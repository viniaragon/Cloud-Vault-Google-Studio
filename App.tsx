import React, { useState, useEffect, useCallback } from 'react';
import { AuthState, FileMetadata, FileType, User } from './types';
import Header from './components/Header';
import DropZone from './components/DropZone';
import FileCard from './components/FileCard';
import { Loader2, Lock, ArrowRight, Search, Database, UserPlus } from 'lucide-react';
import { analyzeFile, fileToBase64 } from './services/geminiService';
import { saveFileToStorage, getAllFilesFromStorage, deleteFileFromStorage, updateFileInStorage } from './services/storageService';
import { auth } from './services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';

const App: React.FC = () => {
  // -- State --
  const [userState, setUserState] = useState<AuthState>({ isAuthenticated: false, user: null });
  const [loginForm, setLoginForm] = useState({ email: '', password: '', name: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // -- Effects --
  
  // Check Firebase session on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUserState({
          isAuthenticated: true,
          user: {
            username: firebaseUser.email || '',
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário'
          }
        });
      } else {
        setUserState({ isAuthenticated: false, user: null });
        setFiles([]);
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  // Load files from Database when authenticated
  useEffect(() => {
    if (userState.isAuthenticated) {
      const loadFiles = async () => {
        setIsLoadingFiles(true);
        try {
          const storedFiles = await getAllFilesFromStorage();
          setFiles(storedFiles);
        } catch (error) {
          console.error("Failed to load files from DB", error);
        } finally {
          setIsLoadingFiles(false);
        }
      };
      loadFiles();
    }
  }, [userState.isAuthenticated]);

  // -- Handlers --

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      if (isRegistering) {
        // Register
        const userCredential = await createUserWithEmailAndPassword(auth, loginForm.email, loginForm.password);
        // Update profile name
        await updateProfile(userCredential.user, {
          displayName: loginForm.name
        });
        // State update handled by onAuthStateChanged
      } else {
        // Login
        await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      }
      setIsLoggingIn(false); // Reset loading state on success
    } catch (error: any) {
      console.error(error);
      let msg = "Erro ao autenticar.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        msg = "Email ou senha incorretos.";
      } else if (error.code === 'auth/email-already-in-use') {
        msg = "Este email já está em uso.";
      } else if (error.code === 'auth/weak-password') {
        msg = "A senha deve ter pelo menos 6 caracteres.";
      }
      setLoginError(msg);
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setLoginForm({ email: '', password: '', name: '' });
      setIsLoggingIn(false); // Ensure loading state is reset
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    if (!userState.user) return;

    // 1. Create Metadata (Temporary ID for optimistic UI)
    const newFileMetadata: FileMetadata[] = newFiles.map((file) => {
      let type = FileType.OTHER;
      if (file.type.startsWith('image/')) type = FileType.IMAGE;
      else if (file.type.startsWith('text/') || file.type === 'application/pdf') type = FileType.DOCUMENT;

      return {
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        name: file.name,
        size: file.size,
        type: type,
        mimeType: file.type,
        url: URL.createObjectURL(file), // Temporary URL for preview before upload finishes
        uploadDate: new Date(),
        uploader: userState.user?.name || 'Unknown',
        isAnalyzing: true,
      };
    });

    // 2. Update UI immediately (Optimistic)
    setFiles((prev) => [...newFileMetadata, ...prev]);

    // 3. Persist to DB and Analyze
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const meta = newFileMetadata[i];

      try {
        // Save to Firebase (Storage + Firestore)
        await saveFileToStorage(meta, file);
        
        // Run Gemini Analysis
        const base64 = await fileToBase64(file);
        const summary = await analyzeFile(file, base64);
         
        // Update UI with AI result
        setFiles(currentFiles => 
          currentFiles.map(f => 
             f.id === meta.id ? { ...f, isAnalyzing: false, aiSummary: summary } : f
          )
        );

        // Update Firestore with AI result
        await updateFileInStorage(meta.id, { isAnalyzing: false, aiSummary: summary });

      } catch (e) {
         console.error(e);
         const errorMsg = "Erro no upload ou análise.";
         
         setFiles(currentFiles => 
           currentFiles.map(f => 
             f.id === meta.id ? { ...f, isAnalyzing: false, aiSummary: errorMsg } : f
           )
         );
         // Try to update status if document exists
         try {
            await updateFileInStorage(meta.id, { isAnalyzing: false, aiSummary: errorMsg });
         } catch(err) { /* ignore if doc doesn't exist */ }
      }
    }
  }, [userState.user]);

  const handleDelete = async (id: string) => {
    // Optimistic update
    const previousFiles = [...files];
    setFiles((prev) => prev.filter((f) => f.id !== id));
    
    try {
      await deleteFileFromStorage(id);
    } catch (error) {
      console.error("Error deleting file", error);
      // Revert on error
      setFiles(previousFiles);
      alert("Erro ao excluir arquivo. Tente novamente.");
    }
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (f.aiSummary && f.aiSummary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // -- Render: Loading --
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  // -- Render: Login Screen --
  if (!userState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
           <div className="absolute top-10 right-10 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl mb-4">
               <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              {isRegistering ? 'Criar Conta' : 'Área Restrita'}
            </h2>
            <p className="text-slate-500 mt-2">
              {isRegistering ? 'Preencha seus dados para começar' : 'Acesse o banco de dados da empresa'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={loginForm.name}
                  onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  placeholder="Seu nome completo"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                placeholder="exemplo@empresa.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            
            {loginError && (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg text-center">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-all transform active:scale-[0.98] flex items-center justify-center shadow-lg shadow-indigo-200"
            >
              {isLoggingIn ? (
                <Loader2 className="animate-spin" />
              ) : (
                <span className="flex items-center">
                  {isRegistering ? 'Cadastrar' : 'Entrar'} 
                  <ArrowRight size={18} className="ml-2" />
                </span>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center border-t border-slate-100 pt-4">
             <button 
               type="button"
               onClick={() => {
                 setIsRegistering(!isRegistering);
                 setLoginError('');
               }}
               className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors flex items-center justify-center mx-auto"
             >
               {isRegistering ? (
                 <>Já tem uma conta? Faça login</>
               ) : (
                 <><UserPlus size={16} className="mr-2" /> Não tem conta? Cadastre-se</>
               )}
             </button>
          </div>
        </div>
      </div>
    );
  }

  // -- Render: Dashboard --
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header user={userState.user!} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Action Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Uploader */}
          <div className="lg:col-span-2">
             <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-full">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  Upload de Arquivos
                  <span className="ml-2 text-xs font-normal bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Arraste para enviar</span>
                </h3>
                <DropZone onFilesAdded={handleFilesAdded} />
             </div>
          </div>

          {/* Stats / Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
               <h3 className="text-lg font-semibold text-slate-800 mb-4">Status do Sistema</h3>
               <div className="space-y-4">
                 <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <span className="text-sm text-emerald-800 font-medium flex items-center gap-2">
                      <Database size={14} />
                      Firebase Database
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-sm text-slate-600">Arquivos Totais</span>
                    <span className="font-bold text-slate-800">{files.length}</span>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                   <p className="text-xs text-blue-700 leading-relaxed">
                     <strong className="block mb-1">Inteligência Gemini Ativa</strong>
                     Arquivos são processados pelo Gemini 2.5 e salvos na nuvem com segurança.
                   </p>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* File List Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-800">Arquivos da Empresa</h2>
            
            <div className="relative w-full sm:w-72">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Search size={18} className="text-slate-400" />
               </div>
               <input 
                 type="text" 
                 placeholder="Pesquisar arquivos..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
               />
            </div>
          </div>

          {isLoadingFiles ? (
             <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-500 mr-2" />
                <span className="text-slate-500">Carregando banco de dados...</span>
             </div>
          ) : filteredFiles.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredFiles.map((file) => (
                <div key={file.id} className="aspect-[3/4]">
                  <FileCard file={file} onDelete={handleDelete} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
               <p className="text-slate-400">Nenhum arquivo no banco de dados.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
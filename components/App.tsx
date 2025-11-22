
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthState, FileMetadata, FileType, User } from '../types';
import Header from './components/Header';
import DropZone from './components/DropZone';
import FileCard from './components/FileCard';
import { Loader2, Lock, ArrowRight, Search, Database, UserPlus, Mail } from 'lucide-react';
import { analyzeFile, fileToBase64 } from './services/geminiService';
import { saveFileToStorage, getAllFilesFromStorage, deleteFileFromStorage, updateFileInStorage } from './services/storageService';
import { syncUserToFirestore } from './services/chatService';
import { auth } from './services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import PrintModal from './components/PrintModal';
import SummaryModal from './components/SummaryModal';
import GeminiChat from './components/GeminiChat';
import UserChat from './components/UserChat';

const App: React.FC = () => {
  // -- State --
  const [userState, setUserState] = useState<AuthState>({ isAuthenticated: false, user: null });
  const [loginForm, setLoginForm] = useState({ email: '', password: '', name: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Estado para controlar qual arquivo está sendo impresso ou visualizado
  const [printingFile, setPrintingFile] = useState<FileMetadata | null>(null); 
  const [viewingSummaryFile, setViewingSummaryFile] = useState<FileMetadata | null>(null);

  // Estado do Chat AI
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Estado do Chat de Usuários (Human to Human)
  const [isUserChatOpen, setIsUserChatOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Cache para armazenar objetos File da sessão atual
  const fileCacheRef = useRef<Record<string, File>>({});

  // -- Effects --
  
  // Check Firebase session on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          username: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          uid: firebaseUser.uid 
        };
        
        setUserState({
          isAuthenticated: true,
          user: userData
        });

        // Sincroniza usuário com o banco de dados 'users'
        try {
          await syncUserToFirestore({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User'
          });
        } catch (e) {
          console.error("Erro ao sincronizar usuário para chat:", e);
        }

      } else {
        setUserState({ isAuthenticated: false, user: null });
        setFiles([]);
        fileCacheRef.current = {};
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
        const userCredential = await createUserWithEmailAndPassword(auth, loginForm.email, loginForm.password);
        await updateProfile(userCredential.user, {
          displayName: loginForm.name
        });
      } else {
        await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      }
      setIsLoggingIn(false); 
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
      fileCacheRef.current = {};
      setIsLoggingIn(false);
      setIsChatOpen(false);
      setIsUserChatOpen(false);
      setHasUnreadMessages(false);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const toggleUserChat = () => {
    if (!isUserChatOpen) {
      // Ao abrir, limpamos a notificação
      setHasUnreadMessages(false);
    }
    setIsUserChatOpen(!isUserChatOpen);
  };

  const handleUnreadActivity = () => {
    setHasUnreadMessages(true);
  };

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    if (!userState.user) return;

    const newFileMetadata: FileMetadata[] = newFiles.map((file) => {
      let type = FileType.OTHER;
      if (file.type.startsWith('image/')) type = FileType.IMAGE;
      else if (file.type.startsWith('text/') || file.type === 'application/pdf') type = FileType.DOCUMENT;

      const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      fileCacheRef.current[id] = file;

      return {
        id: id,
        name: file.name,
        size: file.size,
        type: type,
        mimeType: file.type,
        url: URL.createObjectURL(file),
        uploadDate: new Date(),
        uploader: userState.user?.name || 'Unknown',
        isAnalyzing: false,
      };
    });

    setFiles((prev) => [...newFileMetadata, ...prev]);

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const meta = newFileMetadata[i];

      try {
        const realUrl = await saveFileToStorage(meta, file); 
        
        setFiles(currentFiles => 
          currentFiles.map(f => 
             f.id === meta.id ? { 
               ...f, 
               isAnalyzing: false, 
               url: realUrl 
             } : f
          )
        );
        
      } catch (e) {
         console.error(e);
         setFiles(currentFiles => 
           currentFiles.map(f => 
             f.id === meta.id ? { ...f, isAnalyzing: false, aiSummary: "Erro no upload" } : f
           )
         );
      }
    }
  }, [userState.user]);

  const handleViewOrGenerateSummary = async (fileMeta: FileMetadata) => {
    if (fileMeta.aiSummary) {
      setViewingSummaryFile(fileMeta);
      return;
    }

    setFiles(prev => prev.map(f => f.id === fileMeta.id ? { ...f, isAnalyzing: true } : f));

    try {
      let fileObj: File | null = fileCacheRef.current[fileMeta.id];
      let base64 = "";

      if (fileObj) {
        base64 = await fileToBase64(fileObj);
      } else {
        try {
          const response = await fetch(fileMeta.url);
          if (!response.ok) throw new Error("Erro na resposta da rede");
          const blob = await response.blob();
          fileObj = new File([blob], fileMeta.name, { type: fileMeta.mimeType });
          base64 = await fileToBase64(fileObj);
        } catch (fetchError) {
          try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(fileMeta.url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("Erro no proxy");
            const blob = await response.blob();
            fileObj = new File([blob], fileMeta.name, { type: fileMeta.mimeType });
            base64 = await fileToBase64(fileObj);
          } catch (proxyError) {
             throw new Error("Não foi possível baixar o arquivo devido a restrições de segurança.");
          }
        }
      }

      if (!fileObj) throw new Error("Falha crítica ao obter arquivo.");

      const summary = await analyzeFile(fileObj, base64);
      await updateFileInStorage(fileMeta.id, { aiSummary: summary });

      const updatedFile = { ...fileMeta, aiSummary: summary, isAnalyzing: false };
      setFiles(prev => prev.map(f => f.id === fileMeta.id ? updatedFile : f));
      setViewingSummaryFile(updatedFile);

    } catch (error) {
      console.error("Erro ao gerar resumo sob demanda:", error);
      alert("Não foi possível analisar este arquivo.");
      setFiles(prev => prev.map(f => f.id === fileMeta.id ? { ...f, isAnalyzing: false } : f));
    }
  };

  const handleDelete = async (id: string) => {
    const previousFiles = [...files];
    setFiles((prev) => prev.filter((f) => f.id !== id));
    
    try {
      await deleteFileFromStorage(id);
      if (fileCacheRef.current[id]) {
        delete fileCacheRef.current[id];
      }
    } catch (error) {
      console.error("Error deleting file", error);
      setFiles(previousFiles);
      alert("Erro ao excluir arquivo. Tente novamente.");
    }
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (f.aiSummary && f.aiSummary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-emerald-300 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-900" size={48} />
      </div>
    );
  }

  if (!userState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-emerald-300 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        
        {/* Background Blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute -top-20 -left-20 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
           <div className="absolute top-1/2 -right-20 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
           <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-md w-full bg-orange-50 rounded-3xl shadow-2xl p-8 sm:p-10 z-10 relative border border-orange-200">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4 text-purple-600 shadow-sm ring-4 ring-purple-50">
               <Lock size={32} strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-bold text-emerald-950 tracking-tight">
              {isRegistering ? 'Criar Conta' : 'Área Restrita'}
            </h2>
             <p className="text-emerald-800/60 font-medium mt-2">
              {isRegistering ? 'Junte-se à nossa equipe' : 'Acesse o banco de dados'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isRegistering && (
              <div>
                 <label className="block text-sm font-bold text-emerald-900/70 mb-1.5 ml-1">Nome</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-500/50">
                     <UserPlus size={20} />
                   </div>
                   <input
                    type="text"
                    value={loginForm.name}
                    onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border border-orange-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none text-slate-700 font-medium shadow-sm transition-all placeholder:text-slate-400"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
              </div>
            )}
            <div>
                <label className="block text-sm font-bold text-emerald-900/70 mb-1.5 ml-1">Email</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-500/50">
                     <Mail size={20} />
                   </div>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border border-orange-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none text-slate-700 font-medium shadow-sm transition-all placeholder:text-slate-400"
                    placeholder="nome@empresa.com"
                    required
                  />
                </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-emerald-900/70 mb-1.5 ml-1">Senha</label>
              <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-500/50">
                      <Lock size={20} />
                   </div>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border border-orange-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none text-slate-700 font-medium shadow-sm transition-all placeholder:text-slate-400"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
              </div>
            </div>
            
            {loginError && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl text-center font-medium animate-pulse">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center shadow-lg shadow-emerald-500/20 text-lg mt-4 group"
            >
              {isLoggingIn ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <span className="flex items-center gap-2">
                  {isRegistering ? 'Cadastrar' : 'Entrar'} 
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center border-t border-orange-200/50 pt-6">
             <button 
               type="button"
               onClick={() => {
                 setIsRegistering(!isRegistering);
                 setLoginError('');
               }}
               className="text-sm text-emerald-800 font-semibold hover:text-purple-700 transition-colors flex items-center justify-center mx-auto gap-2 py-2 px-4 rounded-lg hover:bg-white/50"
             >
               {isRegistering ? 'Já possui conta? Login' : 'Não possui conta? Cadastre-se'}
             </button>
          </div>
        </div>
        
        <p className="absolute bottom-6 text-emerald-900/40 text-xs font-semibold tracking-widest uppercase">
          CloudVault Enterprise &copy; 2025
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header 
        user={userState.user!} 
        onLogout={handleLogout} 
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        onToggleUserChat={toggleUserChat}
        isUserChatOpen={isUserChatOpen}
        hasUnreadMessages={hasUnreadMessages}
      />

      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-10 space-y-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
             <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 h-full">
                <h3 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
                  Upload de Arquivos
                  <span className="ml-3 text-sm font-bold bg-orange-100 text-orange-600 px-3 py-1 rounded-full">Arraste para enviar</span>
                </h3>
                <DropZone onFilesAdded={handleFilesAdded} />
             </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
               <h3 className="text-xl font-semibold text-slate-800 mb-6">Status do Sistema</h3>
               <div className="space-y-5">
                 {/* Firebase Card - Green */}
                 <div className="flex justify-between items-center p-4 bg-emerald-300 rounded-xl shadow-sm">
                    <span className="text-base text-emerald-950 font-bold flex items-center gap-2">
                      <Database size={18} />
                      Firebase Database
                    </span>
                    <span className="h-3 w-3 rounded-full bg-emerald-700 animate-pulse"></span>
                 </div>
                 
                 {/* Total Files Card - Neutral */}
                 <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-base text-slate-600">Arquivos Totais</span>
                    <span className="font-bold text-lg text-slate-800">{files.length}</span>
                 </div>

                 {/* Gemini Card - Purple */}
                 <div className="bg-purple-200 p-5 rounded-xl shadow-sm">
                   <p className="text-sm text-purple-900 leading-relaxed">
                     <strong className="block mb-2 text-base font-bold">Inteligência Gemini Ativa</strong>
                     Arquivos são processados pelo Gemini 2.5 e salvos na nuvem com segurança.
                   </p>
                 </div>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <h2 className="text-4xl font-bold text-slate-800">Arquivos da Empresa</h2>
            
            <div className="relative w-full sm:w-96">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                 <Search size={20} className="text-slate-400" />
               </div>
               <input 
                 type="text" 
                 placeholder="Pesquisar arquivos..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-12 pr-5 py-3 bg-white border border-slate-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
               />
            </div>
          </div>

          {isLoadingFiles ? (
             <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-emerald-500 mr-3" size={24} />
                <span className="text-slate-500 text-lg">Carregando banco de dados...</span>
             </div>
          ) : filteredFiles.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredFiles.map((file) => (
                <div key={file.id} className="aspect-[3/4]">
                  <FileCard 
                    file={file} 
                    onDelete={handleDelete} 
                    onPrint={(fileToPrint) => setPrintingFile(fileToPrint)}
                    onViewSummary={handleViewOrGenerateSummary}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-2xl border border-slate-200 border-dashed">
               <p className="text-slate-400 text-lg">Nenhum arquivo no banco de dados.</p>
            </div>
          )}
        </div>

        {printingFile && (
          <PrintModal 
            fileUrl={printingFile.url} 
            fileName={printingFile.name} 
            onClose={() => setPrintingFile(null)} 
          />
        )}

        {viewingSummaryFile && (
          <SummaryModal
            fileName={viewingSummaryFile.name}
            summary={viewingSummaryFile.aiSummary || "Sem resumo disponível."}
            onClose={() => setViewingSummaryFile(null)}
          />
        )}
        
        <GeminiChat 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          files={files}
        />

        {/* USER CHAT (Human to Human) */}
        {userState.user && userState.user.uid && (
          <UserChat
            isOpen={isUserChatOpen}
            onClose={() => setIsUserChatOpen(false)}
            currentUser={{
              uid: userState.user.uid,
              name: userState.user.name,
              email: userState.user.username
            }}
            onUnreadActivity={handleUnreadActivity}
          />
        )}

      </main>
    </div>
  );
};

export default App;

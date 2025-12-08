
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthState, FileMetadata, FileType, User } from './types';
import Header from './components/Header';
import DropZone from './components/DropZone';
import FileCard from './components/FileCard';
import { Loader2, Lock, ArrowRight, Search, Database, UserPlus } from 'lucide-react';
import { analyzeFile, fileToBase64 } from './services/geminiService';
import { saveFileToStorage, deleteFileFromStorage, updateFileInStorage, subscribeToFiles } from './services/storageService';
import { syncUserToFirestore } from './services/chatService';
import { auth } from './services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import PrintModal from './components/PrintModal';
import SummaryModal from './components/SummaryModal';
import GeminiChat from './components/GeminiChat';
import UserChat from './components/UserChat';
import LandingPage from './components/LandingPage';

const App: React.FC = () => {
  // -- State --
  const [showLandingPage, setShowLandingPage] = useState(true);
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
  const [uploadingFiles, setUploadingFiles] = useState<FileMetadata[]>([]); // Arquivos sendo enviados (Optimistic UI)
  const [analyzingFileIds, setAnalyzingFileIds] = useState<Set<string>>(new Set()); // IDs sendo analisados localmente

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Cache para armazenar objetos File da sessão atual (evita erro de CORS no upload imediato)
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

        // Se o usuário já estiver logado, podemos optar por pular a landing page ou não.
        // Seguindo o pedido, o padrão é a landing page, mas se ele recarregar a página logado, 
        // talvez faça sentido ir direto. Por hora, manteremos a Landing Page como porta de entrada.
        // Para UX melhor: Se estiver logado, mantém na app se ele não tiver clicado em "voltar".
        // Mas como state reseta no refresh, ele voltará pra Landing.

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
        setUploadingFiles([]);
        fileCacheRef.current = {};
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to files from Database when authenticated (REAL-TIME)
  useEffect(() => {
    if (userState.isAuthenticated && !showLandingPage) {
      setIsLoadingFiles(true);
      const unsubscribe = subscribeToFiles((updatedFiles) => {
        setFiles(updatedFiles);
        setIsLoadingFiles(false);
      });
      return () => unsubscribe();
    }
  }, [userState.isAuthenticated, showLandingPage]);

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
      setShowLandingPage(true); // Volta para a Landing Page ao sair
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const toggleUserChat = () => {
    if (!isUserChatOpen) {
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
        isAnalyzing: false, // Pode ser usado como 'uploading' visualmente se necessário
      };
    });

    // Adiciona aos arquivos sendo enviados (Optimistic UI)
    setUploadingFiles((prev) => [...newFileMetadata, ...prev]);

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const meta = newFileMetadata[i];

      try {
        // O banco de dados atualizará a lista principal 'files' via subscribeToFiles
        await saveFileToStorage(meta, file);
        
        // Após salvar com sucesso, removemos da lista de upload, 
        // pois a subscription já deve ter pego (ou vai pegar) o arquivo
        setUploadingFiles(prev => prev.filter(f => f.id !== meta.id));
        
      } catch (e) {
         console.error(e);
         alert(`Erro ao fazer upload de ${meta.name}`);
         setUploadingFiles(prev => prev.filter(f => f.id !== meta.id));
      }
    }
  }, [userState.user]);

  const handleViewOrGenerateSummary = async (fileMeta: FileMetadata) => {
    if (fileMeta.aiSummary) {
      setViewingSummaryFile(fileMeta);
      return;
    }

    // Set local analyzing state
    setAnalyzingFileIds(prev => new Set(prev).add(fileMeta.id));

    try {
      let fileObj: File | null = fileCacheRef.current[fileMeta.id];
      let base64 = "";

      if (fileObj) {
        console.log("Usando arquivo do cache local para análise");
        base64 = await fileToBase64(fileObj);
      } else {
        console.log("Arquivo não está no cache, tentando baixar da URL...");
        try {
          const response = await fetch(fileMeta.url);
          if (!response.ok) throw new Error("Erro na resposta da rede");
          const blob = await response.blob();
          fileObj = new File([blob], fileMeta.name, { type: fileMeta.mimeType });
          base64 = await fileToBase64(fileObj);
        } catch (fetchError) {
          console.warn("Fetch direto falhou (provável CORS). Tentando via proxy AllOrigins...", fetchError);
          try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fileMeta.url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("Erro no proxy");
            const blob = await response.blob();
            fileObj = new File([blob], fileMeta.name, { type: fileMeta.mimeType });
            base64 = await fileToBase64(fileObj);
          } catch (proxyError) {
             throw new Error("Não foi possível baixar o arquivo devido a restrições de segurança do navegador.");
          }
        }
      }

      if (!fileObj) throw new Error("Falha crítica ao obter arquivo.");

      const summary = await analyzeFile(fileObj, base64);
      await updateFileInStorage(fileMeta.id, { aiSummary: summary });

      const updatedFile = { ...fileMeta, aiSummary: summary, isAnalyzing: false };
      
      // Update viewing modal immediately if it was successful
      setViewingSummaryFile(updatedFile);

    } catch (error) {
      console.error("Erro ao gerar resumo sob demanda:", error);
      alert("Não foi possível analisar este arquivo. Se você acabou de recarregar a página, tente fazer o upload novamente para habilitar a análise imediata.");
    } finally {
      setAnalyzingFileIds(prev => {
        const next = new Set(prev);
        next.delete(fileMeta.id);
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic delete not needed as much because delete is fast, but we rely on DB subscription
    try {
      await deleteFileFromStorage(id);
      if (fileCacheRef.current[id]) {
        delete fileCacheRef.current[id];
      }
    } catch (error) {
      console.error("Error deleting file", error);
      alert("Erro ao excluir arquivo. Tente novamente.");
    }
  };

  const handleEnterApp = () => {
    setShowLandingPage(false);
  };

  // Merge uploaded files (optimistic) and real files (DB), removing duplicates if any
  const allFiles = [...uploadingFiles, ...files].filter((file, index, self) => 
    index === self.findIndex((f) => f.id === file.id)
  );

  const filteredFiles = allFiles.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (f.aiSummary && f.aiSummary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // --- RENDER FLOW ---

  // 1. Initializing Spinner
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  // 2. Landing Page (New Entry Point)
  if (showLandingPage) {
    return <LandingPage onEnterApp={handleEnterApp} />;
  }

  // 3. Login Screen (CloudVault)
  if (!userState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-teal-100 to-emerald-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        
        {/* Botão de Voltar para Landing Page */}
        <button 
          onClick={() => setShowLandingPage(true)}
          className="absolute top-6 left-6 text-emerald-800 hover:text-emerald-950 font-semibold z-20 flex items-center gap-2"
        >
          &larr; Voltar ao Início
        </button>

        {/* Decoração de Fundo (Bolhas Suaves) */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
           <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        </div>

        {/* CARTÃO PRINCIPAL: Cor Pêssego (#ffe0c2) */}
        <div className="max-w-md w-full bg-[#ffe0c2] rounded-2xl shadow-xl p-8 z-10 border-4 border-white/30">
          <div className="text-center mb-8">
            
            {/* ÍCONE: Roxo */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-200/80 text-purple-700 rounded-full mb-4 shadow-sm ring-4 ring-white/50">
               <Lock size={32} strokeWidth={2.5} />
            </div>
            
            {/* TÍTULO: Roxo Escuro */}
            <h2 className="text-2xl font-bold text-purple-900">
              {isRegistering ? 'Criar Conta' : 'Área Restrita'}
            </h2>
            <p className="text-purple-800/70 mt-2 font-medium text-sm">
              {isRegistering ? 'Preencha seus dados' : 'Acesse o sistema CloudVault'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-purple-900 mb-1 ml-1 uppercase tracking-wide">Nome</label>
                <input
                  type="text"
                  value={loginForm.name}
                  onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/90 border-2 border-transparent focus:border-purple-400 text-purple-900 placeholder-purple-300 focus:ring-0 outline-none transition-all shadow-sm"
                  placeholder="Seu nome completo"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-purple-900 mb-1 ml-1 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white/90 border-2 border-transparent focus:border-purple-400 text-purple-900 placeholder-purple-300 focus:ring-0 outline-none transition-all shadow-sm"
                placeholder="exemplo@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-900 mb-1 ml-1 uppercase tracking-wide">Senha</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white/90 border-2 border-transparent focus:border-purple-400 text-purple-900 placeholder-purple-300 focus:ring-0 outline-none transition-all shadow-sm"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            
            {loginError && (
              <p className="text-red-600 text-sm bg-white/50 p-3 rounded-lg text-center font-bold border border-red-200">{loginError}</p>
            )}

            {/* BOTÃO: Verde Esmeralda Vibrante (#00c48f) */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#00c48f] hover:bg-[#00a87a] text-white font-bold py-3.5 rounded-lg transition-all transform active:scale-[0.98] flex items-center justify-center shadow-lg mt-4"
            >
              {isLoggingIn ? (
                <Loader2 className="animate-spin" />
              ) : (
                <span className="flex items-center">
                  {isRegistering ? 'Cadastrar' : 'Entrar'} 
                  <ArrowRight size={18} className="ml-2" strokeWidth={3} />
                </span>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center pt-2 border-t border-purple-900/10">
             <button 
               type="button"
               onClick={() => {
                 setIsRegistering(!isRegistering);
                 setLoginError('');
               }}
               className="text-sm text-purple-700 font-bold hover:text-purple-900 transition-colors flex items-center justify-center mx-auto mt-2"
             >
               {isRegistering ? (
                 <>Já tem uma conta? Faça login</>
               ) : (
                 <><UserPlus size={16} className="mr-2" /> Não tem conta? Cadastre-se</>
               )}
             </button>
          </div>
        </div>
        
        {/* Rodapé discreto */}
        <p className="absolute bottom-6 text-emerald-800/40 text-xs font-semibold tracking-widest uppercase">
          CloudVault Enterprise &copy; 2025
        </p>
      </div>
    );
  }

  // 4. Main App Dashboard (CloudVault)
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
             <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-full">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  Upload de Arquivos
                  <span className="ml-2 text-xs font-normal bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Arraste para enviar</span>
                </h3>
                <DropZone onFilesAdded={handleFilesAdded} />
             </div>
          </div>

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

          {isLoadingFiles && files.length === 0 ? (
             <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-500 mr-2" />
                <span className="text-slate-500">Carregando banco de dados...</span>
             </div>
          ) : filteredFiles.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredFiles.map((file) => (
                <div key={file.id} className="aspect-[3/4]">
                  <FileCard 
                    file={{
                      ...file,
                      // Override isAnalyzing status if local analysis is happening
                      isAnalyzing: analyzingFileIds.has(file.id) || file.isAnalyzing
                    }} 
                    onDelete={handleDelete} 
                    onPrint={(fileToPrint) => setPrintingFile(fileToPrint)}
                    onViewSummary={handleViewOrGenerateSummary}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
               <p className="text-slate-400">Nenhum arquivo no banco de dados.</p>
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

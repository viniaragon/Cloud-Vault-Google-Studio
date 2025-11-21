
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, GripHorizontal, Search, ChevronLeft, User as UserIcon, Loader2 } from 'lucide-react';
import { ChatUser, Conversation, UserMessage } from '../types';
import { 
  searchUsersByEmail, 
  getOrCreateConversation, 
  sendUserMessage, 
  subscribeToConversations, 
  subscribeToMessages 
} from '../services/chatService';

interface UserChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { uid: string; name: string; email: string };
  onUnreadActivity: () => void; // Callback para avisar o pai
}

const UserChat: React.FC<UserChatProps> = ({ isOpen, onClose, currentUser, onUnreadActivity }) => {
  // --- State UI ---
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 600 });
  
  // --- State Data ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  
  // --- State Search ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // --- State Input ---
  const [messageInput, setMessageInput] = useState('');

  // --- Refs ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  // Ref para rastrear a última mensagem conhecida e disparar notificações
  const lastKnownMessageRef = useRef<string>('');
  const isFirstLoad = useRef(true);

  // --- Effects ---

  // 1. Load Conversations List & Monitor Unread
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const unsubscribe = subscribeToConversations(currentUser.uid, (chats) => {
      setConversations(chats);
      
      // Lógica de Notificação
      if (chats.length > 0) {
        const latest = chats[0];
        const uniqueKey = latest.id + '_' + (latest.lastMessageDate?.seconds || 0);

        // Se não é o primeiro carregamento e a chave mudou (nova msg)
        if (!isFirstLoad.current && lastKnownMessageRef.current !== uniqueKey) {
          if (!isOpen) {
            onUnreadActivity();
          }
        }
        
        lastKnownMessageRef.current = uniqueKey;
      }
      
      isFirstLoad.current = false;
    });

    return () => unsubscribe();
  }, [currentUser, isOpen, onUnreadActivity]);

  // 2. Load Messages for Active Chat
  useEffect(() => {
    if (!activeChat) return;
    const unsubscribe = subscribeToMessages(activeChat.id, (msgs) => {
      setMessages(msgs);
      // Scroll to bottom on new message
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [activeChat]);

  // --- Handlers ---

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const users = await searchUsersByEmail(searchQuery, currentUser.uid);
      setSearchResults(users);
    } catch (error) {
      console.error("Erro na busca:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartChat = async (targetUser: ChatUser) => {
    try {
      const myUser: ChatUser = {
        uid: currentUser.uid,
        name: currentUser.name,
        email: currentUser.email
      };

      const chatId = await getOrCreateConversation(myUser, targetUser);
      
      const tempConv: Conversation = {
        id: chatId,
        participants: [myUser.uid, targetUser.uid],
        participantDetails: {
          [myUser.uid]: myUser,
          [targetUser.uid]: targetUser
        }
      };

      setActiveChat(tempConv);
      setView('chat');
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error("Erro ao iniciar chat:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat) return;

    const text = messageInput;
    setMessageInput(''); 

    try {
      await sendUserMessage(activeChat.id, currentUser.uid, text);
    } catch (error) {
      console.error("Erro ao enviar:", error);
      setMessageInput(text); 
    }
  };

  // --- Drag Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // --- Helpers ---
  const getOtherParticipant = (conv: Conversation) => {
    const otherId = conv.participants.find(id => id !== currentUser.uid);
    if (otherId && conv.participantDetails[otherId]) {
        return conv.participantDetails[otherId];
    }
    return { name: 'Desconhecido', email: '', uid: '' };
  };

  // Não retornamos null aqui para manter os listeners ativos.
  // Usamos CSS para ocultar.

  return (
    <div 
      style={{ 
        left: position.x, 
        top: position.y,
        visibility: isOpen ? 'visible' : 'hidden',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transform: isOpen ? 'scale(1)' : 'scale(0.95)'
      }}
      className="fixed w-80 h-[500px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden transition-all duration-200 ease-in-out"
    >
      {/* Header Draggable */}
      <div 
        onMouseDown={handleMouseDown}
        className={`
          flex items-center justify-between px-4 py-3 bg-emerald-600 text-white cursor-move select-none
          ${isDragging.current ? 'cursor-grabbing' : ''}
        `}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          {view === 'chat' && (
             <button 
               onClick={() => { setView('list'); setActiveChat(null); }} 
               className="p-1 hover:bg-white/20 rounded-full mr-1 pointer-events-auto"
             >
               <ChevronLeft size={18} />
             </button>
          )}
          {view === 'chat' && activeChat ? (
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-800 rounded-full flex items-center justify-center text-xs">
                    {getOtherParticipant(activeChat).name.charAt(0)}
                </div>
                <span className="font-semibold text-sm truncate max-w-[150px]">
                    {getOtherParticipant(activeChat).name}
                </span>
            </div>
          ) : (
            <>
              <MessageCircle size={18} />
              <span className="font-semibold text-sm">Mensagens</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <GripHorizontal size={18} className="opacity-50" />
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col relative">
        
        {/* VIEW: LIST */}
        {view === 'list' && (
          <div className="flex flex-col h-full">
             {/* Search Bar */}
             <div className="p-3 bg-white border-b border-slate-200">
                <form onSubmit={handleSearch} className="relative">
                   <input 
                     type="text" 
                     placeholder="Buscar email..." 
                     className="w-full pl-8 pr-3 py-2 bg-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                   />
                   <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                </form>
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                     <p className="text-xs text-slate-400 font-medium px-1">Resultados da busca:</p>
                     {searchResults.map(u => (
                       <button 
                         key={u.uid}
                         onClick={() => handleStartChat(u)}
                         className="w-full flex items-center gap-2 p-2 hover:bg-emerald-50 rounded-lg text-left transition-colors"
                       >
                          <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                            <UserIcon size={14} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium text-slate-700 truncate">{u.name}</p>
                            <p className="text-xs text-slate-400 truncate">{u.email}</p>
                          </div>
                       </button>
                     ))}
                     <div className="h-px bg-slate-200 my-2"></div>
                  </div>
                )}

                {isSearching && <div className="text-center p-2"><Loader2 className="animate-spin mx-auto text-emerald-500" size={16}/></div>}
             </div>

             {/* Conversations List */}
             <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {conversations.length === 0 && !searchQuery && (
                  <div className="text-center text-slate-400 py-8 text-sm px-4">
                    <p>Nenhuma conversa ainda.</p>
                    <p className="text-xs mt-1">Busque alguém pelo email acima para começar.</p>
                  </div>
                )}

                {conversations.map(chat => {
                  const other = getOtherParticipant(chat);
                  return (
                    <button
                      key={chat.id}
                      onClick={() => { setActiveChat(chat); setView('chat'); }}
                      className="w-full flex items-center gap-3 p-3 bg-white hover:bg-slate-100 rounded-xl border border-slate-100 shadow-sm transition-all text-left group"
                    >
                      <div className="w-10 h-10 bg-slate-200 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 rounded-full flex items-center justify-center transition-colors shrink-0 relative">
                        {other.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-center">
                           <h4 className="text-sm font-semibold text-slate-800 truncate">{other.name}</h4>
                           {chat.lastMessageDate && (
                             <span className="text-[10px] text-slate-400">
                               {new Date(chat.lastMessageDate.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </span>
                           )}
                         </div>
                         <p className="text-xs text-slate-500 truncate mt-0.5 h-4">
                           {chat.lastMessage || <span className="italic opacity-50">Iniciar conversa</span>}
                         </p>
                      </div>
                    </button>
                  );
                })}
             </div>
          </div>
        )}

        {/* VIEW: CHAT ROOM */}
        {view === 'chat' && activeChat && (
          <div className="flex flex-col h-full">
             {/* Messages Area */}
             <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-slate-50">
                {messages.map(msg => {
                  const isMe = msg.senderId === currentUser.uid;
                  return (
                    <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`
                        max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm break-words
                        ${isMe ? 'bg-emerald-500 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'}
                      `}>
                        {msg.text}
                        <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-emerald-100' : 'text-slate-300'}`}>
                           {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
             </div>

             {/* Input Area */}
             <form onSubmit={handleSendMessage} className="p-2 bg-white border-t border-slate-200 flex gap-2">
               <input
                 type="text"
                 value={messageInput}
                 onChange={(e) => setMessageInput(e.target.value)}
                 placeholder="Digite sua mensagem..."
                 className="flex-1 bg-slate-100 border-transparent rounded-full px-4 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
               />
               <button 
                 type="submit"
                 disabled={!messageInput.trim()}
                 className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-full flex items-center justify-center shadow-sm transition-colors"
               >
                 <Send size={16} />
               </button>
             </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default UserChat;

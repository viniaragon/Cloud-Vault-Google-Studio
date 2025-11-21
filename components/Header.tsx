
import React from 'react';
import { User, LogOut, Cloud, Sparkles, MessageCircle } from 'lucide-react';
import { User as UserType } from '../types';

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  onToggleUserChat: () => void;
  isUserChatOpen: boolean;
  hasUnreadMessages: boolean; // Nova prop
}

const Header: React.FC<HeaderProps> = ({ 
  user, 
  onLogout, 
  onToggleChat, 
  isChatOpen,
  onToggleUserChat,
  isUserChatOpen,
  hasUnreadMessages
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="bg-indigo-600 p-2 rounded-lg text-white">
          <Cloud size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800 tracking-tight">CloudVault</h1>
          <p className="text-xs text-slate-500 font-medium">ENTERPRISE DATABASE</p>
        </div>
      </div>

      <div className="flex items-center space-x-4 sm:space-x-6">
        
        {/* User Chat Toggle (Novo) */}
        <button 
          onClick={onToggleUserChat}
          className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
            ${isUserChatOpen 
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-200' 
              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
        >
          <MessageCircle size={16} />
          Mensagens
          {hasUnreadMessages && !isUserChatOpen && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
          )}
        </button>

        {/* AI Assistant Toggle */}
        <button 
          onClick={onToggleChat}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
            ${isChatOpen 
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200' 
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
        >
          <Sparkles size={16} />
          AI Assistant
        </button>

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        <div className="flex items-center space-x-2 text-slate-600 hidden sm:flex">
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
             <User size={16} />
          </div>
          <span className="text-sm font-medium">{user.name}</span>
        </div>
        <button
          onClick={onLogout}
          className="text-slate-400 hover:text-red-600 transition-colors duration-200"
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;


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
  hasUnreadMessages: boolean; 
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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-5 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="bg-indigo-600 p-2.5 rounded-lg text-white">
          <Cloud size={28} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">CloudVault</h1>
          <p className="text-sm text-slate-500 font-medium">ENTERPRISE DATABASE</p>
        </div>
      </div>

      <div className="flex items-center space-x-5 sm:space-x-8">
        
        {/* User Chat Toggle */}
        <button 
          onClick={onToggleUserChat}
          className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-full text-base font-medium transition-all duration-200
            ${isUserChatOpen 
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-200' 
              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
        >
          <MessageCircle size={20} />
          Mensagens
          {hasUnreadMessages && !isUserChatOpen && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
          )}
        </button>

        {/* AI Assistant Toggle */}
        <button 
          onClick={onToggleChat}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-base font-medium transition-all duration-200
            ${isChatOpen 
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200' 
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
        >
          <Sparkles size={20} />
          AI Assistant
        </button>

        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

        <div className="flex items-center space-x-3 text-slate-600 hidden sm:flex">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
             <User size={20} />
          </div>
          <span className="text-lg font-medium">{user.name}</span>
        </div>
        <button
          onClick={onLogout}
          className="text-slate-400 hover:text-red-600 transition-colors duration-200"
          title="Sair"
        >
          <LogOut size={24} />
        </button>
      </div>
    </header>
  );
};

export default Header;

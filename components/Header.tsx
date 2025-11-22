
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
    <header className="bg-emerald-300 border-b border-emerald-400/50 sticky top-0 z-20 px-6 py-5 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="bg-white p-2.5 rounded-lg text-emerald-600 shadow-sm">
          <Cloud size={28} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-emerald-950 tracking-tight">CloudVault</h1>
          <p className="text-sm text-emerald-800 font-medium">ENTERPRISE DATABASE</p>
        </div>
      </div>

      <div className="flex items-center space-x-5 sm:space-x-8">
        
        {/* User Chat Toggle */}
        <button 
          onClick={onToggleUserChat}
          className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-full text-base font-semibold transition-all duration-200 border
            ${isUserChatOpen 
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-inner' 
              : 'bg-white text-emerald-700 border-transparent hover:bg-emerald-50 shadow-sm'}`}
        >
          <MessageCircle size={20} />
          Mensagens
          {hasUnreadMessages && !isUserChatOpen && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-emerald-300 animate-pulse"></span>
          )}
        </button>

        {/* AI Assistant Toggle */}
        <button 
          onClick={onToggleChat}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-base font-semibold transition-all duration-200 border
            ${isChatOpen 
              ? 'bg-purple-300 text-purple-900 border-purple-400 shadow-inner' 
              : 'bg-purple-200 text-purple-800 border-purple-200 hover:bg-purple-300 shadow-sm'}`}
        >
          <Sparkles size={20} />
          AI Assistant
        </button>

        <div className="h-8 w-px bg-emerald-400/50 hidden sm:block"></div>

        <div className="flex items-center space-x-3 text-emerald-900 hidden sm:flex">
          <div className="w-10 h-10 bg-emerald-100/50 rounded-full flex items-center justify-center border border-emerald-200">
             <User size={20} className="text-emerald-800" />
          </div>
          <span className="text-lg font-medium">{user.name}</span>
        </div>
        <button
          onClick={onLogout}
          className="text-emerald-800 hover:text-red-600 transition-colors duration-200"
          title="Sair"
        >
          <LogOut size={24} />
        </button>
      </div>
    </header>
  );
};

export default Header;

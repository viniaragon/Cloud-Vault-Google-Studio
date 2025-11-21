import React from 'react';
import { User, LogOut, Cloud } from 'lucide-react';
import { User as UserType } from '../types';

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
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

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 text-slate-600">
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
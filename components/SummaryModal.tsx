import React from 'react';
import { X, Sparkles, FileText, Bot } from 'lucide-react';

interface SummaryModalProps {
  fileName: string;
  summary: string;
  onClose: () => void;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ fileName, summary, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md shadow-inner">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg tracking-tight">Análise IA</h3>
              <div className="flex items-center gap-1.5 text-indigo-100 text-xs font-medium">
                <Sparkles size={12} className="text-yellow-300" />
                <span>Processado pelo Gemini 2.5</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Scrollable Area */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
           <div className="flex items-center gap-3 mb-6 text-slate-500 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
             <div className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-100">
                <FileText size={18} className="text-indigo-500" />
             </div>
             <span className="font-medium truncate text-slate-700">{fileName}</span>
           </div>

           <div className="prose prose-sm prose-indigo max-w-none">
             <h4 className="text-slate-800 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
               <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
               Resumo do Conteúdo
             </h4>
             <div className="text-slate-600 leading-relaxed whitespace-pre-wrap bg-indigo-50/30 p-5 rounded-2xl border border-indigo-50/50 text-base">
                {summary}
             </div>
           </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-700 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all active:scale-95"
           >
             Fechar
           </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
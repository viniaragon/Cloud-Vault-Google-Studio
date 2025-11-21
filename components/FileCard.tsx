import React from 'react';
import { FileMetadata, FileType } from '../types';
import { FileImage, FileText, File, Sparkles, Download, Trash2, Loader2, Printer } from 'lucide-react';

interface FileCardProps {
  file: FileMetadata;
  onDelete: (id: string) => void;
  onPrint: (file: FileMetadata) => void;
  onViewSummary: (file: FileMetadata) => void; // Added prop
}
const FileCard: React.FC<FileCardProps> = ({ file, onDelete, onPrint, onViewSummary }) => {
  
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    try {
      // Verifica se é uma data válida antes de chamar toLocaleDateString
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
      return 'Data desconhecida';
    } catch (e) {
      return 'Data inválida';
    }
  };

  const getIcon = () => {
    switch (file.type) {
      case FileType.IMAGE:
        return <FileImage className="text-indigo-500" size={24} />;
      case FileType.DOCUMENT:
        return <FileText className="text-emerald-500" size={24} />;
      default:
        return <File className="text-slate-400" size={24} />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full group relative overflow-hidden">
      
      {/* Preview Area */}
      <div className="h-32 w-full bg-slate-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
        {file.type === FileType.IMAGE ? (
          <img src={file.url} alt={file.name} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="bg-slate-100 p-4 rounded-full">
            {getIcon()}
          </div>
        )}
        
{/* Overlay actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
            
            {/* NOVO BOTÃO: Imprimir Remotamente */}
            <button 
              onClick={() => onPrint(file)}
              className="bg-white text-slate-700 p-2 rounded-full shadow-lg hover:text-indigo-600 transition-colors"
              title="Imprimir Remotamente"
            >
              <Printer size={18} />
            </button>

            {/* Botão de Baixar (Já existia) */}
            <a 
              href={file.url} 
              download={file.name}
              className="bg-white text-slate-700 p-2 rounded-full shadow-lg hover:text-indigo-600 transition-colors"
              title="Baixar"
            >
              <Download size={18} />
            </a>

            {/* Botão de Excluir (Já existia) */}
            <button 
              onClick={() => onDelete(file.id)}
              className="bg-white text-slate-700 p-2 rounded-full shadow-lg hover:text-red-600 transition-colors"
              title="Excluir"
            >
              <Trash2 size={18} />
            </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-slate-800 truncate text-sm" title={file.name}>
          {file.name}
        </h3>
        <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
            <p className="text-xs text-slate-400">{formatDate(file.uploadDate)}</p>
        </div>
      </div>

      {/* AI Summary Section (Updated) */}
      <div className="mt-3 pt-3 border-t border-slate-100 min-h-[40px] flex items-center">
        {file.isAnalyzing ? (
          <div className="flex items-center justify-center w-full space-x-2 text-indigo-500 animate-pulse">
             <Loader2 size={14} className="animate-spin" />
             <span className="text-xs font-medium">Analisando...</span>
          </div>
        ) : (
          <button 
            onClick={() => onViewSummary(file)}
            className={`w-full group/btn flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all duration-200 text-xs font-medium border 
              ${file.aiSummary 
                ? 'bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 border-indigo-100 hover:border-indigo-600' 
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:text-indigo-600'}`}
            title={file.aiSummary ? "Ver resumo da IA" : "Gerar análise com Gemini"}
          >
             <Sparkles size={14} className={`${file.aiSummary ? 'group-hover/btn:text-yellow-300' : 'text-slate-400 group-hover/btn:text-indigo-500'} transition-colors`} />
             {file.aiSummary ? 'Ver Resumo' : 'Gerar Resumo IA'}
          </button>
        )}
      </div>
    </div>
  );
};

export default FileCard;
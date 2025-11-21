import React from 'react';
import { FileMetadata, FileType } from '../types';
import { FileImage, FileText, File, Sparkles, Download, Trash2, Loader2 } from 'lucide-react';

interface FileCardProps {
  file: FileMetadata;
  onDelete: (id: string) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onDelete }) => {
  
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
            <a 
              href={file.url} 
              download={file.name}
              className="bg-white text-slate-700 p-2 rounded-full shadow-lg hover:text-indigo-600 transition-colors"
              title="Baixar"
            >
              <Download size={18} />
            </a>
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

      {/* AI Summary Section */}
      <div className="mt-3 pt-3 border-t border-slate-100 min-h-[40px]">
        {file.isAnalyzing ? (
          <div className="flex items-center space-x-2 text-indigo-500 animate-pulse">
             <Loader2 size={14} className="animate-spin" />
             <span className="text-xs font-medium">Gemini analisando...</span>
          </div>
        ) : file.aiSummary ? (
          <div className="bg-indigo-50 rounded-lg p-2 relative">
             <div className="absolute -top-2 -right-2 bg-indigo-600 text-white p-1 rounded-full shadow-sm">
                <Sparkles size={10} fill="currentColor" />
             </div>
             <p className="text-[11px] text-indigo-800 leading-relaxed">
               {file.aiSummary}
             </p>
          </div>
        ) : (
          <p className="text-[11px] text-slate-300 italic text-center">Sem análise disponível</p>
        )}
      </div>
    </div>
  );
};

export default FileCard;
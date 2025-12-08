import React, { useState } from 'react';
import { FileMetadata, FileType } from '../types';
import { FileImage, FileText, File, Sparkles, Download, Trash2, Loader2, Printer } from 'lucide-react';

interface FileCardProps {
  file: FileMetadata;
  onDelete: (id: string) => void;
  onPrint: (file: FileMetadata) => void;
  onViewSummary: (file: FileMetadata) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onDelete, onPrint, onViewSummary }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Verifica se o arquivo ainda é uma versão local (blob) que não foi sincronizada
  const isLocalFile = file.url.startsWith('blob:');

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    try {
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
        return <FileImage className="text-purple-500" size={32} />;
      case FileType.DOCUMENT:
        return <FileText className="text-emerald-500" size={32} />;
      default:
        return <File className="text-slate-400" size={32} />;
    }
  };

  const handleDownload = async () => {
    if (isDownloading || isLocalFile) return; // Evita download de blob se não quiser, mas geralmente blob funciona pra download local. 
    // Mantendo a lógica original de download, mas o foco é o Print.
    
    setIsDownloading(true);

    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error("Falha ao baixar arquivo do servidor.");
      
      const blob = await response.blob();

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: file.name,
            types: [{
              description: 'Arquivo',
              accept: { [file.mimeType || 'application/octet-stream']: [] },
            }],
          });
          
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          setIsDownloading(false);
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setIsDownloading(false);
            return;
          }
          console.warn("Janela de salvar não permitida neste contexto, usando download automático.");
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error("Erro no download:", error);
      window.open(file.url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full group relative overflow-hidden">
      
      <div className="h-40 w-full bg-slate-50 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
        {file.type === FileType.IMAGE ? (
          <img src={file.url} alt={file.name} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="bg-slate-100 p-5 rounded-full">
            {getIcon()}
          </div>
        )}
        
        {/* Camada de Ações (Hover) */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 gap-3">
            
            {/* BOTÃO IMPRIMIR - Com proteção contra Blob URL */}
            <button 
              onClick={() => !isLocalFile && onPrint(file)}
              disabled={isLocalFile}
              className={`p-3 rounded-full shadow-lg transition-colors ${
                isLocalFile 
                  ? 'bg-slate-100 text-slate-300 cursor-wait' 
                  : 'bg-white text-slate-700 hover:text-emerald-600'
              }`}
              title={isLocalFile ? "Aguardando sincronização com a nuvem..." : "Imprimir Remotamente"}
            >
              {isLocalFile ? <Loader2 size={22} className="animate-spin" /> : <Printer size={22} />}
            </button>

            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-white text-slate-700 p-3 rounded-full shadow-lg hover:text-emerald-600 transition-colors disabled:opacity-70 disabled:cursor-wait"
              title="Baixar / Salvar Como"
            >
              {isDownloading ? <Loader2 size={22} className="animate-spin text-emerald-600" /> : <Download size={22} />}
            </button>

            <button 
              onClick={() => onDelete(file.id)}
              className="bg-white text-slate-700 p-3 rounded-full shadow-lg hover:text-red-600 transition-colors"
              title="Excluir"
            >
              <Trash2 size={22} />
            </button>
        </div>

        {/* Indicador visual de upload em andamento */}
        {isLocalFile && (
          <div className="absolute bottom-2 right-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow opacity-90">
            Enviando...
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-800 truncate text-lg" title={file.name}>
          {file.name}
        </h3>
        <div className="flex justify-between items-center mt-2">
            <p className="text-sm text-slate-500">{formatSize(file.size)}</p>
            <p className="text-sm text-slate-500">{formatDate(file.uploadDate)}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 min-h-[50px] flex items-center">
        {file.isAnalyzing ? (
          <div className="flex items-center justify-center w-full space-x-2 text-purple-500 animate-pulse">
             <Loader2 size={18} className="animate-spin" />
             <span className="text-sm font-medium">Analisando...</span>
          </div>
        ) : (
          <button 
            onClick={() => onViewSummary(file)}
            className={`w-full group/btn flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all duration-200 text-sm font-semibold border 
              ${file.aiSummary 
                ? 'bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-600 border-purple-100 hover:border-purple-600' 
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:text-purple-600'}`}
            title={file.aiSummary ? "Ver resumo da IA" : "Gerar análise com Gemini"}
          >
             <Sparkles size={18} className={`${file.aiSummary ? 'group-hover/btn:text-yellow-300' : 'text-slate-400 group-hover/btn:text-purple-500'} transition-colors`} />
             {file.aiSummary ? 'Ver Resumo' : 'Gerar Resumo IA'}
          </button>
        )}
      </div>
    </div>
  );
};

export default FileCard;
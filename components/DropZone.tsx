
import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileUp } from 'lucide-react';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ onFilesAdded }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded(Array.from(e.dataTransfer.files));
    }
  }, [onFilesAdded]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(Array.from(e.target.files));
    }
    // Reset value so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFilesAdded]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative group cursor-pointer
        rounded-2xl border-2 border-dashed
        transition-all duration-300 ease-in-out
        flex flex-col items-center justify-center
        h-56 sm:h-72 w-full
        ${isDragOver 
          ? 'border-orange-400 bg-orange-100 scale-[1.01] shadow-lg' 
          : 'border-orange-300 bg-orange-50 hover:border-orange-400 hover:bg-orange-100/80 shadow-sm'}
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        multiple
      />
      
      <div className={`
        p-5 rounded-full mb-5 transition-all duration-300
        ${isDragOver ? 'bg-orange-200 text-orange-600' : 'bg-orange-100 text-orange-400 group-hover:text-orange-500 group-hover:bg-orange-200'}
      `}>
        {isDragOver ? <FileUp size={40} /> : <UploadCloud size={40} />}
      </div>
      
      <p className="text-slate-800 font-bold text-2xl">
        {isDragOver ? 'Solte os arquivos aqui' : 'Arraste e solte seus arquivos'}
      </p>
      <p className="text-slate-500 text-lg mt-3 font-medium">
        ou clique para selecionar do computador
      </p>
    </div>
  );
};

export default DropZone;

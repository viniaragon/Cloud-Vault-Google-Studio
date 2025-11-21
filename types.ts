export interface User {
  username: string;
  name: string;
}

export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number; // in bytes
  type: FileType;
  mimeType: string;
  url: string; // Object URL for preview
  uploadDate: Date;
  uploader: string;
  aiSummary?: string; // Gemini analysis result
  isAnalyzing?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

// Adicione isso ao final do arquivo types.ts

export interface Device {
  id: string;
  name: string;        // nome do PC (ex: "PC do Dr. Paulo")
  status: string;      // "online"
  impressoras: string[]; // Lista de impressoras instaladas
  ultimo_visto?: any;  // Data do último sinal de vida
}

export interface PrintJob {
  pc_alvo_id: string;
  impressora_alvo: string;
  url_arquivo: string;
  status: 'pendente' | 'impresso' | 'erro';
  created_at: Date;
}
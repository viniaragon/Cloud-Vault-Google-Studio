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
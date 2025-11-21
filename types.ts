
export interface User {
  username: string; // email
  name: string;
  uid?: string; // Firebase UID
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

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

// --- Interfaces do Chat entre Usuários ---

export interface ChatUser {
  uid: string;
  email: string;
  name: string;
}

export interface UserMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: any; // Firestore Timestamp
}

export interface Conversation {
  id: string;
  participants: string[]; // UIDs
  participantDetails: Record<string, ChatUser>; // Mapa de UIDs para detalhes para fácil acesso
  lastMessage?: string;
  lastMessageDate?: any;
}

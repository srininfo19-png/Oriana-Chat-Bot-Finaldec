export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  content: string; // Full text (kept for reference)
  chunks: string[]; // RAG Chunks (Small text segments)
  uploadDate: Date;
}

export interface AdminAuth {
  isAuthenticated: boolean;
}
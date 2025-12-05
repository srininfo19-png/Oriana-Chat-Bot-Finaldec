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
  content: string; // Extracted text content
  uploadDate: Date;
}

export interface AdminAuth {
  isAuthenticated: boolean;
}

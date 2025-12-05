import React, { useState, useRef } from 'react';
import { processDocument } from '../services/fileService';
import { UploadedDocument } from '../types';
import { getUsingCloud, deleteDocumentFromDB } from '../services/dbService';

interface AdminComponentProps {
  onClose: () => void;
  onDocumentsUpdate: (docs: UploadedDocument[]) => void;
  currentDocuments: UploadedDocument[];
  onLogoUpdate: (url: string) => void;
  currentLogo: string;
}

const AdminComponent: React.FC<AdminComponentProps> = ({ 
  onClose, 
  onDocumentsUpdate, 
  currentDocuments, 
  onLogoUpdate, 
  currentLogo 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isCloudConnected = getUsingCloud();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      const newDocs: UploadedDocument[] = [];
      
      try {
        for (let i = 0; i < e.target.files.length; i++) {
          const file = e.target.files[i];
          const doc = await processDocument(file);
          newDocs.push(doc);
        }
        onDocumentsUpdate([...currentDocuments, ...newDocs]);
      } catch (err) {
        alert("Failed to upload some files. Please ensure they are text readable.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onLogoUpdate(reader.result);
        }
      };
      
      if (file) {
        reader.readAsDataURL(file);
      }
      
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const removeDoc = (id: string) => {
    const updated = currentDocuments.filter(d => d.id !== id);
    onDocumentsUpdate(updated);
    // Explicitly call delete for backend cleanup
    deleteDocumentFromDB(id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl text-white brand-font font-bold">Admin Settings</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
              <span className="text-xs text-teal-100 uppercase tracking-wider font-semibold">
                {isCloudConnected ? 'Cloud Database Connected' : 'Local Storage Only'}
              </span>
            </div>
            {!isCloudConnected && (
              <p className="text-[10px] text-teal-200 mt-1">
                To sync across devices, configure firebaseConfig.ts in code.
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-white hover:text-yellow-400 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          {/* Logo Upload Section */}
          <div>
             <h3 className="text-lg font-semibold text-gray-800 mb-2">Brand Logo</h3>
             <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full border border-gray-300 flex items-center justify-center overflow-hidden">
                  {currentLogo ? (
                    <img src={currentLogo} alt="Brand Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-400 text-center">No Logo</span>
                  )}
                </div>
                <div>
                  <button 
                    onClick={() => logoInputRef.current?.click()}
                    className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded hover:bg-yellow-600 transition"
                  >
                    Upload Logo
                  </button>
                  <input 
                    type="file" 
                    ref={logoInputRef}
                    className="hidden" 
                    onChange={handleLogoUpload}
                    accept="image/png, image/jpeg, image/svg+xml"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: Square PNG/SVG</p>
                </div>
             </div>
          </div>

          {/* Document Upload Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Knowledge Base Upload</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload PDF, PPT (text converted), or Text files to train the Oriana Bot.
              These files will be converted to context memory instantly.
            </p>
            
            <div className="border-2 border-dashed border-teal-300 rounded-lg p-8 text-center bg-teal-50 hover:bg-teal-100 transition cursor-pointer"
                 onClick={() => fileInputRef.current?.click()}>
              <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".txt,.md,.json,.csv" 
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-teal-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-teal-800 font-medium">
                {isUploading ? "Processing Vector Embeddings..." : "Click to Upload Documents"}
              </p>
              <p className="text-xs text-gray-500 mt-1">Supported: Text-based files (txt, md, json) for demo</p>
            </div>
          </div>

          {/* Active Documents List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Active Documents ({currentDocuments.length})</h3>
            {currentDocuments.length === 0 ? (
              <div className="text-center py-4 text-gray-400 italic">No documents uploaded yet.</div>
            ) : (
              <ul className="space-y-2">
                {currentDocuments.map(doc => (
                  <li key={doc.id} className="flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{doc.name}</span>
                    </div>
                    <button 
                      onClick={() => removeDoc(doc.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-semibold px-2 py-1 rounded hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="bg-gray-100 p-4 text-right">
          <button onClick={onClose} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-semibold">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminComponent;
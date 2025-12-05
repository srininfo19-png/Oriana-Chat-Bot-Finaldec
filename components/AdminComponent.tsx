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
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isCloudConnected = getUsingCloud();

  // Helper to compress image to ensure it fits in Firestore (limit 1MB)
  const resizeAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300; // Sufficient for a chat logo
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Export as PNG (or JPEG for more compression)
          resolve(canvas.toDataURL('image/png', 0.9));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

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
        alert("Failed to upload some files. Ensure they are PDF or Text files.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessingLogo(true);
      const file = e.target.files[0];
      
      try {
        // Compress before sending up
        const compressedBase64 = await resizeAndCompressImage(file);
        onLogoUpdate(compressedBase64);
      } catch (err) {
        console.error("Logo processing failed", err);
        alert("Failed to process logo image.");
      } finally {
        setIsProcessingLogo(false);
        if (logoInputRef.current) logoInputRef.current.value = '';
      }
    }
  };

  const removeDoc = (id: string) => {
    const updated = currentDocuments.filter(d => d.id !== id);
    onDocumentsUpdate(updated);
    deleteDocumentFromDB(id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 p-6 flex justify-between items-center shadow-lg">
          <div>
            <h2 className="text-2xl text-white brand-font font-bold">Admin Console</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-yellow-400'}`}></span>
              <span className="text-xs text-teal-100 uppercase tracking-wider font-semibold">
                {isCloudConnected ? 'Database Connected' : 'Local Mode'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-yellow-400 transition bg-white/10 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8 bg-gray-50/50">
          
          {/* Logo Upload Section */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
             <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
               <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
               Brand Identity
             </h3>
             <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full border-2 border-teal-100 flex items-center justify-center overflow-hidden shadow-inner">
                  {currentLogo ? (
                    <img src={currentLogo} alt="Brand Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-400 text-center font-medium">No Logo</span>
                  )}
                </div>
                <div className="flex-1">
                  <button 
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isProcessingLogo}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 hover:border-teal-500 hover:text-teal-700 transition flex items-center gap-2"
                  >
                    {isProcessingLogo ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Compressing...
                      </>
                    ) : 'Change Logo'}
                  </button>
                  <input 
                    type="file" 
                    ref={logoInputRef}
                    className="hidden" 
                    onChange={handleLogoUpload}
                    accept="image/png, image/jpeg, image/svg+xml"
                  />
                  <p className="text-[10px] text-gray-400 mt-2">Auto-compressed for database storage.</p>
                </div>
             </div>
          </div>

          {/* Document Upload Section */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              Knowledge Base
            </h3>
            
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer group ${isUploading ? 'bg-gray-50 border-gray-300' : 'border-teal-200 bg-teal-50/30 hover:bg-teal-50 hover:border-teal-400'}`}
                 onClick={() => !isUploading && fileInputRef.current?.click()}>
              <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".txt,.md,.json,.csv,.pdf" 
              />
              <div className="flex flex-col items-center justify-center h-full">
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-3"></div>
                    <span className="text-sm font-semibold text-teal-800">Processing Vector Binaries...</span>
                    <span className="text-xs text-teal-600 mt-1">Extracting embeddings & optimizing memory</span>
                  </div>
                ) : (
                  <>
                    <svg className="h-10 w-10 text-teal-500 mb-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700 group-hover:text-teal-700">Click to Upload Knowledge Files</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">PDF, TXT, JSON Supported</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Active Documents List */}
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Vector Index ({currentDocuments.length})</h3>
            {currentDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-400 italic text-sm border rounded-lg border-dashed">
                No vector data available. Upload files to train the bot.
              </div>
            ) : (
              <ul className="space-y-2">
                {currentDocuments.map(doc => (
                  <li key={doc.id} className="flex justify-between items-center bg-white p-3 rounded-md border border-gray-200 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center overflow-hidden gap-3">
                      <div className="bg-teal-100 p-2 rounded text-teal-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800 truncate max-w-[150px] sm:max-w-[200px]">{doc.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">{(doc.content.length / 1024).toFixed(1)} KB</span>
                            <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium border border-green-200">VECTORIZED</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeDoc(doc.id)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition"
                      title="Remove from memory"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 shadow-md transition font-semibold text-sm">
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminComponent;
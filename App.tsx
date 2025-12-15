import React, { useState, useEffect } from 'react';
import ChatComponent from './components/ChatComponent';
import AdminComponent from './components/AdminComponent';
import { UploadedDocument } from './types';
import { initDB, getDocumentsFromDB, getLogoFromDB, saveDocumentsToDB, saveLogoToDB } from './services/dbService';

function App() {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [logoUrl, setLogoUrl] = useState<string>('');
  
  // Login credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Initialize DB and load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await initDB();
        const savedDocs = await getDocumentsFromDB();
        const savedLogo = await getLogoFromDB();
        
        if (savedDocs.length > 0) setDocuments(savedDocs);
        if (savedLogo) setLogoUrl(savedLogo);
      } catch (error) {
        console.error("Failed to load data from persistence layer", error);
      }
    };
    loadData();
  }, []);

  const handleDocumentsUpdate = (newDocs: UploadedDocument[]) => {
    setDocuments(newDocs);
    saveDocumentsToDB(newDocs).catch(err => console.error("Failed to save documents", err));
  };

  const handleLogoUpdate = (url: string) => {
    setLogoUrl(url);
    saveLogoToDB(url).catch(err => console.error("Failed to save logo", err));
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'Admin' && password === 'Admin@1234') {
      setShowAdminLogin(false);
      setIsAdminOpen(true);
      setUsername('');
      setPassword('');
    } else {
      alert('Invalid Credentials');
    }
  };

  return (
    // Updated gradient with richer gold (#C5A059)
    <div className="min-h-screen bg-gradient-to-br from-[#004d40] via-[#00695c] to-[#C5A059] flex flex-col items-center justify-center p-4 font-sans">
      
      {/* Admin Toggle Button (Top Right) */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={() => setShowAdminLogin(true)}
          className="text-white/80 hover:text-white text-sm bg-black/20 hover:bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm transition flex items-center gap-2 border border-white/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Admin Settings
        </button>
      </div>

      {/* Main Chat Interface */}
      <ChatComponent documents={documents} logoUrl={logoUrl} />

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-100">
            <h2 className="text-xl font-bold text-[#004d40] mb-4 text-center font-serif">Admin Access</h2>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#004d40] outline-none bg-gray-50"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#004d40] outline-none bg-gray-50"
                  placeholder="Enter password"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAdminLogin(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-[#004d40] text-white rounded-lg hover:bg-[#00695c] font-medium shadow-md"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Dashboard Modal */}
      {isAdminOpen && (
        <AdminComponent 
          onClose={() => setIsAdminOpen(false)}
          currentDocuments={documents}
          onDocumentsUpdate={handleDocumentsUpdate}
          currentLogo={logoUrl}
          onLogoUpdate={handleLogoUpdate}
        />
      )}
    </div>
  );
}

export default App;
import React, { useState, useEffect, useRef } from 'react';
import { Message, UploadedDocument } from '../types';
import { generateRAGResponse } from '../services/geminiService';

interface ChatComponentProps {
  documents: UploadedDocument[];
  logoUrl?: string;
}

const ChatComponent: React.FC<ChatComponentProps> = ({ documents, logoUrl }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initial Greeting
  useEffect(() => {
    setMessages([
      {
        id: 'init',
        role: 'model',
        text: 'Hello, I am the Oriana Assistant. How may I assist you with our collections today?',
        timestamp: new Date()
      }
    ]);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    // Update UI immediately with user message
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    const responseText = await generateRAGResponse(userMsg.text, documents, messages);

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Base64 SVG: Deep Teal Circle with Gold "O" (Serif)
  const DEFAULT_LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzAwNGQ0MCIgLz4KICA8dGV4dCB4PSI1MCIgeT0iNzIiIGZvbnQtZmFtaWx5PSJQbGF5ZmFpciBEaXNwbGF5LCBzZXJpZiIgZm9udC1zaXplPSI2MCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiNDNUEwNTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk88L3RleHQ+Cjwvc3ZnPg==";
  const activeLogo = logoUrl || DEFAULT_LOGO;

  return (
    <div className="flex flex-col h-[750px] w-full max-w-md mx-auto bg-[#FDFDFD] rounded-[2.5rem] shadow-2xl overflow-hidden relative border-8 border-[#004d40]">
      
      {/* Watermark Logo in Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.04]">
        <img src={activeLogo} alt="" className="w-64 h-64 object-contain grayscale" />
      </div>

      {/* Header */}
      <div className="bg-[#004d40] p-6 pt-8 flex items-center shadow-lg z-10 relative overflow-hidden">
         {/* Decorative Shine */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mr-4 shadow-md border-2 border-[#C5A059] p-0.5 flex-shrink-0">
           <img 
             src={activeLogo} 
             alt="Oriana Logo" 
             className="w-full h-full object-cover rounded-full"
             onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_LOGO; }}
           />
        </div>
        <div>
          <h1 className="text-white font-bold text-xl font-serif tracking-wide">Oriana Assistant</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 bg-[#C5A059] rounded-full animate-pulse shadow-[0_0_5px_#C5A059]"></span>
            <p className="text-teal-100/80 text-[10px] uppercase tracking-widest font-semibold">Concierge</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 z-10 relative scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start items-end group'}`}>
            
            {/* Bot Avatar */}
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-white border border-[#C5A059]/30 flex-shrink-0 mr-2 flex items-center justify-center overflow-hidden shadow-sm self-end mb-1">
                 <img src={activeLogo} alt="Bot" className="w-full h-full object-cover" />
              </div>
            )}

            <div 
              className={`max-w-[80%] p-4 shadow-sm text-sm leading-relaxed relative ${
                msg.role === 'user' 
                  ? 'bg-[#004d40] text-white rounded-2xl rounded-tr-none shadow-md' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none shadow-sm'
              }`}
            >
              <div className="whitespace-pre-line font-sans">
                {msg.text}
              </div>
              <span className={`text-[10px] block text-right mt-2 ${msg.role === 'user' ? 'text-teal-200' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start items-end z-10 relative">
             <div className="w-8 h-8 rounded-full bg-white border border-[#C5A059]/30 flex-shrink-0 mr-2 flex items-center justify-center overflow-hidden shadow-sm self-end mb-1">
                 <img src={activeLogo} alt="Bot" className="w-full h-full object-cover" />
              </div>
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 bg-[#004d40] rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-[#004d40] rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-[#004d40] rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-5 bg-white border-t border-gray-50 pb-6 z-20 relative">
        <div className="relative flex items-center">
          <input
            type="text"
            className="w-full bg-gray-50 border border-gray-200 rounded-full pl-5 pr-14 py-3.5 focus:border-[#004d40] focus:ring-1 focus:ring-[#004d40] outline-none text-gray-700 placeholder-gray-400/80 shadow-inner transition-all font-sans"
            placeholder="Ask about our collection..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
              input.trim() && !isLoading 
                ? 'bg-[#004d40] text-white shadow-lg hover:scale-105 hover:bg-[#00695c]' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform translate-x-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="text-center mt-3">
            <span className="text-[9px] text-gray-400 tracking-[0.2em] font-bold uppercase font-sans">Powered by Gemini</span>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
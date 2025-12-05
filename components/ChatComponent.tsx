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
  }, [messages]);

  // Initial Greeting
  useEffect(() => {
    setMessages([
      {
        id: 'init',
        role: 'model',
        text: 'Hai, I am Oriana bot. How can i help you?',
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

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const responseText = await generateRAGResponse(userMsg.text, documents);

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

  // Base64 SVG for a default "O" logo matching the brand colors (Teal/Gold)
  const DEFAULT_LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0id2hpdGUiIHN0cm9rZT0iI0ZDQjAyNSIgc3Ryb2tlLXdpZHRoPSI0Ii8+CiAgPHRleHQgeD0iNTAiIHk9IjcwIiBmb250LWZhbWlseT0iUGxheWZhaXIgRGlzcGxheSwgc2VyaWYiIGZvbnQtc2l6ZToiNjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMDk4NDdFIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5PPC90ZXh0Pgo8L3N2Zz4=";

  return (
    <div className="flex flex-col h-[600px] w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden relative">
      
      {/* Header - Updated to match the specific Teal/Gold brand aesthetic */}
      <div className="bg-teal-600 p-4 flex items-center shadow-md z-10">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-3 shadow-sm border-2 border-yellow-300 p-0.5">
           {/* Logo logic: Use prop if available, else default brand SVG */}
           <img 
             src={logoUrl || DEFAULT_LOGO} 
             alt="Oriana Logo" 
             className="w-full h-full object-contain rounded-full"
             onError={(e) => {
               if (!logoUrl) (e.target as HTMLImageElement).src = DEFAULT_LOGO;
             }}
           />
        </div>
        <div>
          <h1 className="text-white font-bold text-xl brand-font tracking-wide">Oriana Assistant</h1>
          <p className="text-teal-100 text-xs">GRT Jewels - Multilingual Support</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-teal-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
              }`}
            >
              {/* Render plain text with basic bullet formatting if needed */}
              <div className="whitespace-pre-line">
                {msg.text}
              </div>
              <span className={`text-[10px] block text-right mt-1 ${msg.role === 'user' ? 'text-teal-200' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 border border-gray-200 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 text-sm"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`ml-2 w-8 h-8 rounded-full flex items-center justify-center transition ${
              input.trim() && !isLoading ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="text-center mt-2">
            <span className="text-[10px] text-gray-400">Powered by Gemini AI</span>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
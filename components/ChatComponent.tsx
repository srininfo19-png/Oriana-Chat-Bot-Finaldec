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

    // Update UI immediately with user message
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    // Pass the ENTIRE history (excluding the one we just added to UI locally if you prefer, 
    // but usually we pass previous messages. Here we pass 'messages' which is the state BEFORE update?
    // No, we need to pass the history including the current context if we want robust threading.
    // Actually, geminiService expects 'history' as PREVIOUS turns.
    
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

  // Base64 SVG for a default "O" logo matching the brand colors (Teal/Gold)
  const DEFAULT_LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0id2hpdGUiIHN0cm9rZT0iI0ZDQjAyNSIgc3Ryb2tlLXdpZHRoPSI0Ii8+CiAgPHRleHQgeD0iNTAiIHk9IjcwIiBmb250LWZhbWlseT0iUGxheWZhaXIgRGlzcGxheSwgc2VyaWYiIGZvbnQtc2l6ZToiNjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMDk4NDdFIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5PPC90ZXh0Pgo8L3N2Zz4=";
  const activeLogo = logoUrl || DEFAULT_LOGO;

  return (
    <div className="flex flex-col h-[600px] w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden relative border border-gray-100">
      
      {/* Header */}
      <div className="bg-teal-700 p-4 flex items-center shadow-md z-10">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-3 shadow-sm border border-teal-200 p-0.5">
           <img 
             src={activeLogo} 
             alt="Oriana Logo" 
             className="w-full h-full object-contain rounded-full"
             onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_LOGO; }}
           />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg brand-font tracking-wide">Oriana Assistant</h1>
          <p className="text-teal-200 text-[10px] uppercase tracking-wider font-semibold">Virtual Support</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-5">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-end'}`}>
            
            {/* Bot Avatar (Only for model messages) */}
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex-shrink-0 mr-2 flex items-center justify-center overflow-hidden shadow-sm">
                 <img src={activeLogo} alt="Bot" className="w-full h-full object-cover" />
              </div>
            )}

            <div 
              className={`max-w-[80%] p-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-teal-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-line">
                {msg.text}
              </div>
              <span className={`text-[9px] block text-right mt-1.5 opacity-70`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start items-end">
             {/* Loading Avatar */}
             <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex-shrink-0 mr-2 flex items-center justify-center overflow-hidden shadow-sm">
                 <img src={activeLogo} alt="Bot" className="w-full h-full object-cover" />
              </div>
            <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center bg-gray-50 rounded-full px-2 py-2 border border-gray-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-50 transition-all shadow-inner">
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 text-sm ml-3"
            placeholder="Ask about Oriana..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
              input.trim() && !isLoading 
                ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700 hover:scale-105' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="text-center mt-2 flex justify-center items-center gap-1">
            <span className="text-[9px] text-gray-400 tracking-wide">POWERED BY GEMINI</span>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
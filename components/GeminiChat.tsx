
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, MessageSquare, GripHorizontal, Minimize2 } from 'lucide-react';
import { ChatMessage, FileMetadata } from '../types';
import { createChatSession } from '../services/geminiService';
import { Chat, GenerateContentResponse } from "@google/genai";

interface GeminiChatProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileMetadata[];
}

const GeminiChat: React.FC<GeminiChatProps> = ({ isOpen, onClose, files }) => {
  // State for UI
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'model',
      text: 'Olá! Sou o assistente inteligente do CloudVault. Posso ajudar a encontrar informações nos seus arquivos ou responder dúvidas gerais. Como posso ajudar?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  
  // Draggable State
  const [position, setPosition] = useState({ x: window.innerWidth - 450, y: window.innerHeight - 650 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  // Chat Session Ref
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat Session with Context
  useEffect(() => {
    if (isOpen && (!chatSessionRef.current || files.length > 0)) {
      // Re-initialize chat when opened or files change to ensure fresh context
      chatSessionRef.current = createChatSession(files);
    }
  }, [isOpen, files]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Drag Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    // Boundary checks could be added here
    setPosition({
      x: dragRef.current.initialX + dx,
      y: dragRef.current.initialY + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Send Message Logic
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isThinking) return;

    const userText = inputValue;
    setInputValue('');
    
    // Add User Message
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsThinking(true);

    try {
      if (!chatSessionRef.current) {
        chatSessionRef.current = createChatSession(files);
      }

      const response: GenerateContentResponse = await chatSessionRef.current.sendMessage({ 
        message: userText 
      });
      
      const aiText = response.text || "Desculpe, não consegui processar sua resposta.";

      const newAiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: aiText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newAiMsg]);
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Ocorreu um erro ao conectar com o serviço de IA. Tente novamente.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{ 
        left: position.x, 
        top: position.y,
        // Initial fallback if outside viewport
        maxWidth: '100vw',
        maxHeight: '100vh'
      }}
      className="fixed w-[420px] h-[600px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header - Draggable Area */}
      <div 
        onMouseDown={handleMouseDown}
        className={`
          flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white cursor-move select-none
          ${isDragging ? 'cursor-grabbing' : ''}
        `}
      >
        <div className="flex items-center gap-3 pointer-events-none">
          <Sparkles size={22} className="text-yellow-300" />
          <span className="font-semibold text-base">CloudVault Assistant</span>
        </div>
        <div className="flex items-center gap-3">
          <GripHorizontal size={20} className="opacity-50" />
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking close
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`
                max-w-[85%] rounded-2xl px-5 py-4 text-lg leading-relaxed shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'}
              `}
            >
              {msg.text}
            </div>
          </div>
        ))}
        
        {isThinking && (
          <div className="flex justify-start w-full animate-pulse">
            <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-bl-none flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Pergunte sobre seus arquivos..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
        />
        <button 
          type="submit"
          disabled={!inputValue.trim() || isThinking}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white p-3 rounded-xl transition-colors flex items-center justify-center shadow-sm"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default GeminiChat;

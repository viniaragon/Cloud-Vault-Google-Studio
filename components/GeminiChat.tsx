import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, GripHorizontal, Mic, Square, Loader2 } from 'lucide-react';
import { ChatMessage, FileMetadata } from '../types';
import { createChatSession, fileToBase64, analyzeFile } from '../services/geminiService';
import { Chat, GenerateContentResponse } from "@google/genai";

interface GeminiChatProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileMetadata[];
}

const GeminiChat: React.FC<GeminiChatProps> = ({ isOpen, onClose, files }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'model',
      text: 'Olá! Sou o assistente avançado CloudVault (Gemini 3 Pro). Posso analisar seus arquivos ou conversar sobre qualquer assunto. Como posso ajudar?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  
  // Gravação
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Dragging
  const [position, setPosition] = useState({ x: window.innerWidth - 450, y: window.innerHeight - 650 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  // Chat Session
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && (!chatSessionRef.current || files.length > 0)) {
      chatSessionRef.current = createChatSession(files);
    }
  }, [isOpen, files]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // --- LÓGICA DE ÁUDIO ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioAndReply(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro microfone:", err);
      alert("Erro ao acessar microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioAndReply = async (audioBlob: Blob) => {
    setIsThinking(true);
    try {
      // 1. Transcrever o áudio
      const base64Audio = await fileToBase64(audioBlob);
      const transcription = await analyzeFile(audioBlob, base64Audio);

      // 2. Adicionar a transcrição como mensagem do USUÁRIO
      const userMsgId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: userMsgId,
        role: 'user',
        text: `🎤 ${transcription}`,
        timestamp: new Date()
      }]);

      // 3. Enviar a transcrição para a IA responder
      if (!chatSessionRef.current) {
        chatSessionRef.current = createChatSession(files);
      }
      
      const response: GenerateContentResponse = await chatSessionRef.current.sendMessage({ 
        message: transcription 
      });
      
      // 4. Adicionar a resposta da IA
      const aiText = response.text || "Não entendi.";
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: aiText,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error("Erro no fluxo de áudio:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Tive um problema ao processar seu áudio.",
        timestamp: new Date()
      }]);
    } finally {
      setIsThinking(false);
    }
  };
  // ------------------------------

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initialX: position.x, initialY: position.y };
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({ x: dragRef.current.initialX + dx, y: dragRef.current.initialY + dy });
  };
  const handleMouseUp = () => setIsDragging(false);

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

  // Send Text Logic
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isThinking) return;

    const userText = inputValue;
    setInputValue('');
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText, timestamp: new Date() }]);
    setIsThinking(true);

    try {
      if (!chatSessionRef.current) chatSessionRef.current = createChatSession(files);
      const response: GenerateContentResponse = await chatSessionRef.current.sendMessage({ message: userText });
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: response.text || "...", timestamp: new Date() }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: "Erro de conexão.", timestamp: new Date() }]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{ left: position.x, top: position.y, maxWidth: '100vw', maxHeight: '100vh' }}
      className="fixed w-[420px] h-[600px] flex flex-col bg-white rounded-2xl shadow-2xl border border-purple-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <div 
        onMouseDown={handleMouseDown}
        className={`flex items-center justify-between px-5 py-4 bg-purple-600 text-white cursor-move select-none ${isDragging ? 'cursor-grabbing' : ''}`}
      >
        <div className="flex items-center gap-3 pointer-events-none">
          <Sparkles size={22} className="text-purple-200" />
          <span className="font-semibold text-base">CloudVault Assistant</span>
        </div>
        <div className="flex items-center gap-3">
          <GripHorizontal size={20} className="opacity-50" />
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer" onMouseDown={(e) => e.stopPropagation()}>
            <X size={22} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-purple-50/30 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-4 text-lg leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white text-slate-700 border border-purple-100 rounded-bl-none'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start w-full">
            <div className="bg-white border border-purple-100 px-5 py-4 rounded-2xl rounded-bl-none flex items-center gap-2">
              <Loader2 className="animate-spin text-purple-500" size={20} />
              <span className="text-slate-500 text-sm">Pensando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-purple-100 flex gap-2 items-center">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isThinking}
          className={`p-3 rounded-full transition-all duration-200 flex items-center justify-center shadow-sm ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse ring-4 ring-red-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
          title={isRecording ? "Parar" : "Gravar"}
        >
          {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
        </button>

        <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isRecording ? "Ouvindo..." : "Pergunte algo..."}
            disabled={isRecording}
            className="flex-1 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all disabled:opacity-50"
          />
          <button type="submit" disabled={!inputValue.trim() || isThinking || isRecording} className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white p-3 rounded-xl transition-colors flex items-center justify-center shadow-sm">
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default GeminiChat;
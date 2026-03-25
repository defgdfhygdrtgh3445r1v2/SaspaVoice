import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Send, Smile, Paperclip, MoreHorizontal, FileText, Download } from 'lucide-react';
import { socket } from '../lib/socket';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface Participant {
  id: string;
  name: string;
  isHost?: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  file?: {
    name: string;
    url: string;
    type: string;
    size: number;
  };
}

interface SidebarProps {
  activeTab: 'chat' | 'participants';
  onClose: () => void;
  participants: Participant[];
  roomId: string;
}

export function Sidebar({ activeTab, onClose, participants, roomId }: SidebarProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleChatMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    };

    socket.on('chat-message', handleChatMessage);

    return () => {
      socket.off('chat-message', handleChatMessage);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim()) return;

    const localParticipant = participants.find(p => p.id === socket.id) || participants[0];
    
    const newMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      senderId: localParticipant.id,
      senderName: localParticipant.name,
      text: message.trim(),
      timestamp: Date.now(),
    };

    socket.emit('chat-message', newMsg);
    setMessage('');
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      
      const localParticipant = participants.find(p => p.id === socket.id) || participants[0];
      
      const newMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        senderId: localParticipant.id,
        senderName: localParticipant.name,
        text: '',
        timestamp: Date.now(),
        file: {
          name: file.name,
          url: base64String,
          type: file.type,
          size: file.size,
        }
      };

      socket.emit('chat-message', newMsg);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#2d2d2d] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-lg font-medium">
          {activeTab === 'chat' ? 'Чат' : `Участники ${participants.length}`}
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} className="text-white/70" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto relative">
        {activeTab === 'participants' ? (
          <div className="p-4 flex flex-col gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <input 
                type="text" 
                placeholder="Имя" 
                className="w-full bg-[#3a3a3a] border border-transparent focus:border-white/20 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none"
              />
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-sm font-medium">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{p.name} {p.id === socket.id ? '(Вы)' : ''}</span>
                    {p.isHost && <span className="text-xs text-white/50">организатор</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 flex flex-col h-full">
            <div className="flex-1 flex flex-col gap-4">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center text-white/50 text-sm my-4">
                  Сообщения видны только участникам встречи
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === socket.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-xs text-white/50 mb-1">{msg.senderName}</span>
                      <div className={`px-4 py-2 rounded-2xl max-w-[85%] ${isMe ? 'bg-green-600 text-white rounded-br-sm' : 'bg-[#3a3a3a] text-white rounded-bl-sm'}`}>
                        {msg.text && <p>{msg.text}</p>}
                        {msg.file && (
                          <div className="mt-2 flex items-center gap-3 bg-black/20 p-3 rounded-xl">
                            {msg.file.type.startsWith('image/') ? (
                              <img src={msg.file.url} alt={msg.file.name} className="max-w-[200px] max-h-[200px] rounded-lg object-contain" />
                            ) : (
                              <>
                                <div className="p-2 bg-white/10 rounded-lg">
                                  <FileText size={24} className="text-white/70" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-sm font-medium truncate max-w-[150px]">{msg.file.name}</span>
                                  <span className="text-xs text-white/50">{formatFileSize(msg.file.size)}</span>
                                </div>
                                <a 
                                  href={msg.file.url} 
                                  download={msg.file.name}
                                  className="ml-2 p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                  <Download size={16} />
                                </a>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {activeTab === 'participants' ? (
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`);
            }}
            className="w-full bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Скопировать ссылку
            <MoreHorizontal size={16} />
          </button>
        </div>
      ) : (
        <div className="p-4 border-t border-white/10 bg-[#2d2d2d] relative">
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2 z-50">
              <EmojiPicker 
                onEmojiClick={handleEmojiClick}
                theme={Theme.DARK}
              />
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-[#3a3a3a] rounded-xl px-3 py-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50"
            >
              <Paperclip size={20} />
            </button>
            <input 
              type="text" 
              placeholder="Сообщение..." 
              className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-white/50 focus:outline-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button 
              type="button" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50"
            >
              <Smile size={20} />
            </button>
            <button type="submit" className={`p-2 rounded-full transition-colors ${message.trim() ? 'text-green-500 hover:bg-green-500/20' : 'text-white/30'}`}>
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}


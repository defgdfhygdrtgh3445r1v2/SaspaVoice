import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface InviteModalProps {
  roomId: string;
  onClose: () => void;
}

export function InviteModal({ roomId, onClose }: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}?room=${roomId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#2d2d2d] rounded-3xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center text-center border border-white/10 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={20} className="text-white/70" />
        </button>

        <h3 className="text-xl font-medium text-white mb-2">
          Чтобы пригласить других участников, отправьте им ссылку на встречу
        </h3>

        <button 
          onClick={handleCopy}
          className="w-full mt-6 bg-green-500 hover:bg-green-600 text-black font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <Check size={20} />
              Ссылка уже скопирована
            </>
          ) : (
            <>
              <Copy size={20} />
              Скопировать ссылку
            </>
          )}
        </button>

        <div className="mt-6 flex items-center gap-4 text-white/70">
          <span className="text-sm font-medium">Встреча № {roomId.split('-')[0]}</span>
          <button onClick={handleCopy} className="hover:text-white transition-colors">
            <Copy size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Video } from 'lucide-react';

interface LandingProps {
  onJoinRoom: (roomId: string) => void;
}

export function Landing({ onJoinRoom }: LandingProps) {
  const handleJoin = () => {
    onJoinRoom('global-room');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-cover bg-center relative"
         style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop")' }}>
      
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 flex flex-col items-center text-white w-full max-w-4xl px-4">
        <h1 className="text-4xl md:text-6xl font-semibold mb-12 text-center drop-shadow-md tracking-tight">
          Saspa Voice
        </h1>

        <div className="flex w-full justify-center">
          <button 
            onClick={handleJoin}
            className="w-full md:max-w-[320px] aspect-video md:aspect-square bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all duration-300 group"
          >
            <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center relative group-hover:scale-105 transition-transform">
              <Video size={32} className="text-white" />
              <div className="absolute bottom-4 right-4 w-3 h-3 bg-green-500 rounded-full border-2 border-transparent" />
            </div>
            <span className="text-xl font-medium">Просто подключиться</span>
          </button>
        </div>
      </div>
    </div>
  );
}

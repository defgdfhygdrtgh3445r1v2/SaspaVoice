import React from 'react';
import { Link, Mic, MicOff, Video, VideoOff, Hand, MonitorUp, Users, MessageSquare, MoreHorizontal, PhoneOff } from 'lucide-react';

interface ControlsProps {
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onOpenSettings: () => void;
  onLeave: () => void;
  participantsCount: number;
}

export function Controls({
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onOpenSettings,
  onLeave,
  participantsCount,
}: ControlsProps) {
  return (
    <div className="h-20 bg-[#1e1e1e] border-t border-white/5 flex items-center justify-between px-6 z-30">
      
      {/* Left Controls */}
      <div className="flex items-center gap-3">
        <button className="w-12 h-12 rounded-2xl bg-[#3a3a3a] hover:bg-[#4a4a4a] flex items-center justify-center transition-colors">
          <Link size={20} className="text-white" />
        </button>
        <button 
          onClick={onToggleAudio}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isAudioMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white'}`}
        >
          {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button 
          onClick={onToggleVideo}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors relative ${isVideoMuted ? 'bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white' : 'bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white'}`}
        >
          {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
          {isVideoMuted && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1e1e1e]" />}
        </button>
      </div>

      {/* Center Controls */}
      <div className="flex items-center gap-3">
        <button className="w-12 h-12 rounded-2xl bg-[#3a3a3a] hover:bg-[#4a4a4a] flex items-center justify-center transition-colors">
          <Hand size={20} className="text-white" />
        </button>
        <button 
          onClick={onToggleScreenShare}
          className={`px-4 h-12 rounded-2xl flex items-center gap-2 transition-colors ${isScreenSharing ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' : 'bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white'}`}
        >
          <MonitorUp size={20} />
          <span className="text-sm font-medium">Демонстрация</span>
        </button>
        <button 
          onClick={onToggleParticipants}
          className="px-4 h-12 rounded-2xl bg-[#3a3a3a] hover:bg-[#4a4a4a] flex items-center gap-2 transition-colors text-white"
        >
          <Users size={20} />
          <span className="text-sm font-medium">Участники</span>
          <span className="bg-[#4a4a4a] text-xs px-2 py-0.5 rounded-full">{participantsCount}</span>
        </button>
        <button 
          onClick={onToggleChat}
          className="px-4 h-12 rounded-2xl bg-[#3a3a3a] hover:bg-[#4a4a4a] flex items-center gap-2 transition-colors text-white"
        >
          <MessageSquare size={20} />
          <span className="text-sm font-medium">Чат</span>
        </button>
        <button 
          onClick={onOpenSettings}
          className="w-12 h-12 rounded-2xl bg-[#3a3a3a] hover:bg-[#4a4a4a] flex items-center justify-center transition-colors"
        >
          <MoreHorizontal size={20} className="text-white" />
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center">
        <button 
          onClick={onLeave}
          className="w-16 h-12 rounded-2xl bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
        >
          <PhoneOff size={24} className="text-white" />
        </button>
      </div>

    </div>
  );
}

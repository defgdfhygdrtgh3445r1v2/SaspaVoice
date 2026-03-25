import React, { useState, useEffect, useRef } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { Controls } from './Controls';
import { Sidebar } from './Sidebar';
import { SettingsModal } from './SettingsModal';
import { InviteModal } from './InviteModal';
import { useWebRTC } from '../lib/useWebRTC';
import { useSettings } from '../lib/SettingsContext';

interface RoomProps {
  roomId: string;
  onLeave: () => void;
}

export function Room({ roomId, onLeave }: RoomProps) {
  const { settings } = useSettings();
  const {
    localStream,
    remoteStreams,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    participants,
    speakingUsers
  } = useWebRTC(roomId);

  const [showSidebar, setShowSidebar] = useState<'chat' | 'participants' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(true); // Show by default when joining

  const handleToggleSidebar = (tab: 'chat' | 'participants') => {
    setShowSidebar(prev => prev === tab ? null : tab);
  };

  return (
    <div className={`flex flex-col h-screen w-full ${settings.background} text-white overflow-hidden font-sans transition-all duration-500`}>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Video Grid */}
        <div className={`flex-1 p-4 transition-all duration-300 ${showSidebar ? 'mr-80' : ''}`}>
          <div className="w-full h-full grid gap-4 auto-rows-fr" 
               style={{
                 gridTemplateColumns: remoteStreams.length === 0 ? '1fr' : 
                                      remoteStreams.length === 1 ? '1fr 1fr' : 
                                      'repeat(auto-fit, minmax(300px, 1fr))'
               }}>
            
            {/* Local Video */}
            <div className="relative rounded-2xl overflow-hidden bg-[#2d2d2d]/80 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-xl">
              <VideoPlayer 
                stream={localStream} 
                muted={true} 
                isLocal 
                isVideoMuted={isVideoMuted} 
                isSpeaking={speakingUsers.has('local')}
              />
              <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 backdrop-blur-sm">
                {settings.name}
                {isAudioMuted && <span className="w-2 h-2 rounded-full bg-red-500" />}
              </div>
            </div>

            {/* Remote Videos */}
            {remoteStreams.map((peer) => (
              <div key={peer.id} className="relative rounded-2xl overflow-hidden bg-[#2d2d2d]/80 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-xl">
                <VideoPlayer 
                  stream={peer.stream} 
                  isVideoMuted={peer.isVideoMuted} 
                  isSpeaking={speakingUsers.has(peer.id)}
                />
                <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 backdrop-blur-sm">
                  Гость
                  {peer.isAudioMuted && <span className="w-2 h-2 rounded-full bg-red-500" />}
                </div>
              </div>
            ))}

            {/* Invite Placeholder (if alone) */}
            {remoteStreams.length === 0 && !showInvite && (
              <div className="rounded-2xl bg-[#2d2d2d]/80 backdrop-blur-sm border border-white/10 flex flex-col items-center justify-center p-8 text-center shadow-xl">
                <h3 className="text-xl font-medium mb-4">Чтобы пригласить других участников, отправьте им ссылку на встречу</h3>
                <button 
                  onClick={() => setShowInvite(true)}
                  className="bg-green-500 hover:bg-green-600 text-black font-medium px-6 py-3 rounded-xl transition-colors"
                >
                  Скопировать ссылку
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#2d2d2d]/95 backdrop-blur-md border-l border-white/10 shadow-2xl z-20 flex flex-col">
            <Sidebar 
              activeTab={showSidebar} 
              onClose={() => setShowSidebar(null)} 
              participants={participants}
              roomId={roomId}
            />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <Controls 
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={() => handleToggleSidebar('chat')}
        onToggleParticipants={() => handleToggleSidebar('participants')}
        onOpenSettings={() => setShowSettings(true)}
        onLeave={onLeave}
        participantsCount={remoteStreams.length + 1}
      />

      {/* Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showInvite && <InviteModal roomId={roomId} onClose={() => setShowInvite(false)} />}
    </div>
  );
}

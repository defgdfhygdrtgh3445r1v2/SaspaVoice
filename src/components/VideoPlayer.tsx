import React, { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  isLocal?: boolean;
  isVideoMuted?: boolean;
  isSpeaking?: boolean;
}

export function VideoPlayer({ stream, muted = false, isLocal = false, isVideoMuted = false, isSpeaking = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

    const checkVideoStatus = () => {
      if (stream) {
        const videoTrack = stream.getVideoTracks()[0];
        setIsVideoEnabled(videoTrack ? videoTrack.enabled : false);
      } else {
        setIsVideoEnabled(false);
      }
    };

    checkVideoStatus();

    // Set up an interval to check track status since there's no reliable event for 'enabled' property changes
    const interval = setInterval(checkVideoStatus, 500);

    return () => clearInterval(interval);
  }, [stream]);

  const showAvatar = !stream || !isVideoEnabled || isVideoMuted;

  return (
    <div className={`w-full h-full relative rounded-2xl overflow-hidden transition-all duration-300 ${isSpeaking ? 'ring-4 ring-green-500 ring-inset' : ''}`}>
      {showAvatar ? (
        <div className="w-full h-full flex items-center justify-center bg-[#2d2d2d]">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className="hidden"
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      )}
    </div>
  );
}

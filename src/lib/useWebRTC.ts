import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from './socket';
import { useSettings } from './SettingsContext';

interface PeerConnection {
  id: string;
  pc: RTCPeerConnection;
  stream: MediaStream;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
}

interface Participant {
  id: string;
  name: string;
  isHost?: boolean;
}

export function useWebRTC(roomId: string) {
  const { settings } = useSettings();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<PeerConnection[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

  const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<{ [key: string]: AnalyserNode }>({});
  const iceServersRef = useRef<RTCConfiguration>({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  const wasMutedBeforePTTRef = useRef<boolean>(false);

  // Volume detection logic
  const detectSpeaking = useCallback((stream: MediaStream, userId: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analysersRef.current[userId] = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      if (!analysersRef.current[userId]) return;
      
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const threshold = 15; // Volume threshold for speaking

      if (average > threshold) {
        setSpeakingUsers(prev => {
          if (prev.has(userId)) return prev;
          const next = new Set(prev);
          next.add(userId);
          return next;
        });
      } else {
        setSpeakingUsers(prev => {
          if (!prev.has(userId)) return prev;
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }

      requestAnimationFrame(checkVolume);
    };

    checkVolume();
  }, []);

  // Apply noise suppression when it changes
  useEffect(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.applyConstraints({ 
          noiseSuppression: settings.noiseSuppression,
          echoCancellation: true,
          autoGainControl: true
        }).catch(console.error);
      }
    }
  }, [settings.noiseSuppression]);

  // Push to talk logic (Reverse Push-to-Talk: hold to mute)
  useEffect(() => {
    if (!settings.pushToTalkEnabled || !settings.pushToTalkKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === settings.pushToTalkKey && !e.repeat) {
        // Mute mic
        if (localStreamRef.current) {
          const audioTrack = localStreamRef.current.getAudioTracks()[0];
          if (audioTrack) {
            wasMutedBeforePTTRef.current = !audioTrack.enabled;
            if (audioTrack.enabled) {
              audioTrack.enabled = false;
              setIsAudioMuted(true);
              socket.emit('toggle-media', {
                userId: socket.id,
                mediaType: 'audio',
                isEnabled: false
              });
            }
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === settings.pushToTalkKey) {
        // Unmute mic only if it wasn't muted before pressing the key
        if (localStreamRef.current && !wasMutedBeforePTTRef.current) {
          const audioTrack = localStreamRef.current.getAudioTracks()[0];
          if (audioTrack && !audioTrack.enabled) {
            audioTrack.enabled = true;
            setIsAudioMuted(false);
            socket.emit('toggle-media', {
              userId: socket.id,
              mediaType: 'audio',
              isEnabled: true
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [settings.pushToTalkEnabled, settings.pushToTalkKey]);

  useEffect(() => {
    let myStream: MediaStream | null = null;

    const init = async () => {
      try {
        // Fetch TURN credentials from our backend
        try {
          const response = await fetch('/api/turn');
          if (response.ok) {
            const data = await response.json();
            if (data.iceServers) {
              iceServersRef.current = { iceServers: data.iceServers };
            }
          }
        } catch (e) {
          console.error('Failed to fetch TURN credentials', e);
        }

        myStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: {
            noiseSuppression: settings.noiseSuppression,
            echoCancellation: true,
            autoGainControl: true
          } 
        });
        setLocalStream(myStream);
        localStreamRef.current = myStream;
        detectSpeaking(myStream, 'local');

        socket.connect();

        socket.on('connect', () => {
          const userId = socket.id || Math.random().toString(36).substring(7);
          const userDetails = { name: settings.name, isHost: true };
          
          setParticipants([{ id: userId, ...userDetails }]);
          socket.emit('join-room', roomId, userId, userDetails);
        });

        socket.on('user-connected', async (newUserId, newUserDetails) => {
          console.log('User connected', newUserId);
          setParticipants(prev => {
            if (prev.find(p => p.id === newUserId)) return prev;
            return [...prev, { id: newUserId, ...newUserDetails }];
          });
          
          const pc = createPeerConnection(newUserId, myStream!);
          peersRef.current[newUserId] = pc;
          
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          socket.emit('offer', {
            target: newUserId,
            caller: socket.id,
            sdp: offer
          });
        });

        socket.on('offer', async (payload) => {
          const pc = createPeerConnection(payload.caller, myStream!);
          peersRef.current[payload.caller] = pc;
          
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          socket.emit('answer', {
            target: payload.caller,
            caller: socket.id,
            sdp: answer
          });
        });

        socket.on('answer', async (payload) => {
          const pc = peersRef.current[payload.caller];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
        });

        socket.on('ice-candidate', async (payload) => {
          const pc = peersRef.current[payload.caller];
          if (pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.error('Error adding ice candidate', e);
            }
          }
        });

        socket.on('toggle-media', (payload) => {
          setRemoteStreams(prev => prev.map(p => {
            if (p.id === payload.userId) {
              return {
                ...p,
                isAudioMuted: payload.mediaType === 'audio' ? !payload.isEnabled : p.isAudioMuted,
                isVideoMuted: payload.mediaType === 'video' ? !payload.isEnabled : p.isVideoMuted
              };
            }
            return p;
          }));
        });

        socket.on('user-disconnected', (disconnectedUserId) => {
          console.log('User disconnected', disconnectedUserId);
          if (peersRef.current[disconnectedUserId]) {
            peersRef.current[disconnectedUserId].close();
            delete peersRef.current[disconnectedUserId];
          }
          delete analysersRef.current[disconnectedUserId];
          setRemoteStreams(prev => prev.filter(p => p.id !== disconnectedUserId));
          setParticipants(prev => prev.filter(p => p.id !== disconnectedUserId));
          setSpeakingUsers(prev => {
            if (!prev.has(disconnectedUserId)) return prev;
            const next = new Set(prev);
            next.delete(disconnectedUserId);
            return next;
          });
        });

      } catch (err) {
        console.error('Error accessing media devices', err);
      }
    };

    init();

    return () => {
      socket.off('connect');
      socket.off('user-connected');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('toggle-media');
      socket.off('user-disconnected');
      socket.disconnect();
      
      if (myStream) {
        myStream.getTracks().forEach(track => track.stop());
      }
      Object.values(peersRef.current).forEach((pc: RTCPeerConnection) => pc.close());
      peersRef.current = {};
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      analysersRef.current = {};
    };
  }, [roomId]);

  const createPeerConnection = (targetId: string, stream: MediaStream) => {
    // Use the dynamically fetched iceServers
    const pc = new RTCPeerConnection(iceServersRef.current);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          target: targetId,
          caller: socket.id,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setRemoteStreams(prev => {
        const existing = prev.find(p => p.id === targetId);
        if (existing) return prev;
        return [...prev, { id: targetId, pc, stream }];
      });
      detectSpeaking(stream, targetId);
    };

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    return pc;
  };

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
        socket.emit('toggle-media', {
          userId: socket.id,
          mediaType: 'audio',
          isEnabled: audioTrack.enabled
        });
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
        socket.emit('toggle-media', {
          userId: socket.id,
          mediaType: 'video',
          isEnabled: videoTrack.enabled
        });
      }
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        Object.values(peersRef.current).forEach((pc: RTCPeerConnection) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        if (localStreamRef.current) {
          const newStream = new MediaStream([
            screenTrack,
            ...localStreamRef.current.getAudioTracks()
          ]);
          setLocalStream(newStream);
        }

        setIsScreenSharing(true);

        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.error('Error sharing screen', err);
      }
    } else {
      stopScreenShare();
    }
  }, [isScreenSharing]);

  const stopScreenShare = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const cameraTrack = cameraStream.getVideoTracks()[0];
      
      Object.values(peersRef.current).forEach((pc: RTCPeerConnection) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(cameraTrack);
        }
      });

      if (localStreamRef.current) {
        const newStream = new MediaStream([
          cameraTrack,
          ...localStreamRef.current.getAudioTracks()
        ]);
        setLocalStream(newStream);
        localStreamRef.current = newStream;
      }

      setIsScreenSharing(false);
    } catch (err) {
      console.error('Error stopping screen share', err);
    }
  };

  return {
    localStream,
    remoteStreams,
    participants,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    speakingUsers
  };
}

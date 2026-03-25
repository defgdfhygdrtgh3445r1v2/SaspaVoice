import React, { useState, useEffect, useRef } from 'react';
import { X, Monitor, User, Shield, Volume2, Video, Trash2 } from 'lucide-react';
import { useSettings } from '../lib/SettingsContext';

interface SettingsModalProps {
  onClose: () => void;
}

function VideoSettings() {
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setVideoInputs(videoDevices);
        if (videoDevices.length > 0 && !selectedDevice) {
          setSelectedDevice(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Error enumerating devices", err);
      }
    };
    getDevices();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const startPreview = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedDevice ? { deviceId: { exact: selectedDevice } } : true,
          audio: false
        });
        
        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        } else {
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error("Error starting video preview", err);
      }
    };

    startPreview();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedDevice]);

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-lg font-medium text-white">Видео</h3>
      
      <div className="flex flex-col gap-4 bg-[#3a3a3a] p-6 rounded-2xl">
        <div className="aspect-video bg-black rounded-xl border border-white/10 mb-4 overflow-hidden flex items-center justify-center relative">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {!selectedDevice && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="text-white/30">Камера не выбрана</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">Камера</span>
          <select 
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="bg-[#4a4a4a] border border-white/10 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-white/30 w-64"
          >
            {videoInputs.length > 0 ? videoInputs.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Камера ${d.deviceId.substring(0, 5)}`}</option>
            )) : <option value="">По умолчанию - Камера</option>}
          </select>
        </div>
      </div>
    </div>
  );
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('appearance');
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editName, setEditName] = useState(settings.name);
  const [editNickname, setEditNickname] = useState(settings.nickname);

  const [isRecordingKey, setIsRecordingKey] = useState(false);

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(devices.filter(d => d.kind === 'audioinput'));
        setAudioOutputs(devices.filter(d => d.kind === 'audiooutput'));
        setVideoInputs(devices.filter(d => d.kind === 'videoinput'));
      } catch (err) {
        console.error("Error accessing media devices.", err);
      }
    };
    getDevices();
  }, []);

  useEffect(() => {
    if (isRecordingKey) {
      const handleKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        updateSettings({ pushToTalkKey: e.code });
        setIsRecordingKey(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isRecordingKey, updateSettings]);

  const tabs = [
    { id: 'appearance', label: 'Внешний вид', icon: <Monitor size={18} /> },
    { id: 'account', label: 'Аккаунт', icon: <User size={18} /> },
    { id: 'sound', label: 'Звук', icon: <Volume2 size={18} /> },
    { id: 'video', label: 'Видео', icon: <Video size={18} /> },
  ];

  const backgrounds = [
    { id: 'bg-[#1e1e1e]', type: 'color', class: 'bg-[#1e1e1e]' },
    { id: 'bg-gradient-to-br from-orange-200 to-pink-200', type: 'gradient', class: 'bg-gradient-to-br from-orange-200 to-pink-200' },
    { id: 'bg-gradient-to-br from-gray-800 to-gray-900', type: 'gradient', class: 'bg-gradient-to-br from-gray-800 to-gray-900' },
    { id: 'bg-[url("https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=400&auto=format&fit=crop")]', type: 'image', class: 'bg-[url("https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=400&auto=format&fit=crop")] bg-cover bg-center' },
    { id: 'bg-[url("https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=400&auto=format&fit=crop")]', type: 'image', class: 'bg-[url("https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=400&auto=format&fit=crop")] bg-cover bg-center' },
    { id: 'bg-[url("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=400&auto=format&fit=crop")]', type: 'image', class: 'bg-[url("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=400&auto=format&fit=crop")] bg-cover bg-center' },
    { id: 'bg-gradient-to-tr from-purple-500 to-indigo-500', type: 'gradient', class: 'bg-gradient-to-tr from-purple-500 to-indigo-500' },
    { id: 'bg-gradient-to-bl from-teal-400 to-blue-500', type: 'gradient', class: 'bg-gradient-to-bl from-teal-400 to-blue-500' },
  ];

  const handleSaveAccount = () => {
    updateSettings({ name: editName, nickname: editNickname });
    setIsEditingAccount(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] rounded-3xl shadow-2xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden border border-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-medium text-white">Настройки</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} className="text-white/70" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar */}
          <div className="w-64 border-r border-white/10 p-4 flex flex-col gap-2 overflow-y-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${
                  activeTab === tab.id 
                    ? 'bg-white/10 text-white border border-green-500/50' 
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-8 overflow-y-auto bg-[#252525]">
            {activeTab === 'appearance' && (
              <div className="flex flex-col gap-6">
                <h3 className="text-lg font-medium text-white">Тема оформления в Saspa</h3>
                <p className="text-sm text-white/50">Такой фон будет в Saspa Voice</p>
                
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {backgrounds.map((bg) => (
                    <div 
                      key={bg.id}
                      onClick={() => updateSettings({ background: bg.id })}
                      className={`aspect-video rounded-xl ${bg.class} border-2 cursor-pointer flex items-center justify-center transition-all ${
                        settings.background === bg.id ? 'border-green-500' : 'border-transparent hover:border-white/30'
                      }`}
                    >
                      {bg.id === 'bg-[#1e1e1e]' && (
                        <div className="w-8 h-8 rounded-full border-2 border-white/50 flex items-center justify-center">
                          <div className="w-6 h-px bg-white/50 rotate-45" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="flex flex-col gap-6">
                <h3 className="text-lg font-medium text-white">Аккаунт</h3>
                <div className="flex flex-col bg-[#3a3a3a] p-6 rounded-2xl gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg uppercase">
                        {settings.name.charAt(0)}
                      </div>
                      {!isEditingAccount ? (
                        <div>
                          <div className="text-lg font-medium text-white">{settings.name}</div>
                          <div className="text-sm text-white/50">{settings.nickname}</div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-[#252525] border border-white/10 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-green-500"
                            placeholder="Имя"
                          />
                          <input 
                            type="text" 
                            value={editNickname}
                            onChange={(e) => setEditNickname(e.target.value)}
                            className="bg-[#252525] border border-white/10 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-green-500"
                            placeholder="Никнейм"
                          />
                        </div>
                      )}
                    </div>
                    {!isEditingAccount ? (
                      <button 
                        onClick={() => setIsEditingAccount(true)}
                        className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/20"
                      >
                        Редактировать
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsEditingAccount(false)}
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                        >
                          Отмена
                        </button>
                        <button 
                          onClick={handleSaveAccount}
                          className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium transition-colors"
                        >
                          Сохранить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="flex flex-col gap-6">
                <h3 className="text-lg font-medium text-white">Права участников на этой встрече</h3>
                <p className="text-sm text-white/50">У соорганизаторов всегда есть все возможности</p>
                
                <div className="flex items-center justify-between bg-[#3a3a3a] p-4 rounded-2xl">
                  <span className="text-white font-medium">Записывать встречу на компьютер</span>
                  <div 
                    onClick={() => updateSettings({ recordMeeting: !settings.recordMeeting })}
                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${settings.recordMeeting ? 'bg-green-500' : 'bg-white/20'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.recordMeeting ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sound' && (
              <div className="flex flex-col gap-6">
                <h3 className="text-lg font-medium text-white">Звук</h3>
                
                <div className="flex flex-col gap-4 bg-[#3a3a3a] p-6 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Динамик</span>
                    <select className="bg-[#4a4a4a] border border-white/10 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-white/30 w-64">
                      {audioOutputs.length > 0 ? audioOutputs.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Динамик ${d.deviceId.substring(0, 5)}`}</option>
                      )) : <option>По умолчанию - Динамики</option>}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Микрофон</span>
                    <select className="bg-[#4a4a4a] border border-white/10 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-white/30 w-64">
                      {audioInputs.length > 0 ? audioInputs.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Микрофон ${d.deviceId.substring(0, 5)}`}</option>
                      )) : <option>По умолчанию - Микрофон</option>}
                    </select>
                  </div>
                  
                  <div className="h-px bg-white/10 my-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Шумоподавление</span>
                    <div 
                      onClick={() => updateSettings({ noiseSuppression: !settings.noiseSuppression })}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${settings.noiseSuppression ? 'bg-green-500' : 'bg-white/20'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.noiseSuppression ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>

                  <div className="h-px bg-white/10 my-2" />

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Обратная рация</span>
                      <div 
                        onClick={() => updateSettings({ pushToTalkEnabled: !settings.pushToTalkEnabled })}
                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${settings.pushToTalkEnabled ? 'bg-indigo-500' : 'bg-white/20'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.pushToTalkEnabled ? 'right-1' : 'left-1'}`} />
                      </div>
                    </div>
                    <p className="text-sm text-white/50">Удерживайте, чтобы временно отключить ваш микрофон в режиме активации по голосу.</p>
                    
                    {settings.pushToTalkEnabled && (
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1">
                          <div className="text-xs text-white/70 mb-1">Действие</div>
                          <div className="bg-[#252525] border border-white/10 rounded-lg px-4 py-2 text-white text-sm">
                            Обратная рация
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-white/70 mb-1">Горячие клавиши</div>
                          <div className="flex items-center gap-2 bg-[#252525] border border-white/10 rounded-lg px-4 py-2">
                            <span className="text-white text-sm flex-1 font-mono">
                              {isRecordingKey ? 'Нажмите клавишу...' : (settings.pushToTalkKey || 'Не задано')}
                            </span>
                            <button 
                              onClick={() => setIsRecordingKey(true)}
                              className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors"
                            >
                              Изменить гор...
                            </button>
                            <button 
                              onClick={() => updateSettings({ pushToTalkKey: null })}
                              className="text-white/50 hover:text-red-400 transition-colors ml-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'video' && (
              <VideoSettings />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

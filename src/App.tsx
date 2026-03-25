/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Landing } from './components/Landing';
import { Room } from './components/Room';
import { SettingsProvider } from './lib/SettingsContext';

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    // Check URL for room ID
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomId(room);
    }
  }, []);

  const handleJoinRoom = (id: string) => {
    setRoomId(id);
    // Update URL without reloading
    window.history.pushState({}, '', `?room=${id}`);
  };

  const handleLeaveRoom = () => {
    setRoomId(null);
    window.history.pushState({}, '', '/');
  };

  return (
    <SettingsProvider>
      {roomId ? (
        <Room roomId={roomId} onLeave={handleLeaveRoom} />
      ) : (
        <Landing onJoinRoom={handleJoinRoom} />
      )}
    </SettingsProvider>
  );
}


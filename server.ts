import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const PORT = 3000;

let cachedCreds: any = null;
let credsTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getVkTurnCreds(link: string) {
  if (cachedCreds && (Date.now() - credsTimestamp < CACHE_DURATION)) {
    return cachedCreds;
  }

  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0",
      "Content-Type": "application/x-www-form-urlencoded"
    };

    // 1
    let data = "client_secret=QbYic1K3lEV5kTGiqlq2&client_id=6287487&scopes=audio_anonymous%2Cvideo_anonymous%2Cphotos_anonymous%2Cprofile_anonymous&isApiOauthAnonymEnabled=false&version=1&app_id=6287487";
    let url = "https://login.vk.ru/?act=get_anonym_token";
    let resp = await axios.post(url, data, { headers });
    const token1 = resp.data.data.access_token;

    // 2
    data = `access_token=${token1}`;
    url = "https://api.vk.ru/method/calls.getAnonymousAccessTokenPayload?v=5.264&client_id=6287487";
    resp = await axios.post(url, data, { headers });
    const token2 = resp.data.response.payload;

    // 3
    data = `client_id=6287487&token_type=messages&payload=${token2}&client_secret=QbYic1K3lEV5kTGiqlq2&version=1&app_id=6287487`;
    url = "https://login.vk.ru/?act=get_anonym_token";
    resp = await axios.post(url, data, { headers });
    const token3 = resp.data.data.access_token;

    // 4
    data = `vk_join_link=https://vk.com/call/join/${link}&name=123&access_token=${token3}`;
    url = "https://api.vk.ru/method/calls.getAnonymousToken?v=5.264";
    resp = await axios.post(url, data, { headers });
    const token4 = resp.data.response.token;

    // 5
    data = `session_data=%7B%22version%22%3A2%2C%22device_id%22%3A%22${uuidv4()}%22%2C%22client_version%22%3A1.1%2C%22client_type%22%3A%22SDK_JS%22%7D&method=auth.anonymLogin&format=JSON&application_key=CGMMEJLGDIHBABABA`;
    url = "https://calls.okcdn.ru/fb.do";
    resp = await axios.post(url, data, { headers });
    const token5 = resp.data.session_key;

    // 6
    data = `joinLink=${link}&isVideo=false&protocolVersion=5&anonymToken=${token4}&method=vchat.joinConversationByLink&format=JSON&application_key=CGMMEJLGDIHBABABA&session_key=${token5}`;
    url = "https://calls.okcdn.ru/fb.do";
    resp = await axios.post(url, data, { headers });
    
    const turnServer = resp.data.turn_server;
    const creds = {
      urls: turnServer.urls,
      username: turnServer.username,
      credential: turnServer.credential,
    };
    cachedCreds = creds;
    credsTimestamp = Date.now();
    return creds;
  } catch (error: any) {
    console.error("Failed to get VK TURN credentials:", error.response?.data || error.message);
    return null;
  }
}

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/turn', async (req, res) => {
  // Use environment variable or fallback to the provided VK call link
  const vkLink = process.env.VK_CALL_LINK || 'https://vk.com/call/join/h-6uNYFkAX6cD3-8MmaD9aCPZfDcAqBBJuXoUVK2X3U';
  
  if (vkLink) {
    // Extract the call ID from the link
    const parts = vkLink.split("join/");
    const linkId = parts[parts.length - 1].split(/[?#]/)[0];
    
    const creds = await getVkTurnCreds(linkId);
    if (creds) {
      return res.json({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          {
            urls: creds.urls,
            username: creds.username,
            credential: creds.credential
          }
        ]
      });
    }
  }
  
  // Fallback to free STUN and metered TURN if VK fails or is not provided
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: '8b6ba56cce7fcd73c454f481',
        credential: '93s5v1AXEQA16MD/'
      },
      {
        urls: 'turn:global.relay.metered.ca:80?transport=tcp',
        username: '8b6ba56cce7fcd73c454f481',
        credential: '93s5v1AXEQA16MD/'
      },
      {
        urls: 'turn:global.relay.metered.ca:443',
        username: '8b6ba56cce7fcd73c454f481',
        credential: '93s5v1AXEQA16MD/'
      },
      {
        urls: 'turns:global.relay.metered.ca:443?transport=tcp',
        username: '8b6ba56cce7fcd73c454f481',
        credential: '93s5v1AXEQA16MD/'
      }
    ]
  });
});

// Socket.io logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userId, userDetails) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId, userDetails);

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
    });

    socket.on('offer', (payload) => {
      io.to(payload.target).emit('offer', payload);
    });

    socket.on('answer', (payload) => {
      io.to(payload.target).emit('answer', payload);
    });

    socket.on('ice-candidate', (payload) => {
      io.to(payload.target).emit('ice-candidate', payload);
    });

    socket.on('toggle-media', (payload) => {
      socket.to(roomId).emit('toggle-media', payload);
    });

    socket.on('chat-message', (payload) => {
      io.to(roomId).emit('chat-message', payload);
    });
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await import('vite');
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    // In production, __dirname is dist/
    const distPath = path.join(__dirname, '..', 'dist'); // Depending on where it's run, actually if it's in dist/ it's just __dirname
    // Let's just use process.cwd() for simplicity
    const staticPath = path.join(process.cwd(), 'dist');
    app.use(express.static(staticPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

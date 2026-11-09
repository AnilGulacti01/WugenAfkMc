import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Background from './components/Background';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

// Point this at the backend (VITE_SERVER_URL in client/.env for deploys)
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// One socket for the whole app: this is a single-page dashboard and every
// component talks to the same backend.
const socket = io(SERVER_URL);

function App() {
  const [connected, setConnected] = useState(false);
  const [botInfo, setBotInfo] = useState(null);
  const [status, setStatus] = useState({ type: 'info', message: 'Ready to connect' });
  const [chatLogs, setChatLogs] = useState([]);
  const [stats, setStats] = useState({ health: 20, food: 20 });

  useEffect(() => {
    const onConnect = () => {
      console.log('Connected to backend');
    };

    const onStatus = (msg) => {
      setStatus(msg);
      // Add status to chat as system message
      setChatLogs(prev => [...prev, {
        username: 'SYSTEM',
        message: msg.message,
        timestamp: Date.now(),
        type: msg.type
      }]);
    };

    const onChat = (msg) => {
      setChatLogs(prev => {
        // Keep last 100 messages
        const newLogs = [...prev, msg];
        if (newLogs.length > 100) return newLogs.slice(newLogs.length - 100);
        return newLogs;
      });
    };

    const onBotInfo = (info) => {
      setBotInfo(info);
      setConnected(true);
    };

    const onBotStats = (newStats) => {
      setStats(newStats);
    };

    const onBotDisconnected = () => {
      setConnected(false);
      setBotInfo(null);
    };

    socket.on('connect', onConnect);
    socket.on('status', onStatus);
    socket.on('chat', onChat);
    socket.on('bot_info', onBotInfo);
    socket.on('bot_stats', onBotStats);
    socket.on('bot_disconnected', onBotDisconnected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('status', onStatus);
      socket.off('chat', onChat);
      socket.off('bot_info', onBotInfo);
      socket.off('bot_stats', onBotStats);
      socket.off('bot_disconnected', onBotDisconnected);
    };
  }, []);

  const handleLogin = (credentials) => {
    setChatLogs([]); // Clear previous chat
    socket.emit('login', credentials);
    setStatus({ type: 'info', message: 'Connecting to Minecraft Server...' });
  };

  const handleDisconnect = () => {
    if (socket) socket.disconnect(); // Actually we might just want to 'end' the bot
    window.location.reload(); // Simple reset for now
  };

  return (
    <div className="app-wrapper">
      <div className="spline-container">
        <Background />
      </div>

      <div className="ui-overlay">
        {!connected ? (
          <Login onLogin={handleLogin} status={status} />
        ) : (
          <Dashboard
            socket={socket}
            botInfo={botInfo}
            chatLogs={chatLogs}
            status={status}
            stats={stats}
            onDisconnect={handleDisconnect}
          />
        )}
      </div>
    </div>
  );
}

export default App;

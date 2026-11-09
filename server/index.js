const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // Comma separated list, e.g. CLIENT_ORIGIN=http://localhost:5173,https://myapp.vercel.app
        origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map(o => o.trim()) : '*',
        methods: ["GET", "POST"]
    }
});

const bots = new Map(); // socket.id -> bot instance
const afkIntervals = new Map(); // socket.id -> intervalId

// Only these may be forwarded to mineflayer, and only as booleans.
const CONTROL_STATES = new Set(['forward', 'back', 'left', 'right', 'jump', 'sneak', 'sprint']);

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('login', (data) => {
        if (bots.has(socket.id)) {
            bots.get(socket.id).end();
            bots.delete(socket.id);
        }

        const { host, port, username, authType, version } = data;
        const mcVersion = version || '1.21.1'; // Force a recent stable version or use user input

        console.log(`Connecting to ${host}:${port} as ${username} (${authType}) Version: ${mcVersion}`);

        try {
            const bot = mineflayer.createBot({
                host: host,
                port: port || 25565,
                username: username,
                auth: authType || 'offline', // 'microsoft' or 'offline'
                version: mcVersion,
                hideErrors: false
            });

            console.log('Bot instance created, waiting for handshake...');
            bots.set(socket.id, bot);

            // Event Forwarding
            bot.on('spawn', () => {
                socket.emit('status', { type: 'success', message: 'Spawned/Joined successfully' });
                socket.emit('bot_info', {
                    username: bot.username,
                    version: bot.version,
                    game: bot.game,
                    players: Object.keys(bot.players).length
                });
            });

            bot.on('chat', (username, message) => {
                socket.emit('chat', { username, message, timestamp: Date.now() });
            });

            bot.on('kicked', (reason) => {
                const kickMsg = typeof reason === 'object' ? JSON.stringify(reason) : reason;
                console.log(`Bot was kicked: ${kickMsg}`);
                socket.emit('status', { type: 'error', message: `Kicked: ${kickMsg}` });
                socket.emit('bot_disconnected');
            });

            bot.on('error', (err) => {
                console.error('Bot Error:', err);
                socket.emit('status', { type: 'error', message: `Error: ${err.message}` });
            });

            bot.on('end', (reason) => {
                console.log('Bot connection ended:', reason || 'No reason');
                socket.emit('status', { type: 'info', message: 'Bot disconnected' });
                socket.emit('bot_disconnected');
                clearInterval(afkIntervals.get(socket.id));
                afkIntervals.delete(socket.id);
                bots.delete(socket.id);
            });

            // Health/Food updates
            bot.on('health', () => {
                socket.emit('bot_stats', { health: bot.health, food: bot.food });
            });

        } catch (err) {
            socket.emit('status', { type: 'error', message: `Connection failed: ${err.message}` });
        }
    });

    socket.on('send_chat', (message) => {
        const bot = bots.get(socket.id);
        if (bot) {
            bot.chat(message);
        }
    });

    socket.on('toggle_afk', (isActive) => {
        const bot = bots.get(socket.id);
        if (!bot) return;

        if (isActive) {
            // Simple AFK: Look around and jump occasionally
            if (afkIntervals.has(socket.id)) clearInterval(afkIntervals.get(socket.id));

            const interval = setInterval(() => {
                if (!bot) return;
                bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * Math.PI); // Look random
                if (Math.random() > 0.8) bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);
            }, 3000);

            afkIntervals.set(socket.id, interval);
            socket.emit('status', { type: 'info', message: 'AFK Mode Enabled' });
        } else {
            clearInterval(afkIntervals.get(socket.id));
            afkIntervals.delete(socket.id);
            socket.emit('status', { type: 'info', message: 'AFK Mode Disabled' });
        }
    });

    socket.on('move', (controlState) => {
        // controlState: { forward: true, jump: false, ... }
        const bot = bots.get(socket.id);
        if (!bot || !bot.entity) return; // not spawned yet
        if (!controlState || typeof controlState !== 'object') return;

        try {
            for (const [key, value] of Object.entries(controlState)) {
                if (!CONTROL_STATES.has(key)) continue;
                bot.setControlState(key, Boolean(value));
            }
        } catch (err) {
            console.error('Failed to apply control state:', err.message);
        }
    });

    socket.on('disconnect', () => {
        const bot = bots.get(socket.id);
        if (bot) {
            bot.end();
            bots.delete(socket.id);
        }
        if (afkIntervals.has(socket.id)) {
            clearInterval(afkIntervals.get(socket.id));
            afkIntervals.delete(socket.id);
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`WugenAFK backend running on port ${PORT}`);
});

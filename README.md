# WugenAFK

A web dashboard for **headless Minecraft bots**. Instead of running a bot script in a terminal, you open a browser tab, type in a server address, and get a live panel: chat, health, hunger, AFK mode, and WASD movement.

Built with [mineflayer](https://github.com/PrismarineJS/mineflayer) on the backend and React + Vite on the frontend.

<!-- TODO: drop a screenshot or a short GIF here before publishing, e.g.
![WugenAFK dashboard](docs/screenshot.png)
-->

## Features

- Connect to any Minecraft server from the browser (host, port, username, version)
- Live chat — read everything the bot hears, send messages as the bot
- Health and hunger meters pushed in real time
- **Keyboard movement**: WASD / arrow keys, `Space` jump, `Shift` sneak, `Ctrl` sprint
- AFK mode — the bot idles by looking around and jumping occasionally
- Per-tab bot instances: closing the tab disconnects that bot and cleans up

## How it works

```
Browser (React + Vite)                Backend (Node + Express)
┌───────────────────────┐   Socket.IO  ┌─────────────────────────┐
│ Login form            │ ───────────► │ login  -> createBot()   │
│ Dashboard             │              │                         │
│  - chat               │ ◄─────────── │ chat / health / status  │
│  - health, food       │              │                         │
│  - movement pad       │ ───────────► │ move   -> setControlState()
└───────────────────────┘              │ chat   -> bot.chat()    │
                                       │ AFK    -> look + jump   │
                                       └───────────┬─────────────┘
                                                   │ Minecraft protocol
                                                   ▼
                                            target server
```

The bot is **headless** — it talks the Minecraft protocol but renders no world. The animated background is decoration only.

## Getting started

Requirements: Node.js 18+ and a Minecraft server you are allowed to connect to.

```bash
# terminal 1 — backend
cd server
npm install
npm start          # http://localhost:3001

# terminal 2 — frontend
cd client
npm install
npm run dev        # http://localhost:5173
```

Then open http://localhost:5173, enter the server address and username, and connect.

### Environment variables

Both are optional and have working defaults for local development.

| Where | Variable | Default | Purpose |
| --- | --- | --- | --- |
| `server` | `PORT` | `3001` | Backend port |
| `server` | `CLIENT_ORIGIN` | `*` | Allowed CORS origins, comma separated |
| `client` | `VITE_SERVER_URL` | `http://localhost:3001` | Backend URL the browser connects to |

Copy the `.env.example` files and adjust:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

The server reads plain `process.env`, so load the file however you prefer — for example `node --env-file=.env index.js`, or export the variables in your shell.

## Controls

| Key | Action |
| --- | --- |
| `W` / `↑` | Move forward |
| `S` / `↓` | Move backward |
| `A` / `←` | Strafe left |
| `D` / `→` | Strafe right |
| `Space` | Jump |
| `Shift` | Sneak |
| `Ctrl` | Sprint |

Keys typed into the chat box are ignored, so you can write messages normally. Losing window focus releases every key so the bot never keeps walking.

## Project layout

```
mc-web-client/
├── client/                  # React + Vite dashboard
│   └── src/
│       ├── App.jsx          # socket setup, login/dashboard switch
│       └── components/
│           ├── Login.jsx      # connection form
│           ├── Dashboard.jsx  # chat, stats, movement, AFK
│           └── Background.jsx # Vanta.js animated background
└── server/
    └── index.js             # Socket.IO -> mineflayer bridge
```

## Limitations

- **Offline (cracked) servers work out of the box.** Microsoft authentication requires a device-code flow in the terminal (see the mineflayer docs); the web form does not do that yet.
- The dashboard shows state, not the world — no 3D view of the game.
- No authentication on the panel. Whoever can reach the backend can make it connect a bot anywhere, so do not expose it publicly without a password and rate limiting in front of it.

## Roadmap

- [ ] Stream the bot's view to the browser with [prismarine-viewer](https://github.com/PrismarineJS/prismarine-viewer)
- [ ] Microsoft device-code login from the UI
- [ ] Inventory and nearby-entities panels
- [ ] Panel authentication + per-IP connection limits

## License

MIT — see [LICENSE](LICENSE).

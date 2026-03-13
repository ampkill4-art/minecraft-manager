# 🎮 Minecraft NATS Manager

A real-time Minecraft server management system connecting your game server to a beautiful web dashboard via NATS messaging.

```
Minecraft Server ──NATS──► Bridge (Railway) ──WebSocket──► Web Dashboard (Netlify)
     [Fabric Mod]                [Express/Node.js]               [Next.js 14]
```

---

## 📦 Repository Structure

```
minecraft-nats-manager/
├── minecraft-mod/       # Fabric mod for Minecraft 1.20.4
├── web-dashboard/       # Next.js 14 dashboard (deployed to Netlify)
├── nats-bridge/         # Express WebSocket bridge (deployed to Railway)
└── docker-compose.yml   # Local development
```

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Node.js 20+
- JDK 17+ (for the Minecraft mod)
- A Minecraft 1.20.4 server with Fabric Loader installed

### 1. Start the NATS Bridge

```bash
cd nats-bridge
npm install
npm run dev
# ✅ Bridge runs on http://localhost:3001
```

### 2. Start the Web Dashboard

```bash
cd web-dashboard
npm install
npm run dev
# ✅ Dashboard runs on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) and log in:
- **Username:** `admin`
- **Password:** `admin123`

### 3. Build and Install the Fabric Mod

```bash
cd minecraft-mod

# Windows
gradlew.bat remapJar

# Linux/Mac
./gradlew remapJar
```

Copy `minecraft-mod/build/libs/minecraft-nats-manager-*-all.jar` to your Minecraft server's `mods/` folder.

Edit `config/nats-manager.json` on the server to set your server ID:
```json
{
  "natsUrl": "nats://shinkansen.proxy.rlwy.net:54149",
  "serverId": "my-server-name",
  "statusIntervalSeconds": 5,
  "heartbeatIntervalSeconds": 10
}
```

Restart your Minecraft server. It will appear in the dashboard automatically.

---

## ☁️ Production Deployment

### Deploy Bridge → Railway

1. Create a new project on [Railway.app](https://railway.app)
2. Connect your GitHub repository or push this folder
3. Set build command to the `nats-bridge/` directory
4. Set these environment variables in Railway:
   ```
   NATS_URL=nats://shinkansen.proxy.rlwy.net:54149
   JWT_SECRET=<generate a long random string>
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<your secure password>
   FRONTEND_URL=https://your-site.netlify.app
   PORT=3001
   ```
5. Note your Railway public URL (e.g. `https://xxx.up.railway.app`)

### Deploy Dashboard → Netlify

1. Go to [Netlify.com](https://netlify.com) and create a new site
2. Connect your GitHub repo, set base directory to `web-dashboard/`
3. Set these environment variables in Netlify:
   ```
   NEXT_PUBLIC_API_URL=https://xxx.up.railway.app
   NEXT_PUBLIC_WS_URL=wss://xxx.up.railway.app
   ```
4. Set build command: `npm run build`
5. Set publish directory: `out`
6. Deploy!

Also update `web-dashboard/netlify.toml` with your Railway URL.

---

## 🔑 Default Credentials

| Setting | Default | Change In |
|---------|---------|-----------|
| Username | `admin` | `.env` → `ADMIN_USERNAME` |
| Password | `admin123` | `.env` → `ADMIN_PASSWORD` |
| JWT Secret | (random) | `.env` → `JWT_SECRET` |

> ⚠️ **Always change the password and JWT secret in production!**

---

## 🔧 Configuration

### NATS Bridge (`nats-bridge/.env`)
```env
NATS_URL=nats://shinkansen.proxy.rlwy.net:54149
PORT=3001
JWT_SECRET=change-me
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
FRONTEND_URL=http://localhost:3000
```

### Web Dashboard (`web-dashboard/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### Minecraft Mod (`config/nats-manager.json`)
```json
{
  "natsUrl": "nats://shinkansen.proxy.rlwy.net:54149",
  "serverId": "unique-server-id",
  "statusIntervalSeconds": 5,
  "heartbeatIntervalSeconds": 10,
  "enableChatBridge": true,
  "enableLogStreaming": true,
  "enableFileAccess": true,
  "enableBackups": true,
  "backupDirectory": "backups",
  "maxBackups": 10
}
```

---

## 📡 API Reference

### REST (`http://bridge-host:3001/api/`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Login, returns JWT |
| `GET`  | `/servers` | List all servers |
| `GET`  | `/servers/:id` | Server details |
| `POST` | `/servers/:id/command` | Execute command |
| `POST` | `/servers/:id/chat` | Send chat message |
| `GET`  | `/servers/:id/files?path=` | List files |
| `POST` | `/servers/:id/players/:name/kick` | Kick player |
| `POST` | `/servers/:id/players/:name/ban` | Ban player |
| `POST` | `/servers/:id/backup` | Backup operations |
| `GET`  | `/health` | Health check |

### WebSocket (`ws://bridge-host:3001/ws?token=JWT`)

Connect with JWT token, then send `{"type":"subscribe","serverId":"xxx"}` to subscribe.

Message types received: `status`, `log`, `chat`, `heartbeat`, `command_res`, `file_res`, `player_event`, `backup_res`

---

## 🏗️ NATS Message Format

All messages follow this envelope:
```json
{
  "serverId": "my-server",
  "type": "status",
  "timestamp": 1710000000000,
  "payload": { ... }
}
```

NATS subjects: `mc.<serverId>.<channel>`
- `mc.*.status` — server status
- `mc.*.heartbeat` — keepalive
- `mc.*.command.req/res` — command execution
- `mc.*.chat` — chat bridge
- `mc.*.logs` — log streaming
- `mc.*.files.req/res` — file access
- `mc.*.players` — player events
- `mc.*.backup.req/res` — backups

---

## 🛡️ Security

- JWT auth on all REST and WebSocket endpoints
- Rate limiting: 30 commands/min, 100 API requests/min
- File access restricted to server root (no path traversal)
- File reads capped at 1MB
- Command input sanitized to printable ASCII
- CORS restricted to dashboard origin
- All secrets via environment variables

---

## 🐳 Docker (Local Dev)

```bash
# Build bridge and dashboard, start both
docker compose up --build
```

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| Server not appearing | Check NATS URL in mod config matches bridge |
| Commands not working | Ensure bridge is running and JWT is valid |
| Chat not syncing | `enableChatBridge: true` in mod config |
| Mod fails to build | Requires JDK 17+ and internet connection for Gradle deps |

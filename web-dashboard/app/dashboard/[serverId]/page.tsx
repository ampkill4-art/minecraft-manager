'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getServer, Server, ServerStatus, ChatMessage, LogEntry, Player, sendCommand } from '@/lib/api';
import { isAuthenticated, removeToken } from '@/lib/auth';
import { useWebSocket } from '@/lib/ws';
import MetricsPanel  from '@/components/MetricsPanel';
import Console       from '@/components/Console';
import PlayerList    from '@/components/PlayerList';
import ChatOverlay   from '@/components/ChatOverlay';
import FileExplorer  from '@/components/FileExplorer';
import BackupManager from '@/components/BackupManager';
import {
  Server as ServerIcon, ArrowLeft, Power, RefreshCw, LogOut,
  Wifi, WifiOff, LayoutDashboard, Terminal, Users, MessageSquare,
  FolderOpen, Archive, LucideProps
} from 'lucide-react';

type Tab = 'overview' | 'console' | 'players' | 'chat' | 'files' | 'backups';
const TABS: { id: Tab; label: string; icon: React.ComponentType<LucideProps> }[] = [
  { id: 'overview', label: 'Overview',  icon: LayoutDashboard },
  { id: 'console',  label: 'Console',   icon: Terminal },
  { id: 'players',  label: 'Players',   icon: Users },
  { id: 'chat',     label: 'Chat',      icon: MessageSquare },
  { id: 'files',    label: 'Files',     icon: FolderOpen },
  { id: 'backups',  label: 'Backups',   icon: Archive },
];

export default function ServerPage() {
  const params  = useParams<{ serverId: string }>();
  const router  = useRouter();
  const serverId = decodeURIComponent(params.serverId);

  const [server, setServer]   = useState<Server | null>(null);
  const [status, setStatus]   = useState<ServerStatus | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [chats, setChats]     = useState<ChatMessage[]>([]);
  const [tab, setTab]         = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) router.push('/');
  }, [router]);

  // Initial server load
  useEffect(() => {
    (async () => {
      try {
        const { server: s } = await getServer(serverId);
        setServer(s);
        setStatus(s.status);
        setPlayers(s.status?.players ?? []);
      } catch { router.push('/dashboard'); }
      finally  { setLoading(false); }
    })();
  }, [serverId, router]);

  // Real-time WebSocket updates
  const { connected } = useWebSocket(serverId, useCallback((msg) => {
    switch (msg.type) {
      case 'status': {
        const s = msg.data as ServerStatus;
        setStatus(s);
        setPlayers(s.players ?? []);
        break;
      }
      case 'log':
        setLogs(prev => [...prev.slice(-500), msg.data as LogEntry]);
        break;
      case 'chat':
        setChats(prev => [...prev.slice(-200), { ...(msg.data as ChatMessage), timestamp: msg.timestamp }]);
        break;
      case 'player_event': {
        const ev = msg.data as { action: string; player: Player };
        if (ev.action === 'join') {
          setPlayers(prev => [...prev.filter(p => p.uuid !== ev.player.uuid), ev.player]);
        } else if (ev.action === 'leave' || ev.action === 'kick' || ev.action === 'ban') {
          setPlayers(prev => prev.filter(p => p.uuid !== ev.player.uuid));
        }
        break;
      }
    }
  }, []));

  const doStop    = () => sendCommand(serverId, 'stop').catch(() => {});
  const doRestart = () => sendCommand(serverId, 'restart').catch(() => {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Nav */}
      <nav className="border-b border-border bg-bg-100/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="btn-ghost py-1.5 px-3 flex items-center gap-1.5 text-xs" id="back-btn">
              <ArrowLeft size={13} /> Back
            </button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded bg-accent/10 border border-accent/20">
                <ServerIcon size={13} className="text-accent" />
              </div>
              <div>
                <span className="font-semibold text-text text-sm">{serverId}</span>
                {status?.version && <span className="ml-2 text-xs text-text-dim">{status.version}</span>}
              </div>
            </div>
            {server?.online
              ? <span className="badge-online ml-2"><span className="ping-dot" />Online</span>
              : <span className="badge-offline ml-2"><span className="ping-dot ping-dot-offline" />Offline</span>
            }
          </div>

          <div className="flex items-center gap-2">
            {connected
              ? <Wifi size={13} className="text-accent" />
              : <WifiOff size={13} className="text-offline" />
            }
            <button onClick={doRestart} className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5" id="restart-btn">
              <RefreshCw size={12} /> Restart
            </button>
            <button onClick={doStop} className="btn-danger py-1.5 px-3 text-xs flex items-center gap-1.5" id="stop-btn">
              <Power size={12} /> Stop
            </button>
            <button onClick={() => { removeToken(); router.push('/'); }} className="btn-ghost py-1.5 px-2">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-6 py-6 flex-1">
        {/* Tab Bar */}
        <div className="flex items-center gap-1 mb-6 bg-bg-200/80 border border-border rounded-xl p-1 w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={tab === id ? 'tab-active' : 'tab'}
              id={`tab-${id}`}
            >
              <span className="flex items-center gap-1.5">
                <Icon size={13} /> {label}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {tab === 'overview' && (
            <div className="space-y-6">
              <MetricsPanel status={status} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Console serverId={serverId} logs={logs} />
                <PlayerList serverId={serverId} players={players} />
              </div>
            </div>
          )}
          {tab === 'console' && <Console serverId={serverId} logs={logs} />}
          {tab === 'players' && <PlayerList serverId={serverId} players={players} />}
          {tab === 'chat'    && <ChatOverlay serverId={serverId} messages={chats} />}
          {tab === 'files'   && <FileExplorer serverId={serverId} />}
          {tab === 'backups' && <BackupManager serverId={serverId} />}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getServers, Server } from '@/lib/api';
import { isAuthenticated, getUsername, removeToken } from '@/lib/auth';
import { useWebSocket } from '@/lib/ws';
import ServerCard from '@/components/ServerCard';
import { Server as ServerIcon, LogOut, RefreshCw, Wifi, WifiOff } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated()) router.push('/');
  }, [router]);

  const fetchServers = useCallback(async () => {
    try {
      const { servers: list } = await getServers();
      setServers(list);
      setLastUpdate(new Date());
    } catch {
      // Silently retry — WebSocket will keep us updated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServers(); }, [fetchServers]);

  // Periodic refresh to detect offline servers
  useEffect(() => {
    const id = setInterval(() => { fetchServers(); }, 15000);
    return () => clearInterval(id);
  }, [fetchServers]);

  // Real-time updates via WebSocket
  const { connected } = useWebSocket(null, useCallback((msg) => {
    if (msg.type === 'status' || msg.type === 'heartbeat') {
      setLastUpdate(new Date());
      // Update specific server in list
      setServers(prev => {
        const idx = prev.findIndex(s => s.serverId === msg.serverId);
        if (idx === -1) {
          // New server appeared — refresh full list
          fetchServers();
          return prev;
        }
        const updated = [...prev];
        if (msg.type === 'status') {
          updated[idx] = { ...updated[idx], status: msg.data as Server['status'], online: true };
        }
        return updated;
      });
    }
  }, [fetchServers]));

  const logout = () => { removeToken(); router.push('/'); };
  const onlineCount = servers.filter(s => s.online).length;

  return (
    <div className="min-h-screen">
      {/* Top Nav */}
      <nav className="border-b border-border bg-bg-100/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 border border-accent/20">
              <ServerIcon className="w-5 h-5 text-accent" />
            </div>
            <span className="font-bold text-lg text-text">Service Manager</span>
          </div>

          <div className="flex items-center gap-4">
            {/* WebSocket indicator */}
            <div className="flex items-center gap-2 text-xs text-text-muted">
              {connected
                ? <><Wifi size={14} className="text-accent" /> Live</>
                : <><WifiOff size={14} className="text-offline" /> Offline</>
              }
            </div>
            <button
              onClick={fetchServers}
              className="btn-ghost flex items-center gap-2 py-2 px-3"
              title="Refresh"
              id="refresh-btn"
            >
              <RefreshCw size={14} />
            </button>
            <span className="text-sm text-text-muted">{getUsername()}</span>
            <button onClick={logout} className="btn-ghost flex items-center gap-1.5 py-2">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-text">Server Dashboard</h1>
          <p className="text-text-muted mt-1">
            {loading ? 'Loading...' : `${onlineCount} of ${servers.length} server${servers.length !== 1 ? 's' : ''} online`}
            <span className="ml-3 text-xs text-text-dim">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          </p>
        </div>

        {/* Server grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="glass h-48 animate-pulse bg-surface/30" />
            ))}
          </div>
        ) : servers.length === 0 ? (
          <div className="glass p-12 text-center animate-fade-in">
            <ServerIcon className="mx-auto mb-4 text-text-dim" size={48} />
            <h3 className="text-lg font-semibold text-text mb-2">No servers connected</h3>
            <p className="text-text-muted text-sm">
              Install the server plugin and it will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {servers.map(server => (
              <ServerCard
                key={server.serverId}
                server={server}
                onClick={() => router.push(`/dashboard/${server.serverId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

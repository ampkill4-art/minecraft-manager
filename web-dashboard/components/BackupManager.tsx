'use client';
import { useState, useCallback } from 'react';
import { createBackup, listBackups } from '@/lib/api';
import { BackupEntry } from '@/lib/api';
import { useWebSocket } from '@/lib/ws';
import { Archive, RefreshCw, Plus, HardDrive } from 'lucide-react';

interface Props { serverId: string; }

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export default function BackupManager({ serverId }: Props) {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [listing,  setListing]  = useState(false);
  const [msg, setMsg] = useState('');

  const toast = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 4000); };

  const refreshList = useCallback(async () => {
    setListing(true);
    try { await listBackups(serverId); } catch { setListing(false); }
  }, [serverId]);

  const doCreate = async () => {
    setCreating(true);
    try {
      await createBackup(serverId);
      toast('Backup requested — this may take a moment...');
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Failed');
    } finally {
      setCreating(false);
    }
  };

  // Listen for backup responses
  useWebSocket(serverId, useCallback((wsMsg) => {
    if (wsMsg.type === 'backup_res') {
      const data = wsMsg.data as { success: boolean; backups?: BackupEntry[]; message?: string; error?: string };
      setListing(false);
      if (data.success && data.backups) {
        setBackups(data.backups);
      } else if (data.message) {
        toast(data.message);
        refreshList(); // Refresh list after create
      } else if (data.error) {
        toast(`Error: ${data.error}`);
      }
    }
  }, [refreshList]));

  return (
    <div className="glass-dark">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Archive size={15} className="text-accent" />
          <span className="text-sm font-medium text-text">Backups</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshList} disabled={listing} className="text-text-dim hover:text-text-muted transition-colors p-1" id="backup-refresh">
            <RefreshCw size={13} className={listing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={doCreate}
            disabled={creating}
            className="btn-accent py-1.5 px-3 text-xs flex items-center gap-1.5"
            id="backup-create"
          >
            <Plus size={12} />
            {creating ? 'Creating...' : 'New Backup'}
          </button>
        </div>
      </div>

      {msg && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs">{msg}</div>
      )}

      <div className="p-4 space-y-2 max-h-[360px] overflow-y-auto custom-scroll">
        {backups.length === 0 ? (
          <div className="text-center py-8">
            <Archive className="mx-auto mb-3 text-text-dim" size={32} />
            <p className="text-text-dim text-sm">No backups yet</p>
            <button onClick={refreshList} className="btn-ghost text-xs mt-3 py-1.5 px-3">Load Backups</button>
          </div>
        ) : (
          backups.map((b, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-bg-300/40">
              <Archive size={15} className="text-text-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-text truncate">{b.name}</div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-text-dim">
                    <HardDrive size={10} /> {formatBytes(b.size)}
                  </span>
                  <span className="text-xs text-text-dim">
                    {new Date(b.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

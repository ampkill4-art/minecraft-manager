'use client';
import { Player } from '@/lib/api';
import { kickPlayer, banPlayer } from '@/lib/api';
import { Users, Sword, ShieldX, Heart, Wifi } from 'lucide-react';
import { useState } from 'react';

interface Props { serverId: string; players: Player[]; }

export default function PlayerList({ serverId, players }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  const doAction = async (action: 'kick' | 'ban', name: string) => {
    const reason = prompt(`Reason to ${action} ${name}?`) ?? '';
    setBusy(name);
    try {
      if (action === 'kick') await kickPlayer(serverId, name, reason);
      else                   await banPlayer(serverId, name, reason);
      setFeedback(`${action === 'kick' ? 'Kicked' : 'Banned'} ${name}`);
    } catch (e: unknown) {
      setFeedback(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
      setTimeout(() => setFeedback(''), 3000);
    }
  };

  return (
    <div className="glass-dark">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-cyan" />
          <span className="text-sm font-medium text-text">Players</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-bg-300 text-text-muted">{players.length}</span>
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs">
          {feedback}
        </div>
      )}

      {/* Player list */}
      <div className="p-4 space-y-2 max-h-[360px] overflow-y-auto custom-scroll">
        {players.length === 0 ? (
          <p className="text-center text-text-dim text-sm py-8">No players online</p>
        ) : (
          players.map(p => (
            <div key={p.uuid} className="flex items-center justify-between p-3 rounded-lg bg-bg-300/40 hover:bg-bg-300/70 transition-colors group">
              <div className="flex items-center gap-3">
                {/* minecraft style avatar placeholder */}
                <div className="w-8 h-8 rounded bg-accent/10 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-text">{p.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-0.5 text-xs text-offline">
                      <Heart size={10} /> {Math.round(p.health / 2)}/10
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-cyan">
                      <Wifi size={10} /> {p.ping}ms
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => doAction('kick', p.name)}
                  disabled={busy === p.name}
                  className="p-1.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                  title="Kick"
                  id={`kick-${p.name}`}
                >
                  <Sword size={13} />
                </button>
                <button
                  onClick={() => doAction('ban', p.name)}
                  disabled={busy === p.name}
                  className="p-1.5 rounded-md bg-offline/10 text-offline hover:bg-offline/20 transition-colors"
                  title="Ban"
                  id={`ban-${p.name}`}
                >
                  <ShieldX size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

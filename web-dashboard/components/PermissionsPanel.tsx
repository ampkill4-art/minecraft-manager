'use client';
import { useEffect, useState } from 'react';
import { getPermissions, setPermissions, Player } from '@/lib/api';
import { Shield, Plus, X } from 'lucide-react';

interface Props {
  serverId: string;
  players: Player[];
}

export default function PermissionsPanel({ serverId, players }: Props) {
  const [list, setList] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPermissions(serverId);
        setList(res.players || []);
      } catch {
        setList([]);
      }
    })();
  }, [serverId]);

  const save = async (next: string[]) => {
    setSaving(true);
    try {
      await setPermissions(serverId, next);
      setList(next);
    } finally {
      setSaving(false);
    }
  };

  const addByUuid = async (uuid: string) => {
    if (!uuid) return;
    const next = Array.from(new Set([...list, uuid]));
    await save(next);
  };

  const remove = async (uuid: string) => {
    const next = list.filter(p => p !== uuid);
    await save(next);
  };

  const addByName = async () => {
    const name = input.trim();
    if (!name) return;
    const p = players.find(pl => pl.name.toLowerCase() === name.toLowerCase());
    if (p) await addByUuid(p.uuid);
    setInput('');
  };

  return (
    <div className="glass-dark p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield size={14} className="text-accent" />
        <span className="text-sm font-medium text-text">Privileged Chat Commands</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <input
          className="input text-xs"
          placeholder="Player name (online)"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          onClick={addByName}
          disabled={saving}
          className="btn-ghost text-xs flex items-center gap-1"
          id="perm-add"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      <div className="space-y-2">
        {list.length === 0 ? (
          <p className="text-xs text-text-dim">No privileged players yet.</p>
        ) : list.map(uuid => (
          <div key={uuid} className="flex items-center justify-between text-xs bg-bg-300/60 border border-border rounded-lg px-3 py-2">
            <span className="font-mono text-text-muted">{uuid}</span>
            <button
              onClick={() => remove(uuid)}
              className="text-text-dim hover:text-offline transition-colors"
              id={`perm-remove-${uuid}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-text-dim mt-3">
        Only players in this list can use chat commands like `#op` or `#crash`.
      </p>
    </div>
  );
}

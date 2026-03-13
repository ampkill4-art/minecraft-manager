'use client';
import { useMemo, useState } from 'react';
import { ChevronDown, Play, Wand2 } from 'lucide-react';

export type PresetCommand = {
  id: string;
  label: string;
  command: string;
  hint?: string;
  danger?: boolean;
};

const PRESETS: PresetCommand[] = [
  { id: 'list', label: 'List players', command: 'list', hint: 'Shows online players' },
  { id: 'tps', label: 'TPS', command: 'tps', hint: 'Paper: server TPS' },
  { id: 'gc', label: 'GC', command: 'gc', hint: 'Paper: suggest GC', danger: true },
  { id: 'save-all', label: 'Save all', command: 'save-all', hint: 'Flush worlds to disk', danger: true },
  { id: 'whitelist-on', label: 'Whitelist on', command: 'whitelist on', danger: true },
  { id: 'whitelist-off', label: 'Whitelist off', command: 'whitelist off', danger: true },
  { id: 'say', label: 'Say...', command: 'say ', hint: 'Broadcast message' },
  { id: 'kick', label: 'Kick...', command: 'kick ', hint: 'Kick player', danger: true },
];

export default function CommandPalette(props: {
  value: string;
  onPick: (cmd: string) => void;
  onRun?: (cmd: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return PRESETS;
    return PRESETS.filter(p =>
      p.label.toLowerCase().includes(qq) || p.command.toLowerCase().includes(qq)
    );
  }, [q]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-xs px-2.5 py-1.5 rounded bg-bg-300/60 text-text border border-border hover:border-accent/30 hover:bg-bg-300/80 transition-colors flex items-center gap-1.5"
        id="cmd-presets"
        title="Command presets"
      >
        <Wand2 size={12} className="text-accent" />
        Presets
        <ChevronDown size={12} className="text-text-dim" />
      </button>

      {open && (
        <div className="absolute bottom-10 left-0 w-[320px] glass-dark p-3 border border-border z-50">
          <div className="flex items-center justify-between mb-2">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search commands..."
              className="w-full bg-bg-300/60 border border-border rounded-lg px-3 py-2 text-xs text-text placeholder-text-dim focus:outline-none focus:border-accent/40"
              autoFocus
            />
          </div>
          <div className="max-h-[240px] overflow-auto custom-scroll space-y-1">
            {filtered.length === 0 ? (
              <div className="text-xs text-text-dim px-2 py-3">No matches</div>
            ) : filtered.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-bg-300/60 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => { props.onPick(p.command); setOpen(false); setQ(''); }}
                  className="text-left flex-1"
                >
                  <div className={`text-xs font-medium ${p.danger ? 'text-warning' : 'text-text'}`}>
                    {p.label}
                  </div>
                  <div className="text-[11px] text-text-dim font-mono truncate">
                    {p.command}{p.hint ? `  // ${p.hint}` : ''}
                  </div>
                </button>
                {props.onRun && (
                  <button
                    type="button"
                    onClick={() => { props.onRun?.(p.command); setOpen(false); setQ(''); }}
                    className="p-2 rounded bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
                    title="Run"
                  >
                    <Play size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


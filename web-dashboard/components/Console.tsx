'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { sendCommand } from '@/lib/api';
import { LogEntry } from '@/lib/api';
import { Terminal, ChevronRight, Trash2 } from 'lucide-react';
import CommandPalette from './CommandPalette';

interface Props {
  serverId: string;
  logs: LogEntry[];
}

const LOG_COLORS: Record<string, string> = {
  INFO:  'text-text-muted',
  WARN:  'text-warning',
  ERROR: 'text-offline',
  DEBUG: 'text-text-dim',
};

export default function Console({ serverId, logs }: Props) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [localLogs, setLocalLogs] = useState<Array<{text:string; cls:string}>>([]);
  const seenRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Append remote console lines as they arrive (don't overwrite local command history)
  useEffect(() => {
    // If upstream truncates, reset cursor to avoid skipping
    if (logs.length < seenRef.current) {
      seenRef.current = 0;
    }

    if (seenRef.current >= logs.length) return;

    const next = logs.slice(seenRef.current).map(l => ({
      text: `[${l.level}] ${l.message}`,
      cls: LOG_COLORS[l.level] ?? 'text-text-muted',
    }));

    seenRef.current = logs.length;
    setLocalLogs(prev => [...prev, ...next].slice(-1500));
  }, [logs]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localLogs]);

  const submit = useCallback(async () => {
    const cmd = command.trim();
    if (!cmd) return;

    setLocalLogs(prev => [...prev, { text: `> ${cmd}`, cls: 'text-accent' }]);
    setHistory(h => [cmd, ...h].slice(0, 50));
    setHistoryIdx(-1);
    setCommand('');

    try {
      await sendCommand(serverId, cmd);
    } catch (e: unknown) {
      setLocalLogs(prev => [...prev, {
        text: `[ERROR] ${e instanceof Error ? e.message : 'Command failed'}`,
        cls: 'text-offline',
      }]);
    }
  }, [command, serverId]);

  const run = useCallback(async (cmd: string) => {
    const next = cmd.trim();
    if (!next) return;
    setLocalLogs(prev => [...prev, { text: `> ${next}`, cls: 'text-accent' }]);
    setHistory(h => [next, ...h].slice(0, 50));
    setHistoryIdx(-1);
    try {
      await sendCommand(serverId, next);
    } catch (e: unknown) {
      setLocalLogs(prev => [...prev, {
        text: `[ERROR] ${e instanceof Error ? e.message : 'Command failed'}`,
        cls: 'text-offline',
      }]);
    }
  }, [serverId]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { submit(); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(idx);
      setCommand(history[idx] ?? '');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(idx);
      setCommand(idx === -1 ? '' : history[idx]);
    }
  };

  return (
    <div className="glass-dark flex flex-col h-[460px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal size={15} className="text-accent" />
          <span className="text-sm font-medium text-text">Console</span>
        </div>
        <button
          onClick={() => { setLocalLogs([]); seenRef.current = logs.length; }}
          className="text-text-dim hover:text-text-muted transition-colors p-1"
          title="Clear"
          id="console-clear"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Log output */}
      <div
        className="flex-1 overflow-y-auto custom-scroll p-4 font-mono text-xs space-y-0.5"
        onClick={() => inputRef.current?.focus()}
      >
        {localLogs.length === 0 ? (
          <p className="text-text-dim">Console output will appear here...</p>
        ) : (
          localLogs.map((l, i) => (
            <div key={i} className={`leading-5 ${l.cls} break-all`}>{l.text}</div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t border-border">
        <ChevronRight size={14} className="text-accent flex-shrink-0" />
        <input
          ref={inputRef}
          id="console-input"
          type="text"
          value={command}
          onChange={e => setCommand(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Enter server command..."
          className="flex-1 bg-transparent font-mono text-xs text-text placeholder-text-dim focus:outline-none"
          spellCheck={false}
          autoComplete="off"
        />
        <CommandPalette
          value={command}
          onPick={(cmd) => { setCommand(cmd); inputRef.current?.focus(); }}
          onRun={run}
        />
        <button
          onClick={submit}
          className="text-xs px-3 py-1.5 rounded bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors font-mono"
          id="console-send"
        >
          Send
        </button>
      </div>
    </div>
  );
}

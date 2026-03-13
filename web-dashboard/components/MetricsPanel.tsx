'use client';
import { ServerStatus } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, Users, HardDrive, Cpu, Clock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Props { status: ServerStatus | null; }

interface DataPoint { time: string; tps: number; cpu: number; mem: number; }

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function MetricsPanel({ status: s }: Props) {
  const [history, setHistory] = useState<DataPoint[]>([]);
  const maxPoints = 30;

  useEffect(() => {
    if (!s) return;
    const point: DataPoint = {
      time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      tps:  s.tps,
      cpu:  s.cpuUsage >= 0 ? s.cpuUsage : 0,
      mem:  Math.round((s.memoryUsed / s.memoryMax) * 100),
    };
    setHistory(prev => [...prev.slice(-(maxPoints - 1)), point]);
  }, [s]);

  const tpsColor = !s ? '#4a5568' : s.tps >= 18 ? '#00e676' : s.tps >= 14 ? '#ffb800' : '#ff4569';
  const memPct   = s ? Math.round((s.memoryUsed / s.memoryMax) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* TPS */}
        <div className="glass p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap size={13} className="text-warning" />
            <span className="metric-label">TPS</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: tpsColor }}>
            {s ? s.tps.toFixed(1) : '—'}
          </div>
          <div className="text-xs text-text-dim mt-0.5">/ 20.0</div>
        </div>
        {/* Players */}
        <div className="glass p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={13} className="text-cyan" />
            <span className="metric-label">Players</span>
          </div>
          <div className="text-2xl font-bold text-text">{s ? s.playerCount : '—'}</div>
          <div className="text-xs text-text-dim mt-0.5">/ {s?.maxPlayers ?? '—'} max</div>
        </div>
        {/* RAM */}
        <div className="glass p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <HardDrive size={13} className="text-accent" />
            <span className="metric-label">RAM</span>
          </div>
          <div className="text-2xl font-bold text-text">{s ? `${s.memoryUsed}` : '—'}</div>
          <div className="text-xs text-text-dim mt-0.5">/ {s?.memoryMax ?? '—'} MB</div>
        </div>
        {/* Uptime */}
        <div className="glass p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={13} className="text-text-muted" />
            <span className="metric-label">Uptime</span>
          </div>
          <div className="text-lg font-bold text-text">{s ? formatUptime(s.uptime) : '—'}</div>
        </div>
      </div>

      {/* Chart */}
      {history.length > 1 && (
        <div className="glass p-4">
          <p className="text-xs text-text-muted mb-3 font-medium">Performance History</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={history} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#4a5568' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#4a5568' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#14141f', border: '1px solid #2a2a3d', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }}
              />
              <Line type="monotone" dataKey="tps"  stroke="#00e676" strokeWidth={1.5} dot={false} name="TPS" />
              <Line type="monotone" dataKey="cpu"  stroke="#00d4ff" strokeWidth={1.5} dot={false} name="CPU%" />
              <Line type="monotone" dataKey="mem"  stroke="#ffb800" strokeWidth={1.5} dot={false} name="RAM%" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            {[['TPS','#00e676'],['CPU%','#00d4ff'],['RAM%','#ffb800']].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-text-muted">
                <div className="w-3 h-0.5 rounded" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memory bar */}
      {s && (
        <div className="glass p-4">
          <div className="flex justify-between mb-2">
            <span className="metric-label">Memory Usage</span>
            <span className="text-xs text-text-muted">{memPct}%</span>
          </div>
          <div className="h-2 bg-bg-300 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                memPct > 85 ? 'bg-offline' : memPct > 65 ? 'bg-warning' : 'bg-accent'
              }`}
              style={{ width: `${Math.min(memPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-text-dim">
            <span>0 MB</span><span>{s.memoryMax} MB</span>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { Server } from '@/lib/api';
import { Users, Cpu, HardDrive, Zap, ArrowRight } from 'lucide-react';

interface Props {
  server: Server;
  onClick?: () => void;
}

export default function ServerCard({ server, onClick }: Props) {
  const s = server.status;

  const tpsColor = !s ? 'text-text-dim' :
    s.tps >= 18 ? 'text-online' :
    s.tps >= 14 ? 'text-warning' : 'text-offline';

  const memPct = s ? Math.round((s.memoryUsed / s.memoryMax) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className="glass p-6 cursor-pointer group hover:border-accent/30 hover:shadow-accent/10 hover:shadow-lg transition-all duration-300 animate-slide-in"
      id={`server-card-${server.serverId}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-text group-hover:text-accent transition-colors duration-200 truncate max-w-[14rem]">
            {server.serverId}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {s?.version ?? '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {server.online ? (
            <span className="badge-online"><span className="ping-dot" />Online</span>
          ) : (
            <span className="badge-offline"><span className="ping-dot ping-dot-offline" />Offline</span>
          )}
        </div>
      </div>

      {s ? (
        <>
          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* TPS */}
            <div className="bg-bg-300/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap size={12} className="text-warning" />
                <span className="metric-label">TPS</span>
              </div>
              <span className={`text-xl font-bold ${tpsColor}`}>{s.tps.toFixed(1)}</span>
              <span className="text-text-dim text-xs ml-1">/20</span>
            </div>

            {/* Players */}
            <div className="bg-bg-300/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={12} className="text-cyan" />
                <span className="metric-label">Players</span>
              </div>
              <span className="text-xl font-bold text-text">{s.playerCount}</span>
              <span className="text-text-dim text-xs ml-1">/{s.maxPlayers}</span>
            </div>
          </div>

          {/* Memory bar */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <div className="flex items-center gap-1"><HardDrive size={11} className="text-text-dim" /><span className="metric-label">RAM</span></div>
              <span className="text-xs text-text-muted">{s.memoryUsed}MB / {s.memoryMax}MB</span>
            </div>
            <div className="h-1.5 bg-bg-300 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  memPct > 85 ? 'bg-offline' : memPct > 65 ? 'bg-warning' : 'bg-accent'
                }`}
                style={{ width: `${Math.min(memPct, 100)}%` }}
              />
            </div>
          </div>

          {/* CPU */}
          {s.cpuUsage >= 0 && (
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <div className="flex items-center gap-1"><Cpu size={11} className="text-text-dim" /><span className="metric-label">CPU</span></div>
                <span className="text-xs text-text-muted">{s.cpuUsage.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-bg-300 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    s.cpuUsage > 80 ? 'bg-offline' : s.cpuUsage > 60 ? 'bg-warning' : 'bg-cyan'
                  }`}
                  style={{ width: `${Math.min(s.cpuUsage, 100)}%` }}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-6 text-center text-text-dim text-sm">
          Waiting for status data...
        </div>
      )}

      {/* Open arrow */}
      <div className="flex justify-end mt-2">
        <ArrowRight size={16} className="text-text-dim group-hover:text-accent group-hover:translate-x-1 transition-all duration-200" />
      </div>
    </div>
  );
}

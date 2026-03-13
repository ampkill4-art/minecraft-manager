'use client';
import { useState, useCallback } from 'react';
import { FileEntry } from '@/lib/api';
import { listFiles } from '@/lib/api';
import { useWebSocket } from '@/lib/ws';
import { Folder, File, ChevronRight, ChevronDown, HardDrive, RefreshCw } from 'lucide-react';

interface Props { serverId: string; }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export default function FileExplorer({ serverId }: Props) {
  const [path, setPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [pendingReqId, setPendingReqId] = useState<string | null>(null);

  const navigate = useCallback(async (newPath: string) => {
    setLoading(true);
    setPath(newPath);
    try {
      const { requestId } = await listFiles(serverId, newPath);
      setPendingReqId(requestId);
    } catch {
      setLoading(false);
    }
  }, [serverId]);

  // Listen for file_res via WebSocket
  useWebSocket(serverId, useCallback((msg) => {
    if (msg.type === 'file_res') {
      const data = msg.data as { requestId: string; success: boolean; files?: FileEntry[] };
      if (data.requestId === pendingReqId && data.success && data.files) {
        setFiles(data.files.sort((a, b) =>
          a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : b.isDirectory ? 1 : -1
        ));
        setLoading(false);
      }
    }
  }, [pendingReqId]));

  const toggleDir = (entry: FileEntry) => {
    if (!entry.isDirectory) return;
    if (expandedDirs.has(entry.path)) {
      setExpandedDirs(prev => { const s = new Set(prev); s.delete(entry.path); return s; });
    } else {
      setExpandedDirs(prev => new Set([...prev, entry.path]));
      navigate(entry.path);
    }
  };

  const breadcrumbs = path.split('/').filter(Boolean);

  return (
    <div className="glass-dark">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <HardDrive size={15} className="text-accent" />
          <span className="text-sm font-medium text-text">File Explorer</span>
        </div>
        <button onClick={() => navigate(path)} className="text-text-dim hover:text-text-muted transition-colors p-1" id="files-refresh">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border font-mono text-xs text-text-muted overflow-x-auto">
        <button onClick={() => navigate('/')} className="hover:text-accent transition-colors">/</button>
        {breadcrumbs.map((crumb, i) => {
          const crumbPath = '/' + breadcrumbs.slice(0, i + 1).join('/');
          return (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={10} className="text-text-dim" />
              <button onClick={() => navigate(crumbPath)} className="hover:text-accent transition-colors">{crumb}</button>
            </span>
          );
        })}
      </div>

      {/* File list */}
      <div className="p-3 max-h-[400px] overflow-y-auto custom-scroll space-y-0.5">
        {files.length === 0 && !loading ? (
          <div className="text-center py-8">
            <p className="text-text-dim text-sm">
              {path === '/' ? 'Click refresh to load files' : 'Empty directory'}
            </p>
            <button onClick={() => navigate(path)} className="btn-ghost text-xs mt-3 py-1.5 px-3">Load Files</button>
          </div>
        ) : files.map((f, i) => (
          <div
            key={i}
            onClick={() => toggleDir(f)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-300/50 cursor-pointer group transition-colors"
            id={`file-${f.name}`}
          >
            {f.isDirectory
              ? (expandedDirs.has(f.path)
                  ? <ChevronDown size={13} className="text-accent flex-shrink-0" />
                  : <ChevronRight size={13} className="text-text-dim flex-shrink-0" />)
              : <span className="w-[13px]" />
            }
            {f.isDirectory
              ? <Folder size={14} className="text-warning flex-shrink-0" />
              : <File size={14} className="text-text-dim flex-shrink-0" />
            }
            <span className={`text-xs flex-1 truncate ${f.isDirectory ? 'text-text font-medium' : 'text-text-muted'}`}>
              {f.name}
            </span>
            {!f.isDirectory && (
              <span className="text-xs text-text-dim ml-auto">{formatBytes(f.size)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

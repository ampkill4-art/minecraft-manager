'use client';
import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/api';
import { sendChat } from '@/lib/api';
import { MessageSquare, Send } from 'lucide-react';

interface Props {
  serverId: string;
  messages: ChatMessage[];
}

export default function ChatOverlay({ serverId, messages }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const msg = text.trim();
    if (!msg) return;
    setSending(true);
    setText('');
    try {
      await sendChat(serverId, msg);
    } catch {
      // Bridge will echo back if success
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass-dark flex flex-col h-[360px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <MessageSquare size={15} className="text-accent" />
        <span className="text-sm font-medium text-text">Chat Bridge</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-2">
        {messages.length === 0 ? (
          <p className="text-text-dim text-xs text-center pt-6">No messages yet...</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="text-xs">
              <span className={m.source === 'web' ? 'text-accent' : 'text-cyan'}>
                [{m.source === 'web' ? 'Web' : 'Game'}]
              </span>
              <span className="text-text-muted ml-1 font-medium">{m.sender}:</span>
              <span className="text-text ml-1">{m.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 p-3 border-t border-border">
        <input
          type="text"
          id="chat-input"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Send message to game..."
          className="flex-1 bg-transparent text-xs text-text placeholder-text-dim focus:outline-none"
          disabled={sending}
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="p-1.5 rounded bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-40"
          id="chat-send"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}

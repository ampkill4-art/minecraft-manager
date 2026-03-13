'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { saveToken, isAuthenticated } from '@/lib/auth';
import { Server, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated()) router.push('/dashboard');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await login(username, password);
      saveToken(token);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-cyan/20 blur-3xl" />

      <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 animate-fade-in">
          {/* Brand / Intro */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 glow-ring">
                <Server className="w-7 h-7 text-accent" />
              </div>
            <div className="chip">Realtime Server Control</div>
            </div>

            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-text leading-tight">
                Service Manager
              </h1>
              <p className="text-base md:text-lg text-text-muted mt-3 max-w-xl">
                A fast, secure command bridge for Minecraft servers with live
                status, file ops, and console control.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-text-muted">
              <span className="chip">Command + RCON-like</span>
              <span className="chip">File explorer</span>
              <span className="chip">JWT auth</span>
              <span className="chip">Live server heartbeat</span>
            </div>
          </div>

          {/* Card */}
          <div className="glass p-8 md:p-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-text">Sign in</h2>
                <p className="text-xs text-text-dim">Use your admin credentials</p>
              </div>
              <div className="text-xs text-text-muted font-mono">v1.0.0</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="admin"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoFocus
                  id="username"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    id="password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-lg bg-offline/10 border border-offline/20 text-offline text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-accent w-full flex items-center justify-center gap-2"
                disabled={loading}
                id="login-btn"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <p className="text-center text-xs text-text-dim mt-6">
              Secured with JWT authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

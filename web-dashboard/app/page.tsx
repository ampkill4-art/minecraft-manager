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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-4 shadow-accent">
            <Server className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text">NATS Manager</h1>
          <p className="text-sm text-text-muted mt-1">Minecraft Server Dashboard</p>
        </div>

        {/* Card */}
        <div className="glass p-8">
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
  );
}

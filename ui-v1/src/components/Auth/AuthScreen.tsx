import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, UserPlus, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE = 'http://localhost:3000/auth';

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const response = await fetch(`${API_BASE}/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');
        
        login(data.token);
      } else {
        const response = await fetch(`${API_BASE}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username, password }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Signup failed');
        
        setMessage('Account created! You can now sign in.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-[400px] bg-white rounded-xl shadow-premium border border-border-notion overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-focus-blue rounded-xl flex items-center justify-center text-white shadow-lg">
              <Sparkles size={24} />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-text-notion mb-2 tracking-tight">
            {isLogin ? 'Welcome back' : 'Join Taskinator'}
          </h1>
          <p className="text-text-dim text-center text-sm mb-8">
            {isLogin ? 'Enter your credentials to continue.' : 'Create an account to start orchestrating.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase tracking-wider mb-1 px-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-secondary border border-border-notion rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-focus-blue/20 focus:border-focus-blue"
                  placeholder="jdoe"
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase tracking-wider mb-1 px-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-notion rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-focus-blue/20 focus:border-focus-blue"
                placeholder="admin@taskinator.io"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase tracking-wider mb-1 px-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-notion rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-focus-blue/20 focus:border-focus-blue"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 animate-in slide-in-from-top-1">
                <AlertCircle size={16} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-600 rounded-lg text-sm border border-green-100 animate-in slide-in-from-top-1">
                <Sparkles size={16} className="shrink-0" />
                <p>{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-focus-blue text-white rounded-lg font-medium text-sm shadow-md hover:bg-focus-blue/90 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border-notion flex flex-col items-center gap-4">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
              }}
              className="text-sm font-medium text-text-dim hover:text-focus-blue transition-colors duration-200"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

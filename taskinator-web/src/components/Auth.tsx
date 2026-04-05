import React, { useState } from 'react';
import { authApi } from '../api/client';
import { Layout } from 'lucide-react';

interface AuthProps {
    onLogin: (token: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);
        
        try {
            if (isLogin) {
                const res = await authApi.signIn({ email, password_raw: password });
                if (res.token) {
                    onLogin(res.token);
                }
            } else {
                await authApi.startSignUp({ email, username, password_raw: password });
                setMessage('Signup started. Check your email or backend logs to finish the process.');
                setIsLogin(true); // Switch to login view after successful signup
                setPassword(''); // Clear password for security
            }
        } catch (err) {
            const error = err as { response?: { data?: { error?: string } }, message?: string };
            setError(error.response?.data?.error || error.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
            <div className="w-full max-w-md p-8 bg-secondary/20 rounded-xl border border-border shadow-lg">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                        <Layout size={24} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Taskinator</h1>
                    <p className="text-sm text-muted mt-1">Manage your tasks and teams</p>
                </div>

                <div className="flex gap-4 mb-6 border-b border-border">
                    <button 
                        className={`pb-2 text-sm font-medium transition-colors ${isLogin ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-foreground'}`}
                        onClick={() => { setIsLogin(true); setError(''); setMessage(''); }}
                    >
                        Login
                    </button>
                    <button 
                        className={`pb-2 text-sm font-medium transition-colors ${!isLogin ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-foreground'}`}
                        onClick={() => { setIsLogin(false); setError(''); setMessage(''); }}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="space-y-1">
                            <label className="text-xs uppercase font-bold text-muted">Username</label>
                            <input 
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                                required={!isLogin}
                                autoComplete="off"
                            />
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-xs uppercase font-bold text-muted">Email</label>
                        <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                            required
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs uppercase font-bold text-muted">Password</label>
                        <input 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                            required
                            autoComplete="off"
                        />
                    </div>

                    {error && <p className="text-xs text-red-500 bg-red-500/10 p-2 rounded">{error}</p>}
                    {message && <p className="text-xs text-green-500 bg-green-500/10 p-2 rounded">{message}</p>}

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 rounded-md transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>
            </div>
        </div>
    );
};

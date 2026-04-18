import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, UserPlus, Sparkles, AlertCircle, Loader2, ArrowRight, Command, Mail, ShieldCheck, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:3000/auth';

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

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
    <div className="min-h-screen flex bg-[#0d0d0e] text-white selection:bg-focus-blue/30 overflow-hidden">
      {/* Visual Side Pane - Ultra High-End Abstract */}
      <div className="hidden lg:flex w-[45%] bg-[#09090b] border-r border-white/5 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-focus-blue/10 blur-[150px] rounded-full animate-pulse duration-[5s]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-600/5 blur-[150px] rounded-full animate-pulse duration-[7s]" />
          <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-focus-blue/5 blur-[120px] rounded-full" />
        </div>
        
        <div className="relative z-10 p-16 max-w-xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-14 h-14 bg-gradient-to-br from-focus-blue to-blue-700 rounded-2xl flex items-center justify-center mb-10 shadow-[0_0_40px_rgba(35,131,226,0.25)]"
          >
            <ShieldCheck size={32} className="text-white" strokeWidth={2.5} />
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-black mb-8 tracking-tighter leading-[0.95]"
          >
            The Operating System <br /> for Next-Gen Ops.
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/30 text-xl font-medium leading-relaxed mb-12 max-w-md"
          >
            Experience the fusion of deterministic task graphs and hyper-scale team intelligence.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-5"
          >
            <FeatureItem text="10k RPS Workspace Engine" />
            <FeatureItem text="End-to-End Encryption as Standard" />
            <FeatureItem text="Deterministic Team Hierarchy" />
          </motion.div>
        </div>

        <div className="absolute bottom-12 left-12 flex items-center gap-4 text-white/10">
          <div className="flex items-center gap-2">
            <Command size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Node_Core_Lattice</span>
          </div>
          <div className="w-1.5 h-1.5 bg-green-500/50 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Auth Form Pane */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 relative">
        {/* Subtle grid pattern for professional feel */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px] relative z-10"
        >
          <div className="mb-12 lg:hidden">
            <div className="w-12 h-12 bg-focus-blue rounded-xl flex items-center justify-center mb-8 shadow-xl shadow-focus-blue/20">
              <ShieldCheck size={24} />
            </div>
          </div>

          <div className="mb-12">
            <h1 className="text-4xl font-black tracking-tighter mb-3">
              {isLogin ? 'Sign In' : 'Join the Network'}
            </h1>
            <p className="text-white/30 text-[15px] font-medium tracking-tight">
              {isLogin ? 'Access your high-performance workspace.' : 'Initialize your professional orchestration profile.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <AuthInput 
                    label="Alias / Username" 
                    type="text" 
                    value={username} 
                    onChange={setUsername}
                    placeholder="e.g. jdoe_admin"
                    required
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AuthInput 
              label="Professional Email" 
              type="email" 
              value={email} 
              onChange={setEmail}
              placeholder="admin@enterprise.io"
              icon={<Mail size={16} />}
              required
            />

            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] pl-1">Secret Key</label>
                {isLogin && (
                  <button type="button" className="text-[10px] text-focus-blue hover:text-focus-blue/80 font-black uppercase tracking-[0.1em] transition-colors">
                    Reset Key
                  </button>
                )}
              </div>
              <AuthInput 
                type="password" 
                value={password} 
                onChange={setPassword}
                placeholder="••••••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div 
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-300 ${rememberMe ? 'bg-focus-blue border-focus-blue shadow-[0_0_15px_rgba(35,131,226,0.4)]' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}
                >
                  {rememberMe && <Check size={12} strokeWidth={4} className="text-white" />}
                </div>
                <span className="text-xs font-bold text-white/30 group-hover:text-white/50 transition-colors uppercase tracking-wider">Keep session alive</span>
              </label>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <p className="leading-relaxed">{error}</p>
                </motion.div>
              )}
              {message && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-400 text-xs font-bold"
                >
                  <Sparkles size={16} className="shrink-0" />
                  <p className="leading-relaxed">{message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4.5 bg-focus-blue text-white rounded-2xl font-black text-[13px] uppercase tracking-[0.15em] shadow-[0_20px_40px_-15px_rgba(35,131,226,0.5)] hover:bg-focus-blue/90 hover:scale-[1.01] hover:shadow-[0_25px_50px_-15px_rgba(35,131,226,0.6)] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Establish Link' : 'Initialize Profile'}</span>
                  <ArrowRight size={20} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <div className="mt-14">
            <div className="flex items-center gap-6 mb-10">
              <div className="h-px bg-white/5 flex-1" />
              <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">Enterprise SSO</span>
              <div className="h-px bg-white/5 flex-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SocialButton icon={<Command size={18} />} label="SAML 2.0" />
              <SocialButton icon={<Mail size={18} />} label="OAuth" />
            </div>
          </div>

          <div className="mt-14 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
              }}
              className="text-white/30 hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
            >
              {isLogin ? "New user? " : "Already established? "}
              <span className="text-focus-blue ml-1 underline decoration-focus-blue/30 underline-offset-4">{isLogin ? 'Join Workspace' : 'Sign In'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const AuthInput: React.FC<{ 
  label?: string, 
  type: string, 
  value: string, 
  onChange: (v: string) => void, 
  placeholder: string,
  icon?: React.ReactNode,
  required?: boolean
}> = ({ label, type, value, onChange, placeholder, icon, required }) => (
  <div>
    {label && <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2.5 pl-1">{label}</label>}
    <div className="relative group">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-5 py-4 bg-white/[0.025] border border-white/5 rounded-2xl text-[15px] font-medium focus:outline-none focus:border-focus-blue/40 focus:bg-white/[0.04] transition-all placeholder:text-white/5"
        placeholder={placeholder}
        required={required}
      />
      {icon && (
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white/5 group-focus-within:text-focus-blue/50 transition-colors pointer-events-none">
          {icon}
        </div>
      )}
    </div>
  </div>
);

const FeatureItem: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center gap-4 group cursor-default">
    <div className="w-6 h-6 rounded-lg bg-focus-blue/10 border border-focus-blue/20 flex items-center justify-center text-focus-blue group-hover:scale-110 transition-transform">
      <Check size={14} strokeWidth={3} />
    </div>
    <span className="text-[15px] font-bold text-white/50 group-hover:text-white/80 transition-colors tracking-tight">{text}</span>
  </div>
);

const SocialButton: React.FC<{ icon: React.ReactNode, label: string }> = ({ icon, label }) => (
  <button className="flex items-center justify-center gap-3 py-4 px-6 bg-white/[0.015] border border-white/5 rounded-2xl hover:bg-white/[0.04] hover:border-white/10 transition-all font-black text-[11px] uppercase tracking-widest text-white/30 hover:text-white">
    {icon}
    <span>{label}</span>
  </button>
);

import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { InlineMessage, SurfaceCardStrong, TextField } from '../shared/workspace';

const GRAPHQL_URL = 'http://localhost:3000/graphql';

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const response = await fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation SignIn($email: String!, $password: String!) { signIn(email: $email, password_raw: $password) { token } }`,
            variables: { email, password },
          }),
        });

        const data = await response.json();
        if (data.errors) throw new Error(data.errors[0].message || 'Unable to sign in');
        login(data.data.signIn.token);
      } else {
        const response = await fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation SignUp($email: String!, $username: String!, $password: String!) { signUp(email: $email, username: $username, password_raw: $password) }`,
            variables: { email, username, password },
          }),
        });

        const data = await response.json();
        if (data.errors) throw new Error(data.errors[0].message || 'Unable to create account');
        setMessage('Account created. Sign in with the same credentials to enter the workspace.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mesh-backdrop min-h-screen bg-app-bg px-4 py-10 md:px-8 md:py-14">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hero-gradient surface-card-strong relative overflow-hidden rounded-[36px] px-7 py-8 md:px-10 md:py-10">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-app-accent/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-app-accent-2/10 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-app-ink">
                <Sparkles size={16} className="text-app-accent" />
                Task-In
              </div>
              <h1 className="mt-6 max-w-xl text-4xl font-extrabold leading-[1.1] tracking-[-0.04em] text-app-ink md:text-5xl">
                The collaborative task engine with dependency intelligence.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-app-muted md:text-base">
                Task-In unites project management, relational task dependencies, and asynchronous outbox activity logs in a single, lightning-fast workspace designed for high-performance teams.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FeatureCard
                title="Dependency Graphs"
                description="Map relational links (blocking, child context) directly inside task views."
              />
              <FeatureCard
                title="Asynchronous Logs"
                description="Audit precise field changes and lifecycle deltas out-of-band."
              />
              <FeatureCard
                title="Optimistic Comments"
                description="Collaborate in real-time with version-locked comments and team tags."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <SurfaceCardStrong className="w-full rounded-[36px] px-6 py-7 md:px-8 md:py-8">
            <div className="mb-8">
              <p className="eyebrow mb-3">{isLogin ? 'Welcome back' : 'Create your account'}</p>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-app-ink">
                {isLogin ? 'Sign in to your workspace' : 'Start a new workspace session'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-app-muted">
                {isLogin
                  ? 'Sign in to continue where you left off.'
                  : 'Create an account to start managing your projects.'}
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
                required
              />

              {!isLogin ? (
                <TextField
                  label="Username"
                  value={username}
                  onChange={setUsername}
                  placeholder="How teammates will see you"
                  required
                />
              ) : null}

              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Your password"
                required
              />

              {error ? <InlineMessage tone="error" message={error} /> : null}
              {message ? <InlineMessage tone="success" message={message} /> : null}

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-app-accent px-5 py-4 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                {isLogin ? 'Sign in' : 'Create account'}
                {!isLoading ? <ArrowRight size={16} /> : null}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setMessage(null);
                }}
                className="text-xs font-semibold text-app-muted hover:text-app-accent transition-colors duration-300 cursor-pointer"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </SurfaceCardStrong>
        </div>
      </div>
    </div>
  );
};

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/60 p-5 backdrop-blur-sm">
      <div className="mb-4 inline-flex rounded-full bg-app-accent-soft p-2 text-app-accent">
        <CheckCircle2 size={16} />
      </div>
      <h3 className="text-lg font-semibold text-app-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-app-muted">{description}</p>
    </div>
  );
}

import { useState } from "react";
import { LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-400/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

const AuthView = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response =
        mode === "login"
          ? await login(email.trim(), password)
          : await register(name.trim(), email.trim(), password);

      if (!response?.success || !response?.user) {
        setError(response?.error || "Authentication failed.");
        return;
      }

      setName("");
      setEmail("");
      setPassword("");
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Unable to continue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <div className="pointer-events-none absolute -top-32 -left-20 h-80 w-80 rounded-full bg-cyan-300/40 blur-3xl dark:bg-cyan-700/20" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 rounded-full bg-indigo-300/40 blur-3xl dark:bg-indigo-700/20" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-7 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-6">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700 ring-1 ring-cyan-400/20 dark:text-cyan-200">
            <ShieldCheck className="h-4 w-4" /> Secure Access
          </p>
          <h1 className="display-font text-2xl font-semibold text-slate-900 dark:text-white">
            Welcome to TaskFlow-AI
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Sign in to access your personal workspace and AI task dashboard.
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/70">
          <button
            onClick={() => setMode("login")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
            type="button"
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "register"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
            type="button"
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
              placeholder="you@example.com"
              required
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={fieldClass}
                placeholder="Your name"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
              placeholder="at least 6 characters"
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {isSubmitting ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Quick start demo account: demo@example.com, password demo123
        </p>
      </div>
    </div>
  );
};

export default AuthView;

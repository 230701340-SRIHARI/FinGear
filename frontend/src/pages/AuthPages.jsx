import { BrainCircuit, Chrome, Landmark, LockKeyhole } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Field } from "../components/ui";
import { api, apiUrl } from "../lib/api";

function AuthShell({ children, title, subtitle }) {
  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="brand-line"><Landmark /> FinGear AI</div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </section>
      <Card className="auth-card" glow>{children}</Card>
    </main>
  );
}

export function Login() {
  const { login, isAuthenticated, authError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [google, setGoogle] = useState({ configured: false, message: "Checking Google login..." });
  const [callbackError, setCallbackError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (await login(form)) navigate("/dashboard");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get("google_error");
    if (googleError) setCallbackError(`Google login failed: ${googleError}`);
    api.auth.googleStatus()
      .then(setGoogle)
      .catch(() => setGoogle({ configured: false, message: "Google login status unavailable." }));
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  function startGoogleLogin() {
    if (google.configured) {
      window.location.href = apiUrl("/auth/google/start");
    }
  }

  return (
    <AuthShell title="Understand today. Predict tomorrow. Simulate before you decide.">
      <div className="auth-icon"><BrainCircuit /></div>
      <h2>Sign in</h2>
      <p className="muted">Use your registered email and password to sign in, or create a new account.</p>
      <form onSubmit={submit} className="stack">
        <Field label="Email"><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></Field>
        <Field label="Password"><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="••••••••" /></Field>
        {(callbackError || authError) && <div className="inline-error">{callbackError || authError}</div>}
        <Button type="submit"><LockKeyhole size={17} /> Login</Button>
        <Button type="button" variant="secondary" onClick={startGoogleLogin} disabled={!google.configured}><Chrome size={17} /> Continue with Google</Button>
        {!google.configured && <p className="muted">{google.message}</p>}
      </form>
      <p className="auth-link">New here? <Link to="/register">Create account</Link> · <Link to="/forgot-password">Forgot password</Link></p>
    </AuthShell>
  );
}

export function OAuthCallback() {
  const { completeExternalLogin, authError } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing Google login...");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const googleError = queryParams.get("google_error") || hashParams.get("google_error");
    const externalToken = queryParams.get("token") || hashParams.get("token");
    const nextPath = queryParams.get("next") || hashParams.get("next") || "/dashboard";

    if (googleError) {
      navigate(`/login?google_error=${encodeURIComponent(googleError)}`, { replace: true });
      return;
    }

    if (!externalToken) {
      navigate("/login?google_error=missing_token", { replace: true });
      return;
    }

    completeExternalLogin(externalToken).then((ok) => {
      if (ok) {
        window.history.replaceState(null, "", "/auth/callback");
        navigate(nextPath.startsWith("/") ? nextPath : "/dashboard", { replace: true });
      } else {
        setMessage(authError || "Google login could not be completed.");
        navigate("/login?google_error=token_validation_failed", { replace: true });
      }
    });
  }, []);

  return (
    <AuthShell title="Completing Google sign in" subtitle="FinGear AI is validating your secure session.">
      <div className="auth-icon"><BrainCircuit /></div>
      <h2>Signing you in</h2>
      <p className="muted">{message}</p>
    </AuthShell>
  );
}

export function Register() {
  const { register, authError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function submit(event) {
    event.preventDefault();
    if (await register(form)) navigate("/dashboard");
  }

  return (
    <AuthShell title="Create your financial operating system." subtitle="Each user receives isolated profile, goals, transactions, simulation history and copilot context.">
      <h2>Create account</h2>
      <form onSubmit={submit} className="stack">
        <Field label="Name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
        <Field label="Email"><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
        <Field label="Password"><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={6} /></Field>
        {authError && <div className="inline-error">{authError}</div>}
        <Button type="submit">Register</Button>
      </form>
      <p className="auth-link">Already registered? <Link to="/login">Sign in</Link></p>
    </AuthShell>
  );
}

export function ForgotPassword() {
  return (
    <AuthShell title="Password recovery" subtitle="Honest placeholder: email delivery is planned for the production deployment.">
      <h2>Forgot password</h2>
      <p className="muted">This feature is marked planned. Use local email/password login until email delivery is configured.</p>
      <Link to="/login"><Button>Back to login</Button></Link>
    </AuthShell>
  );
}

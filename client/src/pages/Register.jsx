import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import Brand from '../components/Brand.jsx';

// One-time setup: creates the first Manager account. Afterwards Managers add employees.
export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    api('/auth/setup-status')
      .then((s) => setNeedsSetup(s.needsSetup))
      .catch(() => setNeedsSetup(true));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (needsSetup === null) return <div className="center-screen">Loading…</div>;

  if (!needsSetup) {
    return (
      <div className="auth-page">
        <div className="auth-card form">
          <Brand stacked />
          <h2>Sign-up is closed</h2>
          <p className="center muted">Employee accounts are created by a Manager. Ask your Manager for your login details.</p>
          <Link to="/login" className="btn btn-primary btn-block center">
            Back to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card form" onSubmit={submit}>
        <Brand stacked />
        <h2>Create the Manager account</h2>
        <p className="center muted small">This first account manages employees, teams, projects and issues.</p>
        {error && <div className="alert">{error}</div>}
        <label>
          Full name
          <input value={form.name} onChange={set('name')} required autoFocus />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={set('password')} minLength={6} required />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="center small">
          <Link to="/login">Back to log in</Link>
        </p>
      </form>
    </div>
  );
}

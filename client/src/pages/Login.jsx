import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import Brand from '../components/Brand.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    api('/auth/setup-status')
      .then((s) => setNeedsSetup(s.needsSetup))
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card form" onSubmit={submit}>
        <Brand stacked />
        <h2>Log in to continue</h2>
        {error && <div className="alert">{error}</div>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        {needsSetup ? (
          <p className="center small">
            First time here? <Link to="/register">Create the Manager account</Link>
          </p>
        ) : (
          <p className="center small muted">No account? Ask your Manager to add you as an employee.</p>
        )}
      </form>
    </div>
  );
}

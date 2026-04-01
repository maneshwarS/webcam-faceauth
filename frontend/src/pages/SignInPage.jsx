import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { FaceScanner } from '../components/FaceScanner/FaceScanner';
import { InputField } from '../components/shared/InputField';
import { Button } from '../components/shared/Button';
import styles from '../components/AuthForm/AuthForm.module.css';
import sharedStyles from '../components/shared/shared.module.css';

const STEP = { CREDENTIALS: 'credentials', FACE_2FA: 'face_2fa', DONE: 'done' };

export default function SignInPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(STEP.CREDENTIALS);
  const [form, setForm] = useState({ email: '', password: '', rememberDevice: false });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [pendingUser, setPendingUser] = useState(null);

  async function handleSignIn(e) {
    e.preventDefault();
    const errs = {};
    if (!form.email) errs.email = 'Email required';
    if (!form.password) errs.password = 'Password required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setApiError('');
    setLoading(true);
    try {
      const res = await client.post('/api/auth/signin', {
        email: form.email.toLowerCase(),
        password: form.password,
        rememberDevice: form.rememberDevice,
      });
      if (res.data.pendingFace) {
        setTempToken(res.data.tempToken);
        setPendingUser(res.data.user);
        setStep(STEP.FACE_2FA);
      } else {
        // No face registered — direct login
        login(res.data.user, res.data.accessToken);
        navigate('/dashboard');
      }
    } catch (err) {
      setApiError(err.response?.data?.error || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFaceCapture(descriptor) {
    try {
      const res = await client.post('/api/face/verify', { descriptor }, {
        headers: { Authorization: `Bearer ${tempToken}` },
      });
      login(res.data.user, res.data.accessToken);
      setStep(STEP.DONE);
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err) {
      const msg = err.response?.data?.error || 'Face verification failed.';
      setApiError(msg);
      setStep(STEP.CREDENTIALS);
    }
  }

  function handleFaceError(reason) {
    setApiError(reason || 'Face scan failed. Please try signing in again.');
    setStep(STEP.CREDENTIALS);
  }

  if (step === STEP.DONE) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className={styles.card} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem' }}>✓</div>
          <h2 className={styles.title} style={{ textAlign: 'center' }}>Signed in!</h2>
        </div>
      </div>
    );
  }

  if (step === STEP.FACE_2FA) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', maxWidth: '600px', width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#f0f0f5', margin: 0 }}>Face Verification</h2>
            <p style={{ color: '#9090a8', margin: '0.5rem 0 0' }}>
              Welcome back, <strong style={{ color: '#d0d0e0' }}>{pendingUser?.name}</strong>. Verify it's you to complete sign-in.
            </p>
          </div>
          {apiError && <div className={styles.apiError} style={{ width: '100%', maxWidth: 480 }}>{apiError}</div>}
          <FaceScanner mode="verify" onCapture={handleFaceCapture} onError={handleFaceError} />
          <button
            style={{ background: 'none', border: 'none', color: '#9090a8', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
            onClick={() => { setStep(STEP.CREDENTIALS); setApiError(''); }}
          >
            ← Back to password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in with your email and password</p>

        {apiError && <div className={styles.apiError}>{apiError}</div>}

        <form className={styles.form} onSubmit={handleSignIn} noValidate>
          <InputField
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
            autoComplete="email"
          />
          <InputField
            id="password"
            label="Password"
            type="password"
            placeholder="Your password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            autoComplete="current-password"
          />
          <label className={sharedStyles.checkboxRow}>
            <input
              type="checkbox"
              checked={form.rememberDevice}
              onChange={(e) => setForm({ ...form, rememberDevice: e.target.checked })}
            />
            Remember this device for 30 days
          </label>
          <Button type="submit" fullWidth loading={loading}>
            Sign In
          </Button>
        </form>

        <div className={styles.divider}>or</div>

        <Button variant="ghost" fullWidth onClick={() => navigate('/face-login')}>
          Sign in with Face
        </Button>

        <div className={styles.footer}>
          <span>New here?</span>
          <Link to="/signup" style={{ color: '#00e5ff', textDecoration: 'underline', fontSize: '0.85rem' }}>
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

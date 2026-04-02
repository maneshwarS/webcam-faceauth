import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { FaceScanner } from '../components/FaceScanner/FaceScanner';
import { InputField } from '../components/shared/InputField';
import { Button } from '../components/shared/Button';
import styles from '../components/AuthForm/AuthForm.module.css';

const STEP = { CREDENTIALS: 1, FACE: 2, DONE: 3 };

export default function SignUpPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(STEP.CREDENTIALS);
  // Credentials live in local state only — no API call until face is also captured
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (form.password.length < 8) e.password = 'At least 8 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  }

  // Step 1: validate locally, advance to face capture — no API call yet
  function handleCredentials(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setApiError('');
    setStep(STEP.FACE);
  }

  // Step 2: face captured — now send credentials + descriptor together in one request
  async function handleFaceCapture(descriptor) {
    setLoading(true);
    setApiError('');
    try {
      const res = await client.post('/api/auth/signup', {
        name: form.name.trim(),
        email: form.email.toLowerCase(),
        password: form.password,
        descriptor,  // credentials + face sent atomically — no partial DB state possible
      });
      login(res.data.user, res.data.accessToken);
      setStep(STEP.DONE);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      // Face was captured fine but signup failed (e.g. email taken, server error)
      // Send user back to step 1 so they can correct the issue — no DB entry was created
      setApiError(err.response?.data?.error || 'Sign up failed. Please check your details and try again.');
      setStep(STEP.CREDENTIALS);
    } finally {
      setLoading(false);
    }
  }

  function handleFaceError(reason) {
    // Face scan failed — no API was ever called, nothing in DB
    setApiError(reason || 'Face capture failed. Please try again.');
    setStep(STEP.CREDENTIALS);
  }

  if (step === STEP.DONE) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className={styles.card} style={{ textAlign: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '3rem' }}>✓</div>
          <h2 className={styles.title} style={{ textAlign: 'center' }}>Account created!</h2>
          <p style={{ color: '#9090a8', margin: 0 }}>Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  if (step === STEP.FACE) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', maxWidth: '600px', width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#f0f0f5', margin: 0 }}>Register Your Face</h2>
            <p style={{ color: '#9090a8', margin: '0.5rem 0 0' }}>
              This enables face login and 2FA verification. Position your face in the frame.
            </p>
          </div>
          {apiError && <div className={styles.apiError} style={{ width: '100%', maxWidth: 480 }}>{apiError}</div>}
          {loading
            ? <div style={{ color: '#9090a8', padding: '2rem' }}>Creating your account…</div>
            : <FaceScanner mode="register" onCapture={handleFaceCapture} onError={handleFaceError} />
          }
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 20, height: 4, borderRadius: 2, background: 'linear-gradient(135deg, #00e5ff, #7c4dff)' }} />
            <div style={{ width: 20, height: 4, borderRadius: 2, background: 'linear-gradient(135deg, #00e5ff, #7c4dff)' }} />
          </div>
          <p style={{ color: '#606080', fontSize: '0.8rem', margin: 0 }}>Step 2 of 2</p>
          <button
            style={{ background: 'none', border: 'none', color: '#707090', cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline' }}
            onClick={() => { setApiError(''); setStep(STEP.CREDENTIALS); }}
          >
            ← Back to details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create account</h1>
        <p className={styles.subtitle}>Step 1 of 2 — your details</p>

        {apiError && <div className={styles.apiError}>{apiError}</div>}

        <form className={styles.form} onSubmit={handleCredentials} noValidate>
          <InputField
            id="name"
            label="Full name"
            type="text"
            placeholder="Jane Doe"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            autoComplete="name"
          />
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
            placeholder="Min 8 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
            autoComplete="new-password"
          />
          <InputField
            id="confirm"
            label="Confirm password"
            type="password"
            placeholder="Repeat password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            error={errors.confirm}
            autoComplete="new-password"
          />
          <Button type="submit" fullWidth>
            Continue to Face Setup →
          </Button>
        </form>

        <div className={styles.footer}>
          <span>Already have an account?</span>
          <Link to="/signin" style={{ color: '#00e5ff', textDecoration: 'underline', fontSize: '0.85rem' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

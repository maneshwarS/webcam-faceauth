import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { FaceScanner } from '../components/FaceScanner/FaceScanner';
import styles from '../components/AuthForm/AuthForm.module.css';
import sharedStyles from '../components/shared/shared.module.css';

export default function FaceLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [apiError, setApiError] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFaceCapture(descriptor) {
    try {
      const res = await client.post('/api/face/login', { descriptor, rememberDevice });
      login(res.data.user, res.data.accessToken);
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err) {
      const msg = err.response?.data?.error || 'Face not recognized. Please try again or use password sign-in.';
      setApiError(msg);
    }
  }

  function handleFaceError(reason) {
    setApiError(reason || 'Face scan failed. Please try again.');
  }

  if (done) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className={styles.card} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem' }}>✓</div>
          <h2 className={styles.title} style={{ textAlign: 'center' }}>Signed in!</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', maxWidth: '600px', width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#f0f0f5', margin: 0 }}>Face Sign-In</h2>
          <p style={{ color: '#9090a8', margin: '0.5rem 0 0' }}>
            Look at the camera and we'll identify you automatically.
          </p>
        </div>

        {apiError && (
          <div className={styles.apiError} style={{ width: '100%', maxWidth: 480 }}>
            {apiError}
            <button
              style={{ display: 'block', marginTop: '0.5rem', background: 'none', border: 'none', color: '#00e5ff', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem', padding: 0 }}
              onClick={() => setApiError('')}
            >
              Try again
            </button>
          </div>
        )}

        {!apiError && (
          <FaceScanner mode="faceLogin" onCapture={handleFaceCapture} onError={handleFaceError} />
        )}

        <label className={sharedStyles.checkboxRow}>
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
          />
          Remember this device for 30 days
        </label>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/signin" style={{ color: '#00e5ff', textDecoration: 'underline', fontSize: '0.85rem' }}>
            Use password instead
          </Link>
          <span style={{ color: '#606080' }}>·</span>
          <Link to="/signup" style={{ color: '#9090a8', textDecoration: 'underline', fontSize: '0.85rem' }}>
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}

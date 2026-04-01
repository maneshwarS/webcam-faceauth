import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FaceScanner } from '../components/FaceScanner/FaceScanner';
import { Button } from '../components/shared/Button';
import client from '../api/client';
import styles from '../components/AuthForm/AuthForm.module.css';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showFaceUpdate, setShowFaceUpdate] = useState(false);
  const [faceUpdateMsg, setFaceUpdateMsg] = useState('');

  async function handleSignOut() {
    await logout();
    navigate('/signin');
  }

  async function handleFaceReregister(descriptor) {
    try {
      await client.post('/api/face/register', { descriptor });
      setShowFaceUpdate(false);
      setFaceUpdateMsg('Face updated successfully!');
      setTimeout(() => setFaceUpdateMsg(''), 4000);
    } catch {
      setFaceUpdateMsg('Failed to update face. Please try again.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeInUp 0.4s ease' }}>
          <div>
            <h1 style={{ color: '#f0f0f5', margin: 0, fontSize: '1.5rem' }}>Dashboard</h1>
            <p style={{ color: '#9090a8', margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              Signed in as <strong style={{ color: '#d0d0e0' }}>{user?.email}</strong>
            </p>
          </div>
          <Button variant="secondary" onClick={handleSignOut}>Sign out</Button>
        </div>

        {/* Welcome card */}
        <div className={styles.card} style={{ gap: '0.5rem' }}>
          <p style={{ color: '#9090a8', fontSize: '0.85rem', margin: 0 }}>Welcome back</p>
          <h2 style={{ color: '#f0f0f5', margin: 0, fontSize: '1.8rem' }}>{user?.name}</h2>
          <p style={{ color: '#707090', margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
            You're securely authenticated with facial recognition enabled.
          </p>
        </div>

        {/* Face ID management */}
        <div className={styles.card}>
          <h3 style={{ color: '#d0d0e0', margin: '0 0 0.5rem', fontSize: '1rem' }}>Face ID</h3>
          <p style={{ color: '#9090a8', fontSize: '0.85rem', margin: '0 0 1rem' }}>
            Update your registered face if it's not recognizing you well (e.g., new glasses, lighting changes).
          </p>
          {faceUpdateMsg && (
            <div style={{
              padding: '0.5rem 0.75rem',
              background: faceUpdateMsg.includes('success') ? 'rgba(105, 240, 174, 0.06)' : 'rgba(255, 82, 82, 0.06)',
              border: `1px solid ${faceUpdateMsg.includes('success') ? 'rgba(105, 240, 174, 0.2)' : 'rgba(255, 82, 82, 0.2)'}`,
              borderRadius: '10px',
              color: faceUpdateMsg.includes('success') ? '#69f0ae' : '#ff8a80',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              backdropFilter: 'blur(8px)',
            }}>
              {faceUpdateMsg}
            </div>
          )}
          {showFaceUpdate ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <FaceScanner mode="register" onCapture={handleFaceReregister} onError={() => setShowFaceUpdate(false)} />
              <Button variant="secondary" onClick={() => setShowFaceUpdate(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setShowFaceUpdate(true)}>Update Face ID</Button>
          )}
        </div>

        {/* Auth info */}
        <div className={styles.card}>
          <h3 style={{ color: '#d0d0e0', margin: '0 0 0.75rem', fontSize: '1rem' }}>Account info</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <tbody>
              {[
                ['Name', user?.name],
                ['Email', user?.email],
                ['User ID', `#${user?.id}`],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ color: '#9090a8', padding: '0.4rem 0', width: '120px' }}>{k}</td>
                  <td style={{ color: '#d0d0e0' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

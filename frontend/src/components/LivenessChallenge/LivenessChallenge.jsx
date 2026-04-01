import { useState, useEffect, useRef } from 'react';
import styles from './LivenessChallenge.module.css';

// Eye Aspect Ratio — ratio drops below threshold during a blink
function eyeAspectRatio(landmarks, eyePoints) {
  const pts = eyePoints.map((i) => landmarks.positions[i]);
  const A = Math.hypot(pts[1].x - pts[5].x, pts[1].y - pts[5].y);
  const B = Math.hypot(pts[2].x - pts[4].x, pts[2].y - pts[4].y);
  const C = Math.hypot(pts[0].x - pts[3].x, pts[0].y - pts[3].y);
  return (A + B) / (2 * C);
}

// face-api 68-landmark indices for each eye
const LEFT_EYE  = [36, 37, 38, 39, 40, 41];
const RIGHT_EYE = [42, 43, 44, 45, 46, 47];
const BLINK_THRESHOLD = 0.22;
const BLINK_FRAMES = 2;
const CHALLENGE_TIMEOUT = 12000; // 12 seconds

export function LivenessChallenge({ onSuccess, onFailure, detectionRef }) {
  const challenge = useRef(Math.random() < 0.5 ? 'blink' : 'smile');
  const [timeLeft, setTimeLeft] = useState(12);
  const blinkFrameCount = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          onFailure('Liveness check timed out. Please try again.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onFailure]);

  useEffect(() => {
    let rafId;
    function check() {
      const det = detectionRef.current;
      if (det) {
        if (challenge.current === 'blink' && det.landmarks) {
          const leftEAR  = eyeAspectRatio(det.landmarks, LEFT_EYE);
          const rightEAR = eyeAspectRatio(det.landmarks, RIGHT_EYE);
          const avgEAR   = (leftEAR + rightEAR) / 2;
          if (avgEAR < BLINK_THRESHOLD) {
            blinkFrameCount.current += 1;
            if (blinkFrameCount.current >= BLINK_FRAMES) {
              onSuccess();
              return;
            }
          } else {
            blinkFrameCount.current = 0;
          }
        } else if (challenge.current === 'smile' && det.expressions) {
          if (det.expressions.happy > 0.7) {
            onSuccess();
            return;
          }
        }
      }
      rafId = requestAnimationFrame(check);
    }
    rafId = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafId);
  }, [onSuccess, detectionRef]);

  return (
    <div className={styles.container}>
      <div className={styles.challengeBox}>
        <div className={styles.icon}>
          {challenge.current === 'blink' ? '👁️' : '😊'}
        </div>
        <p className={styles.prompt}>
          {challenge.current === 'blink'
            ? 'Please blink your eyes'
            : 'Please smile'}
        </p>
        <p className={styles.sub}>Liveness check — {timeLeft}s remaining</p>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(timeLeft / 12) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

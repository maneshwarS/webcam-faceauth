import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebcam } from '../../hooks/useWebcam';
import { useFaceApi } from '../../hooks/useFaceApi';
import { LivenessChallenge } from '../LivenessChallenge/LivenessChallenge';
import styles from './FaceScanner.module.css';

// Detection thresholds — relaxed so normal head positions pass easily
const MIN_CONFIDENCE      = 0.5;   // SSD MobileNet scores vary with angle/lighting
const MIN_FACE_WIDTH_RATIO = 0.10; // face box must be ≥10% of frame width
const QUALITY_PASS_FRAMES  = 2;    // 2 consecutive passing frames before liveness

const PHASE = {
  IDLE: 'IDLE', LOADING: 'LOADING', CAMERA: 'CAMERA',
  SCANNING: 'SCANNING', QUALITY: 'QUALITY',
  LIVENESS: 'LIVENESS', CAPTURED: 'CAPTURED', ERROR: 'ERROR',
};

// Detection sub-state drives the progress panel (independent of phase)
const DETECT = { NONE: 'none', FOUND: 'found', QUALITY: 'quality', LIVENESS: 'liveness', DONE: 'done' };

export function FaceScanner({ mode, onCapture, onError }) {
  const canvasRef   = useRef(null);
  const phaseRef    = useRef(PHASE.IDLE);
  const qualityPassCount = useRef(0);
  const capturedDescriptor = useRef(null);

  const [phase, setPhase]           = useState(PHASE.IDLE);
  const [errorMsg, setErrorMsg]     = useState('');
  const [detectState, setDetectState] = useState(DETECT.NONE);
  const [qualityFrames, setQualityFrames] = useState(0); // 0-3, drives progress bar
  const [confidence, setConfidence] = useState(0);       // 0-1 for display

  const { videoRef, isReady: camReady, error: camError, startWebcam, stopWebcam } = useWebcam();
  const { modelsReady, loadError, lastDetectionRef, initModels, resetAndReload, startDetection, stopDetection } = useFaceApi();

  const transitionTo = useCallback((p) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // Phase 1: load models
  useEffect(() => {
    transitionTo(PHASE.LOADING);
    initModels();
  }, []);

  // Phase 2: start camera once models are ready
  useEffect(() => {
    if (modelsReady) {
      transitionTo(PHASE.CAMERA);
      startWebcam();
    }
  }, [modelsReady]);

  useEffect(() => {
    if (loadError) { setErrorMsg(loadError); transitionTo(PHASE.ERROR); }
  }, [loadError]);

  useEffect(() => {
    if (camError) { setErrorMsg(camError); transitionTo(PHASE.ERROR); }
  }, [camError]);

  // Phase 3: detection loop once camera is ready
  useEffect(() => {
    if (!camReady) return;
    transitionTo(PHASE.SCANNING);
    qualityPassCount.current = 0;
    setQualityFrames(0);
    setDetectState(DETECT.NONE);
    setConfidence(0);

    startDetection(videoRef.current, canvasRef.current, (detection) => {
      const currentPhase = phaseRef.current;
      if (currentPhase !== PHASE.SCANNING && currentPhase !== PHASE.QUALITY) return;

      // No face found at all
      if (!detection) {
        qualityPassCount.current = 0;
        setQualityFrames(0);
        setConfidence(0);
        setDetectState(DETECT.NONE);
        if (currentPhase === PHASE.QUALITY) transitionTo(PHASE.SCANNING);
        return;
      }

      const score  = detection.detection.score;
      const box    = detection.detection.box;
      const videoW = videoRef.current?.videoWidth || 640;
      const ratio  = box.width / videoW;

      setConfidence(score);

      // Face detected but below quality thresholds
      if (score < MIN_CONFIDENCE || ratio < MIN_FACE_WIDTH_RATIO) {
        qualityPassCount.current = 0;
        setQualityFrames(0);
        setDetectState(DETECT.FOUND);
        if (currentPhase === PHASE.QUALITY) transitionTo(PHASE.SCANNING);
        return;
      }

      // Face passes quality — accumulate frames
      qualityPassCount.current += 1;
      setQualityFrames(Math.min(qualityPassCount.current, QUALITY_PASS_FRAMES));
      setDetectState(DETECT.QUALITY);

      if (currentPhase === PHASE.SCANNING) transitionTo(PHASE.QUALITY);

      if (qualityPassCount.current >= QUALITY_PASS_FRAMES) {
        capturedDescriptor.current = Array.from(detection.descriptor);
        setDetectState(DETECT.LIVENESS);
        transitionTo(PHASE.LIVENESS);
      }
    });

    return () => stopDetection();
  }, [camReady]);

  useEffect(() => () => { stopDetection(); stopWebcam(); }, []);

  const handleLivenessSuccess = useCallback(() => {
    setDetectState(DETECT.DONE);
    transitionTo(PHASE.CAPTURED);
    stopWebcam();
    onCapture(capturedDescriptor.current);
  }, [onCapture, stopWebcam, transitionTo]);

  const handleLivenessFailure = useCallback((reason) => {
    setErrorMsg(reason);
    transitionTo(PHASE.ERROR);
    stopWebcam();
    if (onError) onError(reason);
  }, [onError, stopWebcam, transitionTo]);

  const handleRetry = useCallback(() => {
    setErrorMsg('');
    setDetectState(DETECT.NONE);
    setQualityFrames(0);
    setConfidence(0);
    qualityPassCount.current = 0;
    capturedDescriptor.current = null;

    if (!modelsReady) {
      // Models failed to load — reset singleton and reload from scratch.
      // resetAndReload sets modelsReady → triggers the modelsReady effect → starts webcam.
      transitionTo(PHASE.LOADING);
      resetAndReload();
    } else {
      // Models are fine — just restart the camera
      transitionTo(PHASE.CAMERA);
      startWebcam();
    }
  }, [modelsReady, resetAndReload, startWebcam, transitionTo]);

  // ── Derived UI values ────────────────────────────────────────
  const videoActive = [PHASE.SCANNING, PHASE.QUALITY, PHASE.LIVENESS].includes(phase);

  const wrapperBorderClass =
    detectState === DETECT.DONE     ? styles.videoWrapperDone    :
    detectState === DETECT.QUALITY  ? styles.videoWrapperQuality :
    detectState === DETECT.LIVENESS ? styles.videoWrapperDone    :
    detectState === DETECT.FOUND    ? styles.videoWrapperFound   :
    styles.videoWrapperNone;

  const pillInfo = {
    [DETECT.NONE]:     { pill: styles.pillNone,     dot: styles.dotNone,     text: 'Looking for your face…' },
    [DETECT.FOUND]:    { pill: styles.pillFound,    dot: styles.dotFound,    text: 'Face detected — move closer or improve lighting' },
    [DETECT.QUALITY]:  { pill: styles.pillQuality,  dot: styles.dotQuality,  text: 'Face locked — hold still…' },
    [DETECT.LIVENESS]: { pill: styles.pillLiveness, dot: styles.dotLiveness, text: 'Complete the challenge below' },
    [DETECT.DONE]:     { pill: styles.pillDone,     dot: styles.dotDone,     text: 'Face captured!' },
  }[detectState];

  const confidencePct = Math.round(confidence * 100);
  const confBarColor  =
    confidence >= MIN_CONFIDENCE ? '#00e5ff' :
    confidence > 0.4             ? '#ffd740' : '#ff5252';

  const modeLabel = mode === 'register' ? 'Register Your Face'
    : mode === 'verify'    ? 'Face Verification'
    : 'Sign In with Face';

  return (
    <div className={styles.container}>
      <h3 style={{ color: '#d0d0e0', marginBottom: '0.25rem' }}>{modeLabel}</h3>

      {/* Loading / camera-starting placeholder */}
      {[PHASE.LOADING, PHASE.CAMERA].includes(phase) && (
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner} />
          <span>{phase === PHASE.LOADING ? 'Loading face detection models…' : 'Starting camera…'}</span>
        </div>
      )}

      {phase === PHASE.ERROR && (
        <div className={styles.errorBox}>
          <p>{errorMsg || 'An error occurred.'}</p>
          <button
            onClick={handleRetry}
            style={{ marginTop: '0.75rem', padding: '0.4rem 1rem', cursor: 'pointer', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #00e5ff, #7c4dff)', color: '#000', fontWeight: 600, boxShadow: '0 0 15px rgba(0,229,255,0.25)' }}
          >
            Try Again
          </button>
        </div>
      )}

      {phase === PHASE.CAPTURED && (
        <div className={styles.loadingSpinner} style={{ background: 'rgba(105, 240, 174, 0.06)', borderRadius: 16 }}>
          <span style={{ fontSize: '2.5rem', textShadow: '0 0 20px rgba(105, 240, 174, 0.5)' }}>✓</span>
          <span style={{ color: '#69f0ae', fontWeight: 600 }}>Face captured successfully!</span>
        </div>
      )}

      {/* Video + canvas — always mounted so videoRef is valid when startWebcam runs */}
      <div
        className={`${styles.videoWrapper} ${wrapperBorderClass}`}
        style={{ display: videoActive ? 'block' : 'none' }}
      >
        <video ref={videoRef} className={styles.video} muted playsInline />
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>

      {/* Progress panel — visible while scanning/quality/liveness */}
      {videoActive && (
        <div className={styles.progressPanel}>

          {/* Status pill */}
          <div className={`${styles.statusPill} ${pillInfo.pill}`}>
            <span className={`${styles.dot} ${pillInfo.dot}`} />
            {pillInfo.text}
          </div>

          {/* Confidence score bar */}
          <div>
            <div className={styles.progressRow}>
              <span className={styles.progressLabel}>Detection confidence</span>
              <span className={styles.progressValue}>{confidencePct}%</span>
            </div>
            <div className={styles.bar}>
              <div
                className={styles.barFill}
                style={{ width: `${confidencePct}%`, background: confBarColor }}
              />
            </div>
          </div>

          {/* Quality frames progress */}
          <div>
            <div className={styles.progressRow}>
              <span className={styles.progressLabel}>Quality check</span>
              <span className={styles.progressValue}>{qualityFrames} / {QUALITY_PASS_FRAMES} frames</span>
            </div>
            <div className={styles.frameDots}>
              {Array.from({ length: QUALITY_PASS_FRAMES }).map((_, i) => (
                <span
                  key={i}
                  className={[
                    styles.frameDot,
                    i < qualityFrames         ? styles.frameDotFilled : '',
                    i === qualityFrames && detectState === DETECT.QUALITY ? styles.frameDotActive : '',
                  ].join(' ')}
                />
              ))}
              <span style={{ fontSize: '0.78rem', color: '#707090', marginLeft: 4 }}>
                {qualityFrames >= QUALITY_PASS_FRAMES
                  ? '✓ Ready'
                  : qualityFrames > 0
                  ? 'Hold still…'
                  : confidence > 0
                  ? 'Move closer / face the camera'
                  : 'No face detected'}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Liveness challenge */}
      {phase === PHASE.LIVENESS && (
        <LivenessChallenge
          onSuccess={handleLivenessSuccess}
          onFailure={handleLivenessFailure}
          detectionRef={lastDetectionRef}
        />
      )}
    </div>
  );
}

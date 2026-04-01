import { useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

// Module-level singleton — models load once per page session
let modelsLoaded = false;
let loadingPromise = null;

async function loadModels() {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  // face-api.js auto-detects the browser environment — no monkeyPatch needed.
  // All five required nets are loaded here so every chained call below works.
  loadingPromise = Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
  ]).then(() => {
    modelsLoaded = true;
  }).catch((err) => {
    // Reset so the next call retries from scratch
    loadingPromise = null;
    throw err;
  });

  return loadingPromise;
}

export function useFaceApi() {
  const [modelsReady, setModelsReady]   = useState(false);
  const [loadError, setLoadError]       = useState(null);
  const animationFrameRef               = useRef(null);
  const isDetectingRef                  = useRef(false);
  const lastDetectionRef                = useRef(null);

  const initModels = useCallback(async () => {
    setLoadError(null);
    try {
      await loadModels();
      setModelsReady(true);
    } catch (err) {
      console.error('face-api model load error:', err);
      setLoadError('Failed to load face detection models. Please try again.');
    }
  }, []);

  // Called by FaceScanner's "Try Again" when models failed — resets singleton then reloads
  const resetAndReload = useCallback(() => {
    modelsLoaded = false;
    loadingPromise = null;
    setModelsReady(false);
    setLoadError(null);
    initModels();
  }, [initModels]);

  const startDetection = useCallback((videoEl, canvasEl, onDetection) => {
    if (!modelsLoaded) return;

    async function loop() {
      if (!videoEl || videoEl.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }
      if (isDetectingRef.current) {
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      isDetectingRef.current = true;
      try {
        const detection = await faceapi
          .detectSingleFace(videoEl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
          .withFaceLandmarks()
          .withFaceDescriptor()
          .withFaceExpressions(); // faceExpressionNet is now loaded — this won't throw

        lastDetectionRef.current = detection || null;

        if (canvasEl && detection) {
          const dims = faceapi.matchDimensions(canvasEl, {
            width: videoEl.videoWidth,
            height: videoEl.videoHeight,
          });
          const resized = faceapi.resizeResults(detection, dims);
          const ctx = canvasEl.getContext('2d');
          ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
          faceapi.draw.drawDetections(canvasEl, resized);
          faceapi.draw.drawFaceLandmarks(canvasEl, resized);
        } else if (canvasEl) {
          canvasEl.getContext('2d').clearRect(0, 0, canvasEl.width, canvasEl.height);
        }

        if (onDetection) onDetection(detection || null);
      } catch (err) {
        console.error('Detection loop error:', err);
        if (onDetection) onDetection(null);
      }

      isDetectingRef.current = false;
      animationFrameRef.current = requestAnimationFrame(loop);
    }

    animationFrameRef.current = requestAnimationFrame(loop);
  }, [modelsLoaded]);

  const stopDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isDetectingRef.current = false;
  }, []);

  return { modelsReady, loadError, lastDetectionRef, initModels, resetAndReload, startDetection, stopDetection };
}

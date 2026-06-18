import { useEffect, useRef } from 'react';
import { initMediaPipe } from '../services/MediaPipeService';
import { processTrackingResults } from '../services/TrackingService';
import useTrackingStore from '../store/useTrackingStore';

/**
 * Hook: initializes MediaPipe FaceLandmarker and starts the rAF tracking loop.
 *
 * @param {React.RefObject<HTMLVideoElement>} videoRef - the live webcam video element
 * @param {object} manualOffsets - { x, y, z, scale } fine-tune sliders
 * @param {boolean} enabled - pause tracking when manual mode is on
 */
export function useFaceLandmarker(videoRef, manualOffsets, enabled) {
  const rafRef       = useRef(null);
  const landmarkerRef = useRef(null);
  const setTracked   = useTrackingStore((s) => s.setFaceTracked);

  useEffect(() => {
    let alive = true;

    const setup = async () => {
      try {
        landmarkerRef.current = await initMediaPipe();
        if (!alive) return;
        startLoop();
      } catch (err) {
        console.error('[useFaceLandmarker] init failed:', err);
        setTracked(false);
      }
    };

    const startLoop = () => {
      const loop = () => {
        if (!alive) return;
        rafRef.current = requestAnimationFrame(loop);

        const video = videoRef.current?.video ?? videoRef.current;
        if (!enabled || !video || video.readyState < 2 || !landmarkerRef.current) return;

        // Avoid re-processing the same video frame
        if (video.currentTime === video._lastProcessed) return;
        video._lastProcessed = video.currentTime;

        const results = landmarkerRef.current.detectForVideo(video, performance.now());
        processTrackingResults(results, manualOffsets);
      };
      loop();
    };

    setup();

    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setTracked(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

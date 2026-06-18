import Webcam from 'react-webcam';
import { useFaceLandmarker } from '../hooks/useFaceLandmarker';

/**
 * WebcamTracker
 *
 * ── JEELIZ ANALYSIS ─────────────────────────────────────────────────────────
 * Jeeliz uses a <canvas> element (not <video>) as the video background:
 *   <canvas className='mirrorX' ref={faceFilterCanvasRef}
 *     style={{ position:'fixed', zIndex:1 }} />
 *
 * The video is rendered into this canvas via WebGL by JEELIZFACEFILTER.render_video().
 * Mirror is applied via CSS: .mirrorX { transform: scaleX(-1) }
 *
 * ── MEDIAPIPE EQUIVALENT ────────────────────────────────────────────────────
 * We use react-webcam (which renders a <video> element) as the video background.
 * Mirror is applied by react-webcam's mirrored={true} prop (adds CSS scaleX(-1)).
 *
 * NOTE: The Three.js Canvas (Scene3D) is ALSO CSS-mirrored with transform:scaleX(-1)
 * so that the 3D glasses appear in the correct mirrored orientation to match the
 * reflected webcam view — exactly as Jeeliz's mirrorX class does.
 *
 * zIndex:1 puts the video below the Three.js Canvas (zIndex:2).
 */
export function WebcamTracker({ webcamRef, manualOffsets, enabled }) {
  useFaceLandmarker(webcamRef, manualOffsets, enabled);

  return (
    <Webcam
      ref={webcamRef}
      audio={false}
      mirrored={true}      // CSS scaleX(-1) — matches Jeeliz mirrorX class
      screenshotFormat="image/jpeg"
      videoConstraints={{ facingMode: 'user', width: 1280, height: 720 }}
      style={{
        position:  'absolute',
        top:       0,
        left:      0,
        width:     '100%',
        height:    '100%',
        objectFit: 'cover',
        zIndex:    1,      // below Three.js canvas (Jeeliz zIndex:1)
      }}
    />
  );
}

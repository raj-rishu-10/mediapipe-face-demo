import * as THREE from 'three';
import useTrackingStore from '../store/useTrackingStore';
import { extractHeadPose } from '../utils/HeadPose';
import {
  computeEyeCenter, computeFaceScale, eyeCenterToWorld,
  computePD, detectFaceShape, getFrameRecommendations,
  LM,
} from '../utils/FaceScale';
import {
  QuaternionSmoother, ScalarSmoother, OneEuroVector3,
} from '../utils/Smoothing';

// Module-level smoothers — persist across React re-renders, reset on tracking loss
const _posSmoother   = new OneEuroVector3(1.2, 0.008);
const _rotSmoother   = new QuaternionSmoother(0.22);
const _scaleSmoother = new ScalarSmoother(0.15);

// FPS counter
let _fpsFrames = 0;
let _fpsTime   = performance.now();
let _currentFps = 0;

/**
 * Process one frame of MediaPipe FaceLandmarker results.
 * Called from useFaceLandmarker's rAF loop at ~60 FPS.
 *
 * @param {FaceLandmarkerResult} results
 * @param {{ x, y, z, scale }} manualOffsets — slider fine-tune values
 */
export function processTrackingResults(results, manualOffsets = {}) {
  const store = useTrackingStore.getState();
  const now = performance.now();

  // ── FPS counter ──────────────────────────────────────────────────────────
  _fpsFrames++;
  if (now - _fpsTime >= 1000) {
    _currentFps = _fpsFrames;
    store.updateDebug({ fps: _currentFps });
    _fpsFrames = 0;
    _fpsTime   = now;
  }

  // ── No face detected ─────────────────────────────────────────────────────
  if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
    if (store.isFaceTracked) store.setFaceTracked(false);
    
    // Log frame-by-frame debug info when no face is detected
    console.log(
      `[Tracking] Frame - Face Detected: false | Landmarks: 0 | EyeCenter: N/A | TempleDist: N/A | FaceWidth: N/A | Scale: N/A | Quat: N/A | PoseMatrix: N/A | FPS: ${_currentFps}`
    );
    return;
  }

  const landmarks = results.faceLandmarks[0];

  // ── 1. Eye center ────────────────────────────────────────────────────────
  const eyeCenter = computeEyeCenter(landmarks);
  const eyeWorldXY = eyeCenterToWorld(eyeCenter.x, eyeCenter.y);

  // ── 2. Head pose matrix ──────────────────────────────────────────────────
  let finalPos  = eyeWorldXY.clone();
  let finalQuat = new THREE.Quaternion();
  let matrixDataString = 'Identity';

  const hasMatrix = results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0;

  if (hasMatrix) {
    const rawMatrix = results.facialTransformationMatrixes[0];
    const { worldPos, quaternion } = extractHeadPose(rawMatrix);

    // Format matrix data for logging
    if (rawMatrix.data) {
      matrixDataString = Array.from(rawMatrix.data).map(v => v.toFixed(3)).join(', ');
    }

    // Use eye-center XY for horizontal accuracy + matrix Z for depth
    finalPos.x = eyeWorldXY.x + (manualOffsets.x || 0);
    finalPos.y = eyeWorldXY.y + (manualOffsets.y || 0);
    finalPos.z = worldPos.z   + (manualOffsets.z || 0);
    finalQuat  = quaternion;
  } else {
    // Fallback: no matrix — estimate Z from scale heuristic
    const scale  = computeFaceScale(landmarks);
    finalPos.z   = -3 - (18 - scale) * 0.08;
    
    // Add manual offsets
    finalPos.x += (manualOffsets.x || 0);
    finalPos.y += (manualOffsets.y || 0);
    finalPos.z += (manualOffsets.z || 0);
  }

  // ── 3. Dynamic scale ─────────────────────────────────────────────────────
  const rawScale = computeFaceScale(landmarks);
  const userScaleFactor = (manualOffsets.scale !== undefined)
    ? manualOffsets.scale / 18
    : 1.0;
  const targetScale = rawScale * userScaleFactor;

  // ── 4. Smooth (One-Euro / Exponential filters) ──────────────────────────
  const smoothPos   = _posSmoother.filter(finalPos, now / 1000);
  const smoothQuat  = _rotSmoother.filter(finalQuat);
  const smoothScale = _scaleSmoother.filter(targetScale);

  // ── 5. Push to Zustand store (read by FaceAnchor's useFrame at 60 FPS) ──
  store.updateTracking(smoothPos, smoothQuat, smoothScale);

  // ── 6. Log frame-by-frame debug info ─────────────────────────────────────
  const lt = landmarks[LM.LEFT_TEMPLE];
  const rt = landmarks[LM.RIGHT_TEMPLE];
  const templeDist = Math.hypot(rt.x - lt.x, rt.y - lt.y);
  const faceWidth = templeDist; // Face width corresponds to normalized temple distance

  console.log(
    `[Tracking] Frame - Face Detected: true ` +
    `| Landmarks: ${landmarks.length} ` +
    `| EyeCenter: (${eyeCenter.x.toFixed(3)}, ${eyeCenter.y.toFixed(3)}) ` +
    `| TempleDist: ${templeDist.toFixed(4)} ` +
    `| FaceWidth: ${faceWidth.toFixed(4)} ` +
    `| Scale: ${smoothScale.toFixed(3)} ` +
    `| Quat: (${smoothQuat.x.toFixed(3)}, ${smoothQuat.y.toFixed(3)}, ${smoothQuat.z.toFixed(3)}, ${smoothQuat.w.toFixed(3)}) ` +
    `| PoseMatrix: [${matrixDataString}] ` +
    `| FPS: ${_currentFps}`
  );

  // ── 7. Debug data for UI (low freq) ──────────────────────────────────────
  store.updateDebug({
    templeDistance:  templeDist,
    scale:           smoothScale,
    pd:              Math.round(computePD(landmarks)),
    faceShape:       detectFaceShape(landmarks),
    recommendations: getFrameRecommendations(detectFaceShape(landmarks)),
    eyeCenter,
    landmarks,
  });
}

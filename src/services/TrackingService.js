import * as THREE from 'three';
import useTrackingStore from '../store/useTrackingStore';
import { extractHeadPose } from '../utils/HeadPose';
import {
  computeEyeCenter, computeFaceScale, eyeCenterToWorld,
  computePD, detectFaceShape, getFrameRecommendations,
  LM,
} from '../utils/FaceScale';
import {
  Vector3Smoother, QuaternionSmoother, ScalarSmoother, OneEuroVector3,
} from '../utils/Smoothing';

/**
 * TrackingService
 *
 * Stateless per-frame processor — the MediaPipe equivalent of Jeeliz's
 * JeelizThreeFiberHelper.update() → update_poses() pipeline.
 *
 * ── JEELIZ → MEDIAPIPE CONCEPT MAP ─────────────────────────────────────────
 *
 * Jeeliz concept       │ MediaPipe equivalent
 * ─────────────────────┼───────────────────────────────────────────────────
 * detectState.detected │ results.faceLandmarks.length > 0
 * detectState.x, y     │ eye center from landmarks 33 + 263 (mirrored)
 * detectState.s        │ temple-to-temple distance landmarks 234 + 454
 * detectState.rx       │ facialTransformationMatrixes[0] — pitch component
 * detectState.ry       │ facialTransformationMatrixes[0] — yaw component
 * detectState.rz       │ facialTransformationMatrixes[0] — roll component
 * threeCompositeObject │ FaceAnchor <group ref> in React Three Fiber
 * _scaleW              │ normalized landmark coordinates (already [0,1])
 * halfTanFOVX          │ baked into eyeCenterToWorld() linear mapping
 * pivotOffsetYZ        │ applied inside extractHeadPose()
 * rotationOffsetX      │ applied inside extractHeadPose()
 *
 * ── SMOOTHING MAP ───────────────────────────────────────────────────────────
 * Jeeliz smoothing (internal IIR ~0.7 pos / ~0.5 rot)
 *   position  → One-Euro filter (adaptive, best for MediaPipe noise)
 *   rotation  → Quaternion slerp IIR  alpha=0.22
 *   scale     → Scalar IIR           alpha=0.15
 */

// Module-level smoothers — persist across React re-renders, reset on tracking loss
const _posSmoother   = new OneEuroVector3(1.2, 0.008);
const _rotSmoother   = new QuaternionSmoother(0.22);
const _scaleSmoother = new ScalarSmoother(0.15);

// FPS counter
let _fpsFrames = 0;
let _fpsTime   = performance.now();

// Reusable Three.js objects to avoid GC
const _eyeWorld = new THREE.Vector3();

/**
 * Process one frame of MediaPipe FaceLandmarker results.
 * Called from useFaceLandmarker's rAF loop at ~60 FPS.
 *
 * @param {FaceLandmarkerResult} results
 * @param {{ x, y, z, scale }} manualOffsets — slider fine-tune values
 */
export function processTrackingResults(results, manualOffsets = {}) {
  const store = useTrackingStore.getState();

  // ── FPS counter ──────────────────────────────────────────────────────────
  _fpsFrames++;
  const now = performance.now();
  if (now - _fpsTime >= 1000) {
    store.updateDebug({ fps: _fpsFrames });
    _fpsFrames = 0;
    _fpsTime   = now;
  }

  // ── No face detected ─────────────────────────────────────────────────────
  if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
    if (store.isFaceTracked) store.setFaceTracked(false);
    return;
  }

  const landmarks = results.faceLandmarks[0];

  // ── 1. Eye center (Jeeliz x, y) ─────────────────────────────────────────
  const eyeCenter = computeEyeCenter(landmarks);
  const eyeWorldXY = eyeCenterToWorld(eyeCenter.x, eyeCenter.y);

  // ── 2. Head pose matrix (Jeeliz rx, ry, rz) ─────────────────────────────
  let finalPos  = eyeWorldXY.clone();
  let finalQuat = new THREE.Quaternion();

  if (
    results.facialTransformationMatrixes &&
    results.facialTransformationMatrixes.length > 0
  ) {
    const { worldPos, quaternion } = extractHeadPose(
      results.facialTransformationMatrixes[0]
    );

    // Use eye-center XY for horizontal accuracy + matrix Z for depth
    // (Jeeliz uses its own x,y,s→D pipeline for all 3 axes)
    finalPos.x = eyeWorldXY.x + (manualOffsets.x || 0);
    finalPos.y = eyeWorldXY.y + (manualOffsets.y || 0);
    finalPos.z = worldPos.z   + (manualOffsets.z || 0);
    finalQuat  = quaternion;
  } else {
    // Fallback: no matrix — estimate Z from scale heuristic
    const scale  = computeFaceScale(landmarks);
    finalPos.z   = -3 - (18 - scale) * 0.08;
  }

  // ── 3. Dynamic scale (Jeeliz s) ─────────────────────────────────────────
  const rawScale = computeFaceScale(landmarks);
  const userScaleFactor = (manualOffsets.scale !== undefined)
    ? manualOffsets.scale / 18
    : 1.0;
  const targetScale = rawScale * userScaleFactor;

  // ── 4. Smooth (Jeeliz internal IIR) ─────────────────────────────────────
  const smoothPos   = _posSmoother.filter(finalPos, now / 1000);
  const smoothQuat  = _rotSmoother.filter(finalQuat);
  const smoothScale = _scaleSmoother.filter(targetScale);

  // ── 5. Push to Zustand store (read by FaceAnchor's useFrame at 60 FPS) ──
  store.updateTracking(smoothPos, smoothQuat, smoothScale);

  // ── 6. Debug data (low freq — updated by Zustand, polled by UI at 5 Hz) ─
  const lt = landmarks[LM.LEFT_TEMPLE];
  const rt = landmarks[LM.RIGHT_TEMPLE];
  store.updateDebug({
    templeDistance:  Math.hypot(rt.x - lt.x, rt.y - lt.y),
    scale:           smoothScale,
    pd:              Math.round(computePD(landmarks)),
    faceShape:       detectFaceShape(landmarks),
    recommendations: getFrameRecommendations(detectFaceShape(landmarks)),
    eyeCenter,
    landmarks,
  });
}

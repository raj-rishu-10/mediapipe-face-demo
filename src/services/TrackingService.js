import * as THREE from 'three';
import useTrackingStore from '../store/useTrackingStore';
import {
  computeEyeCenter,
  computePD, detectFaceShape, getFrameRecommendations,
  LM
} from '../utils/FaceScale';
import { extractHeadPose } from '../utils/HeadPose';
import {
  OneEuroVector3,
  QuaternionSmoother, ScalarSmoother,
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
 * @param {{ fov, aspect }} cameraOptions — current active camera parameters
 */
export function processTrackingResults(results, manualOffsets = {}, cameraOptions = { fov: 38, aspect: 1.333 }) {
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
    
    console.log(
      `[Tracking] Frame - Face Detected: false | Landmarks: 0 | EyeCenter: N/A | TempleDist: N/A | FaceWidth: N/A | Scale: N/A | Quat: N/A | PoseMatrix: N/A | FPS: ${_currentFps}`
    );
    return;
  }

  const landmarks = results.faceLandmarks[0];

  // ── 1. Parse Matrix Pose & Depth (in meters) ──────────────────────────────
  let worldPos = new THREE.Vector3(0, 0, -0.6);
  let finalQuat = new THREE.Quaternion();
  let matrixDataString = 'Identity';

  const hasMatrix = results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0;

  if (hasMatrix) {
    const rawMatrix = results.facialTransformationMatrixes[0];
    const pose = extractHeadPose(rawMatrix);
    worldPos = pose.worldPos;
    finalQuat = pose.quaternion;

    if (rawMatrix.data) {
      matrixDataString = Array.from(rawMatrix.data).map(v => v.toFixed(3)).join(', ');
    }
  }

  // Face depth D (absolute Z in meters)
  const D = -worldPos.z;

  // ── 2. Viewport calculation at depth D ───────────────────────────────────
  const halfTanFOVY = Math.tan((cameraOptions.fov * Math.PI) / 360);
  const viewportHeight = 2 * D * halfTanFOVY;
  const viewportWidth  = viewportHeight * cameraOptions.aspect;

  // ── 3. Eye center anchor ─────────────────────────────────────────────────
  const eyeCenter = computeEyeCenter(landmarks);
  const eyeWorldX = (eyeCenter.x - 0.5) * viewportWidth;
  const eyeWorldY = -(eyeCenter.y - 0.5) * viewportHeight;

  // Combine stable eyeCenter X/Y + matrix depth Z
  const finalPos = new THREE.Vector3(
    eyeWorldX + (manualOffsets.x || 0),
    eyeWorldY + (manualOffsets.y || 0),
    worldPos.z + (manualOffsets.z || 0)
  );

  // ── 4. Physical scale calculation (in meters) ────────────────────────────
  const lt = landmarks[LM.LEFT_TEMPLE];
  const rt = landmarks[LM.RIGHT_TEMPLE];
  const templeDist = Math.hypot(rt.x - lt.x, rt.y - lt.y);
  
  // Physical temple distance (width of the face in meters)
  const faceWidthMeters = templeDist * viewportWidth;

  const userScaleFactor = (manualOffsets.scale !== undefined)
    ? manualOffsets.scale / 0.14
    : 1.0;
  
  // targetScale is the physical face width scaled by the user slider factor
  const targetScale = faceWidthMeters * userScaleFactor;

  // ── 5. Smooth (One-Euro / Exponential filters) ──────────────────────────
  const smoothPos   = _posSmoother.filter(finalPos, now / 1000);
  const smoothQuat  = _rotSmoother.filter(finalQuat);
  const smoothScale = _scaleSmoother.filter(targetScale);

  // ── 6. Push to Zustand store (read by FaceAnchor's useFrame at 60 FPS) ──
  store.updateTracking(smoothPos, smoothQuat, smoothScale);

  // ── 7. Log frame-by-frame debug info ─────────────────────────────────────
  console.log(
    `[Tracking] Frame - Face Detected: true ` +
    `| Landmarks: ${landmarks.length} ` +
    `| EyeCenter: (${eyeCenter.x.toFixed(3)}, ${eyeCenter.y.toFixed(3)}) ` +
    `| TempleDist: ${templeDist.toFixed(4)} ` +
    `| FaceWidth: ${faceWidthMeters.toFixed(4)}m ` +
    `| Scale: ${smoothScale.toFixed(4)} ` +
    `| Quat: (${smoothQuat.x.toFixed(3)}, ${smoothQuat.y.toFixed(3)}, ${smoothQuat.z.toFixed(3)}, ${smoothQuat.w.toFixed(3)}) ` +
    `| PoseMatrix: [${matrixDataString}] ` +
    `| FPS: ${_currentFps}`
  );

  // ── 8. Debug data for UI (low freq) ──────────────────────────────────────
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

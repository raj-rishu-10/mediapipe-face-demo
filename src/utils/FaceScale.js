import * as THREE from 'three';

/**
 * Face scale utilities — MediaPipe equivalent of Jeeliz's `s` value.
 *
 * ── JEELIZ ANALYSIS ─────────────────────────────────────────────────────────
 * Jeeliz's `s` is the half-width of the detection window relative to canvas
 * width. It is used in update_poses() to compute the camera-to-face distance D:
 *
 *   W      = s * scaleW                   ← viewport-scaled half-width
 *   DFront = 1 / (2 * W * halfTanFOVX)   ← depth from W and camera FOV
 *   D      = DFront + 0.5                 ← total depth
 *   
 * This means s encodes BOTH scale AND depth simultaneously.
 *
 * ── MEDIAPIPE MAPPING ────────────────────────────────────────────────────────
 * MediaPipe separates these concerns:
 *   - Scale  → temple-to-temple distance (landmarks 234 and 454)
 *   - Depth  → Z translation in facialTransformationMatrixes
 *
 * We use the temple distance to compute a proportional scale for the glasses.
 */

// ── Landmark index constants ───────────────────────────────────────────────────
export const LM = {
  LEFT_EYE_OUTER:  33,
  RIGHT_EYE_OUTER: 263,
  LEFT_TEMPLE:     234,
  RIGHT_TEMPLE:    454,
  NOSE_TIP:        1,
  NOSE_BRIDGE:     168,
  CHIN:            152,
  FOREHEAD:        10,
  LEFT_JAW:        132,
  RIGHT_JAW:       361,
  LEFT_IRIS:       473,
  RIGHT_IRIS:      468,
};

const BASE_TEMPLE_DIST = 0.38; // normalized distance at ~60cm working distance
const BASE_SCALE       = 18;   // Three.js world-scale at BASE_TEMPLE_DIST

/**
 * Compute the glasses world-scale from landmark temple distance.
 */
export function computeFaceScale(landmarks) {
  const lt = landmarks[LM.LEFT_TEMPLE];
  const rt = landmarks[LM.RIGHT_TEMPLE];
  if (!lt || !rt) return BASE_SCALE;

  const dist = Math.hypot(rt.x - lt.x, rt.y - lt.y);
  if (dist < 0.01) return BASE_SCALE;

  return (dist / BASE_TEMPLE_DIST) * BASE_SCALE;
}

/**
 * Compute eye center in normalized [0..1] coordinates.
 * We do NOT mirror X here (no 1.0 - x) because the R3F canvas is CSS-mirrored.
 */
export function computeEyeCenter(landmarks) {
  const le = landmarks[LM.LEFT_EYE_OUTER];
  const re = landmarks[LM.RIGHT_EYE_OUTER];
  return {
    x: (le.x + re.x) / 2,   // Keep unmirrored
    y: (le.y + re.y) / 2,
  };
}

/**
 * Map a normalized eye center to Three.js world-space X/Y.
 */
export function eyeCenterToWorld(nx, ny) {
  return new THREE.Vector3(
    (nx - 0.5) * 10,          // [-5, 5] horizontal
    -(ny - 0.5) * 7.5,        // [-3.75, 3.75] vertical (inverted)
    0                          // Z comes from headpose matrix
  );
}

/** Euclidean distance between two NormalizedLandmarks */
export function landmarkDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}

/** PD estimation from iris landmarks */
export function computePD(landmarks) {
  const li = landmarks[LM.LEFT_IRIS];
  const ri = landmarks[LM.RIGHT_IRIS];
  if (!li || !ri) return 62;
  return landmarkDistance(li, ri) * 1000; // Multiply by 1000 to get value in mm range
}

/** Face shape classifier */
export function detectFaceShape(landmarks) {
  const faceLength = landmarkDistance(landmarks[LM.FOREHEAD], landmarks[LM.CHIN]);
  const faceWidth  = landmarkDistance(landmarks[LM.LEFT_TEMPLE], landmarks[LM.RIGHT_TEMPLE]);
  const jawWidth   = landmarkDistance(landmarks[LM.LEFT_JAW], landmarks[LM.RIGHT_JAW]);
  const lwr = faceLength / faceWidth;
  const jwr = jawWidth   / faceWidth;
  if (lwr > 1.45)              return 'Oval';
  if (lwr < 1.25 && jwr > 0.8) return 'Square';
  if (lwr < 1.25 && jwr < 0.8) return 'Round';
  if (jwr < 0.65)              return 'Heart';
  return 'Oval';
}

export function getFrameRecommendations(shape) {
  return ({
    Round:  { best: ['Rectangle', 'Wayfarer'],            desc: 'Adds angles to soft features.' },
    Square: { best: ['Round', 'Aviator'],                  desc: 'Softens strong jawlines.' },
    Oval:   { best: ['Aviator', 'Wayfarer', 'Round'],     desc: 'Lucky you! Almost all frames fit.' },
    Heart:  { best: ['Rimless', 'Round', 'Light Frames'], desc: 'Balances a wider forehead.' },
  })[shape] || { best: ['Wayfarer'], desc: '' };
}

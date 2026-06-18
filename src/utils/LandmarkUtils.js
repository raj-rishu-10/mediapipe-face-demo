import * as THREE from 'three';

// ─── Landmark Index Constants ────────────────────────────────────────────────
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

/**
 * Get a THREE.Vector3 from a normalized MediaPipe NormalizedLandmark,
 * with optional X mirroring for selfie (front-facing) camera mode.
 */
export function landmarkToVec3(lm, mirror = true) {
  return new THREE.Vector3(
    mirror ? 1.0 - lm.x : lm.x,
    lm.y,
    lm.z
  );
}

/**
 * Compute Euclidean distance between two normalized landmarks.
 */
export function landmarkDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}

/**
 * Map a normalized MediaPipe [0..1] X/Y coordinate into Three.js NDC world space.
 * The scene camera FOV, aspect and distance are tuned to match the webcam viewport.
 */
export function normalizedToWorld(nx, ny, depth = 0) {
  // X: mirrored selfie → [-5, 5]
  // Y: inverted → [-3.75, 3.75]  (assuming 4:3 fov mapping)
  return new THREE.Vector3(
    (nx - 0.5) * 10,
    -(ny - 0.5) * 7.5,
    depth
  );
}

import * as THREE from 'three';

/**
 * Head pose extractor — MediaPipe equivalent of JeelizThreeFiberHelper.update_poses()
 *
 * ── JEELIZ ANALYSIS ─────────────────────────────────────────────────────────
 * Jeeliz gives us a detectState object per frame with:
 *   { detected, x, y, s, rx, ry, rz }
 *
 *   detected : float 0..1  — detection confidence
 *   x        : float -1..1 — face center X in viewport (0 = center, +1 = right)
 *   y        : float -1..1 — face center Y in viewport (0 = center, +1 = top)
 *   s        : float 0..1  — face half-width relative to canvas width (scale proxy)
 *   rx       : float       — head pitch  (up/down tilt), radians
 *   ry       : float       — head yaw    (left/right turn), radians
 *   rz       : float       — head roll   (sideways tilt), radians
 *
 * Jeeliz's update_poses() formula:
 *   halfTanFOVX = tan(camera.aspect * camera.fov * PI/360)
 *   W           = s * scaleW               ← viewport-scaled face half-width
 *   DFront      = 1 / (2 * W * halfTanFOVX)  ← distance camera→front of face
 *   D           = DFront + 0.5              ← distance camera→face center
 *   z           = -D
 *   x           = xv * D * halfTanFOVX
 *   y           = yv * D * halfTanFOVX / aspectRatio
 *
 *   Then pivot compensation + Euler rotation applied.
 *
 * ── MEDIAPIPE MAPPING ────────────────────────────────────────────────────────
 * MediaPipe gives us:
 *   landmarks[33]  = left  eye outer corner  (Jeeliz x,y anchor ≡ eye center)
 *   landmarks[263] = right eye outer corner
 *   landmarks[234] = left  temple            (Jeeliz s → temple distance)
 *   landmarks[454] = right temple
 *   facialTransformationMatrixes[0] = 4×4 head pose matrix
 *      → Replaces Jeeliz rx, ry, rz completely with a proper rotation matrix.
 *
 * The facialTransformationMatrix is a column-major Float32Array[16] in
 * MediaPipe's camera space.
 * Since the R3F Canvas is already CSS-mirrored, we keep the translation/rotation
 * unmirrored in JS so the browser's CSS mirror maps it correctly to the user's face.
 */

// ── Pre-allocated objects (zero GC in hot path) ───────────────────────────────
const _tmpMatrix   = new THREE.Matrix4();
const _tmpPos      = new THREE.Vector3();
const _tmpQuat     = new THREE.Quaternion();
const _tmpScale    = new THREE.Vector3();

const DEPTH_SCALE    = 0.065;   // MediaPipe cm → Three.js world units
const DEPTH_OFFSET   = -1.5;    // bring face in front of the camera plane
const PIVOT_Y        = 0.15;    // Jeeliz pivotOffsetYZ[0] — Y compensation
const PIVOT_Z        = 0.5;     // Jeeliz pivotOffsetYZ[1] — Z compensation
const ROT_OFFSET_X   = -0.05;  // mild upward tilt so glasses rest on the nose

/**
 * Convert a MediaPipe FacialTransformationMatrix result → Three.js pose.
 *
 * @param {object} matrixResult  results.facialTransformationMatrixes[0]
 * @returns {{ worldPos: THREE.Vector3, quaternion: THREE.Quaternion }}
 */
export function extractHeadPose(matrixResult) {
  const d = matrixResult.data; // column-major Float32Array[16]

  // Build Three.js Matrix4 from MediaPipe column-major layout
  _tmpMatrix.set(
    d[0],  d[4],  d[8],  d[12],
    d[1],  d[5],  d[9],  d[13],
    d[2],  d[6],  d[10], d[14],
    d[3],  d[7],  d[11], d[15]
  );

  // Note: We do NOT apply X-mirroring here in JS because the canvas itself is CSS-mirrored.
  _tmpMatrix.decompose(_tmpPos, _tmpQuat, _tmpScale);

  // Apply Jeeliz-style pivot offset in CAMERA space before adding translation.
  const pivotInWorld = new THREE.Vector3(0, PIVOT_Y, PIVOT_Z)
    .applyQuaternion(_tmpQuat);

  const worldPos = new THREE.Vector3(
    _tmpPos.x * DEPTH_SCALE,
    _tmpPos.y * DEPTH_SCALE + PIVOT_Y,
    _tmpPos.z * DEPTH_SCALE + DEPTH_OFFSET + PIVOT_Z
  ).sub(pivotInWorld);

  // Apply X rotation offset (Jeeliz rotationOffsetX) so glasses tilt slightly
  const offsetQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(ROT_OFFSET_X, 0, 0)
  );
  const finalQuat = _tmpQuat.clone().premultiply(offsetQuat);

  return { worldPos, quaternion: finalQuat };
}

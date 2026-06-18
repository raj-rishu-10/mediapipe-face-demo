import React from 'react';

/**
 * FaceOccluder — MediaPipe equivalent of Jeeliz's create_threejsOccluder().
 *
 * ── JEELIZ ANALYSIS ─────────────────────────────────────────────────────────
 * Jeeliz creates a depth-mask occluder using a BufferGeometry + ShaderMaterial:
 *
 *   const mat = new THREE.ShaderMaterial({
 *     colorWrite: false,           ← invisible (no color output)
 *     renderOrder: -1,             ← render before everything else
 *   })
 *   occluderMesh.renderOrder = -1;
 *
 * The geometry is loaded from a JSON file — it's a simplified head mesh
 * (low-poly skull shape) positioned and scaled to match the tracked face.
 *
 * ── MEDIAPIPE EQUIVALENT ────────────────────────────────────────────────────
 * We approximate the head with a scaled sphere geometry.
 * The sphere's position and scale offsets below are tuned to match the
 * typical head proportions at the working depth:
 *
 *   Y offset: -0.35 → moves sphere down from eye-center to head center
 *   Z offset: -1.2  → moves sphere backward (toward back of head)
 *   Scale X:   2.1  → ear-to-ear width
 *   Scale Y:   2.6  → top of head to chin height
 *   Scale Z:   2.2  → front-to-back depth
 *
 * These values replicate Jeeliz's spherical head approximation.
 * renderOrder={-1} matches Jeeliz's renderOrder = -1.
 * colorWrite={false} matches Jeeliz's colorWrite: false.
 *
 * The result: glasses temples disappear behind the ears, side profile looks real.
 */
export function FaceOccluder() {
  return (
    <mesh
      position={[0, -0.35, -1.2]}
      scale={[2.1, 2.6, 2.2]}
      renderOrder={-1}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        colorWrite={false}  // invisible — no color output (Jeeliz ShaderMaterial colorWrite:false)
        depthWrite={true}   // writes depth → blocks glasses behind it
        depthTest={true}
      />
    </mesh>
  );
}

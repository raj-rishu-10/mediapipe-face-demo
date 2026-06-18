import React from 'react';

/**
 * FaceOccluder — MediaPipe equivalent of Jeeliz's create_threejsOccluder().
 *
 * Approximates the head with a scaled sphere geometry to block the temples
 * of the glasses as they go behind the ears.
 *
 * The dimensions are in FaceAnchor units (normalized to face width = 1.0 unit).
 *
 * Proportion tuning:
 *   - Center: [0, -0.25, -0.6] (positioned slightly down and behind the nose bridge)
 *   - Scale:  [0.6, 0.8, 0.7] (X = width, Y = height, Z = depth of head)
 *
 * This ensures the front of the sphere ends at local Z = +0.1, leaving the
 * glasses frame (at local Z = +0.15) fully visible in front, while occluding the
 * temples as they wrap around the head.
 */
export function FaceOccluder() {
  return (
    <mesh
      position={[0, -0.25, 0.0]}
      scale={[0.6, 0.8, 0.7]}
      renderOrder={-1}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        colorWrite={false}  // invisible depth-mask
        depthWrite={true}   // writes depth to block glasses temples
        depthTest={true}
      />
    </mesh>
  );
}

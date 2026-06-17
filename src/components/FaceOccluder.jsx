import React from 'react';
import * as THREE from 'three';

/**
 * FaceOccluder
 * Generates an invisible 3D volume that matches the user's head shape.
 * It writes to the WebGL Depth Buffer but not the Color Buffer.
 * This guarantees that glasses temples (arms) render accurately *behind* the ears
 * rather than floating awkwardly through the skull.
 */
export function FaceOccluder({ position, scale, rotationQuat }) {
  // We use a sphere geometry that is slightly flattened/stretched to approximate a skull
  return (
    <mesh 
      position={position}
      quaternion={rotationQuat}
      // Slightly scale the depth (Z) and height (Y) to make the sphere head-shaped
      scale={[scale * 1.05, scale * 1.3, scale * 1.2]} 
      // Render order -1 guarantees this renders *before* the glasses
      renderOrder={-1}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial 
        // DO NOT write color (invisible)
        colorWrite={false} 
        // DO write depth (blocks objects behind it)
        depthWrite={true} 
        // Prevent sorting issues
        depthTest={true}
      />
    </mesh>
  );
}

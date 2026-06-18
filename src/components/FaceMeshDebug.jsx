import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import useTrackingStore from '../store/useTrackingStore';
import { LM } from '../utils/LandmarkUtils';

// Debug these specific 5 landmarks requested by the user
const LM_DEBUG = [
  LM.LEFT_EYE_OUTER,  // 33
  LM.RIGHT_EYE_OUTER, // 263
  LM.LEFT_TEMPLE,     // 234
  LM.RIGHT_TEMPLE,    // 454
  LM.NOSE_BRIDGE,     // 168
];

/**
 * FaceMeshDebug
 *
 * Renders colored 3D spheres at key face landmarks + the FaceAnchor coordinate pivot
 * so you can visually verify that the coordinate mapping is correct.
 */
export function FaceMeshDebug({ showDebug }) {
  const dotRefs = useRef({});

  useFrame((state) => {
    if (!showDebug) return;
    const { debugData, targetPos, isFaceTracked } = useTrackingStore.getState();
    const landmarks = debugData?.landmarks;
    if (!landmarks) return;

    // Viewport dimensions at target depth D (in meters)
    const D = isFaceTracked ? -targetPos.z : 0.6;
    const halfTanFOVY = Math.tan((state.camera.fov * Math.PI) / 360);
    const viewportHeight = 2 * D * halfTanFOVY;
    const viewportWidth  = viewportHeight * state.viewport.aspect;

    // 1. Position key landmarks
    LM_DEBUG.forEach((idx) => {
      const ref = dotRefs.current[idx];
      if (!ref) return;
      const lm = landmarks[idx];
      if (!lm) return;

      const wx = (lm.x - 0.5) * viewportWidth;
      const wy = -(lm.y - 0.5) * viewportHeight;
      const wz = targetPos.z; // Align depth with face plane
      ref.position.set(wx, wy, wz);
    });

    // 2. Position the FaceAnchor pivot marker
    const anchorRef = dotRefs.current['anchor'];
    if (anchorRef) {
      anchorRef.position.copy(targetPos);
    }
  });

  if (!showDebug) return null;

  const colors = {
    [LM.LEFT_EYE_OUTER]:  '#ff0055', // Red (Left Eye)
    [LM.RIGHT_EYE_OUTER]: '#00ff88', // Green (Right Eye)
    [LM.LEFT_TEMPLE]:     '#ffaa00', // Orange (Left Temple)
    [LM.RIGHT_TEMPLE]:    '#00aaff', // Blue (Right Temple)
    [LM.NOSE_BRIDGE]:     '#ffffff', // White (Nose Bridge)
  };

  return (
    <group>
      {/* 5 Key face landmarks */}
      {LM_DEBUG.map((idx) => (
        <mesh
          key={idx}
          ref={(r) => { if (r) dotRefs.current[idx] = r; }}
        >
          <sphereGeometry args={[0.015, 16, 16]} />
          <meshBasicMaterial color={colors[idx] || '#ffffff'} depthTest={false} transparent opacity={0.9} />
        </mesh>
      ))}

      {/* FaceAnchor center pivot marker (Magenta) */}
      <mesh ref={(r) => { if (r) dotRefs.current['anchor'] = r; }}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color="#ff00ff" depthTest={false} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

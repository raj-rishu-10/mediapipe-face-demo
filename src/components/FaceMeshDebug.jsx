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
 * Renders colored 3D spheres at key face landmarks so you can visually verify
 * that the coordinate mapping is correct.
 *
 * Only rendered when showDebug is true.
 */
export function FaceMeshDebug({ showDebug }) {
  const dotRefs = useRef({});

  useFrame(() => {
    if (!showDebug) return;
    const { debugData } = useTrackingStore.getState();
    const landmarks = debugData?.landmarks;
    if (!landmarks) return;

    LM_DEBUG.forEach((idx) => {
      const ref = dotRefs.current[idx];
      if (!ref) return;
      const lm = landmarks[idx];
      if (!lm) return;

      // Unmirrored X mapping because the R3F Canvas is already CSS-mirrored
      const wx = (lm.x - 0.5) * 10;
      const wy = -(lm.y - 0.5) * 7.5;
      const wz = -3 + (lm.z || 0) * 5;
      ref.position.set(wx, wy, wz);
    });
  });

  if (!showDebug) return null;

  const colors = {
    [LM.LEFT_EYE_OUTER]:  '#ff0055', // Red
    [LM.RIGHT_EYE_OUTER]: '#00ff88', // Green
    [LM.LEFT_TEMPLE]:     '#ffaa00', // Orange
    [LM.RIGHT_TEMPLE]:    '#00aaff', // Blue
    [LM.NOSE_BRIDGE]:     '#ffffff', // White
  };

  return (
    <group>
      {LM_DEBUG.map((idx) => (
        <mesh
          key={idx}
          ref={(r) => { if (r) dotRefs.current[idx] = r; }}
        >
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={colors[idx] || '#ffffff'} depthTest={false} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

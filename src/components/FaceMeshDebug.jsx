import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useTrackingStore from '../store/useTrackingStore';
import { LM } from '../utils/LandmarkUtils';

const LM_DEBUG = [
  LM.LEFT_EYE_OUTER, LM.RIGHT_EYE_OUTER,
  LM.LEFT_TEMPLE, LM.RIGHT_TEMPLE,
  LM.NOSE_BRIDGE, LM.CHIN, LM.FOREHEAD,
];

/**
 * FaceMeshDebug
 *
 * Renders colored 3D spheres at key face landmarks so you can visually verify
 * that the coordinate mapping is correct before tweaking offsets.
 *
 * Only rendered when showDebug is true.
 */
export function FaceMeshDebug({ showDebug }) {
  const dotRefs = useRef({});
  const { size } = useThree();

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

      // Mirror X for selfie mode and map to world space
      const wx = (1.0 - lm.x - 0.5) * 10;
      const wy = -(lm.y - 0.5) * 7.5;
      const wz = -3 + lm.z * 5;
      ref.position.set(wx, wy, wz);
    });
  });

  if (!showDebug) return null;

  const colors = {
    [LM.LEFT_EYE_OUTER]:  '#00ff88',
    [LM.RIGHT_EYE_OUTER]: '#00ff88',
    [LM.LEFT_TEMPLE]:     '#ff5500',
    [LM.RIGHT_TEMPLE]:    '#ff5500',
    [LM.NOSE_BRIDGE]:     '#ffffff',
    [LM.CHIN]:            '#8888ff',
    [LM.FOREHEAD]:        '#8888ff',
  };

  return (
    <group>
      {LM_DEBUG.map((idx) => (
        <mesh
          key={idx}
          ref={(r) => { if (r) dotRefs.current[idx] = r; }}
        >
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color={colors[idx] || '#ffffff'} />
        </mesh>
      ))}
    </group>
  );
}

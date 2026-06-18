import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useTrackingStore from '../store/useTrackingStore';

/**
 * FaceAnchor — the MediaPipe equivalent of Jeeliz's threeCompositeObject.
 *
 * FaceAnchor is a <group> (THREE.Group, subclass of Object3D).
 * The pose is already computed and smoothed in TrackingService and stored in
 * Zustand. FaceAnchor reads it on every useFrame call (no React re-renders).
 */

// Pre-allocated fallback targets in metric space (meters)
const _fallbackPos   = new THREE.Vector3(0, 0, -0.6);
const _fallbackQuat  = new THREE.Quaternion();

export function FaceAnchor({
  children,
  isManual,
  manualX     = 0,
  manualY     = 0,
  manualZ     = -0.6,
  manualScale = 0.14,
  manualRotY  = 0,
}) {
  const groupRef = useRef();

  useFrame(() => {
    const obj = groupRef.current;
    if (!obj) return;

    if (isManual) {
      // Manual mode: direct slider control in metric units, compensated for glasses local offsets
      obj.scale.setScalar(manualScale);
      obj.position.set(
        manualX,
        manualY - (-0.05) * manualScale, // compensate glasses Y offset
        manualZ - 0.75 * manualScale     // compensate glasses Z offset
      );
      obj.rotation.set(0, manualRotY, 0);
      return;
    }

    // AI tracking mode: read Zustand store — zero React re-renders
    const { isFaceTracked, targetPos, targetRotation, targetScale } =
      useTrackingStore.getState();

    if (isFaceTracked) {
      // Direct assignment — no lerp here because smoothing was done in TrackingService
      obj.position.copy(targetPos);
      obj.quaternion.copy(targetRotation);
      obj.scale.setScalar(targetScale);
    } else {
      // Graceful fallback in meters: return to neutral pose
      obj.position.lerp(_fallbackPos, 0.06);
      obj.scale.setScalar(THREE.MathUtils.lerp(obj.scale.x, 0.14, 0.06));
      obj.quaternion.slerp(_fallbackQuat, 0.06);
    }
  });

  return (
    <group ref={groupRef} frustumCulled={false}>
      {children}
    </group>
  );
}

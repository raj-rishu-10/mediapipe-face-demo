import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useTrackingStore from '../store/useTrackingStore';

/**
 * FaceAnchor — the MediaPipe equivalent of Jeeliz's threeCompositeObject.
 *
 * ── JEELIZ ANALYSIS ─────────────────────────────────────────────────────────
 * Jeeliz registers each face follower as a plain THREE.Object3D:
 *   const threeCompositeObject = new THREE.Object3D()
 *   threeCompositeObject.frustumCulled = false
 *
 * Each frame in update_poses(), Jeeliz sets:
 *   threeCompositeObject.position.set(...)     ← pivot offset pre-rotation
 *   threeCompositeObject.rotation.set(rx, ry, rz, "ZYX")  ← head angles
 *   threeCompositeObject.position.applyEuler(rotation)     ← pivot in head space
 *   threeCompositeObject.position.add(translation)         ← add world translation
 *
 * All child objects (glasses, occluder) are children of threeCompositeObject,
 * so they automatically inherit the full head pose without extra math.
 *
 * ── MEDIAPIPE EQUIVALENT ────────────────────────────────────────────────────
 * FaceAnchor is a <group> (THREE.Group, subclass of Object3D).
 * The pose is already computed and smoothed in TrackingService and stored in
 * Zustand. FaceAnchor reads it on every useFrame call (no React re-renders).
 *
 * useFrame is the R3F equivalent of Jeeliz's callbackTrack loop.
 *
 * Children:
 *   FaceAnchor
 *   ├── FaceOccluder   ← depth-mask sphere (Jeeliz create_threejsOccluder)
 *   └── GlassesModel   ← the actual GLB
 */

// Pre-allocated fallback targets to avoid GC in useFrame
const _fallbackPos   = new THREE.Vector3(0, 0, -3);
const _fallbackQuat  = new THREE.Quaternion();
const _fallbackScale = new THREE.Vector3(18, 18, 18);

export function FaceAnchor({
  children,
  isManual,
  manualX     = 0,
  manualY     = 0,
  manualZ     = -3,
  manualScale = 18,
  manualRotY  = 0,
}) {
  const groupRef = useRef();

  useFrame(() => {
    const obj = groupRef.current;
    if (!obj) return;

    if (isManual) {
      // Manual mode: direct slider control (Jeeliz debug mode equivalent)
      obj.position.set(manualX, manualY, manualZ);
      obj.scale.setScalar(manualScale);
      obj.rotation.set(0, manualRotY, 0);
      return;
    }

    // AI tracking mode: read Zustand store — zero React re-renders
    const { isFaceTracked, targetPos, targetRotation, targetScale } =
      useTrackingStore.getState();

    if (isFaceTracked) {
      // Direct assignment — no lerp here because smoothing was done in TrackingService
      // (matching Jeeliz: pose is set directly each frame after the IIR smoother)
      obj.position.copy(targetPos);
      obj.quaternion.copy(targetRotation);
      obj.scale.setScalar(targetScale);
    } else {
      // Graceful fallback: float to neutral pose (Jeeliz: object becomes invisible)
      // We keep it visible but smoothly return to default
      obj.position.lerp(_fallbackPos, 0.06);
      obj.scale.lerp(_fallbackScale, 0.06);
      obj.quaternion.slerp(_fallbackQuat, 0.06);
    }
  });

  return (
    <group ref={groupRef} frustumCulled={false}>
      {children}
    </group>
  );
}

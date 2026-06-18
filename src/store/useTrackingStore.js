import { create } from 'zustand';
import * as THREE from 'three';

/**
 * Zustand tracking store.
 * getState() is used inside useFrame — no React re-render triggered on 60FPS updates.
 * set() is only called when isFaceTracked boolean flips, which is rare.
 */
const useTrackingStore = create((set, get) => ({
  isFaceTracked: false,

  // Mutable shared objects — mutated directly (not replaced) for zero-GC 60FPS perf.
  targetPos: new THREE.Vector3(0, 0, -3),
  targetRotation: new THREE.Quaternion(),
  targetScale: 18,

  // Debug / UI data (updated at low frequency)
  debugData: {
    fps: 0,
    templeDistance: 0,
    scale: 0,
    angleY: 0,
    angleZ: 0,
    pd: 62,
    faceShape: 'Analyzing...',
    recommendations: null,
    eyeCenter: { x: 0, y: 0 },
    landmarks: null,
  },

  setFaceTracked: (tracked) => set({ isFaceTracked: tracked }),

  /**
   * Update tracking data every frame — mutates objects in-place to avoid GC.
   */
  updateTracking: (pos, rot, scale) => {
    const state = get();
    state.targetPos.copy(pos);
    state.targetRotation.copy(rot);
    state.targetScale = scale;
    if (!state.isFaceTracked) set({ isFaceTracked: true });
  },

  updateDebug: (data) => set((state) => ({
    debugData: { ...state.debugData, ...data }
  })),
}));

export default useTrackingStore;

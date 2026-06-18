import { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

// All 8 GLB models to enable preloading
export const ALL_MODEL_PATHS = [
  '/translated-bolle.glb',
  '/anaconda_black.glb',
  '/models/anaconda_cyris.glb',
  '/bolt_2.0_turtoise.glb',
  '/models/bolt_2.0_black.glb',
  '/models/glass.glb',
  '/models/prize_Black.glb',
  '/with-mesh-bolle.glb',
];

/**
 * GlassesModel
 *
 * Renders the GLB glasses model as a child of FaceAnchor.
 * Clones the cached GLTF scene to avoid sharing mutable state.
 * Positions and centers the model synchronously inside useMemo to prevent
 * any single-frame flashing or offsets on initial load.
 */
export function GlassesModel({ url }) {
  const gltf = useLoader(GLTFLoader, url);

  // Clone and center synchronously to avoid any 1-frame flash of uncentered model
  const clonedScene = useMemo(() => {
    if (!gltf || !gltf.scene) return null;
    const clone = gltf.scene.clone(true);

    // Auto-center: move nose bridge to local (0, 0, 0)
    const box    = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());

    clone.position.x = -center.x;
    clone.position.y = -center.y;
    clone.position.z = -box.max.z + (box.max.z - box.min.z) * 0.1;

    // Normalize scale: make the width of the glasses exactly 1.0 unit in local space
    const width = box.max.x - box.min.x;
    if (width > 0) {
      clone.scale.setScalar(1.0 / width);
    }

    return clone;
  }, [gltf.scene]);

  if (!clonedScene) return null;

  // Wrap in a group to apply a slight downward and forward offset in FaceAnchor units
  // so the glasses rest naturally on the nose bridge slightly below the eye center.
  return (
    <group position={[0, -0.05, 0.75]}>
      <primitive object={clonedScene} />
    </group>
  );
}

// Preload helper to cache all models on startup
export function preloadAllGlasses() {
  ALL_MODEL_PATHS.forEach((path) => {
    try {
      useLoader.preload(GLTFLoader, path);
    } catch (e) {
      console.warn('Preload failed for model:', path, e);
    }
  });
}

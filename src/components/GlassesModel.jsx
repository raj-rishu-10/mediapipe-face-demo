import { useEffect, useMemo } from 'react';
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
 * Auto-centers the model so the nose bridge sits at the local origin (0, 0, 0).
 */
export function GlassesModel({ url }) {
  const gltf = useLoader(GLTFLoader, url);

  // Clone scene to avoid shared mutable Three.js object
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    if (!clonedScene) return;

    // Auto-center: move nose bridge to local (0, 0, 0)
    const box    = new THREE.Box3().setFromObject(clonedScene);
    const center = box.getCenter(new THREE.Vector3());

    clonedScene.position.x = -center.x;
    clonedScene.position.y = -center.y;

    // Align Z so the back face of the lenses (closest to the face) sits at Z=0
    clonedScene.position.z = -box.max.z + (box.max.z - box.min.z) * 0.1;

    // Note: We do NOT manually dispose geometries and materials of the cloned scene here,
    // because they share references with the cached GLTF model inside useLoader.
    // Disposing them breaks the loader cache, making the model invisible when switched back.
  }, [clonedScene]);

  return <primitive object={clonedScene} />;
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

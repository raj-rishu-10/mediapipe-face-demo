import { useMemo, useState, useEffect } from 'react';
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

// Global cache for loaded GLTF models to avoid redundant network requests and enable instant switching
const _gltfCache = {};

/**
 * GlassesModel
 *
 * Renders the GLB glasses model as a child of FaceAnchor.
 * Loads GLB models asynchronously using standard useEffect to prevent R3F Suspense flashing/blocking.
 * Caches scenes globally to ensure instantaneous, seamless switching.
 */
export function GlassesModel({ url, scaleMultiplier, yOffset = 0, zOffset = 0 }) {
  const [gltf, setGltf] = useState(null);

  useEffect(() => {
    if (!url) return;

    // Use cached model if available
    if (_gltfCache[url]) {
      setGltf(_gltfCache[url]);
      return;
    }

    const loader = new GLTFLoader();
    loader.load(
      url,
      (loadedGltf) => {
        _gltfCache[url] = loadedGltf;
        setGltf(loadedGltf);
      },
      undefined,
      (error) => {
        console.error('[GlassesModel] Failed to load GLTF model:', url, error);
      }
    );
  }, [url]);

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

    // Normalize scale: make the width of the glasses exactly 1.0 unit in local space, factored by scaleMultiplier
    const width = box.max.x - box.min.x;
    if (width > 0) {
      clone.scale.setScalar((1.0 / width) * (scaleMultiplier || 1.0));
    }

    return clone;
  }, [gltf, scaleMultiplier]);

  if (!clonedScene) return null;

  // Wrap in a group to apply a slight downward and forward offset in FaceAnchor units
  // so the glasses rest naturally on the nose bridge slightly below the eye center.
  return (
    <group position={[0, -0.06 + yOffset, 0.72 + zOffset]}>
      <primitive object={clonedScene} />
    </group>
  );
}

// Preload helper to populate the cache on startup
export function preloadAllGlasses() {
  const loader = new GLTFLoader();
  ALL_MODEL_PATHS.forEach((path) => {
    if (_gltfCache[path]) return;
    loader.load(
      path,
      (loadedGltf) => {
        _gltfCache[path] = loadedGltf;
      },
      undefined,
      (e) => {
        console.warn('[GlassesModel] Preload failed for model:', path, e);
      }
    );
  });
}

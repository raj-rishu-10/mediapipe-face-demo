import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

/**
 * GlassesModel
 *
 * Renders the GLB glasses model as a child of FaceAnchor.
 * Clones the cached GLTF scene to avoid the invisible-on-switch bug.
 * Auto-centers the model so the nose bridge sits at the local origin (0, 0, 0),
 * which is where FaceAnchor places the eye center.
 */
export function GlassesModel({ url }) {
  const gltf = useLoader(GLTFLoader, url);

  // Clone scene to avoid shared mutable Three.js object (root cause of invisible bug)
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    if (!clonedScene) return;

    // Auto-center: move nose bridge to local (0, 0, 0)
    const box    = new THREE.Box3().setFromObject(clonedScene);
    const center = box.getCenter(new THREE.Vector3());

    clonedScene.position.x = -center.x;
    clonedScene.position.y = -center.y;

    // Align Z so the back face of the lenses (closest to the face) sits at Z=0
    // rather than the geometric center. This prevents the glasses floating forward.
    clonedScene.position.z = -box.max.z + (box.max.z - box.min.z) * 0.1;

    // Dispose on unmount to free GPU memory
    return () => {
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    };
  }, [clonedScene]);

  return <primitive object={clonedScene} />;
}

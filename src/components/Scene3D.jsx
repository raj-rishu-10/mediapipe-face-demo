import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { FaceAnchor }    from './FaceAnchor';
import { GlassesModel, preloadAllGlasses }  from './GlassesModel';
import { FaceOccluder }  from './FaceOccluder';
import { FaceMeshDebug } from './FaceMeshDebug';

/**
 * Lights — identical to Jeeliz demos which use simple ambient + directional.
 */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[0, 5, 5]} intensity={0.8} castShadow />
      <pointLight position={[-5, 5, 5]} intensity={0.4} />
    </>
  );
}

/**
 * Scene3D — the MediaPipe equivalent of Jeeliz's React Three Fiber Canvas setup.
 */
export function Scene3D({
  modelUrl,
  modelKey,
  showDebug,
  isManual,
  manualX,
  manualY,
  manualZ,
  manualScale,
  manualRotY,
}) {
  // Preload all glasses GLB files on mount to ensure instant, lag-free switching
  useEffect(() => {
    preloadAllGlasses();
  }, []);

  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ fov: 38, near: 0.01, far: 200, position: [0, 0, 0] }}
      className="canvas-wrapper"
      style={{
        position:  'absolute',
        top:       0,
        left:      0,
        width:     '100%',
        height:    '100%',
        zIndex:    2,      // above webcam video (Jeeliz zIndex:2)
        transform: 'scaleX(-1)',  // mirror to match CSS-mirrored webcam
      }}
    >
      <Lights />

      {/*
        FaceAnchor = Jeeliz's threeCompositeObject
        All children inherit the full 6-DoF head pose automatically.
      */}
      <FaceAnchor
        isManual={isManual}
        manualX={manualX}
        manualY={manualY}
        manualZ={manualZ}
        manualScale={manualScale}
        manualRotY={manualRotY}
      >
        {/* Depth-mask head sphere — render first (Jeeliz renderOrder=-1) */}
        <FaceOccluder />

        {/* Glasses model — child of FaceAnchor, never attached to a single landmark */}
        {modelUrl && (
          <Suspense fallback={null}>
            <GlassesModel key={modelKey} url={modelUrl} />
          </Suspense>
        )}
      </FaceAnchor>

      {/* Debug landmark visualization (developer tool) */}
      <FaceMeshDebug showDebug={showDebug} />
    </Canvas>
  );
}

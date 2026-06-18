import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { FaceAnchor }    from './FaceAnchor';
import { GlassesModel }  from './GlassesModel';
import { FaceOccluder }  from './FaceOccluder';
import { FaceMeshDebug } from './FaceMeshDebug';

/**
 * Lights — identical to Jeeliz demos which use simple ambient + directional.
 * Jeeliz doesn't do complex lighting on the glasses; it relies on the
 * GLB's baked textures / PBR materials. We match this.
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
 *
 * ── JEELIZ ANALYSIS ─────────────────────────────────────────────────────────
 * Jeeliz AppCanvas.jsx:
 *   <Canvas className='mirrorX' style={{ position:'fixed', zIndex:2, ...sizing }}>
 *     <ThreeGrabber sizing={sizing} />   ← syncs camera FOV to video size
 *     <FaceFollower faceIndex={0} />     ← the tracked object
 *   </Canvas>
 *   <canvas ref={faceFilterCanvasRef} style={{ position:'fixed', zIndex:1 }} />
 *
 * Key details:
 *   - Canvas is ABOVE the video canvas (zIndex:2 vs zIndex:1)
 *   - Canvas uses className='mirrorX' (CSS transform: scaleX(-1)) — mirroring
 *   - preserveDrawingBuffer:true for screenshot capture
 *   - Camera FOV ≈ 35° (minimum video dimension FOV)
 *
 * ── MEDIAPIPE EQUIVALENT ────────────────────────────────────────────────────
 *   - Canvas is position:absolute, top/left:0, width/height:100% over webcam
 *   - WebcamTracker renders the video in CSS-mirrored position:absolute below
 *   - preserveDrawingBuffer:true for screenshots
 *   - Camera fov=38 (tuned to match Jeeliz's 35° min-dim FOV at typical aspect)
 *
 * Scene hierarchy (matches Jeeliz FaceFollower structure):
 *   FaceAnchor  (threeCompositeObject)
 *   ├── FaceOccluder   (create_threejsOccluder)
 *   └── GlassesModel   (user content)
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
        <Suspense fallback={null}>
          <GlassesModel key={modelKey} url={modelUrl} />
        </Suspense>
      </FaceAnchor>

      {/* Debug landmark visualization (developer tool) */}
      <FaceMeshDebug showDebug={showDebug} />
    </Canvas>
  );
}

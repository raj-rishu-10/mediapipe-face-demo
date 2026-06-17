import './App.css';
const FaceMesh = window.FaceMesh;
const Facemesh = window;
const cam = { Camera: window.Camera };
import Webcam from "react-webcam";
import { useRef, useEffect, useState } from 'react';
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  Box,
  Divider,
  Stack,
  Alert,
  Tooltip
} from '@mui/material';
import Header from './Header';
import { Canvas, useFrame } from "@react-three/fiber";
import { useLoader } from "@react-three/fiber";
import { Suspense } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "@react-three/drei";
import * as THREE from 'three';
import { FaceOccluder } from './components/FaceOccluder';
import { Vector3KalmanFilter, calculatePD, detectFaceShape, getFrameRecommendations } from './utils/LenskartCore';
import SecurityIcon from '@mui/icons-material/Security';
import TuneIcon from '@mui/icons-material/Tune';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import BugReportIcon from '@mui/icons-material/BugReport';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import FileUploadIcon from '@mui/icons-material/FileUpload';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff88',
    },
    background: {
      default: '#0b0c10',
      paper: '#1a1c2d',
    },
  },
});

const Lights = () => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight 
        castShadow 
        position={[-8, 16, -8]}
        intensity={0.6}
      />
      <pointLight position={[0, 50, 0]} intensity={1.5} />
    </>
  );
};

// Global variables to pass data smoothly to useFrame (60 FPS rendering)
const targetPos = new THREE.Vector3(0, 0, -3);
let targetScaleVal = 18;
let targetRotX = 0;
let targetRotY = 0;
let targetRotZ = 0;
let isFaceTracked = false;

// Initialize Kalman Filters for ultra-smooth tracking (Reduces jitter significantly over Lerp)
const posFilter = new Vector3KalmanFilter(0.04, 0.005);
const scaleFilter = new Vector3KalmanFilter(0.08, 0.01);

var manual_mode = true;
var manual_x = 0;
var manual_y = 0;
var manual_z = -3;
var manual_scale = 18;
var manual_rotation_y = 0;

// Export debug info
let debugInfo = { 
  templeDistance: 0, scale: 0, angleZ: 0, angleY: 0, fps: 0, eyeCenter: {x: 0, y: 0},
  pd: 62, faceShape: 'Analyzing...', recommendations: null
};
let lastFrameTime = performance.now();
let frameCount = 0;

function Model({ url, ...props }) {
  const gltf = useLoader(GLTFLoader, url);
  const groupRef = useRef();
  
  // Automatically calculate model dimensions and recenter
  useEffect(() => {
    if (gltf.scene) {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      
      // Recenter model automatically (bridge of glasses to 0,0,0)
      gltf.scene.position.x = -center.x;
      gltf.scene.position.y = -center.y;
      gltf.scene.position.z = -center.z;
    }
  }, [gltf.scene]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Calculate FPS
    frameCount++;
    const now = performance.now();
    if (now - lastFrameTime >= 1000) {
      debugInfo.fps = frameCount;
      frameCount = 0;
      lastFrameTime = now;
    }
    
    if (manual_mode) {
      groupRef.current.position.set(manual_x, manual_y, manual_z);
      groupRef.current.scale.set(manual_scale, manual_scale, manual_scale);
      groupRef.current.rotation.set(0, manual_rotation_y, 0);
    } else {
      if (isFaceTracked) {
        // Apply configurable offsets (using the manual sliders as fine-tuning offsets in AI mode)
        const finalTargetPos = new THREE.Vector3(
          targetPos.x + manual_x,
          targetPos.y + manual_y,
          targetPos.z + (manual_z + 3) // +3 to offset the default -3 
        );
        
        // Smoothing using True Kalman Filter for position and scale
        const filteredPos = posFilter.filter(finalTargetPos);
        groupRef.current.position.copy(filteredPos);
        
        // Dynamic Scale via Kalman
        // The scale slider provides a base relative size (around 18), we multiply it by our dynamic face scale factor
        const finalScale = (targetScaleVal / 18) * manual_scale; 
        const targetScaleVec = new THREE.Vector3(finalScale, finalScale, finalScale);
        const filteredScale = scaleFilter.filter(targetScaleVec);
        groupRef.current.scale.copy(filteredScale);
        
        // Smooth Rotation (Slerp remains superior for Quaternions)
        const targetEuler = new THREE.Euler(targetRotX, targetRotY, targetRotZ, 'XYZ');
        const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);
        groupRef.current.quaternion.slerp(targetQuat, 0.35);
        
        // Update debug info
        debugInfo.scale = finalScale;
      } else {
        // Fallback default coordinates if tracking is lost
        const fallbackPos = posFilter.filter(new THREE.Vector3(0, 0, -3));
        groupRef.current.position.copy(fallbackPos);
        const fallbackScale = scaleFilter.filter(new THREE.Vector3(18, 18, 18));
        groupRef.current.scale.copy(fallbackScale);
        groupRef.current.quaternion.slerp(new THREE.Quaternion().identity(), 0.1);
      }
    }
  });

  return (
    <group ref={groupRef} {...props}>
      {/* FaceOccluder hides the back temples behind the ears automatically */}
      <FaceOccluder position={[0, -0.5, -1.5]} scale={2.5} rotationQuat={new THREE.Quaternion()} />
      <primitive object={gltf.scene} />
    </group>
  );
}

const MODELS_LIST = [
  { id: 'bolle', name: 'Bolle Nevada Blue', path: '/translated-bolle.glb', desc: 'Stylish blue snow goggles' },
  { id: 'anaconda', name: 'Anaconda Black', path: '/anaconda_black.glb', desc: 'Classic black sports sunglasses' },
  { id: 'bolt', name: 'Bolt 2.0 Tortoise', path: '/bolt_2.0_turtoise.glb', desc: 'Tortoise pattern casual frame' },
  { id: 'glass', name: 'Premium Glass', path: '/models/glass.glb', desc: 'Frameless glass design' },
  { id: 'prize', name: 'Prize Black', path: '/models/prize_Black.glb', desc: 'Modern sport shield glasses' }
];

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraMocked, setCameraMocked] = useState(false);
  const [mockReason, setMockReason] = useState('');
  const [isManual, setIsManual] = useState(true); // Default to true so user has instant control
  const [showDebug, setShowDebug] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS_LIST[0]);
  const [debugOverlayData, setDebugOverlayData] = useState({ 
    fps: 0, scale: 0, angleZ: 0, templeDist: 0, pd: 62, faceShape: '', recs: null 
  });
  
  // Slider states for manual control
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [posZ, setPosZ] = useState(-3);
  const [scale, setScale] = useState(18);
  const [rotY, setRotY] = useState(0);

  // Connect tracking points drawing tool
  const connect = window.drawConnectors;

  // Intercept the custom mock event dispatched by our index.js polyfill
  useEffect(() => {
    const handleMockActive = (e) => {
      setCameraMocked(true);
      setMockReason(e.detail.error || 'Browser getUserMedia API is unavailable');
      setIsManual(true); // Ensure manual control is enabled
    };
    window.addEventListener('camera-fallback-active', handleMockActive);
    return () => {
      window.removeEventListener('camera-fallback-active', handleMockActive);
    };
  }, []);

  // Sync React state values to global variables read inside useFrame
  useEffect(() => {
    manual_mode = isManual;
  }, [isManual]);

  // Update debug stats periodically so we don't spam re-renders on every frame
  useEffect(() => {
    const interval = setInterval(() => {
      if (showDebug) {
        setDebugOverlayData({
          fps: debugInfo.fps,
          scale: debugInfo.scale,
          angleZ: debugInfo.angleZ,
          angleY: debugInfo.angleY,
          templeDist: debugInfo.templeDistance,
          pd: debugInfo.pd,
          faceShape: debugInfo.faceShape,
          recs: debugInfo.recommendations
        });
      }
    }, 200);
    return () => clearInterval(interval);
  }, [showDebug]);

  useEffect(() => {
    manual_x = posX;
    manual_y = posY;
    manual_z = posZ;
    manual_scale = scale;
    manual_rotation_y = rotY;
  }, [posX, posY, posZ, scale, rotY]);

  // Reset sliders to default values
  const handleResetSliders = () => {
    setPosX(0);
    setPosY(0);
    setPosZ(-3);
    setScale(18);
    setRotY(0);
  };

  // Capture System - Generates Screenshot for Download
  const handleScreenshot = () => {
    if (!webcamRef.current || !canvasRef.current) return;
    
    // Find the active WebGL React Three Fiber Canvas
    const threeCanvas = document.querySelector('.canvas-wrapper canvas');
    if (!threeCanvas) return;
    
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = webcamRef.current.video.videoWidth;
    captureCanvas.height = webcamRef.current.video.videoHeight;
    const ctx = captureCanvas.getContext('2d');
    
    // 1. Draw mirrored webcam frame
    ctx.translate(captureCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(webcamRef.current.video, 0, 0, captureCanvas.width, captureCanvas.height);
    
    // 2. Overlay 3D scene (reset transform as 3D canvas handles mirror internally)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(threeCanvas, 0, 0, captureCanvas.width, captureCanvas.height);
    
    // 3. Trigger native download
    const link = document.createElement('a');
    link.download = `lenskart-fit-${new Date().getTime()}.png`;
    link.href = captureCanvas.toDataURL('image/png');
    link.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = url;
      video.loop = true;
      video.muted = true;
      video.play().catch(console.error);
      window.mockMediaElement = video;
      setIsManual(false); // Switch back to AI Tracking mode for the uploaded media
    } else if (file.type.startsWith('image/')) {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        window.mockMediaElement = img;
        setIsManual(false); // Switch back to AI Tracking mode
      };
    }
  };

  function onResults(results) {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      isFaceTracked = true;
      const landmarks = results.multiFaceLandmarks[0];
      
      // Target specific landmarks
      const leftEye = landmarks[33]; 
      const rightEye = landmarks[263]; 
      const leftTemple = landmarks[234];
      const rightTemple = landmarks[454];
      const noseBridge = landmarks[168];

      // 2. Position Calculation
      // Calculate eye center (primary anchor)
      const eyeCenterX = (leftEye.x + rightEye.x) / 2;
      const eyeCenterY = (leftEye.y + rightEye.y) / 2;
      const eyeCenterZ = (leftEye.z + rightEye.z) / 2;

      debugInfo.eyeCenter = { x: eyeCenterX, y: eyeCenterY };

      // Map mapped points to 3D coordinate space mapping 16:9 
      targetPos.x = (eyeCenterX - 0.5) * 10;
      targetPos.y = -(eyeCenterY - 0.5) * 7.5;
      targetPos.z = -(noseBridge.z) * 10;

      // 3. Dynamic Scaling 
      const templeDistance = Math.hypot(rightTemple.x - leftTemple.x, rightTemple.y - leftTemple.y);
      debugInfo.templeDistance = templeDistance;
      
      // Calculate scale relative to temple distance (multiplier tuned for normal face distance)
      targetScaleVal = templeDistance * 45; 

      // 4. Rotation Calculations
      // Z Rotation (Head tilt)
      const angleZ = Math.atan2(rightTemple.y - leftTemple.y, rightTemple.x - leftTemple.x);
      targetRotZ = -angleZ; 
      debugInfo.angleZ = angleZ;

      // Y Rotation (Head turn left/right)
      const angleY = Math.asin((rightTemple.z - leftTemple.z) / templeDistance);
      targetRotY = angleY;
      debugInfo.angleY = angleY;

      // X Rotation (Head tilt up/down)
      const faceHeight = Math.hypot(landmarks[152].x - landmarks[10].x, landmarks[152].y - landmarks[10].y);
      const angleX = Math.asin((noseBridge.z - landmarks[152].z) / faceHeight);
      targetRotX = angleX - 0.1; // mild offset for glasses resting angle

      // 5. Face Shape & PD (analyzed passively for AI Recommendations)
      const currentPd = calculatePD(landmarks);
      const currentShape = detectFaceShape(landmarks);
      
      // Update global debug info dynamically
      debugInfo.pd = Math.round(currentPd);
      debugInfo.faceShape = currentShape;
      debugInfo.recommendations = getFrameRecommendations(currentShape);

    } else {
      isFaceTracked = false;
    }

    if (canvasRef.current && webcamRef.current && webcamRef.current.video) {
      canvasRef.current.width = webcamRef.current.video.videoWidth;
      canvasRef.current.height = webcamRef.current.video.videoHeight;

      const canvasElement = canvasRef.current;
      const canvasCtx = canvasElement.getContext("2d");
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

      if (results.multiFaceLandmarks && connect) {
        for (const landmarks of results.multiFaceLandmarks) {
          if (!manual_mode && showDebug) {
             // Debug overlay: Render developer landmark dots (8)
             const debugLandmarks = [33, 263, 168, 234, 454];
             canvasCtx.fillStyle = '#ff3366';
             for (let i of debugLandmarks) {
                 const lm = landmarks[i];
                 canvasCtx.beginPath();
                 canvasCtx.arc(lm.x * canvasElement.width, lm.y * canvasElement.height, 4, 0, 2 * Math.PI);
                 canvasCtx.fill();
                 
                 // Text label
                 canvasCtx.fillStyle = '#ffffff';
                 canvasCtx.font = '10px Arial';
                 canvasCtx.fillText(`L${i}`, lm.x * canvasElement.width + 5, lm.y * canvasElement.height - 5);
                 canvasCtx.fillStyle = '#ff3366';
             }
          }

          // Face mesh wireframe for context
          connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYE, {color: 'rgba(0, 255, 136, 0.3)', lineWidth: 1});
          connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYE, {color: 'rgba(0, 255, 136, 0.3)', lineWidth: 1});
          connect(canvasCtx, landmarks, Facemesh.FACEMESH_FACE_OVAL, {color: 'rgba(255,255,255,0.1)', lineWidth: 1});
        }
      }
      canvasCtx.restore();
    }
  }

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      selfieMode: true,
    });

    faceMesh.onResults(onResults);

    let cameraInstance = null;

    if (webcamRef.current && webcamRef.current.video) {
      cameraInstance = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current && webcamRef.current.video) {
            await faceMesh.send({ image: webcamRef.current.video });
          }
        },
      });
      cameraInstance.start().catch((err) => {
        console.error("Camera startup failed: ", err);
        setCameraMocked(true);
        setMockReason(err.message || 'Device camera access denied');
        setIsManual(true);
      });
    }

    return () => {
      if (cameraInstance) {
        try {
          cameraInstance.stop();
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <Grid container direction="column" sx={{ minHeight: "100vh" }}>
        <Grid item xs={12}>
          <Header />
        </Grid>
        
        <Grid item container sx={{ p: { xs: 2, md: 4 }, flexGrow: 1, gap: 3 }} justifyContent="center">
          
          {/* Main Visualizer Panel */}
          <Grid item xs={12} md={7} lg={7}>
            <Box className="outer-div" sx={{ position: 'relative' }}>
              <Webcam 
                ref={webcamRef} 
                className="webcam-wrapper" 
                mirrored={true} 
                audio={false}
                screenshotFormat="image/jpeg"
              />
              <canvas hidden={!showDebug} className="responsive-canvas" ref={canvasRef} style={{ zIndex: 9, opacity: showDebug ? 0.7 : 0 }} />
              <Canvas gl={{ preserveDrawingBuffer: true }} className="canvas-wrapper">
                <Lights />
                <Suspense fallback={null}>
                  <Model key={selectedModel.id} url={selectedModel.path} position={[0, 0, -3]} />
                  <OrbitControls enableZoom={true} />
                </Suspense>
              </Canvas>
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              {cameraMocked ? (
                <Box className="status-badge status-warning">
                  <SecurityIcon fontSize="small" />
                  Simulated Camera Feed Active
                </Box>
              ) : (
                <Box className="status-badge status-active">
                  <CheckCircleOutlineIcon fontSize="small" />
                  Hardware Camera Active
                </Box>
              )}
              <Button 
                variant={showDebug ? "contained" : "outlined"}
                color="secondary"
                size="small"
                startIcon={<BugReportIcon />}
                onClick={() => setShowDebug(!showDebug)}
                sx={{ borderRadius: '20px', textTransform: 'none' }}
              >
                Developer Debug Mode
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                size="small"
                onClick={handleScreenshot}
                startIcon={<CameraAltIcon />}
                sx={{ borderRadius: '20px', textTransform: 'none', ml: 1, boxShadow: '0 0 10px rgba(0,255,136,0.3)' }}
              >
                Capture Fit
              </Button>
              {cameraMocked && (
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={<FileUploadIcon />}
                  sx={{ borderRadius: '20px', textTransform: 'none', ml: 1, color: '#00ff88', borderColor: '#00ff88' }}
                >
                  Upload Media
                  <input
                    type="file"
                    hidden
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                  />
                </Button>
              )}
            </Box>

            {/* Debug Overlay */}
            {showDebug && (
              <Box sx={{ 
                mt: 2, 
                p: 2, 
                backgroundColor: 'rgba(20, 25, 40, 0.8)', 
                border: '1px solid rgba(100, 150, 255, 0.2)',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2
              }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">FPS</Typography>
                  <Typography variant="body2" fontWeight="bold" color={debugOverlayData.fps < 30 ? "error.main" : "primary.main"}>
                    {debugOverlayData.fps}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Scale</Typography>
                  <Typography variant="body2" fontWeight="bold" color="white">
                    {debugOverlayData.scale.toFixed(2)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Face Z-Angle</Typography>
                  <Typography variant="body2" fontWeight="bold" color="white">
                    {((debugOverlayData.angleZ * 180) / Math.PI).toFixed(1)}°
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Temple Distance</Typography>
                  <Typography variant="body2" fontWeight="bold" color="white">
                    {debugOverlayData.templeDist.toFixed(3)}
                  </Typography>
                </Box>
              </Box>
            )}

          </Grid>
          
          {/* Controls and Customizations Panel */}
          <Grid item xs={12} md={4} lg={4}>
            <Card className="glass-panel" sx={{ height: '100%', background: 'transparent' }}>
              <CardContent sx={{ p: 0 }}>
                <Typography variant="h5" fontWeight="700" sx={{ mb: 2, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TuneIcon color="primary" /> Glasses Configurator
                </Typography>
                
                {/* AI Recommendation Panel */}
                {!isManual && debugOverlayData.recs && (
                  <Alert 
                    icon={<FaceRetouchingNaturalIcon />} 
                    severity="info" 
                    sx={{ mb: 2, borderRadius: '10px', backgroundColor: 'rgba(0, 255, 136, 0.08)', border: '1px solid rgba(0, 255, 136, 0.2)', color: '#fff' }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">Detected Face: {debugOverlayData.faceShape}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>PD: {debugOverlayData.pd}mm • {debugOverlayData.recs.desc}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#00ff88', fontWeight: 'bold' }}>
                      Recommended: {debugOverlayData.recs.best.join(', ')}
                    </Typography>
                  </Alert>
                )}

                {cameraMocked && (
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px', backgroundColor: 'rgba(255, 153, 0, 0.08)', border: '1px solid rgba(255, 153, 0, 0.2)' }}>
                    Camera access blocked or unsupported ({mockReason}). Using simulated feed and manual mode.
                  </Alert>
                )}

                {/* Model Selector */}
                <Typography variant="subtitle2" sx={{ mb: 1, color: '#888bc4', fontWeight: '600' }}>
                  SELECT GLASSES STYLE
                </Typography>
                <Grid container spacing={1.5} sx={{ mb: 3 }}>
                  {MODELS_LIST.map((model) => (
                    <Grid item xs={6} key={model.id}>
                      <Tooltip title={model.desc} placement="top">
                        <Box 
                          className={`model-card ${selectedModel.id === model.id ? 'active' : ''}`}
                          onClick={() => setSelectedModel(model)}
                        >
                          <Typography variant="body2" fontWeight="600">
                            {model.name}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Grid>
                  ))}
                </Grid>
                
                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
                
                {/* Mode Controller */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#888bc4', fontWeight: '600' }}>
                    TRACKING MODE
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={isManual} 
                        onChange={(e) => setIsManual(e.target.checked)} 
                        color="primary"
                      />
                    }
                    label={isManual ? "Manual Control" : "AI Face Tracking"}
                    sx={{ color: '#ffffff' }}
                  />
                </Box>
                
                {/* Manual Sliders (Now act as offsets for AI Tracking as well) */}
                <Box sx={{ pointerEvents: 'auto', transition: 'all 0.3s ease' }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 2, color: '#888bc4' }}>
                    {isManual ? "Use sliders to place the glasses." : "Use sliders to fine-tune offsets for the AI tracking."}
                  </Typography>
                  <Stack spacing={2} className="slider-container">
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#c5c6c7' }}>Position X (Left / Right) {!isManual && 'Offset'}</Typography>
                        <Typography variant="caption" fontWeight="600" color="primary">{posX.toFixed(2)}</Typography>
                      </Box>
                      <Slider 
                        value={posX} 
                        min={-5} 
                        max={5} 
                        step={0.05} 
                        onChange={(e, val) => setPosX(val)} 
                      />
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#c5c6c7' }}>Position Y (Up / Down) {!isManual && 'Offset'}</Typography>
                        <Typography variant="caption" fontWeight="600" color="primary">{posY.toFixed(2)}</Typography>
                      </Box>
                      <Slider 
                        value={posY} 
                        min={-5} 
                        max={5} 
                        step={0.05} 
                        onChange={(e, val) => setPosY(val)} 
                      />
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#c5c6c7' }}>Position Z (Depth) {!isManual && 'Offset'}</Typography>
                        <Typography variant="caption" fontWeight="600" color="primary">{posZ.toFixed(2)}</Typography>
                      </Box>
                      <Slider 
                        value={posZ} 
                        min={-10} 
                        max={5} 
                        step={0.1} 
                        onChange={(e, val) => setPosZ(val)} 
                      />
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#c5c6c7' }}>Scale (Size) {!isManual && 'Modifier'}</Typography>
                        <Typography variant="caption" fontWeight="600" color="primary">{scale.toFixed(1)}</Typography>
                      </Box>
                      <Slider 
                        value={scale} 
                        min={5} 
                        max={40} 
                        step={0.5} 
                        onChange={(e, val) => setScale(val)} 
                      />
                    </Box>

                    <Box sx={{ display: isManual ? 'block' : 'none' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#c5c6c7' }}>Angle (Rotation)</Typography>
                        <Typography variant="caption" fontWeight="600" color="primary">{((rotY * 180) / Math.PI).toFixed(0)}°</Typography>
                      </Box>
                      <Slider 
                        value={rotY} 
                        min={-Math.PI} 
                        max={Math.PI} 
                        step={0.05} 
                        onChange={(e, val) => setRotY(val)} 
                      />
                    </Box>

                    <Button 
                      variant="outlined" 
                      className="neon-btn"
                      onClick={handleResetSliders}
                      startIcon={<AutorenewIcon />}
                      fullWidth
                      sx={{ mt: 2 }}
                    >
                      Reset Placement
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
        </Grid>
      </Grid>
    </ThemeProvider>
  );
}

export default App;

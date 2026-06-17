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
import SecurityIcon from '@mui/icons-material/Security';
import TuneIcon from '@mui/icons-material/Tune';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';

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
var landmark_x = 0;
var landmark_y = 0;
var landmark_z = 0;
var scale_x = 0;

var manual_mode = true;
var manual_x = 0;
var manual_y = 0;
var manual_z = -3;
var manual_scale = 18;
var manual_rotation_y = 0;

function Model({ url, ...props }) {
  const gltf = useLoader(GLTFLoader, url);
  const ref = useRef();
  
  useFrame((state, delta) => {
    if (!ref.current) return;
    
    if (manual_mode) {
      ref.current.position.x = manual_x;
      ref.current.position.y = manual_y;
      ref.current.position.z = manual_z;
      
      ref.current.scale.x = manual_scale;
      ref.current.scale.y = manual_scale;
      ref.current.scale.z = manual_scale;
      
      ref.current.rotation.y = manual_rotation_y;
    } else {
      // Automatic tracking
      ref.current.position.x = (landmark_x - 0.5) * 10;
      ref.current.position.y = -(landmark_y - 0.5) * 7.5;
      ref.current.position.z = -(landmark_z);
      
      if (scale_x === 0) {
        // Fallback default coordinates if tracking hasn't locked onto a face yet
        ref.current.scale.x = 18;
        ref.current.scale.y = 18;
        ref.current.scale.z = 18;
        ref.current.position.x = 0;
        ref.current.position.y = 0;
        ref.current.position.z = -3;
      } else {
        ref.current.scale.x = scale_x * 100;
        ref.current.scale.y = scale_x * 100;
        ref.current.scale.z = scale_x * 100;
      }
      ref.current.rotation.y = 0;
    }
  });

  return (
    <>
      <primitive {...props} ref={ref} object={gltf.scene}></primitive>
    </>
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
  const [selectedModel, setSelectedModel] = useState(MODELS_LIST[0]);
  
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

  function onResults(results) {
    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        if (landmarks[0].x !== undefined) {
          landmark_x = landmarks[168].x;
          landmark_y = landmarks[168].y;
          landmark_z = landmarks[168].z;
          scale_x = landmarks[265].x - landmarks[35].x;
        }
      }
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
          connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYE, {color: '#00ff88', lineWidth: 1});
          connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYEBROW, {color: '#00ff88', lineWidth: 1});
          connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_IRIS, {color: '#00ff88', lineWidth: 1});
          connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYE, {color: '#00ff88', lineWidth: 1});
          connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYEBROW, {color: '#00ff88', lineWidth: 1});
          connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_IRIS, {color: '#00ff88', lineWidth: 1});
          connect(canvasCtx, landmarks, Facemesh.FACEMESH_FACE_OVAL, {color: 'rgba(255,255,255,0.4)', lineWidth: 1});
          connect(canvasCtx, landmarks, Facemesh.FACEMESH_LIPS, {color: '#ff3030', lineWidth: 1});
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
            <Box className="outer-div">
              <Webcam 
                ref={webcamRef} 
                className="webcam-wrapper" 
                mirrored={true} 
                audio={false}
                screenshotFormat="image/jpeg"
              />
              <canvas hidden className="responsive-canvas" ref={canvasRef} style={{ zIndex: 9 }} />
              <Canvas className="canvas-wrapper">
                <Lights />
                <Suspense fallback={null}>
                  <Model url={selectedModel.path} position={[0, 0, -3]} />
                  <OrbitControls enableZoom={true} />
                </Suspense>
              </Canvas>
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
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
            </Box>
          </Grid>
          
          {/* Controls and Customizations Panel */}
          <Grid item xs={12} md={4} lg={4}>
            <Card className="glass-panel" sx={{ height: '100%', background: 'transparent' }}>
              <CardContent sx={{ p: 0 }}>
                <Typography variant="h5" fontWeight="700" sx={{ mb: 2, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TuneIcon color="primary" /> Glasses Configurator
                </Typography>
                
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
                
                {/* Manual Sliders */}
                <Box sx={{ opacity: isManual ? 1 : 0.4, pointerEvents: isManual ? 'auto' : 'none', transition: 'all 0.3s ease' }}>
                  <Stack spacing={2} className="slider-container">
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#c5c6c7' }}>Position X (Left / Right)</Typography>
                        <Typography variant="caption" fontWeight="600" color="primary">{posX.toFixed(2)}</Typography>
                      </Box>
                      <Slider 
                        value={posX} 
                        min={-5} 
                        max={5} 
                        step={0.05} 
                        onChange={(e, val) => setPosX(val)} 
                        valueLabelDisplay="auto"
                      />
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#c5c6c7' }}>Position Y (Up / Down)</Typography>
                        <Typography variant="caption" fontWeight="600" color="primary">{posY.toFixed(2)}</Typography>
                      </Box>
                      <Slider 
                        value={posY} 
                        min={-5} 
                        max={5} 
                        step={0.05} 
                        onChange={(e, val) => setPosY(val)} 
                        valueLabelDisplay="auto"
                      />
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#c5c6c7' }}>Position Z (Depth)</Typography>
                        <Typography variant="caption" fontWeight="600" color="primary">{posZ.toFixed(2)}</Typography>
                      </Box>
                      <Slider 
                        value={posZ} 
                        min={-10} 
                        max={2} 
                        step={0.1} 
                        onChange={(e, val) => setPosZ(val)} 
                        valueLabelDisplay="auto"
                      />
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#c5c6c7' }}>Scale (Size)</Typography>
                        <Typography variant="caption" fontWeight="600" color="primary">{scale.toFixed(1)}</Typography>
                      </Box>
                      <Slider 
                        value={scale} 
                        min={5} 
                        max={50} 
                        step={0.5} 
                        onChange={(e, val) => setScale(val)} 
                        valueLabelDisplay="auto"
                      />
                    </Box>

                    <Box>
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
                        valueLabelDisplay="auto"
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

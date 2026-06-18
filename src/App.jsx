import './App.css';
import { useRef, useState, useEffect, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Grid, Card, CardContent, Typography, Slider, Switch,
  FormControlLabel, Button, Box, Divider, Stack, Alert, Tooltip,
} from '@mui/material';
import Header from './Header';
import SecurityIcon           from '@mui/icons-material/Security';
import TuneIcon               from '@mui/icons-material/Tune';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutorenewIcon          from '@mui/icons-material/Autorenew';
import BugReportIcon          from '@mui/icons-material/BugReport';
import CameraAltIcon          from '@mui/icons-material/CameraAlt';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import FileUploadIcon         from '@mui/icons-material/FileUpload';

import useTrackingStore from './store/useTrackingStore';
import { Scene3D }       from './components/Scene3D';
import { WebcamTracker } from './components/WebcamTracker';

// ─── Theme ────────────────────────────────────────────────────────────────────
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: '#00ff88' },
    background: { default: '#0b0c10', paper: '#1a1c2d' },
  },
});

// ─── Model list — all 8 GLB frames in public/ ────────────────────────────────
const MODELS_LIST = [
  {
    id: 'bolle',
    name: 'Nevada Blue',
    brand: 'Bollé',
    path: '/translated-bolle.glb',
    desc: 'Wide-lens snow goggle with blue shield. Great for broad faces.',
    emoji: '🥽',
    tag: 'Goggle',
    color: '#4fa3e0',
  },
  {
    id: 'anaconda',
    name: 'Anaconda',
    brand: 'Sport',
    path: '/anaconda_black.glb',
    desc: 'Classic wrap-around black sports sunglasses.',
    emoji: '🕶️',
    tag: 'Sport',
    color: '#444',
  },
  {
    id: 'anaconda-cyris',
    name: 'Anaconda Cyris',
    brand: 'Sport',
    path: '/models/anaconda_cyris.glb',
    desc: 'Sleek Cyris variant with tinted lenses.',
    emoji: '😎',
    tag: 'Sport',
    color: '#556b2f',
  },
  {
    id: 'bolt-tortoise',
    name: 'Bolt Tortoise',
    brand: 'Casual',
    path: '/bolt_2.0_turtoise.glb',
    desc: 'Warm tortoise-shell pattern casual frame.',
    emoji: '🐢',
    tag: 'Casual',
    color: '#8B6914',
  },
  {
    id: 'bolt-black',
    name: 'Bolt Black',
    brand: 'Casual',
    path: '/models/bolt_2.0_black.glb',
    desc: 'Sleek matte-black version of the Bolt 2.0.',
    emoji: '⚡',
    tag: 'Casual',
    color: '#222',
  },
  {
    id: 'glass',
    name: 'Premium Glass',
    brand: 'Luxury',
    path: '/models/glass.glb',
    desc: 'Minimalist frameless glass design.',
    emoji: '✨',
    tag: 'Luxury',
    color: '#a0c4ff',
  },
  {
    id: 'prize',
    name: 'Prize Black',
    brand: 'Shield',
    path: '/models/prize_Black.glb',
    desc: 'Modern sport shield with full wraparound protection.',
    emoji: '🏆',
    tag: 'Shield',
    color: '#1a1a1a',
  },
  {
    id: 'bolle-mesh',
    name: 'Nevada Mesh',
    brand: 'Bollé',
    path: '/with-mesh-bolle.glb',
    desc: 'Bollé Nevada with visible head mesh for alignment debug.',
    emoji: '🔵',
    tag: 'Debug',
    color: '#3a7bd5',
  },
];

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const webcamRef = useRef(null);

  const [cameraMocked,   setCameraMocked]   = useState(false);
  const [mockReason,     setMockReason]     = useState('');
  const [isManual,       setIsManual]       = useState(true);
  const [showDebug,      setShowDebug]      = useState(false);
  const [selectedModel,  setSelectedModel]  = useState(MODELS_LIST[0]);
  const [debugDisplay,   setDebugDisplay]   = useState({
    fps: 0, scale: 0, angleY: 0, angleZ: 0, templeDist: 0, pd: 62, faceShape: '', recs: null,
  });

  // Manual slider state
  const [posX,  setPosX]  = useState(0);
  const [posY,  setPosY]  = useState(0);
  const [posZ,  setPosZ]  = useState(-3);
  const [scale, setScale] = useState(18);
  const [rotY,  setRotY]  = useState(0);

  // Listen for camera-fallback polyfill event from index.jsx
  useEffect(() => {
    const h = (e) => {
      setCameraMocked(true);
      setMockReason(e.detail?.error || 'Camera unavailable');
      setIsManual(true);
    };
    window.addEventListener('camera-fallback-active', h);
    return () => window.removeEventListener('camera-fallback-active', h);
  }, []);

  // Poll debug data from Zustand at ~5 Hz (no 60fps React re-renders)
  useEffect(() => {
    if (!showDebug) return;
    const id = setInterval(() => {
      const { debugData } = useTrackingStore.getState();
      setDebugDisplay({
        fps:       debugData.fps,
        scale:     debugData.scale,
        angleY:    debugData.angleY,
        angleZ:    debugData.angleZ,
        templeDist: debugData.templeDistance,
        pd:        debugData.pd,
        faceShape: debugData.faceShape,
        recs:      debugData.recommendations,
      });
    }, 200);
    return () => clearInterval(id);
  }, [showDebug]);

  const handleResetSliders = () => {
    setPosX(0); setPosY(0); setPosZ(-3); setScale(18); setRotY(0);
  };

  const handleScreenshot = useCallback(() => {
    const video = webcamRef.current?.video;
    if (!video) return;
    const threeCanvas = document.querySelector('.canvas-wrapper canvas');
    if (!threeCanvas) return;

    const cap = document.createElement('canvas');
    cap.width  = video.videoWidth;
    cap.height = video.videoHeight;
    const ctx  = cap.getContext('2d');
    ctx.translate(cap.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, cap.width, cap.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(threeCanvas, 0, 0, cap.width, cap.height);

    const a = document.createElement('a');
    a.download = `vto-${Date.now()}.png`;
    a.href     = cap.toDataURL('image/png');
    a.click();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
      const v = Object.assign(document.createElement('video'), { src: url, loop: true, muted: true });
      v.play().catch(console.error);
      window.mockMediaElement = v;
    } else {
      const img = new Image();
      img.onload = () => { window.mockMediaElement = img; };
      img.src = url;
    }
    setIsManual(false);
  };

  // Offsets passed to TrackingService for fine-tuning
  const manualOffsets = { x: posX, y: posY, z: posZ - (-3), scale };

  return (
    <ThemeProvider theme={darkTheme}>
      <Grid container direction="column" sx={{ minHeight: '100vh' }}>

        <Grid item xs={12}><Header /></Grid>

        <Grid item container sx={{ p: { xs: 2, md: 4 }, flexGrow: 1, gap: 3 }} justifyContent="center">

          {/* ── Visualizer Panel ─────────────────────────────────────────── */}
          <Grid item xs={12} md={7} lg={7}>
            <Box
              className="outer-div"
              sx={{ position: 'relative', width: '100%', paddingTop: '56.25%' /* 16:9 */ }}
            >
              {/* Webcam layer + MediaPipe tracking */}
              <WebcamTracker
                webcamRef={webcamRef}
                manualOffsets={manualOffsets}
                enabled={!isManual}
              />

              {/* Three.js overlay */}
              <Scene3D
                modelUrl={selectedModel.path}
                modelKey={selectedModel.id}
                showDebug={showDebug}
                isManual={isManual}
                manualX={posX}
                manualY={posY}
                manualZ={posZ}
                manualScale={scale}
                manualRotY={rotY}
              />
            </Box>

            {/* Status row */}
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              {cameraMocked ? (
                <Box className="status-badge status-warning">
                  <SecurityIcon fontSize="small" /> Simulated Camera Feed Active
                </Box>
              ) : (
                <Box className="status-badge status-active">
                  <CheckCircleOutlineIcon fontSize="small" /> Hardware Camera Active
                </Box>
              )}

              <Button variant={showDebug ? 'contained' : 'outlined'} color="secondary" size="small"
                startIcon={<BugReportIcon />} onClick={() => setShowDebug(!showDebug)}
                sx={{ borderRadius: '20px', textTransform: 'none' }}>
                Debug Mode
              </Button>

              <Button variant="contained" color="primary" size="small"
                onClick={handleScreenshot} startIcon={<CameraAltIcon />}
                sx={{ borderRadius: '20px', textTransform: 'none', boxShadow: '0 0 10px rgba(0,255,136,0.3)' }}>
                Capture Fit
              </Button>

              {cameraMocked && (
                <Button component="label" variant="outlined" size="small"
                  startIcon={<FileUploadIcon />}
                  sx={{ borderRadius: '20px', textTransform: 'none', color: '#00ff88', borderColor: '#00ff88' }}>
                  Upload Media
                  <input type="file" hidden accept="image/*,video/*" onChange={handleFileUpload} />
                </Button>
              )}
            </Box>

            {/* Debug overlay */}
            {showDebug && (
              <Box sx={{
                mt: 2, p: 2, backgroundColor: 'rgba(20,25,40,0.8)',
                border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px',
                backdropFilter: 'blur(10px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2,
              }}>
                {[
                  ['FPS',           debugDisplay.fps, debugDisplay.fps < 30 ? 'error.main' : 'primary.main'],
                  ['Scale',         debugDisplay.scale?.toFixed(2), 'white'],
                  ['Head Y°',       ((debugDisplay.angleY || 0) * 180 / Math.PI).toFixed(1) + '°', 'white'],
                  ['Temple Dist',   debugDisplay.templeDist?.toFixed(3), 'white'],
                  ['PD (mm)',       debugDisplay.pd, 'white'],
                  ['Face Shape',    debugDisplay.faceShape, '#00ff88'],
                ].map(([label, val, color]) => (
                  <Box key={label}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" fontWeight="bold" color={color}>{val}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Grid>

          {/* ── Configurator Panel ───────────────────────────────────────── */}
          <Grid item xs={12} md={4} lg={4}>
            <Card className="glass-panel" sx={{ height: '100%', background: 'transparent' }}>
              <CardContent sx={{ p: 0 }}>
                <Typography variant="h5" fontWeight="700"
                  sx={{ mb: 2, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TuneIcon color="primary" /> Glasses Configurator
                </Typography>

                {/* AI Recommendation */}
                {!isManual && debugDisplay.recs && (
                  <Alert icon={<FaceRetouchingNaturalIcon />} severity="info"
                    sx={{ mb: 2, borderRadius: '10px', backgroundColor: 'rgba(0,255,136,0.08)',
                      border: '1px solid rgba(0,255,136,0.2)', color: '#fff' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Detected Face: {debugDisplay.faceShape}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      PD: {debugDisplay.pd}mm · {debugDisplay.recs.desc}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#00ff88', fontWeight: 'bold' }}>
                      Recommended: {debugDisplay.recs.best.join(', ')}
                    </Typography>
                  </Alert>
                )}

                {cameraMocked && (
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px',
                    backgroundColor: 'rgba(255,153,0,0.08)', border: '1px solid rgba(255,153,0,0.2)' }}>
                    Camera blocked ({mockReason}). Using simulated feed.
                  </Alert>
                )}

                {/* ── Model Selector ─────────────────────────────────── */}
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#888bc4', fontWeight: '600', letterSpacing: '0.08em' }}>
                  SELECT GLASSES STYLE
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.2, mb: 3 }}>
                  {MODELS_LIST.map((model) => (
                    <Tooltip key={model.id} title={model.desc} placement="top" arrow>
                      <Box
                        onClick={() => setSelectedModel(model)}
                        sx={{
                          cursor: 'pointer',
                          borderRadius: '10px',
                          border: selectedModel.id === model.id
                            ? '1.5px solid #00ff88'
                            : '1px solid rgba(255,255,255,0.07)',
                          background: selectedModel.id === model.id
                            ? 'rgba(0,255,136,0.07)'
                            : 'rgba(255,255,255,0.02)',
                          boxShadow: selectedModel.id === model.id
                            ? '0 0 12px rgba(0,255,136,0.18)'
                            : 'none',
                          p: '9px 10px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          transition: 'all 0.18s ease',
                          '&:hover': {
                            borderColor: 'rgba(0,255,136,0.4)',
                            background: 'rgba(0,255,136,0.04)',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        {/* Emoji icon circle */}
                        <Box sx={{
                          width: 36, height: 36, borderRadius: '8px', flexShrink: 0,
                          background: `${model.color}22`,
                          border: `1px solid ${model.color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.1rem',
                        }}>
                          {model.emoji}
                        </Box>

                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              color: selectedModel.id === model.id ? '#00ff88' : '#e0e0e0',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              lineHeight: 1.2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {model.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              color: '#666',
                              fontSize: '0.62rem',
                              lineHeight: 1.2,
                            }}
                          >
                            {model.brand} · {model.tag}
                          </Typography>
                        </Box>

                        {/* Active checkmark */}
                        {selectedModel.id === model.id && (
                          <Box sx={{ ml: 'auto', color: '#00ff88', fontSize: '0.75rem', flexShrink: 0 }}>
                            ✓
                          </Box>
                        )}
                      </Box>
                    </Tooltip>
                  ))}
                </Box>

                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

                {/* Mode Toggle */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#888bc4', fontWeight: '600' }}>
                    TRACKING MODE
                  </Typography>
                  <FormControlLabel
                    control={<Switch checked={isManual} onChange={(e) => setIsManual(e.target.checked)} color="primary" />}
                    label={isManual ? 'Manual Control' : 'AI Face Tracking'}
                    sx={{ color: '#ffffff' }}
                  />
                </Box>

                <Typography variant="caption" sx={{ display: 'block', mb: 2, color: '#888bc4' }}>
                  {isManual
                    ? 'Use sliders to place the glasses.'
                    : 'Sliders act as fine-tune offsets on top of AI tracking.'}
                </Typography>

                {/* Sliders */}
                <Stack spacing={2} className="slider-container">
                  {[
                    { label: 'Position X (Left/Right)', val: posX, set: setPosX, min: -5, max: 5, step: 0.05, fmt: (v) => v.toFixed(2) },
                    { label: 'Position Y (Up/Down)',    val: posY, set: setPosY, min: -5, max: 5, step: 0.05, fmt: (v) => v.toFixed(2) },
                    { label: 'Position Z (Depth)',      val: posZ, set: setPosZ, min: -10, max: 5, step: 0.1, fmt: (v) => v.toFixed(2) },
                    { label: 'Scale (Size)',            val: scale, set: setScale, min: 5, max: 40, step: 0.5, fmt: (v) => v.toFixed(1) },
                  ].map(({ label, val, set, min, max, step, fmt }) => (
                    <Box key={label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#c5c6c7' }}>{label}</Typography>
                        <Typography variant="caption" fontWeight="600" color="primary">{fmt(val)}</Typography>
                      </Box>
                      <Slider value={val} min={min} max={max} step={step} onChange={(_, v) => set(v)} />
                    </Box>
                  ))}

                  {isManual && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: '#c5c6c7' }}>Angle (Rotation Y)</Typography>
                        <Typography variant="caption" fontWeight="600" color="primary">
                          {((rotY * 180) / Math.PI).toFixed(0)}°
                        </Typography>
                      </Box>
                      <Slider value={rotY} min={-Math.PI} max={Math.PI} step={0.05} onChange={(_, v) => setRotY(v)} />
                    </Box>
                  )}

                  <Button variant="outlined" className="neon-btn" onClick={handleResetSliders}
                    startIcon={<AutorenewIcon />} fullWidth sx={{ mt: 2 }}>
                    Reset Placement
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
      </Grid>
    </ThemeProvider>
  );
}

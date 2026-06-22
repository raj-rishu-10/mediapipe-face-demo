import './App.css';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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

// Jeeliz-style icons
import FavoriteIcon           from '@mui/icons-material/Favorite';
import FavoriteBorderIcon     from '@mui/icons-material/FavoriteBorder';
import CloseIcon              from '@mui/icons-material/Close';
import SearchIcon             from '@mui/icons-material/Search';
import OpenWithIcon           from '@mui/icons-material/OpenWith';
import LocalOfferIcon         from '@mui/icons-material/LocalOffer';
import ShareIcon              from '@mui/icons-material/Share';

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

// ─── Model list with mock prices and brands ──────────────────────────────────
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
    price: 189,
    scaleMultiplier: 1.12,
    yOffset: -0.01,
    zOffset: 0.0,
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
    price: 129,
    scaleMultiplier: 0.95,
    yOffset: -0.05,
    zOffset: -0.02,
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
    price: 149,
    scaleMultiplier: 0.95,
    yOffset: -0.05,
    zOffset: -0.02,
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
    price: 159,
    scaleMultiplier: 0.95,
    yOffset: -0.03,
    zOffset: -0.01,
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
    price: 169,
    scaleMultiplier: 0.95,
    yOffset: -0.03,
    zOffset: -0.01,
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
    price: 249,
    scaleMultiplier: 0.92,
    yOffset: -0.02,
    zOffset: -0.01,
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
    price: 199,
    scaleMultiplier: 1.02,
    yOffset: -0.04,
    zOffset: -0.02,
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
    price: 99,
    scaleMultiplier: 1.12,
    yOffset: -0.01,
    zOffset: 0.0,
  },
];

const BRANDS = ['All', 'Sport', 'Casual', 'Luxury', 'Goggle'];
const PRICE_FILTERS = ['All Prices', 'Price: Low-High', 'Price: High-Low'];

export default function App() {
  const webcamRef = useRef(null);

  const [cameraMocked,   setCameraMocked]   = useState(false);
  const [mockReason,     setMockReason]     = useState('');
  const [isManual,       setIsManual]       = useState(false);
  const [showDebug,      setShowDebug]      = useState(false);
  const [selectedModel,  setSelectedModel]  = useState(MODELS_LIST[0]);
  const [debugDisplay,   setDebugDisplay]   = useState({
    fps: 0, scale: 0, angleY: 0, angleZ: 0, templeDist: 0, pd: 62, faceShape: '', recs: null,
  });

  // Jeeliz-style State
  const [activeTab, setActiveTab] = useState('try'); // 'try' | 'favourites' | 'polls'
  const [favorites, setFavorites] = useState([]); // list of model ids
  const [brandIndex, setBrandIndex] = useState(0); // index in BRANDS
  const [priceIndex, setPriceIndex] = useState(0); // index in PRICE_FILTERS
  const [showSlidersPopup, setShowSlidersPopup] = useState(false);

  // Manual slider state
  const [posX,  setPosX]  = useState(0);
  const [posY,  setPosY]  = useState(0);
  const [posZ,  setPosZ]  = useState(-0.6);
  const [scale, setScale] = useState(0.14);
  const [rotY,  setRotY]  = useState(0);
  const [videoAspect, setVideoAspect] = useState(4 / 3);

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

  // Poll debug data from Zustand at ~5 Hz
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
    setPosX(0); setPosY(0); setPosZ(-0.6); setScale(0.14); setRotY(0);
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

  // Toggle favorite for current selected model
  const toggleFavorite = () => {
    if (!selectedModel) return;
    if (favorites.includes(selectedModel.id)) {
      setFavorites(favorites.filter(id => id !== selectedModel.id));
    } else {
      setFavorites([...favorites, selectedModel.id]);
    }
  };

  const currentBrand = BRANDS[brandIndex];
  const currentPriceFilter = PRICE_FILTERS[priceIndex];

  // Process and filter/sort models based on active brand category, tab, and sorting
  const processedModels = useMemo(() => {
    let list = [...MODELS_LIST];

    // Filter by Favourites tab
    if (activeTab === 'favourites') {
      list = list.filter(m => favorites.includes(m.id));
    }

    // Filter by category tag
    if (currentBrand !== 'All') {
      list = list.filter(m => m.tag === currentBrand);
    }

    // Apply price sorting
    if (currentPriceFilter === 'Price: Low-High') {
      list.sort((a, b) => a.price - b.price);
    } else if (currentPriceFilter === 'Price: High-Low') {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [activeTab, favorites, currentBrand, currentPriceFilter]);

  // Offsets passed to TrackingService for fine-tuning
  const manualOffsets = { x: posX, y: posY, z: posZ - (-0.6), scale };

  return (
    <ThemeProvider theme={darkTheme}>
      <Grid container direction="column" sx={{ minHeight: '100vh', backgroundColor: '#0b0c10' }}>
        
        {/* ── 1. Top Tab Bar (Jeeliz Inspired Navigation) ──────────────────── */}
        <Box className="jeeliz-header">
          <Typography className="jeeliz-logo">JEELIZ</Typography>
          <Box className="jeeliz-tabs">
            <Box 
              className={`jeeliz-tab ${activeTab === 'try' ? 'active' : ''}`}
              onClick={() => setActiveTab('try')}
            >
              <Typography sx={{ fontSize: '1.2rem', lineHeight: 1 }}>👓</Typography>
              <Typography variant="caption">Try Glasses</Typography>
            </Box>
            <Box 
              className={`jeeliz-tab ${activeTab === 'favourites' ? 'active' : ''}`}
              onClick={() => setActiveTab('favourites')}
            >
              <Typography sx={{ fontSize: '1.2rem', lineHeight: 1 }}>
                {favorites.length > 0 ? '❤️' : '🖤'}
              </Typography>
              <Typography variant="caption">
                Favourites {favorites.length > 0 ? `(${favorites.length})` : ''}
              </Typography>
            </Box>
            <Box 
              className={`jeeliz-tab ${activeTab === 'polls' ? 'active' : ''}`}
              onClick={() => setActiveTab('polls')}
            >
              <ShareIcon sx={{ fontSize: '1rem' }} />
              <Typography variant="caption">My Polls</Typography>
            </Box>
          </Box>
        </Box>

        {/* ── 2. Content Body ────────────────────────────────────────────── */}
        <Grid item container sx={{ p: { xs: 1, md: 3 }, flexGrow: 1, gap: 2 }} justifyContent="center">
          
          {/* Main Visualizer viewport */}
          <Grid item xs={12} md={7} lg={7} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box
              className="outer-div"
              sx={{ position: 'relative', width: '100%', aspectRatio: videoAspect, height: 'auto', maxHeight: '70vh', flexGrow: 1 }}
            >
              {/* Webcam layer + MediaPipe tracking */}
              <WebcamTracker
                webcamRef={webcamRef}
                manualOffsets={manualOffsets}
                enabled={!isManual}
                onVideoDimensions={setVideoAspect}
              />

              {/* Three.js overlay */}
              <Scene3D
                modelUrl={selectedModel?.path}
                modelKey={selectedModel?.id}
                scaleMultiplier={selectedModel?.scaleMultiplier}
                yOffset={selectedModel?.yOffset || 0}
                zOffset={selectedModel?.zOffset || 0}
                showDebug={showDebug}
                isManual={isManual}
                manualX={posX}
                manualY={posY}
                manualZ={posZ}
                manualScale={scale}
                manualRotY={rotY}
              />

              {/* Floating Frame Position Sliders Popup */}
              {showSlidersPopup && (
                <Box className="jeeliz-popup-overlay">
                  <Box className="jeeliz-popup-header">
                    <Typography className="jeeliz-popup-title">FRAME POSITION</Typography>
                    <CloseIcon 
                      className="jeeliz-popup-close" 
                      onClick={() => setShowSlidersPopup(false)} 
                    />
                  </Box>
                  <Stack spacing={1.5} className="slider-container">
                    {[
                      { label: 'Position X (Left/Right)', val: posX, set: setPosX, min: -0.4, max: 0.4, step: 0.005, fmt: (v) => v.toFixed(3) },
                      { label: 'Position Y (Up/Down)',    val: posY, set: setPosY, min: -0.4, max: 0.4, step: 0.005, fmt: (v) => v.toFixed(3) },
                      { label: 'Position Z (Depth)',      val: posZ, set: setPosZ, min: -1.2, max: -0.2, step: 0.01, fmt: (v) => v.toFixed(2) },
                      { label: 'Scale (Size)',            val: scale, set: setScale, min: 0.08, max: 0.22, step: 0.002, fmt: (v) => v.toFixed(3) },
                    ].map(({ label, val, set, min, max, step, fmt }) => (
                      <Box key={label}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" sx={{ color: '#c5c6c7' }}>{label}</Typography>
                          <Typography variant="caption" fontWeight="600" color="primary">{fmt(val)}</Typography>
                        </Box>
                        <Slider value={val} min={min} max={max} step={step} onChange={(_, v) => set(v)} size="small" />
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
                        <Slider value={rotY} min={-Math.PI} max={Math.PI} step={0.05} onChange={(_, v) => setRotY(v)} size="small" />
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}
            </Box>

            {/* ── 3. Sub-menu Selector Row ─────────────────────────────────── */}
            <Box className="jeeliz-submenu">
              <Box 
                className="jeeliz-submenu-item"
                onClick={() => setBrandIndex((brandIndex + 1) % BRANDS.length)}
              >
                <SearchIcon sx={{ fontSize: '0.95rem' }} />
                <Typography variant="caption">Brands: {currentBrand}</Typography>
              </Box>
              <Box 
                className={`jeeliz-submenu-item ${showSlidersPopup ? 'active' : ''}`}
                onClick={() => setShowSlidersPopup(!showSlidersPopup)}
              >
                <OpenWithIcon sx={{ fontSize: '0.95rem' }} />
                <Typography variant="caption">Frame Position</Typography>
              </Box>
              <Box 
                className="jeeliz-submenu-item"
                onClick={() => setPriceIndex((priceIndex + 1) % PRICE_FILTERS.length)}
              >
                <LocalOfferIcon sx={{ fontSize: '0.95rem' }} />
                <Typography variant="caption">{currentPriceFilter}</Typography>
              </Box>
            </Box>

            {/* ── 4. Horizontal Previews Carousel ───────────────────────────── */}
            <Box className="jeeliz-carousel-container">
              {processedModels.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ py: 2, width: '100%', textAlign: 'center' }}>
                  No styles fit the criteria.
                </Typography>
              ) : (
                processedModels.map((model) => (
                  <Box
                    key={model.id}
                    className={`jeeliz-carousel-card ${selectedModel?.id === model.id ? 'active' : ''}`}
                    onClick={() => setSelectedModel(model)}
                  >
                    {favorites.includes(model.id) && (
                      <FavoriteIcon className="jeeliz-heart-badge" />
                    )}
                    <Typography className="jeeliz-carousel-emoji">{model.emoji}</Typography>
                    <Typography className="jeeliz-carousel-name">{model.name}</Typography>
                    <Typography sx={{ fontSize: '0.52rem', opacity: 0.65, color: '#00ff88' }}>
                      ${model.price}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>

            {/* ── 5. Bottom Action Buttons Row ─────────────────────────────── */}
            <Box className="jeeliz-actions-row">
              <Tooltip title="Remove Glasses" arrow>
                <Box className="jeeliz-action-btn btn-close" onClick={() => setSelectedModel(null)}>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>×</Typography>
                </Box>
              </Tooltip>

              <Tooltip title="Reset Position" arrow>
                <Box className="jeeliz-action-btn btn-reset" onClick={handleResetSliders}>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>↻</Typography>
                </Box>
              </Tooltip>

              <Tooltip title="Like style" arrow>
                <Box 
                  className={`jeeliz-action-btn btn-favorite ${selectedModel && favorites.includes(selectedModel.id) ? 'active' : ''}`} 
                  onClick={toggleFavorite}
                >
                  <Typography variant="h5" sx={{ lineHeight: 1 }}>♥</Typography>
                </Box>
              </Tooltip>
            </Box>
          </Grid>

          {/* Desktop Right Info/Sidebar Panel */}
          <Grid item xs={12} md={4} lg={4}>
            <Card className="glass-panel" sx={{ height: '100%', background: 'transparent' }}>
              <CardContent sx={{ p: 0 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#888bc4', fontWeight: '600', letterSpacing: '0.08em' }}>
                  ENGINE CONTROLS
                </Typography>

                {/* Tracking Mode Switch */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: '600' }}>
                    TRACKING MODE
                  </Typography>
                  <FormControlLabel
                    control={<Switch checked={isManual} onChange={(e) => setIsManual(e.target.checked)} color="primary" />}
                    label={isManual ? 'Manual Control' : 'AI Face Tracking'}
                    sx={{ color: '#ffffff', m: 0 }}
                  />
                </Box>

                {/* AI Recommendation Alert */}
                {!isManual && debugDisplay.recs && (
                  <Alert icon={<FaceRetouchingNaturalIcon />} severity="info"
                    sx={{ mb: 2, borderRadius: '10px', backgroundColor: 'rgba(0,255,136,0.08)',
                      border: '1px solid rgba(0,255,136,0.2)', color: '#fff' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Face Shape: {debugDisplay.faceShape}
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

                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

                {/* Upload Media / Fallback controls */}
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#888bc4', fontWeight: '600', letterSpacing: '0.08em' }}>
                  SIMULATOR CONTROLS
                </Typography>
                
                <Stack spacing={1.5}>
                  <Button variant={showDebug ? 'contained' : 'outlined'} color="secondary" fullWidth
                    startIcon={<BugReportIcon />} onClick={() => setShowDebug(!showDebug)}
                    sx={{ borderRadius: '20px', textTransform: 'none' }}>
                    Toggle Debug Mode
                  </Button>

                  <Button variant="contained" color="primary" fullWidth
                    onClick={handleScreenshot} startIcon={<CameraAltIcon />}
                    sx={{ borderRadius: '20px', textTransform: 'none', boxShadow: '0 0 10px rgba(0,255,136,0.3)' }}>
                    Capture VTO Screenshot
                  </Button>

                  {cameraMocked && (
                    <Button component="label" variant="outlined" fullWidth
                      startIcon={<FileUploadIcon />}
                      sx={{ borderRadius: '20px', textTransform: 'none', color: '#00ff88', borderColor: '#00ff88' }}>
                      Upload Photo / Video
                      <input type="file" hidden accept="image/*,video/*" onChange={handleFileUpload} />
                    </Button>
                  )}
                </Stack>

                {/* Debug Data Metrics Panel */}
                {showDebug && (
                  <Box sx={{
                    mt: 3, p: 2, backgroundColor: 'rgba(20,25,40,0.8)',
                    border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px',
                    backdropFilter: 'blur(10px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2,
                  }}>
                    {[
                      ['FPS',           debugDisplay.fps, debugDisplay.fps < 20 ? 'error.main' : 'primary.main'],
                      ['Scale',         debugDisplay.scale?.toFixed(3), 'white'],
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

              </CardContent>
            </Card>
          </Grid>

        </Grid>
      </Grid>
    </ThemeProvider>
  );
}

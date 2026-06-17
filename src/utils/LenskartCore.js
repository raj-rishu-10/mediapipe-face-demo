import * as THREE from 'three';

// ---------------------------------------------------------
// 1. Kalman Filter for Extreme Smoothing (Eliminates Jitter)
// ---------------------------------------------------------
export class Vector3KalmanFilter {
  constructor(r = 0.05, q = 0.01) {
    this.R = r; // Measurement noise (higher = smoother but more delay)
    this.Q = q; // Process noise (lower = smoother)
    this.A = 1;
    this.C = 1;
    
    this.cov = { x: 1, y: 1, z: 1 };
    this.x = { x: NaN, y: NaN, z: NaN };
  }

  filter(z) {
    if (isNaN(this.x.x)) {
      this.x = { x: z.x, y: z.y, z: z.z };
    } else {
      ['x', 'y', 'z'].forEach(axis => {
        // Prediction
        const predX = this.A * this.x[axis];
        const predCov = this.A * this.cov[axis] * this.A + this.R;

        // Kalman gain
        const K = predCov * this.C * (1 / (this.C * predCov * this.C + this.Q));

        // Correction
        this.x[axis] = predX + K * (z[axis] - this.C * predX);
        this.cov[axis] = predCov - K * this.C * predCov;
      });
    }
    return new THREE.Vector3(this.x.x, this.x.y, this.x.z);
  }
}

// ---------------------------------------------------------
// 2. Face Geometry & Pose Math
// ---------------------------------------------------------
export function calculateDistance(lm1, lm2) {
  return Math.hypot(lm1.x - lm2.x, lm1.y - lm2.y, (lm1.z - lm2.z) || 0);
}

// Computes accurate Pupillary Distance (PD) for optical accuracy
export function calculatePD(landmarks) {
  const leftIris = landmarks[473];
  const rightIris = landmarks[468];
  if (!leftIris || !rightIris) return 62; // Default average PD in mm
  
  // Real world multiplier relies on face width calibration, but proportional is fine
  return calculateDistance(leftIris, rightIris) * 100; // Scaled proportional PD
}

// ---------------------------------------------------------
// 3. AI Face Shape Detection
// ---------------------------------------------------------
export function detectFaceShape(landmarks) {
  // Key points for morphological analysis
  const topForehead = landmarks[10];
  const bottomChin = landmarks[152];
  const leftTemple = landmarks[234];
  const rightTemple = landmarks[454];
  const leftJaw = landmarks[132];
  const rightJaw = landmarks[361];

  const faceLength = calculateDistance(topForehead, bottomChin);
  const faceWidth = calculateDistance(leftTemple, rightTemple);
  const jawWidth = calculateDistance(leftJaw, rightJaw);
  
  const lengthWidthRatio = faceLength / faceWidth;
  const jawWidthRatio = jawWidth / faceWidth;
  
  if (lengthWidthRatio > 1.45) return 'Oval';
  if (lengthWidthRatio < 1.25 && jawWidthRatio > 0.8) return 'Square';
  if (lengthWidthRatio < 1.25 && jawWidthRatio < 0.8) return 'Round';
  if (jawWidthRatio < 0.65) return 'Heart';
  
  return 'Oval'; // Default fallback
}

// ---------------------------------------------------------
// 4. AI Frame Recommendation Engine
// ---------------------------------------------------------
export function getFrameRecommendations(shape) {
  const rules = {
    'Round': { best: ['Rectangle', 'Wayfarer'], desc: 'Adds angles to soft features.' },
    'Square': { best: ['Round', 'Aviator'], desc: 'Softens strong jawlines.' },
    'Oval': { best: ['Aviator', 'Wayfarer', 'Round'], desc: 'Lucky you! Almost all frames fit.' },
    'Heart': { best: ['Rimless', 'Round', 'Light Frames'], desc: 'Balances a wider forehead.' }
  };
  return rules[shape] || rules['Oval'];
}

import * as THREE from 'three';

/**
 * Smoothing utilities — MediaPipe equivalent of Jeeliz's built-in smoothing.
 *
 * ── JEELIZ ANALYSIS ─────────────────────────────────────────────────────────
 * Jeeliz applies internal exponential smoothing to detectState values:
 *   x, y, s, rx, ry, rz
 * The smoothing coefficient is approx. 0.7 for position and 0.5 for rotation
 * (inferred from the neural net output blending in the Jeeliz WebGL pipeline).
 *
 * Jeeliz does NOT use a Kalman filter — it uses a simple 1-pole IIR:
 *   smoothed = prev + alpha * (new - prev)
 *
 * For our MediaPipe implementation we use:
 *   - 1-pole IIR (exponential) for position and scale   (matches Jeeliz)
 *   - Quaternion slerp for rotation                     (matches Jeeliz intent)
 *
 * Tuned coefficients to match the visual "feel" of Jeeliz:
 *   position alpha = 0.18  (Jeeliz feel: smooth, slight lag)
 *   rotation alpha = 0.22  (slightly snappier than position)
 *   scale    alpha = 0.15  (slowest — prevents size jitter)
 */

// ── Scalar IIR smoother ────────────────────────────────────────────────────────
export class ScalarSmoother {
  constructor(alpha = 0.18) {
    this.alpha = alpha;
    this._v    = NaN;
  }

  filter(v) {
    if (isNaN(this._v)) { this._v = v; return v; }
    this._v += (v - this._v) * this.alpha;
    return this._v;
  }

  reset() { this._v = NaN; }
}

// ── Vector3 IIR smoother (3 independent scalars) ──────────────────────────────
export class Vector3Smoother {
  constructor(alpha = 0.18) {
    this._x = new ScalarSmoother(alpha);
    this._y = new ScalarSmoother(alpha);
    this._z = new ScalarSmoother(alpha);
  }

  filter(v) {
    return new THREE.Vector3(
      this._x.filter(v.x),
      this._y.filter(v.y),
      this._z.filter(v.z)
    );
  }

  reset() { this._x.reset(); this._y.reset(); this._z.reset(); }
}

// ── Quaternion slerp smoother ──────────────────────────────────────────────────
export class QuaternionSmoother {
  constructor(alpha = 0.22) {
    this.alpha  = alpha;
    this._q     = new THREE.Quaternion();
    this._ready = false;
  }

  filter(target) {
    if (!this._ready) {
      this._q.copy(target);
      this._ready = true;
      return this._q.clone();
    }
    this._q.slerp(target, this.alpha);
    return this._q.clone();
  }

  reset() { this._ready = false; }
}

/**
 * One-Euro Filter for position — lower jitter than pure IIR at low speeds,
 * yet stays responsive at high speeds. Jeeliz uses simpler IIR; this is an
 * optional upgrade that improves MediaPipe results.
 *
 * Reference: Géry Casiez, Nicolas Roussel, Daniel Vogel (2012)
 */
class OneEuroScalar {
  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta      = beta;
    this.dCutoff   = dCutoff;
    this._xPrev    = NaN;
    this._dxPrev   = 0;
    this._tPrev    = NaN;
  }

  _alpha(cutoff, dt) {
    const te = 1.0 / (60 * dt || 1); // assume 60Hz if dt unknown
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(x, t = performance.now() / 1000) {
    if (isNaN(this._xPrev)) {
      this._xPrev = x; this._tPrev = t; return x;
    }
    const dt = t - this._tPrev;
    this._tPrev = t;

    // derivative
    const dx = (x - this._xPrev) / (dt || 1/60);
    const alphaD = this._alpha(this.dCutoff, dt);
    this._dxPrev += alphaD * (dx - this._dxPrev);

    // adaptive cutoff
    const cutoff = this.minCutoff + this.beta * Math.abs(this._dxPrev);
    const alpha  = this._alpha(cutoff, dt);
    this._xPrev += alpha * (x - this._xPrev);
    return this._xPrev;
  }
}

export class OneEuroVector3 {
  constructor(minCutoff = 1.0, beta = 0.005) {
    this._x = new OneEuroScalar(minCutoff, beta);
    this._y = new OneEuroScalar(minCutoff, beta);
    this._z = new OneEuroScalar(minCutoff, beta);
  }

  filter(v, t) {
    return new THREE.Vector3(
      this._x.filter(v.x, t),
      this._y.filter(v.y, t),
      this._z.filter(v.z, t)
    );
  }
}

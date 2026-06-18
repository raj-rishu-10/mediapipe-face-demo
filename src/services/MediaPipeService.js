import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let _instance = null;
let _loading  = false;

const WASM_PATH   = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_PATH  =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/**
 * Singleton initializer — safe to call multiple times (returns cached instance).
 */
export async function initMediaPipe() {
  if (_instance) return _instance;
  if (_loading)  {
    // Wait until the first call finishes
    return new Promise((resolve, reject) => {
      const poll = setInterval(() => {
        if (_instance)  { clearInterval(poll); resolve(_instance); }
        if (!_loading)  { clearInterval(poll); reject(new Error('MediaPipe failed to load')); }
      }, 100);
    });
  }

  _loading = true;
  try {
    const resolver = await FilesetResolver.forVisionTasks(WASM_PATH);
    _instance = await FaceLandmarker.createFromOptions(resolver, {
      baseOptions: {
        modelAssetPath: MODEL_PATH,
        delegate: 'GPU',
      },
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      runningMode: 'VIDEO',
      numFaces: 1,
    });
    return _instance;
  } finally {
    _loading = false;
  }
}

export function getMediaPipeInstance() {
  return _instance;
}

export function closeMediaPipe() {
  if (_instance) {
    _instance.close();
    _instance = null;
  }
}

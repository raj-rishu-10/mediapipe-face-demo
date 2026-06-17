import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Polyfill/mock getUserMedia for browsers/contexts that don't support it (e.g. HTTP, headless)
if (typeof window !== 'undefined') {
  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {},
      writable: true,
      configurable: true
    });
  }

  const originalGetUserMedia = navigator.mediaDevices.getUserMedia
    ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    : null;

  navigator.mediaDevices.getUserMedia = async function (constraints) {
    try {
      if (originalGetUserMedia) {
        return await originalGetUserMedia(constraints);
      } else {
        throw new Error('getUserMedia is not implemented in this browser');
      }
    } catch (error) {
      console.warn("getUserMedia failed or not supported. Falling back to mock stream.", error);
      
      // Dispatch a custom event so the React application knows we are in mock mode
      window.dispatchEvent(new CustomEvent('camera-fallback-active', { detail: { error: error.message } }));
      
      // Create a canvas to generate a mock video feed
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      let angle = 0;
      const intervalId = setInterval(() => {
        if (!ctx) return;
        
        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#11121d');
        grad.addColorStop(1, '#07080c');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Techy grid lines
        ctx.strokeStyle = 'rgba(0, 255, 128, 0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, canvas.height);
          ctx.stroke();
        }
        for (let j = 0; j < canvas.height; j += 40) {
          ctx.beginPath();
          ctx.moveTo(0, j);
          ctx.lineTo(canvas.width, j);
          ctx.stroke();
        }
        
        // Moving target circle
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(320 + Math.cos(angle) * 120, 240 + Math.sin(angle) * 80, 20, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Face outline simulation
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(320, 240, 95, 130, 0, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Simulated eyes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(285, 210, 6, 0, 2 * Math.PI);
        ctx.arc(355, 210, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Simulated nose
        ctx.beginPath();
        ctx.moveTo(320, 210);
        ctx.lineTo(320, 255);
        ctx.lineTo(305, 255);
        ctx.stroke();
        
        // Simulated mouth
        ctx.beginPath();
        ctx.arc(320, 285, 25, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        
        // Text status
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Webcam Feed Simulator', 320, 45);
        
        ctx.fillStyle = '#ff9900';
        ctx.font = '13px system-ui, -apple-system, sans-serif';
        ctx.fillText('Physical camera access: ' + error.message, 320, 415);
        ctx.fillStyle = '#888bc4';
        ctx.fillText('Please adjust the glasses placement manually below', 320, 440);
        
        angle += 0.04;
      }, 33);
      
      const stream = canvas.captureStream ? canvas.captureStream(30) : (canvas.mozCaptureStream ? canvas.mozCaptureStream(30) : null);
      if (!stream) {
        throw new Error('captureStream not supported');
      }
      
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const originalStop = videoTrack.stop;
        videoTrack.stop = function () {
          clearInterval(intervalId);
          if (originalStop) originalStop.call(videoTrack);
        };
      }
      
      return stream;
    }
  };
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

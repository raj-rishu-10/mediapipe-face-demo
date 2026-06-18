import { render, screen } from '@testing-library/react';
import App from './App';
import React from 'react';

// Mock WebGL and Three.js components which crash JSDOM
jest.mock('@react-three/fiber', () => {
  const THREE = require('three');
  return {
    Canvas: ({ children }) => <div data-testid="mock-canvas">{children}</div>,
    useFrame: jest.fn(),
    useLoader: jest.fn().mockReturnValue({ scene: new THREE.Group() }),
  };
});

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => <div />,
}));

// Mock react-webcam
jest.mock('react-webcam', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => <video ref={ref} data-testid="mock-webcam" />);
});

// Mock MediaPipe Tasks Vision
jest.mock('@mediapipe/tasks-vision', () => ({
  FaceLandmarker: {
    createFromOptions: jest.fn().mockResolvedValue({
      detectForVideo: jest.fn().mockReturnValue({ faceLandmarks: [], facialTransformationMatrixes: [] }),
      close: jest.fn()
    })
  },
  FilesetResolver: {
    forVisionTasks: jest.fn().mockResolvedValue({})
  }
}));

test('renders App with JEELIZ title', () => {
  render(<App />);
  const titleElement = screen.getByText(/JEELIZ/i);
  expect(titleElement).toBeInTheDocument();
  
  // Verify webcam and canvas fallbacks are rendered
  expect(screen.getByTestId('mock-webcam')).toBeInTheDocument();
  expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
});

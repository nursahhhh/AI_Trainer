export function createMockKeypointFrame() {
  return {
    timestamp: Date.now(),
    landmarks: [
      { name: "left_shoulder", x: 0.42, y: 0.28, z: -0.12, visibility: 0.98 },
      { name: "right_shoulder", x: 0.58, y: 0.27, z: -0.11, visibility: 0.97 },
      { name: "left_hip", x: 0.45, y: 0.53, z: -0.08, visibility: 0.95 },
      { name: "right_hip", x: 0.55, y: 0.54, z: -0.09, visibility: 0.95 },
      { name: "left_knee", x: 0.44, y: 0.73, z: -0.03, visibility: 0.93 },
      { name: "right_knee", x: 0.56, y: 0.74, z: -0.02, visibility: 0.92 },
    ],
  };
}
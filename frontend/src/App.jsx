import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import Hand from './Hand';

export default function App() {
  const [pose, setPose] = useState('relax');
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  useEffect(() => {
    let ws;
    let reconnectInterval;

    const connect = () => {
      // Connect to FastAPI backend
      ws = new WebSocket('ws://127.0.0.1:8000/ws/gesture');
      
      ws.onopen = () => setConnectionStatus('Live');
      ws.onclose = () => {
        setConnectionStatus('Disconnected. Retrying...');
        reconnectInterval = setTimeout(connect, 3000);
      };
      
      ws.onerror = () => ws.close();

      ws.onmessage = (event) => {
        // Map backend enums to component props
        const gestureMap = {
          "RELAX": "relax",
          "WAVE": "wave",
          "ROTATION": "rotate",
          "PINCH": "pinch",
          "FIST": "fist",
          "FLEX": "flex",
          "WRIST FLEX": "flex"
        };
        const rawGesture = event.data;
        if (gestureMap[rawGesture]) {
          setPose(gestureMap[rawGesture]);
        }
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectInterval);
      if (ws) ws.close();
    };
  }, []);

  const badgeColors = {
    relax: 'bg-slate-500 text-white',
    wave: 'bg-blue-500 text-white',
    rotate: 'bg-purple-500 text-white',
    pinch: 'bg-green-500 text-white',
    fist: 'bg-red-500 text-white',
    flex: 'bg-orange-500 text-white',
  };

  const poseLabel = pose === 'rotate' ? 'ROTATION' : pose;

  return (
    <div className="w-screen h-screen relative bg-slate-900 overflow-hidden flex flex-col md:flex-row font-sans">
      
      {/* Top Header */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start">
        <div className="text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 tracking-tight m-0">
            Realtime EMG Control
          </h1>
          <p className="text-slate-400 mt-3 max-w-md text-sm md:text-base opacity-90">
            Hardware-driven 3D Hand Tracking ({connectionStatus})
          </p>
        </div>
        
        {/* Dynamic Real-Time Gesture Badge */}
        <div className={`px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-lg shadow-2xl ring-2 ring-white/20 transition-all duration-300 transform scale-105 ${badgeColors[pose] || 'bg-gray-500 text-white'}`}>
          {poseLabel}
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [0, 2, 12], fov: 45 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" castShadow />
          <directionalLight position={[-10, 5, -5]} intensity={1.5} color="#c084fc" />
          <directionalLight position={[0, -10, 5]} intensity={0.5} color="#60a5fa" />
          
          <Hand pose={pose} />

          <ContactShadows position={[0, -5, 0]} opacity={0.65} scale={30} blur={3} far={15} color="#000000" />
          
          <OrbitControls 
            enablePan={false} 
            minPolarAngle={Math.PI / 4} 
            maxPolarAngle={Math.PI / 1.5} 
            minDistance={4} 
            maxDistance={20}
          />
          <Environment preset="night" />
        </Canvas>
      </div>
    </div>
  );
}

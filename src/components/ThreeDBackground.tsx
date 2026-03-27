import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Float, Sphere, MeshDistortMaterial } from '@react-three/drei';
import { useRef, useState } from 'react';
import * as THREE from 'three';

function ParticleField() {
  const ref = useRef<THREE.Points>(null);
  const [sphere] = useState(() => {
    const positions = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 5 + Math.random() * 5;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  });

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#6366f1"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

const FloatingShape = ({ position, color, speed, distort, radius = 1 }: { position: [number, number, number], color: string, speed: number, distort: number, radius?: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((_state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005;
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={2} floatIntensity={2}>
      <Sphere ref={meshRef} position={position} args={[radius, 32, 32]}>
        <MeshDistortMaterial
          color={color}
          speed={speed}
          distort={distort}
          radius={radius}
          emissive={color}
          emissiveIntensity={0.3}
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.3}
        />
      </Sphere>
    </Float>
  );
};

export const ThreeDBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-[#0a0f1c]">
      <Canvas dpr={[1, 1.5]} performance={{ min: 0.5 }} camera={{ position: [0, 0, 12], fov: 75 }}>
        <color attach="background" args={['#0a0f1c']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} />
        
        <ParticleField />
        
        {/* Large Background Morphing Shapes */}
        <FloatingShape position={[-10, 5, -5]} color="#6366f1" speed={2} distort={0.4} radius={3} />
        <FloatingShape position={[12, -6, -8]} color="#3b82f6" speed={1.5} distort={0.5} radius={4} />
        <FloatingShape position={[-8, -8, -6]} color="#8b5cf6" speed={2.5} distort={0.3} radius={2.5} />
        <FloatingShape position={[9, 9, -10]} color="#4f46e5" speed={1.8} distort={0.6} radius={3.5} />
      </Canvas>
      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-transparent to-[#0a0f1c] opacity-60 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0f1c_100%)] opacity-40 pointer-events-none"></div>
    </div>
  );
};

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ACCENT_HEX } from '@/lib/departments';

function Orb({ intensity }: { intensity: number }) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    // Ease the orb toward the pointer so it feels attentive, not twitchy.
    const { x, y } = state.pointer;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, x * 0.6, 3, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -y * 0.4, 3, delta);
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 1.4) * 0.025 * intensity;
    g.scale.setScalar(pulse);
    if (inner.current) inner.current.rotation.z = t * 0.2;
    if (ring.current) ring.current.rotation.z = -t * 0.15;
  });

  return (
    <group ref={group}>
      <mesh ref={inner}>
        <icosahedronGeometry args={[1.25, 64]} />
        <MeshDistortMaterial
          color={ACCENT_HEX.violet}
          emissive={ACCENT_HEX.violet}
          emissiveIntensity={0.45}
          roughness={0.2}
          metalness={0.25}
          distort={0.32 * intensity}
          speed={1.6}
        />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[1.9, 0.008, 8, 160]} />
        <meshBasicMaterial color={ACCENT_HEX.cyan} transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 1.8, 0.4, 0]}>
        <torusGeometry args={[2.15, 0.005, 8, 160]} />
        <meshBasicMaterial color={ACCENT_HEX.magenta} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/** The "Core": a distorted glowing orb that follows the pointer and breathes. */
export default function CoreScene({ intensity = 1 }: { intensity?: number }) {
  const dpr = useMemo<[number, number]>(() => [1, Math.min(2, window.devicePixelRatio)], []);
  return (
    <Canvas dpr={dpr} camera={{ position: [0, 0, 5.2], fov: 45 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 4]} intensity={40} color={ACCENT_HEX.cyan} />
      <pointLight position={[-4, -2, 2]} intensity={30} color={ACCENT_HEX.magenta} />
      <pointLight position={[0, 4, -3]} intensity={20} color={ACCENT_HEX.violet} />
      <Orb intensity={intensity} />
      <Sparkles count={60} scale={6} size={2} speed={0.3} color={ACCENT_HEX.cyan} opacity={0.6} />
    </Canvas>
  );
}

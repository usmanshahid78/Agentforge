/**
 * 3D avatar stage (lazy-loaded; never in the main bundle).
 *
 * PLUGGING IN A REAL MODEL
 * 1. Put a VRM (recommended, e.g. exported from VRoid Studio) or GLB file in
 *    `public/models/`, for example `public/models/atlas.vrm`.
 * 2. Set the agent's avatar to `{ kind: 'model3d', modelUrl: '/models/atlas.vrm' }`
 *    (Avatar studio > 3D tab > Model URL does this for you).
 * 3. VRM models get: idle breathing, look-at-pointer via the VRM lookAt rig,
 *    blinking, and lip-sync via the "aa" expression driven by speech level.
 *    Plain GLB models get idle motion and head look-at only (no standard
 *    face rig to drive).
 * Without a model URL, or if loading fails, a procedural head is shown.
 */
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import type { AvatarState } from './types';

interface StageProps {
  color: string;
  accent2: string;
  state: AvatarState;
  /** Speech level 0..1, read every frame. */
  levelRef: React.MutableRefObject<number>;
  modelUrl?: string;
}

const pointerTarget = new THREE.Vector3();

/** Procedural placeholder head: glossy sphere, eyes that track the pointer, mouth driven by speech. */
function PlaceholderHead({ color, accent2, state, levelRef }: Omit<StageProps, 'modelUrl'>) {
  const head = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const eyes = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    const g = head.current;
    if (g) {
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, s.pointer.x * 0.5, 4, dt);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -s.pointer.y * 0.3 + (state === 'thinking' ? -0.15 : 0), 4, dt);
      g.position.y = Math.sin(t * 1.2) * 0.03;
    }
    if (mouth.current) {
      const open = state === 'speaking' ? 0.15 + levelRef.current * 1.1 : 0.12;
      mouth.current.scale.y = THREE.MathUtils.damp(mouth.current.scale.y, open, 18, dt);
    }
    if (eyes.current) {
      // Blink briefly every four seconds.
      const blinking = t % 4 < 0.12;
      eyes.current.scale.y = THREE.MathUtils.damp(eyes.current.scale.y, blinking ? 0.1 : 1, 30, dt);
    }
    if (halo.current) {
      halo.current.rotation.z = t * (state === 'thinking' ? 2 : 0.3);
      const m = halo.current.material as THREE.MeshBasicMaterial;
      m.opacity = state === 'alert' ? 0.4 + Math.abs(Math.sin(t * 6)) * 0.5 : state === 'listening' ? 0.5 + Math.sin(t * 4) * 0.3 : 0.35;
    }
  });

  return (
    <group ref={head}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial color={color} roughness={0.25} metalness={0.1} clearcoat={1} clearcoatRoughness={0.2} emissive={color} emissiveIntensity={0.15} />
      </mesh>
      <group ref={eyes} position={[0, 0.18, 0.86]}>
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} position={[x, 0, 0]}>
            <sphereGeometry args={[0.11, 24, 24]} />
            <meshStandardMaterial color="#0B1020" emissive="#ffffff" emissiveIntensity={0.05} />
          </mesh>
        ))}
      </group>
      <mesh ref={mouth} position={[0, -0.3, 0.92]} scale={[1, 0.12, 1]}>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshStandardMaterial color="#1A0B1A" />
      </mesh>
      <mesh ref={halo} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[1.45, 0.012, 8, 128]} />
        <meshBasicMaterial color={state === 'alert' ? '#FBBF24' : accent2} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/** Loads a VRM/GLB model and animates it. */
function Model({ url, state, levelRef }: { url: string; state: AvatarState; levelRef: StageProps['levelRef'] }) {
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  }) as GLTF & { userData: { vrm?: VRM } };
  const vrm = gltf.userData.vrm;
  const scene = vrm?.scene ?? gltf.scene;
  const lookTarget = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!vrm) return;
    VRMUtils.rotateVRM0(vrm);
    if (vrm.lookAt) vrm.lookAt.target = lookTarget;
  }, [vrm, lookTarget]);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    pointerTarget.set(s.pointer.x * 2, 1.4 + s.pointer.y, 2);
    lookTarget.position.lerp(pointerTarget, 0.1);
    if (vrm) {
      const em = vrm.expressionManager;
      em?.setValue('aa', state === 'speaking' ? Math.min(1, levelRef.current * 1.2) : 0);
      em?.setValue('blink', t % 4 < 0.12 ? 1 : 0);
      const spine = vrm.humanoid?.getNormalizedBoneNode('spine');
      if (spine) spine.rotation.x = Math.sin(t * 1.3) * 0.02;
      vrm.update(dt);
    } else {
      scene.rotation.y = THREE.MathUtils.damp(scene.rotation.y, s.pointer.x * 0.4, 4, dt);
    }
  });

  return <primitive object={scene} position={[0, -1.35, 0]} />;
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function Stage3D({ color, accent2, state, level, modelUrl }: Omit<StageProps, 'levelRef'> & { level: number }) {
  const levelRef = useRef(level);
  levelRef.current = level;
  const [dpr] = useState<[number, number]>(() => [1, Math.min(2, window.devicePixelRatio)]);
  const placeholder = <PlaceholderHead color={color} accent2={accent2} state={state} levelRef={levelRef} />;

  return (
    <Canvas dpr={dpr} camera={{ position: modelUrl ? [0, 0.1, 1.6] : [0, 0, 4], fov: 35 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 4]} intensity={2} />
      <pointLight position={[-3, -1, 2]} intensity={25} color={accent2} />
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.25} enabled={!modelUrl}>
        {modelUrl ? (
          <ModelBoundary fallback={placeholder}>
            <Suspense fallback={placeholder}>
              <Model url={modelUrl} state={state} levelRef={levelRef} />
            </Suspense>
          </ModelBoundary>
        ) : (
          placeholder
        )}
      </Float>
      <ContactShadows position={[0, -1.4, 0]} opacity={0.35} scale={5} blur={2.5} far={2} />
    </Canvas>
  );
}

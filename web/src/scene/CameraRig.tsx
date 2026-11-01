import { useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

export function CameraRig({
  focus,
}: {
  focus: [number, number, number] | null;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0.6, 0));
  const desired = useRef(new THREE.Vector3(0, 0.6, 0));

  useEffect(() => {
    camera.position.set(14, 12, 14);
    camera.lookAt(0, 0.5, 0);
  }, [camera]);

  useEffect(() => {
    if (focus) {
      desired.current.set(focus[0], focus[1] + 0.4, focus[2]);
    }
  }, [focus]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    target.current.lerp(desired.current, 1 - Math.exp(-4 * dt));
    c.target.copy(target.current);
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={8}
      maxDistance={36}
      minPolarAngle={0.55}
      maxPolarAngle={1.15}
      target={[0, 0.6, 0]}
    />
  );
}

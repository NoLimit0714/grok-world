import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

function FloatingRock({
  url,
  position,
  scale = 1,
  rotation = 0,
}: {
  url: string;
  position: [number, number, number];
  scale?: number;
  rotation?: number;
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return (
    <primitive object={cloned} position={position} scale={scale} rotation={[0, rotation, 0]} />
  );
}

export function Island() {
  const islandGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(16, 13.5, 3.2, 48, 1, false);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < 0) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const n = Math.sin(x * 0.45) * Math.cos(z * 0.4) * 0.55;
        pos.setY(i, y - 1.4 + n);
      } else {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const bump = Math.sin(x * 0.35 + 1.2) * Math.cos(z * 0.3) * 0.18;
        pos.setY(i, y + bump);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group>
      <mesh geometry={islandGeo} position={[0, -1.55, 0]} receiveShadow={false}>
        <meshStandardMaterial
          color="#4a5560"
          roughness={0.95}
          metalness={0.08}
          flatShading
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[15.2, 48]} />
        <meshStandardMaterial color="#6f8a55" roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[11.5, 14.8, 48]} />
        <meshStandardMaterial color="#6a5344" roughness={1} metalness={0} />
      </mesh>

      <FloatingRock url="/assets/nature/rock_largeA.glb" position={[-11, 0.1, -5]} scale={1.8} rotation={0.4} />
      <FloatingRock url="/assets/nature/rock_largeB.glb" position={[12, 0.1, 3]} scale={2.1} rotation={1.1} />
      <FloatingRock url="/assets/nature/rock_smallA.glb" position={[-4, 0.1, 10]} scale={1.4} />
      <FloatingRock url="/assets/nature/rock_smallB.glb" position={[5, 0.1, -11]} scale={1.6} rotation={0.7} />
      <FloatingRock url="/assets/nature/tree_oak.glb" position={[-10.5, 0.1, 6]} scale={1.3} />
      <FloatingRock url="/assets/nature/tree_palm.glb" position={[10.8, 0.1, -6.5]} scale={1.4} />
      <FloatingRock url="/assets/nature/tree_cone.glb" position={[-8.5, 0.1, -10]} scale={1.2} />
      <FloatingRock url="/assets/nature/tree_oak.glb" position={[9.2, 0.1, 8.5]} scale={1.15} rotation={1.4} />
      <FloatingRock url="/assets/nature/grass_large.glb" position={[-2.5, 0.08, 8]} scale={1.5} />
      <FloatingRock url="/assets/nature/grass_large.glb" position={[3.5, 0.08, -9]} scale={1.3} rotation={0.8} />

      {/* Soft underglow / floating feel */}
      <mesh position={[0, -4.2, 0]}>
        <cylinderGeometry args={[10, 2, 6, 24, 1, true]} />
        <meshBasicMaterial color="#6b8cff" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

useGLTF.preload("/assets/nature/rock_largeA.glb");
useGLTF.preload("/assets/nature/rock_largeB.glb");
useGLTF.preload("/assets/nature/rock_smallA.glb");
useGLTF.preload("/assets/nature/rock_smallB.glb");
useGLTF.preload("/assets/nature/tree_oak.glb");
useGLTF.preload("/assets/nature/tree_palm.glb");
useGLTF.preload("/assets/nature/tree_cone.glb");
useGLTF.preload("/assets/nature/grass_large.glb");

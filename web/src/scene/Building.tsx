import { useMemo } from "react";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { BUILDINGS, type BuildingLayout } from "./layout";

export function Building({
  layout,
  selected,
  onSelect,
}: {
  layout: BuildingLayout;
  selected: boolean;
  onSelect: (id: string, position: [number, number, number]) => void;
}) {
  const { scene } = useGLTF(layout.asset);
  const cloned = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const mat = m as THREE.MeshStandardMaterial;
        if (!mat || !("emissive" in mat) || !mat.color) continue;
        if (mat.color.r + mat.color.g + mat.color.b > 1.6) {
          mat.emissive = mat.emissive?.clone?.() ?? mat.color.clone();
          mat.emissive.set(layout.glowColor);
          mat.emissiveIntensity = 0.35;
        }
      }
    });
    return root;
  }, [scene, layout.glowColor]);

  return (
    <group
      position={layout.position}
      rotation={[0, layout.rotation, 0]}
      scale={layout.scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(layout.id, layout.position);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <primitive object={cloned} />
      <mesh visible={false} position={[0, 0.6, 0]}>
        <boxGeometry args={[2.2, 1.8, 2.2]} />
      </mesh>
      {selected ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[1.35, 1.55, 32]} />
          <meshBasicMaterial color={layout.glowColor} transparent opacity={0.85} />
        </mesh>
      ) : null}
      <Html position={[0, 2.2, 0]} center distanceFactor={18} style={{ pointerEvents: "none" }}>
        <div className={`bldg-tag${selected ? " on" : ""}`}>
          <strong>{layout.label}</strong>
          <span className="bldg-district">{layout.district}</span>
        </div>
      </Html>
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color={layout.glowColor}
          emissive={layout.glowColor}
          emissiveIntensity={2.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

for (const b of BUILDINGS) {
  useGLTF.preload(b.asset);
}

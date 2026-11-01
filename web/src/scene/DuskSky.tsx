import { useMemo } from "react";
import * as THREE from "three";

/** Lightweight inward sky dome — dusk indigo → warm horizon, no HDR fetch. */
export function DuskSky() {
  const mat = useMemo(() => {
    const top = new THREE.Color("#1a1238");
    const mid = new THREE.Color("#5a3a78");
    const horizon = new THREE.Color("#ff9a6a");
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, top.getStyle());
    g.addColorStop(0.55, mid.getStyle());
    g.addColorStop(0.82, horizon.getStyle());
    g.addColorStop(1, "#2a1838");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
  }, []);

  return (
    <mesh scale={80}>
      <sphereGeometry args={[1, 24, 16]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

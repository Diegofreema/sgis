"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Float, OrbitControls } from "@react-three/drei";
import { FloatingGeometry } from "./FloatingGeometry";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type MousePosition = { x: number; y: number };

export function HeroCanvas3D() {
  const prefersReduced = useReducedMotion();
  const [mouse, setMouse] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    if (prefersReduced) return;

    function handleMouseMove(e: MouseEvent) {
      // Normalize to [-1, 1]
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [prefersReduced]);

  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 55 }}
      dpr={[1, 1.5]}
      style={{ background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#fff5f5" />

      <Suspense fallback={null}>
        <Float
          speed={prefersReduced ? 0 : 1.5}
          rotationIntensity={prefersReduced ? 0 : 0.3}
          floatIntensity={prefersReduced ? 0 : 0.5}
        >
          <FloatingGeometry mouseX={mouse.x} mouseY={mouse.y} />
        </Float>

        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}

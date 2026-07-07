
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Icosahedron, MeshDistortMaterial, Sphere } from "@react-three/drei";
import * as THREE from "three";

type FloatingGeometryProps = {
  mouseX?: number;
  mouseY?: number;
};

export function FloatingGeometry({ mouseX = 0, mouseY = 0 }: FloatingGeometryProps) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.getElapsedTime();

    // Gentle float animation
    groupRef.current.position.y = Math.sin(t * 0.5) * 0.15;
    // Slow rotation
    groupRef.current.rotation.y = t * 0.12;
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.08;

    // Cursor parallax (subtle)
    groupRef.current.rotation.x += (mouseY * 0.003 - groupRef.current.rotation.x) * 0.05;
    groupRef.current.rotation.y += (mouseX * 0.003 - groupRef.current.rotation.y) * 0.05;

    if (innerRef.current) {
      innerRef.current.rotation.x = t * 0.2;
      innerRef.current.rotation.z = t * 0.15;
    }
  });

  return (
    <group ref={groupRef} scale={[1.2, 1.2, 1.2]}>
      {/* Outer wireframe icosahedron */}
      <Icosahedron args={[1, 1]} ref={outerRef}>
        <meshBasicMaterial
          color="#8B3A42"
          wireframe
          transparent
          opacity={0.15}
        />
      </Icosahedron>

      {/* Inner distorted sphere — the main visual */}
      <Sphere args={[0.7, 64, 64]} ref={innerRef}>
        <MeshDistortMaterial
          color="#8B3A42"
          distort={0.3}
          speed={1.5}
          roughness={0.2}
          metalness={0.6}
          envMapIntensity={1}
        />
      </Sphere>

      {/* Soft glow point light */}
      <pointLight
        position={[2, 2, 2]}
        color="#C96E78"
        intensity={2}
        distance={10}
      />
    </group>
  );
}

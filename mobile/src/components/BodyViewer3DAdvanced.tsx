import React, { Suspense, useRef, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei/native';
import * as THREE from 'three';
import { ErrorBoundary } from './ErrorBoundary';

interface BodyViewer3DAdvancedProps {
  muscles: any[];
  onMusclePress?: (muscleId: string) => void;
  layer?: number;
}

// Muscle marker sphere that can be clicked
function MuscleMarker({
  muscle,
  onPress
}: {
  muscle: any;
  onPress?: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.scale.lerp(new THREE.Vector3(1.3, 1.3, 1.3), 0.1);
    } else if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[
        muscle.position_x || 0,
        muscle.position_y || 0,
        muscle.position_z || 0
      ]}
      onClick={() => onPress?.(muscle.id)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial
        color={hovered ? '#ff4444' : '#e74c3c'}
        emissive={hovered ? '#ff0000' : '#660000'}
        emissiveIntensity={hovered ? 0.8 : 0.3}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}

// Simplified anatomical human body model
function AnatomicalBody() {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle breathing animation
      meshRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime) * 0.01;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Head */}
      <mesh position={[0, 7, 0]} >
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial
          color="#ffdbac"
          metalness={0.1}
          roughness={0.8}
          transparent={true}
          opacity={0.85}
        />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 6.2, 0]} >
        <cylinderGeometry args={[0.25, 0.3, 0.6, 16]} />
        <meshStandardMaterial
          color="#ffd4a3"
          metalness={0.1}
          roughness={0.8}
          transparent={true}
          opacity={0.85}
        />
      </mesh>

      {/* Torso - Upper */}
      <mesh position={[0, 5, 0]} >
        <boxGeometry args={[1.8, 2, 0.8]} />
        <meshStandardMaterial
          color="#ffdbac"
          metalness={0.1}
          roughness={0.7}
          transparent={true}
          opacity={0.75}
        />
      </mesh>

      {/* Torso - Lower (abdomen) */}
      <mesh position={[0, 3.3, 0]} >
        <cylinderGeometry args={[0.8, 0.9, 1.4, 16]} />
        <meshStandardMaterial
          color="#ffd4a3"
          metalness={0.1}
          roughness={0.7}
          transparent={true}
          opacity={0.75}
        />
      </mesh>

      {/* Pelvis */}
      <mesh position={[0, 2.3, 0]} >
        <boxGeometry args={[1.6, 0.6, 0.8]} />
        <meshStandardMaterial
          color="#ffdbac"
          metalness={0.1}
          roughness={0.8}
          transparent={true}
          opacity={0.8}
        />
      </mesh>

      {/* Arms */}
      {/* Left Shoulder */}
      <mesh position={[-1.2, 5.5, 0]} >
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#ffdbac" metalness={0.1} roughness={0.8} transparent opacity={0.8} />
      </mesh>

      {/* Left Upper Arm */}
      <mesh position={[-1.5, 4.3, 0]} rotation={[0, 0, 0.2]} >
        <cylinderGeometry args={[0.22, 0.25, 2.4, 16]} />
        <meshStandardMaterial color="#ffd4a3" metalness={0.1} roughness={0.7} transparent opacity={0.8} />
      </mesh>

      {/* Left Elbow */}
      <mesh position={[-1.8, 3.1, 0]} >
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#ffdbac" metalness={0.1} roughness={0.8} transparent opacity={0.8} />
      </mesh>

      {/* Left Forearm */}
      <mesh position={[-2.1, 2, 0]} rotation={[0, 0, 0.2]} >
        <cylinderGeometry args={[0.18, 0.22, 2.2, 16]} />
        <meshStandardMaterial color="#ffd4a3" metalness={0.1} roughness={0.7} transparent opacity={0.8} />
      </mesh>

      {/* Left Hand */}
      <mesh position={[-2.4, 0.9, 0]} >
        <boxGeometry args={[0.15, 0.4, 0.25]} />
        <meshStandardMaterial color="#ffdbac" metalness={0.1} roughness={0.8} transparent opacity={0.85} />
      </mesh>

      {/* Right Shoulder */}
      <mesh position={[1.2, 5.5, 0]} >
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#ffdbac" metalness={0.1} roughness={0.8} transparent opacity={0.8} />
      </mesh>

      {/* Right Upper Arm */}
      <mesh position={[1.5, 4.3, 0]} rotation={[0, 0, -0.2]} >
        <cylinderGeometry args={[0.22, 0.25, 2.4, 16]} />
        <meshStandardMaterial color="#ffd4a3" metalness={0.1} roughness={0.7} transparent opacity={0.8} />
      </mesh>

      {/* Right Elbow */}
      <mesh position={[1.8, 3.1, 0]} >
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#ffdbac" metalness={0.1} roughness={0.8} transparent opacity={0.8} />
      </mesh>

      {/* Right Forearm */}
      <mesh position={[2.1, 2, 0]} rotation={[0, 0, -0.2]} >
        <cylinderGeometry args={[0.18, 0.22, 2.2, 16]} />
        <meshStandardMaterial color="#ffd4a3" metalness={0.1} roughness={0.7} transparent opacity={0.8} />
      </mesh>

      {/* Right Hand */}
      <mesh position={[2.4, 0.9, 0]} >
        <boxGeometry args={[0.15, 0.4, 0.25]} />
        <meshStandardMaterial color="#ffdbac" metalness={0.1} roughness={0.8} transparent opacity={0.85} />
      </mesh>

      {/* Legs */}
      {/* Left Hip */}
      <mesh position={[-0.5, 1.9, 0]} >
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#ffdbac" metalness={0.1} roughness={0.8} transparent opacity={0.8} />
      </mesh>

      {/* Left Thigh */}
      <mesh position={[-0.5, 0.8, 0]} >
        <cylinderGeometry args={[0.35, 0.32, 2.2, 16]} />
        <meshStandardMaterial color="#ffd4a3" metalness={0.1} roughness={0.7} transparent opacity={0.8} />
      </mesh>

      {/* Left Knee */}
      <mesh position={[-0.5, -0.3, 0]} >
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color="#ffdbac" metalness={0.1} roughness={0.8} transparent opacity={0.8} />
      </mesh>

      {/* Left Calf */}
      <mesh position={[-0.5, -1.5, 0]} >
        <cylinderGeometry args={[0.22, 0.28, 2.4, 16]} />
        <meshStandardMaterial color="#ffd4a3" metalness={0.1} roughness={0.7} transparent opacity={0.8} />
      </mesh>

      {/* Left Foot */}
      <mesh position={[-0.5, -2.8, 0.15]} rotation={[-0.2, 0, 0]} >
        <boxGeometry args={[0.3, 0.25, 0.6]} />
        <meshStandardMaterial color="#ffdbac" metalness={0.1} roughness={0.8} transparent opacity={0.85} />
      </mesh>

      {/* Right Hip */}
      <mesh position={[0.5, 1.9, 0]} >
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#ffdbac" metalness={0.1} roughness={0.8} transparent opacity={0.8} />
      </mesh>

      {/* Right Thigh */}
      <mesh position={[0.5, 0.8, 0]} >
        <cylinderGeometry args={[0.35, 0.32, 2.2, 16]} />
        <meshStandardMaterial color="#ffd4a3" metalness={0.1} roughness={0.7} transparent opacity={0.8} />
      </mesh>

      {/* Right Knee */}
      <mesh position={[0.5, -0.3, 0]} >
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color="#ffdbac" metalness={0.1} roughness={0.8} transparent opacity={0.8} />
      </mesh>

      {/* Right Calf */}
      <mesh position={[0.5, -1.5, 0]} >
        <cylinderGeometry args={[0.22, 0.28, 2.4, 16]} />
        <meshStandardMaterial color="#ffd4a3" metalness={0.1} roughness={0.7} transparent opacity={0.8} />
      </mesh>

      {/* Right Foot */}
      <mesh position={[0.5, -2.8, 0.15]} rotation={[-0.2, 0, 0]} >
        <boxGeometry args={[0.3, 0.25, 0.6]} />
        <meshStandardMaterial color="#ffdbac" metalness={0.1} roughness={0.8} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

// Main scene
function Scene({
  muscles,
  onMusclePress,
  showBody
}: {
  muscles: any[];
  onMusclePress?: (id: string) => void;
  showBody: boolean;
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 3, 12]} fov={50} />
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        minDistance={5}
        maxDistance={20}
        target={[0, 3, 0]}
      />

      {/* Lighting - Optimized for mobile */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.0}
      />
      <directionalLight position={[-10, 5, -5]} intensity={0.4} />
      <pointLight position={[0, 8, 0]} intensity={0.3} color="#ffffff" />

      {/* Simple ground plane for depth */}
      <mesh position={[0, -3.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={false}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="#0a0a0a" opacity={0.5} transparent={true} />
      </mesh>

      {/* Anatomical body */}
      {showBody && <AnatomicalBody />}

      {/* Muscle markers */}
      {muscles.map((muscle) => (
        <MuscleMarker
          key={muscle.id}
          muscle={muscle}
          onPress={onMusclePress}
        />
      ))}
    </>
  );
}

export default function BodyViewer3DAdvanced({
  muscles,
  onMusclePress,
  layer
}: BodyViewer3DAdvancedProps) {
  const [showBody, setShowBody] = useState(true);
  const filteredMuscles = layer
    ? muscles.filter(m => m.layer === layer)
    : muscles;

  return (
    <ErrorBoundary
      fallback={
        <View style={styles.container}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ color: '#e74c3c', fontSize: 18, marginBottom: 8, fontWeight: 'bold' }}>
              3D Rendering Error
            </Text>
            <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
              Your device may not support advanced 3D rendering. Please use List View to browse anatomy data.
            </Text>
          </View>
        </View>
      }
    >
      <View style={styles.container}>
        <Canvas gl={{ antialias: false, powerPreference: 'default' }}>
          <Suspense fallback={null}>
            <Scene
              muscles={filteredMuscles}
              onMusclePress={onMusclePress}
              showBody={showBody}
            />
          </Suspense>
        </Canvas>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowBody(!showBody)}
          >
            <Text style={styles.controlButtonText}>
              {showBody ? 'Hide Body' : 'Show Body'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>
            🔴 Tap red markers to view muscle details
          </Text>
          <Text style={styles.infoText}>
            Drag to rotate • Pinch to zoom • Two fingers to pan
          </Text>
          <Text style={styles.infoText}>
            {filteredMuscles.length} muscles • Layer {layer || 1}
          </Text>
        </View>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  controls: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  info: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  infoText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

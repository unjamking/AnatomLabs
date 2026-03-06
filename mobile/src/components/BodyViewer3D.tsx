import React, { Suspense } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei/native';
import * as THREE from 'three';
import { ErrorBoundary } from './ErrorBoundary';

interface BodyViewer3DProps {
  muscles: any[];
  onMusclePress?: (muscleId: string) => void;
  layer?: number;
}
function MuscleSphere({
  muscle,
  onPress
}: {
  muscle: any;
  onPress?: (id: string) => void;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <mesh
      position={[muscle.position_x || 0, muscle.position_y || 0, muscle.position_z || 0]}
      onClick={() => onPress?.(muscle.id)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial
        color={hovered ? '#ff6b6b' : '#e74c3c'}
        emissive={hovered ? '#ff0000' : '#000000'}
        emissiveIntensity={hovered ? 0.5 : 0}
      />
    </mesh>
  );
}

// Simple body outline
function BodyOutline() {
  return (
    <group>
      {/* Head */}
      <mesh position={[0, 7, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color="#ffdbac" opacity={0.3} transparent={true} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 4.5, 0]}>
        <cylinderGeometry args={[1.2, 1.5, 4, 16]} />
        <meshStandardMaterial color="#ffdbac" opacity={0.2} transparent={true} />
      </mesh>

      {/* Arms */}
      <mesh position={[-2, 4.5, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.3, 0.3, 3, 16]} />
        <meshStandardMaterial color="#ffdbac" opacity={0.2} transparent={true} />
      </mesh>
      <mesh position={[2, 4.5, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.3, 0.3, 3, 16]} />
        <meshStandardMaterial color="#ffdbac" opacity={0.2} transparent={true} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.6, 0.5, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 4, 16]} />
        <meshStandardMaterial color="#ffdbac" opacity={0.2} transparent={true} />
      </mesh>
      <mesh position={[0.6, 0.5, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 4, 16]} />
        <meshStandardMaterial color="#ffdbac" opacity={0.2} transparent={true} />
      </mesh>
    </group>
  );
}

// Main scene
function Scene({ muscles, onMusclePress }: { muscles: any[]; onMusclePress?: (id: string) => void }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 5, 10]} />
      <OrbitControls enableZoom={true} enablePan={true} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      {/* Body outline */}
      <BodyOutline />

      {/* Muscle spheres */}
      {muscles.map((muscle) => (
        <MuscleSphere
          key={muscle.id}
          muscle={muscle}
          onPress={onMusclePress}
        />
      ))}
    </>
  );
}

export default function BodyViewer3D({ muscles, onMusclePress, layer }: BodyViewer3DProps) {
  const filteredMuscles = layer
    ? muscles.filter(m => m.layer === layer)
    : muscles;

  return (
    <ErrorBoundary
      fallback={
        <View style={styles.container}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#e74c3c', fontSize: 18, marginBottom: 8 }}>
              3D Viewer Error
            </Text>
            <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 }}>
              Unable to render 3D content. Try using List View instead.
            </Text>
          </View>
        </View>
      }
    >
      <View style={styles.container}>
        <Canvas>
          <Suspense fallback={null}>
            <Scene muscles={filteredMuscles} onMusclePress={onMusclePress} />
          </Suspense>
        </Canvas>
        <View style={styles.info}>
          <Text style={styles.infoText}>
            Drag to rotate • Pinch to zoom
          </Text>
          <Text style={styles.infoText}>
            {filteredMuscles.length} muscles shown
          </Text>
        </View>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  info: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  infoText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
  },
});

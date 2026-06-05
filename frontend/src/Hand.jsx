import React, { useMemo } from 'react';
import { motion } from 'framer-motion-3d';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';

// Pose Definitions
const poses = {
  relax: {
    forearmRot: [0, -Math.PI * 0.75, 0], // face rightside with a 45 degree tilt to front
    wristRot: [0, 0, 0],
    thumbProx: [0.1, 0, -0.2], // bend slightly forward and inwards like other fingers
    thumbDist: [0.1, 0, -0.1],
    indexProx: [0.1, 0, 0],
    indexDist: [0.1, 0, 0],
    middleProx: [0.1, 0, 0],
    middleDist: [0.1, 0, 0],
    ringProx: [0.1, 0, 0],
    ringDist: [0.1, 0, 0],
    pinkyProx: [0.1, 0, 0],
    pinkyDist: [0.1, 0, 0],
  },
  wave: {
    forearmRot: [0, Math.PI, 0], // Handled completely by variants
    wristRot: [0, 0, Math.PI / 6],
    thumbProx: [0.1, 0, -0.2],
    thumbDist: [0, 0, 0],
    indexProx: [0, 0, 0],
    indexDist: [0, 0, 0],
    middleProx: [0, 0, 0],
    middleDist: [0, 0, 0],
    ringProx: [0, 0, 0],
    ringDist: [0, 0, 0],
    pinkyProx: [0, 0, 0],
    pinkyDist: [0, 0, 0],
  },
  rotate: {
    forearmRot: [0, Math.PI, 0], // Rotate so inner palm faces strictly front
    wristRot: [0, 0, 0],
    thumbProx: [0.1, 0, -0.2],
    thumbDist: [0.1, 0, -0.1],
    indexProx: [0.1, 0, 0],
    indexDist: [0.1, 0, 0],
    middleProx: [0.1, 0, 0],
    middleDist: [0.1, 0, 0],
    ringProx: [0.1, 0, 0],
    ringDist: [0.1, 0, 0],
    pinkyProx: [0.1, 0, 0],
    pinkyDist: [0.1, 0, 0],
  },
  pinch: {
    forearmRot: [0, -Math.PI * 0.75, 0],
    wristRot: [0, 0, 0],
    thumbProx: [0.6, 0.2, -0.6], 
    thumbDist: [0.4, 0, -0.4], 
    indexProx: [1.2, 0, 0.4], // Bends Index sharply down and rightwards to touch thumb exactly
    indexDist: [1.0, 0, 0], // Bends Index tip back towards thumb tip
    middleProx: [-0.05, 0, 0],
    middleDist: [0, 0, 0],
    ringProx: [-0.05, 0, 0],
    ringDist: [0, 0, 0],
    pinkyProx: [-0.05, 0, 0],
    pinkyDist: [0, 0, 0],
  },
  flex: {
    forearmRot: [0, -Math.PI * 0.75, 0],
    wristRot: [Math.PI / 3, 0, 0], 
    thumbProx: [0.2, 0, -0.3],
    thumbDist: [0, 0, 0],
    indexProx: [-0.1, 0, -0.1],
    indexDist: [0, 0, 0],
    middleProx: [-0.1, 0, 0],
    middleDist: [0, 0, 0],
    ringProx: [-0.1, 0, 0.1],
    ringDist: [0, 0, 0],
    pinkyProx: [-0.1, 0, 0.2],
    pinkyDist: [0, 0, 0],
  },
  fist: {
    forearmRot: [0, -Math.PI * 0.75, 0],
    wristRot: [0, 0, 0],
    thumbProx: [1.0, 0, -1.2], 
    thumbDist: [0.6, 0, -0.6],
    indexProx: [1.45, 0, 0], // Increased to bring perfectly close to surface, without fully penetrating
    indexDist: [1.4, 0, 0],
    middleProx: [1.45, 0, 0],
    middleDist: [1.4, 0, 0],
    ringProx: [1.45, 0, 0],
    ringDist: [1.4, 0, 0],
    pinkyProx: [1.45, 0, 0],
    pinkyDist: [1.4, 0, 0],
  }
};

// Grey Matte Finish
const material = new THREE.MeshStandardMaterial({
  color: '#8b8b93',
  roughness: 0.85,
  metalness: 0.15,
});

const Finger = ({ name, pose, xOffset, yOffset = 2.0, zOffset = 0, lengthMult = 1, isThumb }) => {
  const proxKey = `${name}Prox`;
  const distKey = `${name}Dist`;
  
  const proxRot = poses[pose][proxKey];
  const distRot = poses[pose][distKey];

  const proxHeight = 1.0 * lengthMult;
  const distHeight = 0.8 * lengthMult;
  const width = isThumb ? 0.32 : 0.28;

  return (
    <motion.group 
      position={[xOffset, yOffset, zOffset]} 
      animate={{ rotateX: proxRot[0], rotateY: proxRot[1], rotateZ: proxRot[2] }}
      transition={{ type: 'spring', stiffness: 60, damping: 15 }}
    >
      {/* Proximal segment */}
      <RoundedBox 
        args={[width, proxHeight, width]} 
        radius={0.12} 
        smoothness={4} 
        material={material} 
        position={[0, proxHeight / 2, 0]} 
      />
      
      {/* Distal Joint */}
      <motion.group 
        position={[0, proxHeight, 0]}
        animate={{ rotateX: distRot[0], rotateY: distRot[1], rotateZ: distRot[2] }}
        transition={{ type: 'spring', stiffness: 60, damping: 15 }}
      >
        <RoundedBox 
          args={[width * 0.9, distHeight, width * 0.9]} 
          radius={0.1} 
          smoothness={4} 
          material={material} 
          position={[0, distHeight / 2, 0]} 
        />
      </motion.group>
    </motion.group>
  );
};

export default function Hand({ pose }) {
  // Forearm oscillates during wave
  const forearmVariants = {
    relax: { rotateX: poses.relax.forearmRot[0], rotateY: poses.relax.forearmRot[1], rotateZ: poses.relax.forearmRot[2] },
    wave: {
      rotateX: [0, 0, 0],
      rotateY: [Math.PI, Math.PI, Math.PI], // inner palm faces front during wave
      rotateZ: [Math.PI / 12, -Math.PI / 12, Math.PI / 12],
      transition: { repeat: Infinity, duration: 1.0, ease: "easeInOut" }
    },
    rotate: { rotateX: poses.rotate.forearmRot[0], rotateY: poses.rotate.forearmRot[1], rotateZ: poses.rotate.forearmRot[2] },
    pinch: { rotateX: poses.pinch.forearmRot[0], rotateY: poses.pinch.forearmRot[1], rotateZ: poses.pinch.forearmRot[2] },
    flex: { rotateX: poses.flex.forearmRot[0], rotateY: poses.flex.forearmRot[1], rotateZ: poses.flex.forearmRot[2] },
    fist: { rotateX: poses.fist.forearmRot[0], rotateY: poses.fist.forearmRot[1], rotateZ: poses.fist.forearmRot[2] },
  };

  const wristVariants = {
    relax: { rotateX: poses.relax.wristRot[0], rotateY: poses.relax.wristRot[1], rotateZ: poses.relax.wristRot[2] },
    wave: {
      rotateX: [0, 0, 0],
      rotateY: [0, 0, 0],
      rotateZ: [Math.PI / 8, -Math.PI / 8, Math.PI / 8],
      transition: { repeat: Infinity, duration: 0.8, ease: "easeInOut" }
    },
    rotate: { rotateX: poses.rotate.wristRot[0], rotateY: poses.rotate.wristRot[1], rotateZ: poses.rotate.wristRot[2] },
    pinch: { rotateX: poses.pinch.wristRot[0], rotateY: poses.pinch.wristRot[1], rotateZ: poses.pinch.wristRot[2] },
    flex: { rotateX: poses.flex.wristRot[0], rotateY: poses.flex.wristRot[1], rotateZ: poses.flex.wristRot[2] },
    fist: { rotateX: poses.fist.wristRot[0], rotateY: poses.fist.wristRot[1], rotateZ: poses.fist.wristRot[2] },
  };

  return (
    <motion.group 
      variants={forearmVariants}
      animate={pose}
      initial="relax"
      position={[0, -0.8, 0]}
    >
      {/* Forearm (Rounded to look more organic) */}
      <RoundedBox 
        args={[1.0, 3, 0.7]} 
        radius={0.3} 
        smoothness={4} 
        material={material} 
        position={[0, -1.5, 0]} 
      />

      {/* Wrist Joint */}
      <motion.group
        variants={wristVariants}
        animate={pose}
        initial="relax"
      >
        {/* Palm */}
        <RoundedBox 
          args={[1.8, 2.0, 0.5]} 
          radius={0.2} 
          smoothness={4} 
          material={material} 
          position={[0, 1.0, 0]} 
        />

        {/* Fingers (Right Hand structure: Thumb is on left side [-x], Pinky on right side [+x]) */}
        <Finger name="thumb" pose={pose} xOffset={-0.95} yOffset={0.6} zOffset={0} lengthMult={0.9} isThumb={true} />
        <Finger name="index" pose={pose} xOffset={-0.65} lengthMult={1.05} />
        <Finger name="middle" pose={pose} xOffset={-0.2} lengthMult={1.2} />
        <Finger name="ring" pose={pose} xOffset={0.25} lengthMult={1.1} />
        <Finger name="pinky" pose={pose} xOffset={0.7} lengthMult={0.85} />
      </motion.group>
    </motion.group>
  );
}

// COMPREHENSIVE BONES INDEX - 206 BONES OF THE HUMAN SKELETON
// Skull (22) + Vertebrae (26) + Thorax (25) + Upper Limbs (64) + Lower Limbs (62) + Auditory (6) + Hyoid (1) = 206

import { SKULL_BONES } from './bones-skull';
import { SPINE_BONES } from './bones-spine';
import { THORAX_BONES } from './bones-thorax';
import { UPPER_LIMB_BONES } from './bones-upper-limb';
import { LOWER_LIMB_BONES } from './bones-lower-limb';

export const ALL_BONES = [
  ...SKULL_BONES,        // 22 bones
  ...SPINE_BONES,        // 26 bones
  ...THORAX_BONES,       // 25 bones (24 ribs + 3 sternum parts counted as 1)
  ...UPPER_LIMB_BONES,   // 64 bones
  ...LOWER_LIMB_BONES,   // 62 bones + 6 auditory ossicles + 1 hyoid = 69
];

// Total: 206 bones

export { SKULL_BONES, SPINE_BONES, THORAX_BONES, UPPER_LIMB_BONES, LOWER_LIMB_BONES };

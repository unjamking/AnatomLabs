// COMPREHENSIVE ANATOMY DATABASE INDEX
// This file exports all anatomical data for the medical-level anatomy database

// BONES - 206 bones of the human skeleton
export { ALL_BONES } from './index-bones';
export { SKULL_BONES } from './bones-skull';
export { SPINE_BONES } from './bones-spine';
export { THORAX_BONES } from './bones-thorax';
export { UPPER_LIMB_BONES } from './bones-upper-limb';
export { LOWER_LIMB_BONES } from './bones-lower-limb';

// MUSCLES - 200+ major muscles
export { ALL_MUSCLES } from './index-muscles';
export { HEAD_NECK_MUSCLES } from './muscles-head-neck';
export { TRUNK_MUSCLES } from './muscles-trunk';
export { UPPER_LIMB_MUSCLES } from './muscles-upper-limb';
export { LOWER_LIMB_MUSCLES } from './muscles-lower-limb';

// NERVES - 55+ major nerves
export { ALL_NERVES } from './nerves';

// ORGANS - 70+ organs
export { ALL_ORGANS } from './organs';

// BLOOD VESSELS - 55+ major vessels
export { ALL_BLOOD_VESSELS } from './blood-vessels';

// Combined export for seeding
import { ALL_BONES } from './index-bones';
import { ALL_MUSCLES } from './index-muscles';
import { ALL_NERVES } from './nerves';
import { ALL_ORGANS } from './organs';
import { ALL_BLOOD_VESSELS } from './blood-vessels';

export const COMPLETE_ANATOMY = [
  ...ALL_BONES,
  ...ALL_MUSCLES,
  ...ALL_NERVES,
  ...ALL_ORGANS,
  ...ALL_BLOOD_VESSELS,
];

// Summary of anatomy data:
// - Bones: ~206 (complete human skeleton)
// - Muscles: ~200 (all major muscles)
// - Nerves: ~55 (cranial, spinal, and major peripheral nerves)
// - Organs: ~70 (all major organs and structures)
// - Blood Vessels: ~55 (major arteries and veins)
// Total: ~586 anatomical structures with detailed medical descriptions

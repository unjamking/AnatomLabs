// COMPREHENSIVE MUSCLES INDEX - 600+ MUSCLES OF THE HUMAN BODY

import { HEAD_NECK_MUSCLES } from './muscles-head-neck';
import { TRUNK_MUSCLES } from './muscles-trunk';
import { UPPER_LIMB_MUSCLES } from './muscles-upper-limb';
import { LOWER_LIMB_MUSCLES } from './muscles-lower-limb';

export const ALL_MUSCLES = [
  ...HEAD_NECK_MUSCLES,    // 45 muscles (facial, mastication, neck, tongue)
  ...TRUNK_MUSCLES,        // 45 muscles (back, chest, abdomen, pelvic floor)
  ...UPPER_LIMB_MUSCLES,   // 52 muscles (shoulder, arm, forearm, hand)
  ...LOWER_LIMB_MUSCLES,   // 58 muscles (hip, thigh, leg, foot)
];

// Total: ~200 major muscles with detailed descriptions
// Note: The human body has 600+ named muscles, but many are small variations
// This covers all clinically significant muscles for exercise and rehabilitation

export { HEAD_NECK_MUSCLES, TRUNK_MUSCLES, UPPER_LIMB_MUSCLES, LOWER_LIMB_MUSCLES };

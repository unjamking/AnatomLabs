export type AnatomySide = 'front' | 'back';
export type AnatomyCanvasView = 'both' | AnatomySide;
export type AnatomyCategory = 'upper_body' | 'core' | 'lower_body';
export type AnatomyThemeId = 'neon' | 'ember';

export interface TrainingData {
  muscleId: string;
  intensity: number;
  lastTrained?: string;
  weeklyVolume?: number;
}

export interface AnatomyRegion {
  id: string;
  name: string;
  category: AnatomyCategory;
  sides: AnatomySide[];
  aliases: string[];
  backendKeywords: string[];
  description: string;
  recoveryHours: number;
  defaultDifficulty: 'beginner' | 'intermediate' | 'advanced';
  exerciseHints: string[];
}

export interface AnatomySegment {
  id: string;
  side: AnatomySide;
  placement: 'pair' | 'center';
  path: string;
  zIndex: number;
}

export interface AnatomyTheme {
  id: AnatomyThemeId;
  label: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  glow: string;
  glass: string;
  glassBorder: string;
  track: string;
}

export const SVG_CENTER_X = 100;

export const ANATOMY_THEMES: Record<AnatomyThemeId, AnatomyTheme> = {
  neon: {
    id: 'neon',
    label: 'Neon',
    accent: '#7BFF61',
    accentStrong: '#9CFF7E',
    accentSoft: 'rgba(123, 255, 97, 0.18)',
    glow: 'rgba(123, 255, 97, 0.52)',
    glass: 'rgba(15, 24, 20, 0.72)',
    glassBorder: 'rgba(123, 255, 97, 0.22)',
    track: 'rgba(123, 255, 97, 0.12)',
  },
  ember: {
    id: 'ember',
    label: 'Ember',
    accent: '#FF8D3A',
    accentStrong: '#FFB067',
    accentSoft: 'rgba(255, 141, 58, 0.18)',
    glow: 'rgba(255, 141, 58, 0.5)',
    glass: 'rgba(27, 18, 12, 0.72)',
    glassBorder: 'rgba(255, 141, 58, 0.22)',
    track: 'rgba(255, 141, 58, 0.12)',
  },
};

export const ANATOMY_REGIONS: AnatomyRegion[] = [
  {
    id: 'upper_chest',
    name: 'Upper Chest',
    category: 'upper_body',
    sides: ['front'],
    aliases: ['clavicular chest', 'upper pecs'],
    backendKeywords: ['chest', 'pectoralis', 'pec'],
    description: 'Upper pectoral fibers that drive incline pressing and add shelf through the clavicle line.',
    recoveryHours: 48,
    defaultDifficulty: 'intermediate',
    exerciseHints: ['Incline dumbbell press', 'Low-to-high cable fly', 'Incline smith press'],
  },
  {
    id: 'lower_chest',
    name: 'Lower Chest',
    category: 'upper_body',
    sides: ['front'],
    aliases: ['sternal chest', 'lower pecs'],
    backendKeywords: ['chest', 'pectoralis', 'pec'],
    description: 'Lower pectoral fibers responsible for adduction and powerful pressing through the lower arc.',
    recoveryHours: 48,
    defaultDifficulty: 'beginner',
    exerciseHints: ['Weighted dips', 'Decline press', 'High-to-low cable fly'],
  },
  {
    id: 'front_delts',
    name: 'Front Delts',
    category: 'upper_body',
    sides: ['front'],
    aliases: ['anterior delts', 'anterior deltoid'],
    backendKeywords: ['shoulder', 'deltoid', 'delt'],
    description: 'Anterior shoulder fibers that assist pressing, shoulder flexion, and overhead stability.',
    recoveryHours: 36,
    defaultDifficulty: 'beginner',
    exerciseHints: ['Seated dumbbell press', 'Front raise', 'Arnold press'],
  },
  {
    id: 'side_delts',
    name: 'Side Delts',
    category: 'upper_body',
    sides: ['front', 'back'],
    aliases: ['lateral delts', 'middle delts', 'lateral deltoid'],
    backendKeywords: ['shoulder', 'deltoid', 'delt'],
    description: 'Lateral shoulder fibers that create width and power arm abduction.',
    recoveryHours: 36,
    defaultDifficulty: 'intermediate',
    exerciseHints: ['Cable lateral raise', 'Machine lateral raise', 'Lean-away dumbbell raise'],
  },
  {
    id: 'rear_delts',
    name: 'Rear Delts',
    category: 'upper_body',
    sides: ['back'],
    aliases: ['posterior delts', 'posterior deltoid'],
    backendKeywords: ['rear delt', 'shoulder', 'deltoid'],
    description: 'Posterior shoulder fibers for horizontal abduction, pulling mechanics, and shoulder balance.',
    recoveryHours: 36,
    defaultDifficulty: 'intermediate',
    exerciseHints: ['Reverse pec deck', 'Cable rear delt fly', 'Chest-supported rear delt raise'],
  },
  {
    id: 'biceps',
    name: 'Biceps',
    category: 'upper_body',
    sides: ['front'],
    aliases: ['biceps brachii', 'brachialis'],
    backendKeywords: ['biceps', 'arm'],
    description: 'Elbow flexors and forearm supinators that support pulling and curling strength.',
    recoveryHours: 36,
    defaultDifficulty: 'beginner',
    exerciseHints: ['EZ-bar curl', 'Incline dumbbell curl', 'Cable curl'],
  },
  {
    id: 'triceps',
    name: 'Triceps',
    category: 'upper_body',
    sides: ['back'],
    aliases: ['triceps brachii'],
    backendKeywords: ['triceps', 'arm'],
    description: 'Three-headed elbow extensor complex that drives lockout strength and pressing volume.',
    recoveryHours: 36,
    defaultDifficulty: 'beginner',
    exerciseHints: ['Cable pressdown', 'Overhead rope extension', 'Close-grip bench press'],
  },
  {
    id: 'forearms',
    name: 'Forearms',
    category: 'upper_body',
    sides: ['front', 'back'],
    aliases: ['wrist flexors', 'wrist extensors', 'grip'],
    backendKeywords: ['forearm', 'arm', 'wrist'],
    description: 'Grip and wrist musculature that stabilizes the bar, controls wrist motion, and supports pulling strength.',
    recoveryHours: 24,
    defaultDifficulty: 'beginner',
    exerciseHints: ['Hammer curl', 'Wrist curl', 'Reverse curl'],
  },
  {
    id: 'upper_abs',
    name: 'Upper Abs',
    category: 'core',
    sides: ['front'],
    aliases: ['upper rectus abdominis'],
    backendKeywords: ['abs', 'abdominals', 'rectus abdominis', 'core'],
    description: 'Upper rectus fibers that flex the trunk and brace under heavy load.',
    recoveryHours: 24,
    defaultDifficulty: 'beginner',
    exerciseHints: ['Cable crunch', 'Weighted crunch', 'Decline sit-up'],
  },
  {
    id: 'lower_abs',
    name: 'Lower Abs',
    category: 'core',
    sides: ['front'],
    aliases: ['lower rectus abdominis'],
    backendKeywords: ['abs', 'abdominals', 'rectus abdominis', 'core'],
    description: 'Lower abdominal fibers emphasized during posterior pelvic tilt and leg-raise patterns.',
    recoveryHours: 24,
    defaultDifficulty: 'intermediate',
    exerciseHints: ['Hanging leg raise', 'Reverse crunch', 'Dragon flag progression'],
  },
  {
    id: 'obliques',
    name: 'Obliques',
    category: 'core',
    sides: ['front'],
    aliases: ['external obliques', 'serratus line'],
    backendKeywords: ['oblique', 'core', 'serratus'],
    description: 'Rotational and anti-rotational core fibers that stabilize the rib cage and pelvis.',
    recoveryHours: 24,
    defaultDifficulty: 'intermediate',
    exerciseHints: ['Cable wood chop', 'Side plank reach', 'Landmine rotation'],
  },
  {
    id: 'traps',
    name: 'Traps',
    category: 'upper_body',
    sides: ['back'],
    aliases: ['trapezius', 'upper traps'],
    backendKeywords: ['traps', 'trapezius', 'upper back'],
    description: 'Upper-back stabilizers controlling scapular elevation, retraction, and neck support.',
    recoveryHours: 48,
    defaultDifficulty: 'intermediate',
    exerciseHints: ['Barbell shrug', 'Snatch-grip high pull', 'Face pull'],
  },
  {
    id: 'upper_lats',
    name: 'Upper Lats',
    category: 'upper_body',
    sides: ['front', 'back'],
    aliases: ['upper latissimus', 'teres major'],
    backendKeywords: ['lats', 'latissimus', 'back'],
    description: 'Upper sweeping lat fibers and upper-back tie-ins that add width near the armpit and rib cage.',
    recoveryHours: 48,
    defaultDifficulty: 'intermediate',
    exerciseHints: ['Neutral-grip pulldown', 'Single-arm high row', 'Machine pullover'],
  },
  {
    id: 'lower_lats',
    name: 'Lower Lats',
    category: 'upper_body',
    sides: ['front', 'back'],
    aliases: ['lower latissimus', 'lat sweep'],
    backendKeywords: ['lats', 'latissimus', 'back'],
    description: 'Lower lat fibers that drive shoulder extension and create the pronounced V-taper.',
    recoveryHours: 48,
    defaultDifficulty: 'intermediate',
    exerciseHints: ['Straight-arm pulldown', 'Close-grip pulldown', 'Chest-supported row'],
  },
  {
    id: 'spinal_erectors',
    name: 'Spinal Erectors',
    category: 'core',
    sides: ['back'],
    aliases: ['erector spinae', 'lower back', 'lumbar'],
    backendKeywords: ['lower back', 'erector', 'lumbar', 'back'],
    description: 'Posterior-chain columns that extend the spine, resist flexion, and support loaded hinges.',
    recoveryHours: 72,
    defaultDifficulty: 'advanced',
    exerciseHints: ['Romanian deadlift', 'Back extension', 'Good morning'],
  },
  {
    id: 'quads',
    name: 'Quads',
    category: 'lower_body',
    sides: ['front'],
    aliases: ['quadriceps', 'rectus femoris'],
    backendKeywords: ['quads', 'quadriceps', 'leg'],
    description: 'Knee extensor group responsible for squatting power, jumping, and front-leg drive.',
    recoveryHours: 72,
    defaultDifficulty: 'intermediate',
    exerciseHints: ['Hack squat', 'Leg press', 'Bulgarian split squat'],
  },
  {
    id: 'adductors',
    name: 'Adductors',
    category: 'lower_body',
    sides: ['front'],
    aliases: ['inner thighs', 'hip adductors'],
    backendKeywords: ['adductor', 'inner thigh', 'leg'],
    description: 'Inner thigh musculature that stabilizes the pelvis and contributes to squat depth and sprinting power.',
    recoveryHours: 48,
    defaultDifficulty: 'intermediate',
    exerciseHints: ['Adductor machine', 'Cossack squat', 'Wide-stance leg press'],
  },
  {
    id: 'tibialis',
    name: 'Foreleg',
    category: 'lower_body',
    sides: ['front'],
    aliases: ['tibialis anterior', 'shins'],
    backendKeywords: ['tibialis', 'shin', 'lower leg'],
    description: 'Front lower-leg muscle that dorsiflexes the ankle and improves running and sprint mechanics.',
    recoveryHours: 24,
    defaultDifficulty: 'beginner',
    exerciseHints: ['Tib raises', 'Heel walks', 'Resistance band dorsiflexion'],
  },
  {
    id: 'glutes',
    name: 'Glutes',
    category: 'lower_body',
    sides: ['back'],
    aliases: ['gluteus maximus', 'gluteus medius'],
    backendKeywords: ['glute', 'glutes', 'hips'],
    description: 'Primary hip extensor and pelvic stabilizer group for sprinting, hinging, and lower-body force output.',
    recoveryHours: 72,
    defaultDifficulty: 'intermediate',
    exerciseHints: ['Hip thrust', 'Romanian deadlift', 'Cable kickback'],
  },
  {
    id: 'hamstrings',
    name: 'Hamstrings',
    category: 'lower_body',
    sides: ['back'],
    aliases: ['biceps femoris', 'posterior thigh'],
    backendKeywords: ['hamstring', 'posterior thigh', 'leg'],
    description: 'Posterior thigh group that flexes the knee, extends the hip, and powers sprint mechanics.',
    recoveryHours: 72,
    defaultDifficulty: 'intermediate',
    exerciseHints: ['Seated leg curl', 'Romanian deadlift', 'Nordic curl'],
  },
  {
    id: 'calves',
    name: 'Calves',
    category: 'lower_body',
    sides: ['back'],
    aliases: ['gastrocnemius', 'soleus'],
    backendKeywords: ['calves', 'calf', 'lower leg'],
    description: 'Lower-leg plantar flexors that contribute to gait, jumping, and ankle stiffness.',
    recoveryHours: 36,
    defaultDifficulty: 'beginner',
    exerciseHints: ['Standing calf raise', 'Seated calf raise', 'Donkey calf raise'],
  },
];

export const MUSCLE_REGIONS = ANATOMY_REGIONS.map(({ id, name, category, sides }) => ({
  id,
  name,
  category,
  sides,
}));

export const FIGURE_SILHOUETTES = {
  front: {
    bodyFill:
      'M74 83 C62 86 51 95 44 109 C38 120 35 136 37 153 C39 170 44 185 46 202 C48 219 52 239 58 255 C61 264 63 274 63 287 C63 305 60 327 58 349 C56 369 58 389 66 405 C70 412 76 412 81 405 C87 397 89 384 90 367 L93 318 C94 304 96 287 100 287 C104 287 106 304 107 318 L110 367 C111 384 113 397 119 405 C124 412 130 412 134 405 C142 389 144 369 142 349 C140 327 137 305 137 287 C137 274 139 264 142 255 C148 239 152 219 154 202 C156 185 161 170 163 153 C165 136 162 120 156 109 C149 95 138 86 126 83 C120 81 114 79 107 79 L93 79 C86 79 80 81 74 83 Z',
    outline:
      'M74 83 C62 86 51 95 44 109 C38 120 35 136 37 153 C39 170 44 185 46 202 C48 219 52 239 58 255 C61 264 63 274 63 287 C63 305 60 327 58 349 C56 369 58 389 66 405 C70 412 76 412 81 405 C87 397 89 384 90 367 L93 318 C94 304 96 287 100 287 C104 287 106 304 107 318 L110 367 C111 384 113 397 119 405 C124 412 130 412 134 405 C142 389 144 369 142 349 C140 327 137 305 137 287 C137 274 139 264 142 255 C148 239 152 219 154 202 C156 185 161 170 163 153 C165 136 162 120 156 109 C149 95 138 86 126 83 C120 81 114 79 107 79 L93 79 C86 79 80 81 74 83 Z',
    head:
      'M100 18 C84 18 73 30 72 46 C71 61 78 75 90 80 C96 82 104 82 110 80 C122 75 129 61 128 46 C127 30 116 18 100 18 Z',
    neck:
      'M89 78 C91 89 95 96 100 101 C105 96 109 89 111 78',
    lines: [
      'M100 100 L100 250',
      'M80 118 C88 124 94 128 100 130',
      'M120 118 C112 124 106 128 100 130',
      'M70 205 C77 220 85 232 96 240',
      'M130 205 C123 220 115 232 104 240',
      'M79 252 C86 279 89 303 90 325',
      'M121 252 C114 279 111 303 110 325',
      'M85 332 C87 350 87 371 84 395',
      'M115 332 C113 350 113 371 116 395',
    ],
  },
  back: {
    bodyFill:
      'M74 83 C62 86 51 95 44 109 C38 120 35 136 37 153 C39 170 44 185 46 202 C48 219 52 239 58 255 C61 264 63 274 63 287 C63 305 60 327 58 349 C56 369 58 389 66 405 C70 412 76 412 81 405 C87 397 89 384 90 367 L93 318 C94 304 96 287 100 287 C104 287 106 304 107 318 L110 367 C111 384 113 397 119 405 C124 412 130 412 134 405 C142 389 144 369 142 349 C140 327 137 305 137 287 C137 274 139 264 142 255 C148 239 152 219 154 202 C156 185 161 170 163 153 C165 136 162 120 156 109 C149 95 138 86 126 83 C120 81 114 79 107 79 L93 79 C86 79 80 81 74 83 Z',
    outline:
      'M74 83 C62 86 51 95 44 109 C38 120 35 136 37 153 C39 170 44 185 46 202 C48 219 52 239 58 255 C61 264 63 274 63 287 C63 305 60 327 58 349 C56 369 58 389 66 405 C70 412 76 412 81 405 C87 397 89 384 90 367 L93 318 C94 304 96 287 100 287 C104 287 106 304 107 318 L110 367 C111 384 113 397 119 405 C124 412 130 412 134 405 C142 389 144 369 142 349 C140 327 137 305 137 287 C137 274 139 264 142 255 C148 239 152 219 154 202 C156 185 161 170 163 153 C165 136 162 120 156 109 C149 95 138 86 126 83 C120 81 114 79 107 79 L93 79 C86 79 80 81 74 83 Z',
    head:
      'M100 18 C84 18 73 30 72 46 C71 61 78 75 90 80 C96 82 104 82 110 80 C122 75 129 61 128 46 C127 30 116 18 100 18 Z',
    neck:
      'M89 78 C91 90 95 96 100 102 C105 96 109 90 111 78',
    lines: [
      'M100 101 L100 252',
      'M82 106 C88 120 94 129 100 135',
      'M118 106 C112 120 106 129 100 135',
      'M74 145 C83 152 91 155 100 157',
      'M126 145 C117 152 109 155 100 157',
      'M78 220 C85 229 91 235 98 240',
      'M122 220 C115 229 109 235 102 240',
      'M82 332 C87 350 88 370 86 396',
      'M118 332 C113 350 112 370 114 396',
    ],
  },
} as const;

export const ANATOMY_SEGMENTS: AnatomySegment[] = [
  { id: 'side_delts', side: 'front', placement: 'pair', zIndex: 1, path: 'M39 111 C42 101 49 95 58 96 C62 104 62 118 57 128 C48 128 41 122 39 111 Z' },
  { id: 'front_delts', side: 'front', placement: 'pair', zIndex: 2, path: 'M49 102 C55 96 64 95 72 100 C74 108 72 119 67 128 C59 126 53 120 50 111 C49 107 49 104 49 102 Z' },
  { id: 'upper_chest', side: 'front', placement: 'pair', zIndex: 3, path: 'M74 108 C80 100 89 96 99 99 L99 127 C92 129 85 128 78 124 C73 120 71 114 74 108 Z' },
  { id: 'lower_chest', side: 'front', placement: 'pair', zIndex: 4, path: 'M72 127 C79 123 88 123 99 127 L99 156 C91 159 83 158 77 151 C72 145 70 135 72 127 Z' },
  { id: 'biceps', side: 'front', placement: 'pair', zIndex: 5, path: 'M39 132 C44 127 51 129 55 138 C58 149 57 162 51 171 C44 170 39 164 37 156 C36 147 37 138 39 132 Z' },
  { id: 'forearms', side: 'front', placement: 'pair', zIndex: 6, path: 'M31 175 C37 171 44 174 48 182 C50 195 48 212 41 225 C35 223 31 217 29 208 C28 195 29 184 31 175 Z' },
  { id: 'upper_lats', side: 'front', placement: 'pair', zIndex: 7, path: 'M66 133 C71 126 77 123 84 124 L84 156 C79 159 74 159 70 154 C66 148 65 140 66 133 Z' },
  { id: 'lower_lats', side: 'front', placement: 'pair', zIndex: 8, path: 'M66 156 C71 152 77 151 84 153 L84 207 C78 212 73 213 69 209 C65 201 64 189 64 177 C64 168 65 161 66 156 Z' },
  { id: 'obliques', side: 'front', placement: 'pair', zIndex: 9, path: 'M73 154 C79 148 84 146 88 148 L88 210 C82 213 77 219 73 226 C68 218 66 207 65 194 C65 178 68 163 73 154 Z' },
  { id: 'upper_abs', side: 'front', placement: 'center', zIndex: 10, path: 'M88 148 C92 142 97 139 100 139 C103 139 108 142 112 148 L112 189 C108 194 104 196 100 196 C96 196 92 194 88 189 Z' },
  { id: 'lower_abs', side: 'front', placement: 'center', zIndex: 11, path: 'M88 189 C92 194 96 196 100 196 C104 196 108 194 112 189 L113 244 C108 248 104 250 100 250 C96 250 92 248 87 244 Z' },
  { id: 'quads', side: 'front', placement: 'pair', zIndex: 12, path: 'M77 252 C84 245 91 246 97 251 C98 277 96 304 91 334 C84 337 79 334 75 325 C72 304 72 277 77 252 Z' },
  { id: 'adductors', side: 'front', placement: 'pair', zIndex: 13, path: 'M96 251 C98 248 99 247 100 247 C101 247 102 248 104 251 L102 318 C98 317 95 312 93 303 C92 287 92 268 96 251 Z' },
  { id: 'tibialis', side: 'front', placement: 'pair', zIndex: 14, path: 'M81 334 C86 331 91 333 94 340 C95 358 92 377 88 395 C82 394 78 389 76 380 C75 365 76 348 81 334 Z' },
  { id: 'side_delts', side: 'back', placement: 'pair', zIndex: 1, path: 'M39 112 C42 101 49 96 58 97 C62 106 61 119 56 129 C48 128 41 123 39 112 Z' },
  { id: 'rear_delts', side: 'back', placement: 'pair', zIndex: 2, path: 'M50 103 C56 97 64 96 72 101 C74 109 72 120 66 130 C58 128 52 123 49 114 C48 109 48 105 50 103 Z' },
  { id: 'traps', side: 'back', placement: 'center', zIndex: 3, path: 'M82 102 C88 90 95 84 100 84 C105 84 112 90 118 102 L117 145 C110 149 105 151 100 151 C95 151 90 149 83 145 Z' },
  { id: 'upper_lats', side: 'back', placement: 'pair', zIndex: 4, path: 'M69 128 C77 118 87 114 98 117 L98 153 C89 157 81 157 75 152 C70 146 67 137 69 128 Z' },
  { id: 'lower_lats', side: 'back', placement: 'pair', zIndex: 5, path: 'M71 153 C78 149 87 149 98 153 L98 215 C91 220 84 221 78 217 C71 208 68 198 67 185 C67 171 68 160 71 153 Z' },
  { id: 'triceps', side: 'back', placement: 'pair', zIndex: 6, path: 'M37 133 C42 127 49 129 53 138 C56 150 55 164 49 176 C42 175 37 169 35 160 C34 149 35 138 37 133 Z' },
  { id: 'forearms', side: 'back', placement: 'pair', zIndex: 7, path: 'M29 178 C35 174 42 176 46 184 C48 198 46 214 40 227 C34 225 30 219 28 210 C27 197 27 186 29 178 Z' },
  { id: 'spinal_erectors', side: 'back', placement: 'center', zIndex: 8, path: 'M92 150 C95 145 98 143 100 143 C102 143 105 145 108 150 L108 237 C104 242 102 244 100 244 C98 244 96 242 92 237 Z' },
  { id: 'glutes', side: 'back', placement: 'pair', zIndex: 9, path: 'M75 226 C82 220 90 219 98 223 L98 265 C90 270 84 269 78 263 C74 255 73 238 75 226 Z' },
  { id: 'hamstrings', side: 'back', placement: 'pair', zIndex: 10, path: 'M79 266 C86 262 92 263 97 268 L96 334 C91 340 86 341 81 336 C77 325 76 281 79 266 Z' },
  { id: 'calves', side: 'back', placement: 'pair', zIndex: 11, path: 'M81 336 C87 332 92 334 96 341 C98 360 96 379 92 398 C86 401 81 398 78 390 C76 374 77 351 81 336 Z' },
];

export function normalizeAnatomyKey(value: string): string {
  return value.toLowerCase().trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

const aliasEntries = new Map<string, Set<string>>();

function addAlias(alias: string, ids: string[]) {
  const key = normalizeAnatomyKey(alias);
  if (!aliasEntries.has(key)) {
    aliasEntries.set(key, new Set<string>());
  }
  ids.forEach((id) => aliasEntries.get(key)?.add(id));
}

ANATOMY_REGIONS.forEach((region) => {
  addAlias(region.id, [region.id]);
  addAlias(region.name, [region.id]);
  region.aliases.forEach((alias) => addAlias(alias, [region.id]));
  region.backendKeywords.forEach((keyword) => addAlias(keyword, [region.id]));
});

addAlias('chest', ['upper_chest', 'lower_chest']);
addAlias('pectorals', ['upper_chest', 'lower_chest']);
addAlias('pecs', ['upper_chest', 'lower_chest']);
addAlias('pectoralis major', ['upper_chest', 'lower_chest']);
addAlias('pectoralis minor', ['upper_chest', 'lower_chest']);
addAlias('shoulders', ['front_delts', 'side_delts', 'rear_delts']);
addAlias('delts', ['front_delts', 'side_delts', 'rear_delts']);
addAlias('deltoids', ['front_delts', 'side_delts', 'rear_delts']);
addAlias('anterior deltoid', ['front_delts']);
addAlias('front deltoid', ['front_delts']);
addAlias('lateral deltoid', ['side_delts']);
addAlias('middle deltoid', ['side_delts']);
addAlias('posterior deltoid', ['rear_delts']);
addAlias('rear deltoid', ['rear_delts']);
addAlias('core', ['upper_abs', 'lower_abs', 'obliques', 'spinal_erectors']);
addAlias('abs', ['upper_abs', 'lower_abs']);
addAlias('abdominals', ['upper_abs', 'lower_abs']);
addAlias('rectus abdominis', ['upper_abs', 'lower_abs']);
addAlias('lats', ['upper_lats', 'lower_lats']);
addAlias('latissimus dorsi', ['upper_lats', 'lower_lats']);
addAlias('back', ['traps', 'upper_lats', 'lower_lats', 'spinal_erectors']);
addAlias('legs', ['quads', 'adductors', 'hamstrings', 'calves', 'tibialis']);
addAlias('gluteus maximus', ['glutes']);
addAlias('gluteus medius', ['glutes']);
addAlias('quadriceps femoris', ['quads']);
addAlias('hamstring', ['hamstrings']);
addAlias('hamstrings', ['hamstrings']);
addAlias('gastrocnemius', ['calves']);
addAlias('soleus', ['calves']);

export const REGION_ALIAS_TO_IDS = Object.fromEntries(
  Array.from(aliasEntries.entries()).map(([alias, ids]) => [alias, Array.from(ids)])
);

export const MUSCLE_NAME_TO_ID = Object.fromEntries(
  Object.entries(REGION_ALIAS_TO_IDS).map(([alias, ids]) => [alias, ids[0]])
);

const REGION_MAP = new Map(ANATOMY_REGIONS.map((region) => [region.id, region]));

export function getAnatomyRegion(id: string) {
  return REGION_MAP.get(id) ?? null;
}

export function expandMuscleAliasToIds(value: string): string[] {
  const normalized = normalizeAnatomyKey(value);
  return REGION_ALIAS_TO_IDS[normalized] ?? [];
}

export function getDefaultViewForMuscle(id: string): AnatomyCanvasView {
  const region = getAnatomyRegion(id);
  if (!region) {
    return 'both';
  }
  return region.sides.length === 1 ? region.sides[0] : 'both';
}

export function getRenderablePaths(segment: AnatomySegment) {
  if (segment.placement === 'center') {
    return [{ key: `${segment.id}-${segment.side}-center`, d: segment.path }];
  }

  return [
    { key: `${segment.id}-${segment.side}-left`, d: segment.path },
    {
      key: `${segment.id}-${segment.side}-right`,
      d: segment.path,
      transform: `translate(${SVG_CENTER_X * 2}, 0) scale(-1, 1)`,
    },
  ];
}

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G, Defs, LinearGradient as SvgGradient, Stop, Rect, ClipPath } from 'react-native-svg';

interface MuscleBodyDiagramProps {
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  height?: number;
}

const MUSCLE_NAME_MAP: Record<string, string[]> = {
  chest: ['f_chest_l', 'f_chest_r'],
  pectorals: ['f_chest_l', 'f_chest_r'],
  pecs: ['f_chest_l', 'f_chest_r'],
  'pectoralis major': ['f_chest_l', 'f_chest_r'],
  'pectoralis minor': ['f_chest_l', 'f_chest_r'],
  pectoralis_major: ['f_chest_l', 'f_chest_r'],
  shoulders: ['f_delt_l', 'f_delt_r', 'b_delt_l', 'b_delt_r'],
  'front delts': ['f_delt_l', 'f_delt_r'],
  'front deltoids': ['f_delt_l', 'f_delt_r'],
  'anterior deltoid': ['f_delt_l', 'f_delt_r'],
  'rear delts': ['b_delt_l', 'b_delt_r'],
  'rear deltoids': ['b_delt_l', 'b_delt_r'],
  'posterior deltoid': ['b_delt_l', 'b_delt_r'],
  deltoids: ['f_delt_l', 'f_delt_r', 'b_delt_l', 'b_delt_r'],
  delts: ['f_delt_l', 'f_delt_r', 'b_delt_l', 'b_delt_r'],
  'lateral deltoid': ['f_delt_l', 'f_delt_r', 'b_delt_l', 'b_delt_r'],
  biceps: ['f_bicep_l', 'f_bicep_r'],
  'biceps brachii': ['f_bicep_l', 'f_bicep_r'],
  brachialis: ['f_bicep_l', 'f_bicep_r'],
  forearms: ['f_forearm_l', 'f_forearm_r'],
  'wrist flexors': ['f_forearm_l', 'f_forearm_r'],
  'wrist extensors': ['f_forearm_l', 'f_forearm_r'],
  abs: ['f_abs'],
  abdominals: ['f_abs'],
  core: ['f_abs', 'f_oblique_l', 'f_oblique_r'],
  'rectus abdominis': ['f_abs'],
  obliques: ['f_oblique_l', 'f_oblique_r'],
  'external obliques': ['f_oblique_l', 'f_oblique_r'],
  'internal obliques': ['f_oblique_l', 'f_oblique_r'],
  'serratus anterior': ['f_oblique_l', 'f_oblique_r'],
  quads: ['f_quad_l', 'f_quad_r'],
  quadriceps: ['f_quad_l', 'f_quad_r'],
  'rectus femoris': ['f_quad_l', 'f_quad_r'],
  'vastus lateralis': ['f_quad_l', 'f_quad_r'],
  'vastus medialis': ['f_quad_l', 'f_quad_r'],
  'hip flexors': ['f_quad_l', 'f_quad_r'],
  iliopsoas: ['f_quad_l', 'f_quad_r'],
  tibialis: ['f_shin_l', 'f_shin_r'],
  shins: ['f_shin_l', 'f_shin_r'],
  'tibialis anterior': ['f_shin_l', 'f_shin_r'],
  adductors: ['f_adductor_l', 'f_adductor_r'],
  'hip adductors': ['f_adductor_l', 'f_adductor_r'],
  traps: ['b_trap'],
  trapezius: ['b_trap'],
  'upper traps': ['b_trap'],
  'middle traps': ['b_trap'],
  'lower traps': ['b_trap'],
  rhomboids: ['b_trap'],
  lats: ['b_lat_l', 'b_lat_r'],
  'latissimus dorsi': ['b_lat_l', 'b_lat_r'],
  back: ['b_lat_l', 'b_lat_r', 'b_lowerback', 'b_trap'],
  'upper back': ['b_trap', 'b_delt_l', 'b_delt_r'],
  'teres major': ['b_lat_l', 'b_lat_r'],
  'teres minor': ['b_delt_l', 'b_delt_r'],
  infraspinatus: ['b_delt_l', 'b_delt_r'],
  'lower back': ['b_lowerback'],
  'erector spinae': ['b_lowerback'],
  lumbar: ['b_lowerback'],
  triceps: ['b_tricep_l', 'b_tricep_r'],
  'triceps brachii': ['b_tricep_l', 'b_tricep_r'],
  'long head triceps': ['b_tricep_l', 'b_tricep_r'],
  glutes: ['b_glute_l', 'b_glute_r'],
  gluteus: ['b_glute_l', 'b_glute_r'],
  'gluteus maximus': ['b_glute_l', 'b_glute_r'],
  'gluteus medius': ['b_glute_l', 'b_glute_r'],
  hamstrings: ['b_ham_l', 'b_ham_r'],
  'biceps femoris': ['b_ham_l', 'b_ham_r'],
  calves: ['b_calf_l', 'b_calf_r'],
  gastrocnemius: ['b_calf_l', 'b_calf_r'],
  soleus: ['b_calf_l', 'b_calf_r'],
};

const FRONT_OUTLINE =
  'M50,2 C46,2 43,5 42.5,9 C42,12 42.5,14 44,16 C45,17.5 47,18.5 50,18.5 C53,18.5 55,17.5 56,16 C57.5,14 58,12 57.5,9 C57,5 54,2 50,2 Z ' +
  'M44,19 L42.5,19.5 C39.5,20.5 36,22 34,24 L33,25.5 ' +
  'M56,19 L57.5,19.5 C60.5,20.5 64,22 66,24 L67,25.5 ' +
  'M33,25.5 C31,28 29.5,32 29,36 C28.5,40 28.5,43 29,45.5 L29.5,47 ' +
  'M67,25.5 C69,28 70.5,32 71,36 C71.5,40 71.5,43 71,45.5 L70.5,47 ' +
  'M38,20 L38,24 L38.5,34 L38,48 C38,50 37.5,55 37,58 C36.5,62 36,67 36.5,72 C36.5,76 37,80 37,84 C37,87 37.5,90 39,92 C40,93.5 41.5,93.5 42.5,92 C43.5,90.5 44,88 44,85 L44.5,78 L45,72 L46,66 C46.5,64.5 47.5,63 50,63 C52.5,63 53.5,64.5 54,66 L55,72 L55.5,78 L56,85 C56,88 56.5,90.5 57.5,92 C58.5,93.5 60,93.5 61,92 C62.5,90 63,87 63,84 C63,80 63.5,76 63.5,72 C64,67 63.5,62 63,58 C62.5,55 62,50 62,48 L61.5,34 L62,24 L62,20';

const BACK_OUTLINE =
  'M50,2 C46,2 43,5 42.5,9 C42,12 42.5,14 44,16 C45,17.5 47,18.5 50,18.5 C53,18.5 55,17.5 56,16 C57.5,14 58,12 57.5,9 C57,5 54,2 50,2 Z ' +
  'M44,19 L42.5,19.5 C39.5,20.5 36,22 34,24 L33,25.5 ' +
  'M56,19 L57.5,19.5 C60.5,20.5 64,22 66,24 L67,25.5 ' +
  'M33,25.5 C31,28 29.5,32 29,36 C28.5,40 28.5,43 29,45.5 L29.5,47 ' +
  'M67,25.5 C69,28 70.5,32 71,36 C71.5,40 71.5,43 71,45.5 L70.5,47 ' +
  'M38,20 L38,24 L38.5,34 L38,48 C38,50 37.5,55 37,58 C36.5,62 36,67 36.5,72 C36.5,76 37,80 37,84 C37,87 37.5,90 39,92 C40,93.5 41.5,93.5 42.5,92 C43.5,90.5 44,88 44,85 L44.5,78 L45,72 L46,66 C46.5,64.5 47.5,63 50,63 C52.5,63 53.5,64.5 54,66 L55,72 L55.5,78 L56,85 C56,88 56.5,90.5 57.5,92 C58.5,93.5 60,93.5 61,92 C62.5,90 63,87 63,84 C63,80 63.5,76 63.5,72 C64,67 63.5,62 63,58 C62.5,55 62,50 62,48 L61.5,34 L62,24 L62,20';

const FRONT_FILL =
  'M50,2 C46,2 43,5 42.5,9 C42,12 42.5,14.5 44,16.5 C45.2,18 47.2,19 50,19 C52.8,19 54.8,18 56,16.5 C57.5,14.5 58,12 57.5,9 C57,5 54,2 50,2 Z ' +
  'M38,20 C36,20 33.5,21 31.5,23 C29.5,25 28.5,28 28,32 C27.5,36 27.5,40 28,44 C28.3,46 28.8,47.5 30,48 L31,48 C31.5,44 32,40 33,36 L34,33 L36,30 L38,28 L38,20 Z ' +
  'M62,20 C64,20 66.5,21 68.5,23 C70.5,25 71.5,28 72,32 C72.5,36 72.5,40 72,44 C71.7,46 71.2,47.5 70,48 L69,48 C68.5,44 68,40 67,36 L66,33 L64,30 L62,28 L62,20 Z ' +
  'M38,20 L38.5,28 L39,34 L38.5,42 L38,50 C37.8,53 37.2,56 36.8,59 C36.2,63 36,67 36.3,71 C36.5,75 36.8,79 37,83 C37,86 37.3,89 38.5,91.5 C39.3,93 40.8,93.2 41.8,91.5 C42.8,89.8 43.2,87 43.5,84 L44,78 L44.5,72 L45.5,66.5 C46,64.5 47.5,63 50,63 C52.5,63 54,64.5 54.5,66.5 L55.5,72 L56,78 L56.5,84 C56.8,87 57.2,89.8 58.2,91.5 C59.2,93.2 60.7,93 61.5,91.5 C62.7,89 63,86 63,83 C63.2,79 63.5,75 63.7,71 C64,67 63.8,63 63.2,59 C62.8,56 62.2,53 62,50 L61.5,42 L61,34 L61.5,28 L62,20 C59,19 56,18.8 54,19 L50,19.2 L46,19 C44,18.8 41,19 38,20 Z';

const BACK_FILL = FRONT_FILL;

const FRONT_MUSCLES: Record<string, string> = {
  f_chest_l:
    'M40,26 C40,24.5 42,23 45,22.5 L49.5,22 L49.5,26 L49.5,32 C48,33 45.5,33.5 43.5,33 C41.5,32.5 40,31 40,29 Z',
  f_chest_r:
    'M60,26 C60,24.5 58,23 55,22.5 L50.5,22 L50.5,26 L50.5,32 C52,33 54.5,33.5 56.5,33 C58.5,32.5 60,31 60,29 Z',
  f_delt_l:
    'M34,24 C35,22.5 37,21.5 39,21 L40,22 L40,27 C38,26.5 35.5,25.5 34,24 Z',
  f_delt_r:
    'M66,24 C65,22.5 63,21.5 61,21 L60,22 L60,27 C62,26.5 64.5,25.5 66,24 Z',
  f_bicep_l:
    'M32.5,28 C32,30 31.5,33 32,36 C32.5,38 33.5,39.5 34.5,39 L35.5,37 L36,33 L35,29 Z',
  f_bicep_r:
    'M67.5,28 C68,30 68.5,33 68,36 C67.5,38 66.5,39.5 65.5,39 L64.5,37 L64,33 L65,29 Z',
  f_forearm_l:
    'M31,40 C30.5,43 30,46 30.5,48.5 L32,48.5 C32.5,46 33,43 33,40 Z',
  f_forearm_r:
    'M69,40 C69.5,43 70,46 69.5,48.5 L68,48.5 C67.5,46 67,43 67,40 Z',
  f_abs:
    'M46,34 L46,38 L45.5,42 L45.5,46 L46,50 L46,54 C47,55.5 48.5,56.5 50,56.5 C51.5,56.5 53,55.5 54,54 L54,50 L54.5,46 L54.5,42 L54,38 L54,34 C52.8,33.2 51.4,33 50,33 C48.6,33 47.2,33.2 46,34 Z',
  f_oblique_l:
    'M40,32 L40,38 L40,44 C40,48 40.5,52 42,55 L45.5,56 L45.5,50 L46,42 L46,34 C44,33 42,32 40,32 Z',
  f_oblique_r:
    'M60,32 L60,38 L60,44 C60,48 59.5,52 58,55 L54.5,56 L54.5,50 L54,42 L54,34 C56,33 58,32 60,32 Z',
  f_quad_l:
    'M38,59 C37.5,63 37,67.5 37,72 C37,75 37.2,77.5 37.5,79 L43,79 C43.2,76 43.5,72 44,68 C44.3,65 44.5,62 44.5,59.5 Z',
  f_quad_r:
    'M62,59 C62.5,63 63,67.5 63,72 C63,75 62.8,77.5 62.5,79 L57,79 C56.8,76 56.5,72 56,68 C55.7,65 55.5,62 55.5,59.5 Z',
  f_adductor_l:
    'M44.5,59 C44.5,62 45,65 45.5,68 L46,63 L46,58 Z',
  f_adductor_r:
    'M55.5,59 C55.5,62 55,65 54.5,68 L54,63 L54,58 Z',
  f_shin_l:
    'M37.5,81 C37.3,84 37.2,87 37.3,90 L41,90 C41.2,87 41.3,84 41.5,81 Z',
  f_shin_r:
    'M62.5,81 C62.7,84 62.8,87 62.7,90 L59,90 C58.8,87 58.7,84 58.5,81 Z',
};

const BACK_MUSCLES: Record<string, string> = {
  b_trap:
    'M42,20 C44,21.5 47,22.5 50,22.5 C53,22.5 56,21.5 58,20 L56,20 C54.5,21 52.5,21.5 50,21.5 C47.5,21.5 45.5,21 44,20 Z ' +
    'M44,20 L42,21 L41,23 C43,24 46.5,25 50,25 C53.5,25 57,24 59,23 L58,21 L56,20',
  b_delt_l:
    'M34,24 C35,22.5 37,21.5 39,21 L40,22 L40,27 C38,26.5 35.5,25.5 34,24 Z',
  b_delt_r:
    'M66,24 C65,22.5 63,21.5 61,21 L60,22 L60,27 C62,26.5 64.5,25.5 66,24 Z',
  b_lat_l:
    'M40,26 C39.5,30 39,34 39.5,38 L40,42 L46,42 L46,28 C44.5,26.5 42.5,26 40,26 Z',
  b_lat_r:
    'M60,26 C60.5,30 61,34 60.5,38 L60,42 L54,42 L54,28 C55.5,26.5 57.5,26 60,26 Z',
  b_lowerback:
    'M46,42 L46,54 C47.5,55.5 48.8,56 50,56 C51.2,56 52.5,55.5 54,54 L54,42 Z',
  b_tricep_l:
    'M32.5,28 C32,30.5 31.5,33.5 32,36.5 C32.3,38 33.2,39 34.2,38.5 L35,36 L35.5,32 L34.5,28 Z',
  b_tricep_r:
    'M67.5,28 C68,30.5 68.5,33.5 68,36.5 C67.7,38 66.8,39 65.8,38.5 L65,36 L64.5,32 L65.5,28 Z',
  b_glute_l:
    'M40,54 C40,56.5 41.5,59 44,60 L46,60 L46,54 C44.5,54 42,54 40,54 Z',
  b_glute_r:
    'M60,54 C60,56.5 58.5,59 56,60 L54,60 L54,54 C55.5,54 58,54 60,54 Z',
  b_ham_l:
    'M38,61 C37.5,65 37,69 37,73 C37,76 37.2,78 37.5,79 L43,79 C43.2,76 43.5,72 44,68 C44.3,65 44.5,62.5 44.5,61 Z',
  b_ham_r:
    'M62,61 C62.5,65 63,69 63,73 C63,76 62.8,78 62.5,79 L57,79 C56.8,76 56.5,72 56,68 C55.7,65 55.5,62.5 55.5,61 Z',
  b_calf_l:
    'M37.5,81 C37.3,84 37.2,87 37.3,90 L41,90 C41.2,87 41.5,84.5 42,82 C41,80.5 39.5,80.5 38,81 Z',
  b_calf_r:
    'M62.5,81 C62.7,84 62.8,87 62.7,90 L59,90 C58.8,87 58.5,84.5 58,82 C59,80.5 60.5,80.5 62,81 Z',
};

function resolveMuscleIds(muscles: string[]): Set<string> {
  const ids = new Set<string>();
  muscles.forEach(muscle => {
    const key = muscle.toLowerCase().trim().replace(/_/g, ' ');
    const mapped = MUSCLE_NAME_MAP[key] || MUSCLE_NAME_MAP[key.replace(/ /g, '_')];
    if (mapped) {
      mapped.forEach(id => ids.add(id));
    }
  });
  return ids;
}

function RenderBody({ muscles, outline, fill, primaryIds, secondaryIds, gradId }: {
  muscles: Record<string, string>;
  outline: string;
  fill: string;
  primaryIds: Set<string>;
  secondaryIds: Set<string>;
  gradId: string;
}) {
  return (
    <G>
      <Defs>
        <SvgGradient id={`${gradId}_body`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2a2a36" />
          <Stop offset="0.5" stopColor="#222230" />
          <Stop offset="1" stopColor="#1a1a26" />
        </SvgGradient>
        <SvgGradient id={`${gradId}_primary`} x1="0" y1="0" x2="0.3" y2="1">
          <Stop offset="0" stopColor="#34d87a" stopOpacity="0.95" />
          <Stop offset="0.5" stopColor="#2ecc71" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#25a85c" stopOpacity="0.9" />
        </SvgGradient>
        <SvgGradient id={`${gradId}_secondary`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2ecc71" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#2ecc71" stopOpacity="0.15" />
        </SvgGradient>
      </Defs>

      <Path d={fill} fill={`url(#${gradId}_body)`} />
      <Path d={outline} fill="none" stroke="#3a3a4a" strokeWidth={0.4} strokeLinecap="round" />

      {Object.entries(muscles).map(([id, path]) => {
        const isP = primaryIds.has(id);
        const isS = secondaryIds.has(id);
        if (isP || isS) return null;
        return (
          <Path
            key={id}
            d={path}
            fill="#252532"
            stroke="#2d2d3d"
            strokeWidth={0.2}
            opacity={0.4}
          />
        );
      })}

      {Object.entries(muscles).map(([id, path]) => {
        const isS = secondaryIds.has(id);
        if (!isS) return null;
        return (
          <Path
            key={id}
            d={path}
            fill={`url(#${gradId}_secondary)`}
            stroke="rgba(46,204,113,0.25)"
            strokeWidth={0.4}
          />
        );
      })}

      {Object.entries(muscles).map(([id, path]) => {
        const isP = primaryIds.has(id);
        if (!isP) return null;
        return (
          <G key={id}>
            <Path
              d={path}
              fill={`url(#${gradId}_primary)`}
              stroke="#2ecc71"
              strokeWidth={0.5}
            />
            <Path
              d={path}
              fill="rgba(52,216,122,0.15)"
              stroke="none"
            />
          </G>
        );
      })}
    </G>
  );
}

export default function MuscleBodyDiagram({
  primaryMuscles,
  secondaryMuscles = [],
  height = 220,
}: MuscleBodyDiagramProps) {
  const primaryIds = resolveMuscleIds(primaryMuscles);
  const secondaryIds = resolveMuscleIds(secondaryMuscles);
  const svgH = height - 24;
  const svgW = svgH * 0.52;

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.figure}>
        <Text style={styles.label}>FRONT</Text>
        <View style={styles.svgWrap}>
          <Svg width={svgW} height={svgH} viewBox="26 0 48 96">
            <RenderBody
              muscles={FRONT_MUSCLES}
              outline={FRONT_OUTLINE}
              fill={FRONT_FILL}
              primaryIds={primaryIds}
              secondaryIds={secondaryIds}
              gradId="f"
            />
          </Svg>
        </View>
      </View>

      <View style={styles.separator} />

      <View style={styles.figure}>
        <Text style={styles.label}>BACK</Text>
        <View style={styles.svgWrap}>
          <Svg width={svgW} height={svgH} viewBox="26 0 48 96">
            <RenderBody
              muscles={BACK_MUSCLES}
              outline={BACK_OUTLINE}
              fill={BACK_FILL}
              primaryIds={primaryIds}
              secondaryIds={secondaryIds}
              gradId="b"
            />
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingTop: 4,
    paddingBottom: 8,
  },
  figure: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555566',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  svgWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    width: 1,
    height: '55%',
    backgroundColor: '#2a2a38',
    alignSelf: 'center',
    borderRadius: 1,
  },
});

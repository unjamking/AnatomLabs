"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Eye, Info } from "lucide-react";

const muscles = [
  {
    name: "Quadriceps",
    group: "Extensors",
    function: "Knee extension, Hip flexion",
    color: "rgba(59,130,246,0.8)",
  },
  {
    name: "Hamstrings",
    group: "Flexors",
    function: "Knee flexion, Hip extension",
    color: "rgba(34,197,94,0.8)",
  },
  {
    name: "Gluteus Maximus",
    group: "Extensors",
    function: "Hip extension, External rotation",
    color: "rgba(231,76,60,0.8)",
  },
];

function AnatomyButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="group relative px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-text hover:bg-white/[0.12] hover:border-white/[0.16] transition-all duration-300"
    >
      {children}
    </motion.button>
  );
}

export default function AnatomyDiagram() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="relative py-32 bg-[#0a0a0a] overflow-hidden">
      <div className="absolute inset-0 bg-grid-diagonal-[rgba(255,255,255,0.02)]" />

      <div className="absolute top-10 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <Eye size={14} className="text-primary" />
          <span className="text-xs font-medium text-primary">Interactive Explorer</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-4">
            Anatomy Explorer
          </p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Visualize Your
            <br />
            Muscle Physiology.
          </h2>
          <p className="text-lg text-text-secondary max-w-xl mx-auto leading-relaxed font-light">
            Tap and explore the biomechanics behind every movement. Understand your
            body's architecture before you train it.
          </p>
        </div>

        <div className="relative mb-16">
          <div
            ref={ref}
            className="relative w-full aspect-video rounded-3xl bg-gradient-to-br from-blue-500/[0.1] via-purple-500/[0.08] to-[#111111] border border-white/[0.06] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.5)]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 50%, rgba(139,92,249,0.1) 0%, transparent 50%), radial-gradient(circle at 0% 0%, rgba(231,76,60,0.05) 0%, transparent 25%), radial-gradient(circle at 100% 100%, rgba(59,130,246,0.05) 0%, transparent 25%)",
            }}
          >
            {/* Simulated muscle diagram using SVG */}
            <svg className="w-full h-full" viewBox="0 0 1000 560">
              <defs>
                <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="rgba(231,76,60,0.2)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>

              {/* Thigh background */}
              <path
                d="M 150,320 L 280,180 L 480,150 L 600,220 L 750,180 L 880,320 L 880,400 L 120,400 Z"
                fill="url(#glow)"
                className="opacity-40"
              />
              <path
                d="M 150,320 L 280,180 L 480,150"
                stroke="rgba(59,130,246,0.6)"
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M 480,150 L 600,220 L 750,180"
                stroke="rgba(34,197,94,0.6)"
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M 750,180 L 880,320 L 880,400 L 120,400 L 150,320"
                stroke="rgba(231,76,60,0.6)"
                strokeWidth="3"
                fill="none"
              />

              {/* Knee joint */}
              <circle cx="500" cy="150" r="40" fill="rgba(0,0,0,0.8)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
              <circle cx="500" cy="150" r="30" fill="rgba(59,130,246,0.3)" className="animate-pulse" />

              {/* Labels */}
              <text x="230" y="135" fill="rgba(255,255,255,0.8)" fontSize="12" fontFamily="Inter, sans-serif" className="font-medium">Quadriceps</text>
              <text x="230" y="148" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="Inter, sans-serif">Extensors</text>

              <text x="500" y="440" fill="rgba(255,255,255,0.8)" fontSize="12" fontFamily="Inter, sans-serif" className="font-medium" textAnchor="middle">Knee Joint</text>

              <text x="750" y="320" fill="rgba(255,255,255,0.8)" fontSize="12" fontFamily="Inter, sans-serif" className="font-medium">Gluteus Maximus</text>
              <text x="750" y="334" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="Inter, sans-serif">Extensors</text>

              <text x="320" y="360" fill="rgba(255,255,255,0.8)" fontSize="12" fontFamily="Inter, sans-serif" className="font-medium">Hamstrings</text>
              <text x="320" y="374" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="Inter, sans-serif">Flexors</text>
            </svg>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {muscles.map((m, i) => (
              <AnatomyButton key={i} onClick={() => {}}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#a855f7' }}
                  />
                  <span className="text-text">{m.name}</span>
                  <span className="text-text-tertiary ml-1">{m.function}</span>
                </div>
              </AnatomyButton>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="p-6 bg-white/[0.02] rounded-2xl border border-white/[0.04]"
          >
            <h3 className="text-sm font-semibold mb-2">Muscle Architecture</h3>
            <p className="text-xs text-text-tertiary">
              Understand the 3D structure and fiber orientation of every muscle.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="p-6 bg-white/[0.02] rounded-2xl border border-white/[0.04]"
          >
            <h3 className="text-sm font-semibold mb-2">Biomechanics</h3>
            <p className="text-xs text-text-tertiary">
              See how muscles work together during complex movements.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="p-6 bg-white/[0.02] rounded-2xl border border-white/[0.04]"
          >
            <h3 className="text-sm font-semibold mb-2">Injury Prevention</h3>
            <p className="text-xs text-text-tertiary">
              Identify imbalances and target weak points before they cause problems.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Star, ChevronRight, Award, Users } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const coaches = [
  {
    name: "Dr. Sarah Mitchell",
    specialty: ["Endurance", "Nutrition"],
    rating: 4.9,
    reviews: 128,
    initials: "SM",
    gradient: "from-[#e74c3c] to-[#a855f7]",
  },
  {
    name: "Marcus Chen",
    specialty: ["Hypertrophy", "Strength"],
    rating: 4.8,
    reviews: 94,
    initials: "MC",
    gradient: "from-[#22c55e] to-[#3b82f6]",
  },
  {
    name: "Dr. Elena Torres",
    specialty: ["Recovery", "Biomarkers"],
    rating: 5.0,
    reviews: 211,
    initials: "ET",
    gradient: "from-[#f59e0b] to-[#e74c3c]",
  },
  {
    name: "James Okafor",
    specialty: ["Sprint", "Power"],
    rating: 4.9,
    reviews: 76,
    initials: "JO",
    gradient: "from-[#a855f7] to-[#e74c3c]",
  },
  {
    name: "Dr. Anika Patel",
    specialty: ["Longevity", "Hormones"],
    rating: 4.7,
    reviews: 163,
    initials: "AP",
    gradient: "from-[#14b8a6] to-[#3b82f6]",
  },
  {
    name: "Sofia Bergstr\u00f6m",
    specialty: ["Mobility", "Rehab"],
    rating: 4.8,
    reviews: 89,
    initials: "SB",
    gradient: "from-[#3b82f6] to-[#a855f7]",
  },
];

function CoachCard({
  coach,
  index,
}: {
  coach: (typeof coaches)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.55,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="group w-full bg-[#111111] rounded-2xl border border-white/[0.06] p-6 shadow-[0_2px_20px_rgba(0,0,0,0.3)] hover:border-[#e74c3c]/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_12px_48px_rgba(231,76,60,0.1)] relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-[1.5px] rounded-full bg-gradient-to-br from-white/20 to-white/5 shadow-[0_0_20px_rgba(231,76,60,0.1)]">
            <div
              className={`w-11 h-11 rounded-full bg-gradient-to-br ${coach.gradient} flex items-center justify-center text-white text-xs font-bold tracking-wide`}
            >
              {coach.initials}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <h4 className="text-[14px] font-semibold text-white truncate">
                {coach.name}
              </h4>
              <Award size={13} className="text-blue-400 shrink-0" />
            </div>
            <div className="flex items-center gap-1.5">
              <Star size={11} fill="#f59e0b" className="text-amber-400" />
              <span className="text-xs font-semibold text-white tabular-nums">
                {coach.rating}
              </span>
              <span className="text-[11px] text-white/40">
                ({coach.reviews} reviews)
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {coach.specialty.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium text-white/50 bg-white/[0.04] rounded-lg px-2.5 py-1.5 uppercase tracking-[0.08em] border border-white/[0.04]"
            >
              {tag}
            </span>
          ))}
        </div>

        <button className="w-full flex items-center justify-center gap-2 bg-[#e74c3c] text-white text-[13px] font-semibold py-2.5 rounded-xl hover:bg-[#c0392b] transition-all duration-300 shadow-[0_2px_12px_rgba(231,76,60,0.25)] hover:shadow-[0_4px_20px_rgba(231,76,60,0.35)]">
          Book Session
          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-300" />
        </button>
      </div>
    </motion.div>
  );
}

export default function Marketplace() {
  return (
    <section id="marketplace" className="section-spacing section-bg-subtle relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="section-container">
        <ScrollReveal>
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-4">
              Elite Marketplace
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
              Find Your Pro.
            </h2>
            <p className="text-base text-white/40 max-w-md mx-auto leading-relaxed">
              Direct access to elite expertise. Verified coaches. Custom
              programming. Real-time feedback.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="flex items-center justify-center gap-6 mb-14">
            <div className="flex items-center gap-2.5 bg-white/[0.03] rounded-full px-4 py-2 border border-white/[0.06]">
              <Award size={14} className="text-blue-400" />
              <span className="text-xs font-medium text-white/60">Verified Profiles</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/[0.03] rounded-full px-4 py-2 border border-white/[0.06]">
              <Users size={14} className="text-green-400" />
              <span className="text-xs font-medium text-white/60">Session Booking</span>
            </div>
            <div className="hidden sm:flex items-center gap-2.5 bg-white/[0.03] rounded-full px-4 py-2 border border-white/[0.06]">
              <Star size={14} className="text-amber-400" />
              <span className="text-xs font-medium text-white/60">Performance Feed</span>
            </div>
          </div>
        </ScrollReveal>

        <div className="coach-grid">
          {coaches.map((coach, i) => (
            <CoachCard key={coach.name} coach={coach} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

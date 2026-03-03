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
    gradient: "from-primary to-purple",
  },
  {
    name: "Marcus Chen",
    specialty: ["Hypertrophy", "Strength"],
    rating: 4.8,
    reviews: 94,
    initials: "MC",
    gradient: "from-success to-info",
  },
  {
    name: "Dr. Elena Torres",
    specialty: ["Recovery", "Biomarkers"],
    rating: 5.0,
    reviews: 211,
    initials: "ET",
    gradient: "from-warning to-primary",
  },
  {
    name: "James Okafor",
    specialty: ["Sprint", "Power"],
    rating: 4.9,
    reviews: 76,
    initials: "JO",
    gradient: "from-purple to-primary",
  },
  {
    name: "Dr. Anika Patel",
    specialty: ["Longevity", "Hormones"],
    rating: 4.7,
    reviews: 163,
    initials: "AP",
    gradient: "from-teal to-info",
  },
  {
    name: "Sofia Bergström",
    specialty: ["Mobility", "Rehab"],
    rating: 4.8,
    reviews: 89,
    initials: "SB",
    gradient: "from-info to-purple",
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
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group w-full bg-bg-card rounded-2xl border border-border p-6 card-depth hover:border-primary/30 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(231,76,60,0.06)]"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="p-[1.5px] rounded-full bg-gradient-to-br from-white/15 to-white/5">
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br ${coach.gradient} flex items-center justify-center text-white text-xs font-semibold`}
          >
            {coach.initials}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="text-sm font-semibold text-text">{coach.name}</h4>
            <Award size={12} className="text-info" />
          </div>
          <div className="flex items-center gap-1">
            <Star size={10} fill="#f39c12" className="text-warning" />
            <span className="text-xs font-medium text-text tabular-nums">{coach.rating}</span>
            <span className="text-[11px] text-text-tertiary">({coach.reviews})</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {coach.specialty.map((tag) => (
          <span
            key={tag}
            className="text-[10px] font-medium text-text-secondary bg-bg-card-light rounded-lg px-2.5 py-1 uppercase tracking-[0.06em]"
          >
            {tag}
          </span>
        ))}
      </div>

      <button className="w-full flex items-center justify-center gap-2 bg-primary text-white text-[13px] font-medium py-2.5 rounded-xl hover:bg-primary-dark transition-colors duration-300">
        Book Session
        <ChevronRight size={12} />
      </button>
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
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-text mb-6 leading-tight">
              Find Your Pro.
            </h2>
            <p className="text-base text-text-tertiary max-w-md mx-auto leading-relaxed">
              Direct access to elite expertise. Verified coaches. Custom
              programming. Real-time feedback.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="flex items-center justify-center gap-5 mb-14 text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              <Award size={14} className="text-info" />
              <span className="text-xs">Verified Profiles</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-2">
              <Users size={14} className="text-success" />
              <span className="text-xs">Session Booking</span>
            </div>
            <div className="w-px h-3 bg-border hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <Star size={14} className="text-warning" />
              <span className="text-xs">Performance Feed</span>
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

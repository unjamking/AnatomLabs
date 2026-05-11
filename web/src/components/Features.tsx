"use client";

import { useRef, useEffect } from "react";
import { motion, useInView, useAnimation } from "framer-motion";
import {
  Droplets,
  Dumbbell,
  Activity,
  BrainCircuit,
  ShieldCheck,
  FileText,
  Users,
  TrendingUp
} from "lucide-react";

const features = [
  {
    icon: Droplets,
    title: "Deep Nutrition",
    description: "Track 30+ micronutrients beyond basic calories. Monitor electrolytes, vitamins, and minerals with precision.",
    details: [
      "Barcode scanning & recognition",
      "30+ micronutrients tracked",
      "AI-powered food analysis",
      "Dietary framework filters"
    ],
    color: "text-blue-400",
    bg: "blue",
  },
  {
    icon: Dumbbell,
    title: "Smart Workouts",
    description: "AI-generated training programs that adapt to your recovery, performance, and goals in real-time.",
    details: [
      "Auto-generating workouts",
      "Recovery-aware programming",
      "Progress tracking",
      "Injury prevention"
    ],
    color: "text-green-400",
    bg: "green",
  },
  {
    icon: BrainCircuit,
    title: "AI Insights",
    description: "Machine learning that connects the dots between nutrition, training, sleep, and recovery.",
    details: [
      "Performance correlations",
      "Recovery recommendations",
      "Personalized insights",
      "Predictive analytics"
    ],
    color: "text-purple-400",
    bg: "purple",
  },
  {
    icon: Activity,
    title: "Biomarker Lab",
    description: "Log your lab results and see how nutrition directly impacts your biology over time.",
    details: [
      "50+ biomarkers supported",
      "Trend analysis",
      "Optimal range tracking",
      "Goal-based recommendations"
    ],
    color: "text-emerald-400",
    bg: "emerald",
  },
  {
    icon: ShieldCheck,
    title: "Coaching Ecosystem",
    description: "Direct access to elite coaches with verified credentials, real-time feedback, and custom programming.",
    details: [
      "200+ elite coaches",
      "Direct messaging",
      "Session booking",
      "Performance reports"
    ],
    color: "text-amber-400",
    bg: "amber",
  },
  {
    icon: FileText,
    title: "Advanced Reports",
    description: "Shareable insights that transform raw data into actionable intelligence for athletes and coaches.",
    details: [
      "Weekly/monthly summaries",
      "Export to PDF/CSV",
      "Coach-sharing enabled",
      "Progress visualization"
    ],
    color: "text-teal-400",
    bg: "teal",
  },
];

function FeatureCard({ feature }: { feature: typeof features[0] }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay: (features.indexOf(feature) * 0.1) }}
      className="group relative bg-[#111111] rounded-2xl p-7 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 shadow-[0_2px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 overflow-hidden"
    >
      <div className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-current/0.1 to-transparent ${feature.color}`} />

      <div className="relative">
        <div className="flex items-start gap-4 mb-5">
          <div className="p-3 rounded-xl bg-white/[0.08] group-hover:opacity-80 transition-opacity" >
            <feature.icon size={20} className={feature.color} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-text">{feature.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed font-light">
              {feature.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {feature.details.map((detail, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className={`w-1.5 h-1.5 rounded-full bg-${feature.bg}-400/40`} />
              <span className="text-xs font-medium text-text-tertiary">{detail}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Features() {
  return (
    <section id="features" className="section-spacing relative">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20 max-w-2xl mx-auto"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-5">
            Complete Performance Platform
          </p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Every Tool You Need.
          </h2>
          <p className="text-xl text-text-secondary max-w-lg mx-auto leading-relaxed font-light">
            From nutrition tracking to elite coaching — everything integrated into one seamless experience.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

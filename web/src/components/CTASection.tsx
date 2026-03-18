"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  { label: "Micronutrients", value: "30+" },
  { label: "Biomarkers", value: "50+" },
  { label: "Elite Coaches", value: "200+" },
];

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="download" ref={ref} className="relative py-32 md:py-44 overflow-hidden" style={{ backgroundColor: "#111111" }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1a1a1a] to-transparent" />

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[150px]"
          style={{ backgroundColor: "rgba(231,76,60,0.04)" }}
        />
        <div
          className="absolute top-1/3 left-1/4 w-[350px] h-[350px] rounded-full blur-[120px]"
          style={{ backgroundColor: "rgba(59,130,246,0.03)" }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-6 relative z-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease }}
          className="text-xs font-semibold uppercase tracking-[0.25em] mb-6"
          style={{ color: "#e74c3c" }}
        >
          Start Today
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-7 leading-[1.05]"
          style={{ color: "#f5f5f5" }}
        >
          Standardize
          <br />
          Your Success.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="text-base md:text-lg max-w-md mx-auto mb-14 leading-relaxed font-light"
          style={{ color: "#888" }}
        >
          Join the platform that treats human performance as a science, not a
          guessing game.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3, ease }}
        >
          <a
            href="#"
            className="group inline-flex items-center gap-3 text-white px-10 py-4 rounded-full text-sm font-semibold transition-all duration-500"
            style={{
              backgroundColor: "#e74c3c",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#c0392b";
              e.currentTarget.style.boxShadow = "0 0 50px rgba(231,76,60,0.3)";
              e.currentTarget.style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#e74c3c";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <svg width="16" height="20" viewBox="0 0 20 24" fill="currentColor">
              <path d="M15.07 12.95c-.03-2.77 2.26-4.1 2.36-4.17-1.29-1.88-3.29-2.14-4-2.17-1.7-.17-3.33 1-4.19 1-.87 0-2.2-.98-3.62-.96-1.86.03-3.58 1.08-4.54 2.75-1.94 3.36-.5 8.33 1.39 11.06.92 1.33 2.02 2.83 3.46 2.78 1.39-.06 1.91-.9 3.59-.9 1.67 0 2.15.9 3.61.87 1.5-.02 2.45-1.36 3.36-2.69 1.06-1.54 1.5-3.04 1.52-3.12-.03-.01-2.92-1.12-2.95-4.45zM12.33 4.7c.77-.93 1.28-2.22 1.14-3.51-1.1.04-2.44.73-3.23 1.66-.71.82-1.33 2.13-1.16 3.39 1.23.1 2.48-.63 3.25-1.54z" />
            </svg>
            Download on the App Store
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7, duration: 0.6, ease }}
          className="mt-24 flex flex-wrap items-center justify-center gap-10 sm:gap-16"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.8 + i * 0.1, duration: 0.5, ease }}
              className="text-center min-w-[90px]"
            >
              <div className="text-3xl font-bold mb-1.5 tabular-nums" style={{ color: "#f5f5f5" }}>{stat.value}</div>
              <div className="text-xs font-medium" style={{ color: "#555" }}>{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

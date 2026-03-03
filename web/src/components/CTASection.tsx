"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="download" ref={ref} className="section-spacing bg-bg-card relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-0 cta-grid-bg" />
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/4 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-info/3 rounded-full blur-[100px]" />
      </div>

      <div className="section-container cta-max-width relative z-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-5"
        >
          Start Today
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-4xl md:text-6xl font-bold tracking-tight text-text mb-6 leading-tight"
        >
          Standardize
          <br />
          Your Success.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-base md:text-lg text-text-secondary max-w-md mx-auto mb-14 leading-relaxed font-light"
        >
          Join the platform that treats human performance as a science, not a
          guessing game.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <a
            href="#"
            className="group inline-flex items-center gap-3 bg-primary text-white px-10 py-4 rounded-full text-sm font-semibold hover:bg-primary-dark transition-all duration-500 hover:shadow-[0_0_40px_rgba(231,76,60,0.25)] hover:scale-[1.02]"
          >
            <svg width="16" height="20" viewBox="0 0 20 24" fill="currentColor">
              <path d="M15.07 12.95c-.03-2.77 2.26-4.1 2.36-4.17-1.29-1.88-3.29-2.14-4-2.17-1.7-.17-3.33 1-4.19 1-.87 0-2.2-.98-3.62-.96-1.86.03-3.58 1.08-4.54 2.75-1.94 3.36-.5 8.33 1.39 11.06.92 1.33 2.02 2.83 3.46 2.78 1.39-.06 1.91-.9 3.59-.9 1.67 0 2.15.9 3.61.87 1.5-.02 2.45-1.36 3.36-2.69 1.06-1.54 1.5-3.04 1.52-3.12-.03-.01-2.92-1.12-2.95-4.45zM12.33 4.7c.77-.93 1.28-2.22 1.14-3.51-1.1.04-2.44.73-3.23 1.66-.71.82-1.33 2.13-1.16 3.39 1.23.1 2.48-.63 3.25-1.54z" />
            </svg>
            Download on the App Store
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7 }}
          className="mt-20 flex flex-wrap items-center justify-center gap-8 sm:gap-14"
        >
          {[
            { label: "Micronutrients", value: "30+" },
            { label: "Biomarkers", value: "50+" },
            { label: "Elite Coaches", value: "200+" },
          ].map((stat) => (
            <div key={stat.label} className="text-center min-w-[80px]">
              <div className="text-2xl font-bold text-text mb-1 tabular-nums">{stat.value}</div>
              <div className="text-xs text-text-tertiary">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

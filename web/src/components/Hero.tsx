"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Image from "next/image";

const screens = [
  { id: "login", label: "Login", src: "/screens/login.png" },
  { id: "home", label: "Home", src: "/screens/home.png" },
  { id: "nutrition", label: "Nutrition", src: "/screens/nutrition.png" },
  { id: "coaches", label: "Coaches", src: "/screens/coaches.png" },
  { id: "workouts", label: "Workouts", src: "/screens/workout.png" },
  { id: "reports", label: "Reports", src: "/screens/reports.png" },
];

function PhoneCarousel() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [dotKey, setDotKey] = useState(0);

  const goTo = useCallback((index: number) => {
    setDirection(index > active ? 1 : -1);
    setActive(index);
    setDotKey((k) => k + 1);
  }, [active]);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setActive((prev) => (prev + 1) % screens.length);
      setDotKey((k) => k + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center"
    >
      <div className="relative w-[280px] h-[607px] md:w-[320px] md:h-[693px]">
        <div className="absolute inset-0 rounded-[48px] bg-[#1c1c1e] border border-[#3a3a3c]/60 shadow-[0_0_0_0.5px_rgba(255,255,255,0.06)_inset] overflow-hidden">
          <div className="absolute inset-0 rounded-[48px] bg-gradient-to-b from-white/[0.05] via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-white/[0.06] via-white/[0.02] to-transparent pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-white/[0.06] via-white/[0.02] to-transparent pointer-events-none" />

          <div className="absolute top-[11px] left-1/2 -translate-x-1/2 w-[90px] h-[25px] bg-black rounded-full z-20">
            <div className="absolute top-[8px] right-[16px] w-[9px] h-[9px] rounded-full bg-[#1c1c1e]/80 border border-[#3a3a3c]/50" />
          </div>

          <div className="absolute inset-[3px] rounded-[45px] bg-black overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={active}
                custom={direction}
                initial={{ opacity: 0, x: direction * 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -50 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="absolute inset-0"
              >
                <Image
                  src={screens[active].src}
                  alt={screens[active].label}
                  fill
                  unoptimized
                  className="object-cover object-top"
                  style={{ imageRendering: "auto" }}
                  sizes="320px"
                  priority={active === 0}
                />
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="absolute -inset-12 rounded-[70px] bg-gradient-to-b from-primary/8 via-purple/4 to-transparent blur-3xl -z-10" />
      </div>

      <div className="flex gap-2 mt-8">
        {screens.map((screen, i) => (
          <button
            key={screen.id}
            onClick={() => goTo(i)}
            className={`h-1 rounded-full transition-all duration-500 overflow-hidden ${i === active ? "w-7 bg-primary/25" : "w-1.5 bg-white/10"}`}
          >
            {i === active && (
              <div
                key={dotKey}
                className="h-full bg-primary rounded-full dot-progress"
              />
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-bg">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(231,76,60,0.04)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(52,152,219,0.03)_0%,_transparent_50%)]" />

      <div className="section-container relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-20 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex-1 text-center lg:text-left max-w-xl"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 bg-bg-card border border-border rounded-full px-4 py-1.5 mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-text-secondary">
              Now available on iOS
            </span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold leading-[0.92] tracking-[-0.04em] text-text mb-7">
            Performance.
            <br />
            <span className="gradient-text-red">Decoded.</span>
          </h1>

          <p className="text-lg md:text-xl text-text-secondary max-w-md mx-auto lg:mx-0 mb-12 leading-relaxed font-light">
            The most advanced human performance ecosystem ever built. From
            micronutrient tracking to elite coaching — all in one integrated
            experience.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <a
              href="#download"
              className="group inline-flex items-center gap-3 bg-primary text-white px-8 py-3.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-all duration-300 hover:shadow-[0_0_30px_rgba(231,76,60,0.25)]"
            >
              <svg width="16" height="20" viewBox="0 0 20 24" fill="currentColor">
                <path d="M15.07 12.95c-.03-2.77 2.26-4.1 2.36-4.17-1.29-1.88-3.29-2.14-4-2.17-1.7-.17-3.33 1-4.19 1-.87 0-2.2-.98-3.62-.96-1.86.03-3.58 1.08-4.54 2.75-1.94 3.36-.5 8.33 1.39 11.06.92 1.33 2.02 2.83 3.46 2.78 1.39-.06 1.91-.9 3.59-.9 1.67 0 2.15.9 3.61.87 1.5-.02 2.45-1.36 3.36-2.69 1.06-1.54 1.5-3.04 1.52-3.12-.03-.01-2.92-1.12-2.95-4.45zM12.33 4.7c.77-.93 1.28-2.22 1.14-3.51-1.1.04-2.44.73-3.23 1.66-.71.82-1.33 2.13-1.16 3.39 1.23.1 2.48-.63 3.25-1.54z" />
              </svg>
              Download for iOS
            </a>
            <a
              href="#nutrition"
              className="group text-sm font-medium text-text-secondary hover:text-text transition-colors duration-300 flex items-center gap-1.5"
            >
              Learn more
              <ChevronDown size={14} className="transition-transform duration-300 group-hover:translate-y-0.5" />
            </a>
          </div>
        </motion.div>

        <div className="flex-shrink-0">
          <PhoneCarousel />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={20} className="text-text-tertiary" />
        </motion.div>
      </motion.div>
    </section>
  );
}

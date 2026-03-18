"use client";

import { Droplets, Scan, ShieldCheck, Zap } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const micronutrients = [
  { name: "Sodium", value: "2,145", unit: "mg", pct: 93 },
  { name: "Potassium", value: "3,420", unit: "mg", pct: 73 },
  { name: "Magnesium", value: "380", unit: "mg", pct: 90 },
  { name: "Vitamin D", value: "42", unit: "mcg", pct: 84 },
  { name: "Zinc", value: "9.2", unit: "mg", pct: 84 },
  { name: "Iron", value: "14", unit: "mg", pct: 78 },
  { name: "B12", value: "4.8", unit: "mcg", pct: 96 },
  { name: "Vitamin K", value: "92", unit: "mcg", pct: 77 },
];

const dietaryFilters = [
  "Keto", "Paleo", "Vegan", "Halal", "Kosher",
  "Gluten-Free", "Dairy-Free", "Low-FODMAP", "AIP", "Carnivore",
];

function ProgressBar({ value }: { value: number }) {
  const color =
    value >= 90
      ? "#22c55e"
      : value >= 75
        ? "#3b82f6"
        : "#f59e0b";

  return (
    <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden flex-1">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

function PctBadge({ value }: { value: number }) {
  const color =
    value >= 90
      ? "text-green-400"
      : value >= 75
        ? "text-blue-400"
        : "text-amber-400";

  return (
    <span className={`text-[10px] font-semibold tabular-nums ${color}`}>
      {value}%
    </span>
  );
}

export default function BentoNutrition() {
  return (
    <section id="nutrition" className="section-spacing bg-bg relative">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="section-container">
        <ScrollReveal>
          <div className="text-center mb-20">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-4">
              Deep Nutrition
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-text mb-4 leading-tight">
              Macro to Micro.
            </h2>
            <p className="text-2xl md:text-3xl font-medium text-text-secondary mb-6">
              Every data point matters.
            </p>
            <p className="text-base text-text-tertiary max-w-lg mx-auto leading-relaxed">
              Most apps stop at calories. We decode 30+ micronutrients — every
              electrolyte, every vitamin, every mineral — to give you a complete
              biological picture.
            </p>
          </div>
        </ScrollReveal>

        <div className="bento-grid">
          <ScrollReveal className="bento-large" delay={0.1}>
            <div className="group h-full bg-[#111111] rounded-2xl p-7 border border-white/[0.06] hover:border-[#e74c3c]/25 transition-all duration-500 relative overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(231,76,60,0.08)]">
              <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-blue-500 via-blue-500/30 to-transparent rounded-l-2xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-5">
                  <Droplets size={15} className="text-blue-400" />
                  <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-[0.12em]">
                    Full Spectrum
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-text mb-2">
                  30+ Micronutrients.
                </h3>
                <p className="text-sm text-text-secondary mb-7 font-light">
                  Every electrolyte. Every vitamin. Every mineral.
                </p>

                <div className="bg-[#0a0a0a] rounded-xl p-5 border border-white/[0.04] space-y-3.5">
                  {micronutrients.map((n) => (
                    <div key={n.name} className="flex items-center gap-3">
                      <span className="text-[11px] text-text-secondary w-[70px] shrink-0">
                        {n.name}
                      </span>
                      <ProgressBar value={n.pct} />
                      <span className="text-[11px] text-text font-medium w-16 text-right tabular-nums">
                        {n.value} {n.unit}
                      </span>
                      <PctBadge value={n.pct} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="group h-full min-h-[280px] bg-[#111111] rounded-2xl p-7 border border-white/[0.06] hover:border-[#e74c3c]/25 transition-all duration-500 flex flex-col shadow-[0_2px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(231,76,60,0.08)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.03] to-transparent pointer-events-none" />
              <div className="relative flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-5">
                  <Scan size={15} className="text-green-400" />
                  <span className="text-[11px] font-semibold text-green-400 uppercase tracking-[0.12em]">
                    Instant
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-text mb-2">
                  Barcode &amp; Beyond.
                </h3>
                <p className="text-[13px] text-text-secondary mb-6 leading-relaxed font-light">
                  Scan any product. Get complete micro breakdowns in under a second.
                </p>

                <div className="flex items-center justify-center flex-1">
                  <div className="relative w-28 h-28">
                    <div className="absolute inset-0 border border-green-500/15 rounded-2xl" />
                    <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-green-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-green-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-green-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-green-400 rounded-br-lg" />
                    <div
                      className="absolute left-3 right-3 h-[2px] bg-green-400/60 rounded-full"
                      style={{
                        animation: "scanLine 2.4s ease-in-out infinite",
                        top: "50%",
                      }}
                    />
                    <style>{`
                      @keyframes scanLine {
                        0%, 100% { top: 15%; opacity: 0.4; }
                        50% { top: 80%; opacity: 1; }
                      }
                    `}</style>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex gap-[2px]">
                        {[12, 18, 8, 14, 10, 20, 6, 14, 16, 10].map((h, i) => (
                          <div
                            key={i}
                            className="w-[2.5px] bg-white/10 rounded-full"
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <div className="group h-full min-h-[280px] bg-[#111111] rounded-2xl p-7 border border-white/[0.06] hover:border-[#e74c3c]/25 transition-all duration-500 flex flex-col shadow-[0_2px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(231,76,60,0.08)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent pointer-events-none" />
              <div className="relative flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-5">
                  <ShieldCheck size={15} className="text-amber-400" />
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-[0.12em]">
                    Safety
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-text mb-2">
                  Allergen Safety.
                </h3>
                <p className="text-[13px] text-text-secondary mb-5 leading-relaxed font-light">
                  Filter by 10+ dietary frameworks. Know what&apos;s safe before you eat.
                </p>

                <div className="flex flex-wrap gap-2 mt-auto">
                  {dietaryFilters.map((filter) => (
                    <span
                      key={filter}
                      className="text-[10px] font-medium text-text-secondary bg-white/[0.04] rounded-lg px-2.5 py-1.5 border border-white/[0.06] hover:border-white/[0.12] hover:text-text transition-all duration-300 cursor-default"
                    >
                      {filter}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal className="bento-wide" delay={0.4}>
            <div className="group h-full bg-gradient-to-br from-[#e74c3c]/[0.08] via-purple-500/[0.04] to-[#111111] rounded-2xl p-7 border border-[#e74c3c]/10 hover:border-[#e74c3c]/25 transition-all duration-500 flex flex-col md:flex-row items-center gap-8 shadow-[0_2px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(231,76,60,0.08)]">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-5">
                  <Zap size={15} className="text-purple-400" />
                  <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-[0.12em]">
                    Intelligence
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-text mb-2">
                  Nutrient Density Reports.
                </h3>
                <p className="text-[13px] text-text-secondary leading-relaxed font-light max-w-md">
                  Automated analysis that transforms raw intake data into
                  actionable insights shared between athletes and coaches.
                </p>
              </div>
              <div className="shrink-0 w-48 h-28">
                <svg viewBox="0 0 200 110" className="w-full h-full">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity="0.2" />
                      <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,85 C25,78 45,65 70,60 C95,55 110,45 130,35 C150,25 170,18 200,12"
                    fill="none"
                    stroke="url(#chartGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0,85 C25,78 45,65 70,60 C95,55 110,45 130,35 C150,25 170,18 200,12 L200,110 L0,110 Z"
                    fill="url(#chartFill)"
                  />
                  <circle cx="200" cy="12" r="4" fill="#a855f7" />
                  <circle cx="200" cy="12" r="8" fill="#a855f7" opacity="0.15">
                    <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="130" cy="35" r="2.5" fill="#a855f7" opacity="0.5" />
                  <circle cx="70" cy="60" r="2.5" fill="#a855f7" opacity="0.3" />
                </svg>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

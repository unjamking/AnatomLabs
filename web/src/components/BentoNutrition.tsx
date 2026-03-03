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
  const color = value >= 90 ? "var(--color-success)" : value >= 75 ? "var(--color-info)" : "var(--color-warning)";
  return (
    <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden flex-1">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
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
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-text mb-6 leading-tight">
              Macro to Micro.
              <br />
              <span className="text-text-secondary font-medium">Every data point matters.</span>
            </h2>
            <p className="text-base text-text-tertiary max-w-lg mx-auto leading-relaxed">
              Most apps stop at calories. We decode 30+ micronutrients — every
              electrolyte, every vitamin, every mineral — to give you a complete
              biological picture.
            </p>
          </div>
        </ScrollReveal>

        <div className="bento-grid">
          <ScrollReveal className="bento-large" delay={0.1}>
            <div className="h-full bg-bg-card rounded-2xl p-7 border border-border card-depth hover:border-primary/20 transition-all duration-500 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-info via-info/30 to-transparent rounded-l-2xl" />
              <div className="flex items-center gap-2 mb-5">
                <Droplets size={15} className="text-info" />
                <span className="text-[11px] font-semibold text-info uppercase tracking-[0.1em]">
                  Full Spectrum
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-text mb-2">
                30+ Micronutrients.
              </h3>
              <p className="text-sm text-text-secondary mb-7 font-light">
                Every electrolyte. Every vitamin. Every mineral.
              </p>

              <div className="bg-bg rounded-xl p-5 border border-border space-y-3.5">
                {micronutrients.map((n) => (
                  <div key={n.name} className="flex items-center gap-3">
                    <span className="text-[11px] text-text-secondary w-16 shrink-0">
                      {n.name}
                    </span>
                    <ProgressBar value={n.pct} />
                    <span className="text-[11px] text-text font-medium w-14 text-right tabular-nums">
                      {n.value} {n.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="h-full min-h-[280px] bg-bg-card rounded-2xl p-7 border border-border card-depth hover:border-primary/20 transition-all duration-500 flex flex-col">
              <div className="flex items-center gap-2 mb-5">
                <Scan size={15} className="text-success" />
                <span className="text-[11px] font-semibold text-success uppercase tracking-[0.1em]">
                  Instant
                </span>
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-text mb-2">
                Barcode & Beyond.
              </h3>
              <p className="text-[13px] text-text-secondary mb-6 leading-relaxed font-light">
                Scan any product. Get complete micro breakdowns in under a second.
              </p>

              <div className="flex items-center justify-center flex-1">
                <div className="relative w-28 h-28">
                  <div className="absolute inset-0 border border-success/15 rounded-2xl" />
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-success rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-success rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-success rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-success rounded-br-lg" />
                  <div className="absolute top-1/2 left-3 right-3 h-[2px] bg-success/40 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex gap-[2px]">
                      {[12, 18, 8, 14, 10, 20, 6, 14, 16, 10].map((h, i) => (
                        <div
                          key={i}
                          className="w-[2.5px] bg-text/10 rounded-full"
                          style={{ height: `${h}px` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <div className="h-full min-h-[280px] bg-bg-card rounded-2xl p-7 border border-border card-depth hover:border-primary/20 transition-all duration-500 flex flex-col">
              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck size={15} className="text-warning" />
                <span className="text-[11px] font-semibold text-warning uppercase tracking-[0.1em]">
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
                    className="text-[10px] font-medium text-text-secondary bg-bg-card-light rounded-lg px-2.5 py-1 border border-border"
                  >
                    {filter}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal className="bento-wide" delay={0.4}>
            <div className="h-full bg-gradient-to-br from-primary/10 via-purple/5 to-bg-card rounded-2xl p-7 border border-primary/10 card-depth flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-5">
                  <Zap size={15} className="text-purple" />
                  <span className="text-[11px] font-semibold text-purple uppercase tracking-[0.1em]">
                    Intelligence
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-text mb-2">
                  Nutrient Density Reports.
                </h3>
                <p className="text-[13px] text-text-secondary leading-relaxed font-light">
                  Automated analysis that transforms raw intake data into
                  actionable insights shared between athletes and coaches.
                </p>
              </div>
              <div className="shrink-0 w-44 h-24">
                <svg viewBox="0 0 180 100" className="w-full h-full">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#9b59b6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#9b59b6" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,80 C30,70 50,40 80,45 C110,50 130,20 160,15 L180,10"
                    fill="none"
                    stroke="url(#chartGrad)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="160" cy="15" r="3.5" fill="#9b59b6" />
                  <circle cx="160" cy="15" r="7" fill="#9b59b6" opacity="0.15" />
                </svg>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

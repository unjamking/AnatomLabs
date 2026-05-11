"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Droplets, Scan, BarChart3 } from "lucide-react";

const micronutrientData = [
  { name: "Sodium", value: "2,145", unit: "mg", optimal: "3,300", status: "optimal" },
  { name: "Potassium", value: "3,420", unit: "mg", optimal: "4,700", status: "good" },
  { name: "Magnesium", value: "380", unit: "mg", optimal: "420", status: "optimal" },
  { name: "Vitamin D", value: "42", unit: "mcg", optimal: "60", status: "needs-improvement" },
  { name: "Zinc", value: "9.2", unit: "mg", optimal: "11", status: "good" },
  { name: "Vitamin K", value: "92", unit: "mcg", optimal: "120", status: "needs-improvement" },
];

function MicronutrientRow({ nutrient }: { nutrient: typeof micronutrientData[0] }) {
  const progress = Math.min(100, Math.max(0, (parseInt(nutrient.value.replace(/,/g, '')) / parseInt(nutrient.optimal)) * 100));

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-b-0">
      <span className="text-sm font-medium text-text w-24 shrink-0">{nutrient.name}</span>
      <div className="flex-1">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${nutrient.status === 'optimal' ? 'bg-green-500' : nutrient.status === 'good' ? 'bg-blue-500' : 'bg-amber-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        </div>
      </div>
      <div className="text-right min-w-[70px]">
        <div className="text-[10px] font-semibold text-text tabular-nums">{nutrient.value} <span className="text-text-tertiary">{nutrient.unit}</span></div>
        <div className="text-[10px] text-text-tertiary/60">Optimal: {nutrient.optimal} {nutrient.unit}</div>
      </div>
    </div>
  );
}

function NutritionCard() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6 }}
      className="relative h-full bg-[#111111] rounded-2xl p-8 border border-white/[0.06] hover:border-[#e74c3c]/20 transition-all duration-500 shadow-[0_4px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_60px_rgba(231,76,60,0.1)] overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.06] via-purple-500/[0.04] to-transparent group-hover:from-blue-500/[0.08] group-hover:via-purple-500/[0.06] transition-all duration-500 pointer-events-none" />

      <div className="relative flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <Droplets size={16} className="text-blue-400" />
          <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-[0.12em]">
            Deep Nutrition
          </span>
        </div>

        <h3 className="text-2xl font-semibold mb-3 text-text">Beyond Calories.</h3>
        <p className="text-sm text-text-secondary mb-6 leading-relaxed font-light">
          Most apps stop at macronutrients. We decode the micro — every vitamin, mineral, and electrolyte that drives biological performance.
        </p>

        <div className="flex-1 bg-[#0a0a0a] rounded-xl p-4 border border-white/[0.04]">
          {micronutrientData.map((nutrient, i) => (
            <MicronutrientRow key={i} nutrient={nutrient} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function NutritionShowcase() {
  return (
    <section className="relative py-24 bg-[#0a0a0a]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-2">
              The Deep Data
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              30+ Micronutrients.
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-3 px-5 py-3 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <BarChart3 size={16} className="text-green-400" />
            <span className="text-xs font-medium text-green-400">
              AI-Powered Analysis
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NutritionCard />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative h-full bg-gradient-to-br from-green-500/[0.08] via-[#111111] to-[#111111] rounded-2xl p-8 border border-green-500/10 hover:border-green-500/20 transition-all duration-500 flex flex-col justify-center"
          >
            <div className="absolute inset-0 bg-grid-diagonal-[rgba(255,255,255,0.02)]" />

            <div className="relative flex flex-col items-center text-center">
              <div className="relative w-32 h-32 mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-green-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-green-500/30" style={{ transform: 'rotate(45deg)' }} />
                <div className="absolute inset-0 rounded-full bg-green-500/5 flex items-center justify-center">
                  <Scan size={48} className="text-green-400" />
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2">Barcode & Beyond.</h3>
              <p className="text-sm text-text-secondary leading-relaxed max-w-sm">
                Scan any product. Get instant micronutrient breakdowns with full transparency. No more guessing what's in your food.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

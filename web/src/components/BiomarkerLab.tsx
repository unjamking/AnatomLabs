"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Activity, TrendingUp, FlaskConical } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dataPoints = [
  { x: 0, y: 72 },
  { x: 1, y: 65 },
  { x: 2, y: 70 },
  { x: 3, y: 78 },
  { x: 4, y: 82 },
  { x: 5, y: 88 },
];

function BiomarkerChart() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const width = 520;
  const height = 220;
  const padding = { top: 24, right: 24, bottom: 34, left: 44 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minY = 50;
  const maxY = 100;

  const scaleX = (i: number) => padding.left + (i / (dataPoints.length - 1)) * chartW;
  const scaleY = (v: number) => padding.top + chartH - ((v - minY) / (maxY - minY)) * chartH;

  const linePath = dataPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(p.x)},${scaleY(p.y)}`)
    .join(" ");

  const areaPath = `${linePath} L${scaleX(5)},${height - padding.bottom} L${scaleX(0)},${height - padding.bottom} Z`;

  return (
    <div ref={ref} className="w-full max-w-[560px] mx-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="bioAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bioLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <filter id="dotGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x={padding.left}
          y={scaleY(95)}
          width={chartW}
          height={scaleY(75) - scaleY(95)}
          fill="#22c55e"
          opacity="0.04"
          rx="4"
        />
        <line
          x1={padding.left}
          y1={scaleY(95)}
          x2={width - padding.right}
          y2={scaleY(95)}
          stroke="#22c55e"
          strokeWidth="0.5"
          strokeDasharray="4 3"
          opacity="0.2"
        />
        <line
          x1={padding.left}
          y1={scaleY(75)}
          x2={width - padding.right}
          y2={scaleY(75)}
          stroke="#22c55e"
          strokeWidth="0.5"
          strokeDasharray="4 3"
          opacity="0.2"
        />
        <text
          x={width - padding.right + 4}
          y={scaleY(85) + 3}
          className="text-[8px]"
          fill="#22c55e"
          opacity="0.4"
        >
          optimal
        </text>

        {[50, 60, 70, 80, 90, 100].map((v) => (
          <g key={v}>
            <line
              x1={padding.left}
              y1={scaleY(v)}
              x2={width - padding.right}
              y2={scaleY(v)}
              stroke="#1a1a1a"
              strokeWidth="0.5"
            />
            <text
              x={padding.left - 8}
              y={scaleY(v) + 4}
              textAnchor="end"
              className="text-[10px]"
              fill="#555"
            >
              {v}
            </text>
          </g>
        ))}

        {months.map((m, i) => (
          <text
            key={m}
            x={scaleX(i)}
            y={height - 8}
            textAnchor="middle"
            className="text-[10px]"
            fill="#555"
          >
            {m}
          </text>
        ))}

        <motion.path
          d={areaPath}
          fill="url(#bioAreaFill)"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.5 }}
        />

        <motion.path
          d={linePath}
          fill="none"
          stroke="url(#bioLineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : {}}
          transition={{ duration: 1.5, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        />

        {dataPoints.map((p, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.5 + i * 0.15, type: "spring", stiffness: 300, damping: 20 }}
          >
            <circle cx={scaleX(p.x)} cy={scaleY(p.y)} r="5" fill="#22c55e" opacity="0.15" filter="url(#dotGlow)" />
            <circle cx={scaleX(p.x)} cy={scaleY(p.y)} r="3.5" fill="#0a0a0a" stroke="#22c55e" strokeWidth="1.5" />
          </motion.g>
        ))}

        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.5, type: "spring", stiffness: 200, damping: 20 }}
        >
          <rect x={scaleX(5) - 48} y={scaleY(88) - 36} width="66" height="28" rx="10" fill="#22c55e" />
          <text x={scaleX(5) - 15} y={scaleY(88) - 18} textAnchor="middle" className="text-[11px] font-semibold" fill="#fff">
            88 mg/dL
          </text>
        </motion.g>
      </svg>
    </div>
  );
}

export default function BiomarkerLab() {
  return (
    <section id="biomarkers" className="relative py-32 md:py-40" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1a1a1a] to-transparent" />
      <div className="max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-20">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-5" style={{ color: "#22c55e" }}>
              Biomarker Lab
            </p>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]" style={{ color: "#f5f5f5" }}>
              Your lab results,
              <br />
              <span className="font-medium" style={{ color: "#888" }}>put to work.</span>
            </h2>
            <p className="text-base md:text-lg max-w-lg mx-auto leading-relaxed font-light" style={{ color: "#666" }}>
              Log biomarkers and see the direct impact of your nutrition on your
              biology. Track trends over months, not moments.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div
            className="rounded-3xl p-8 md:p-12"
            style={{
              backgroundColor: "#111111",
              border: "1px solid #1a1a1a",
              boxShadow: "0 0 80px rgba(34,197,94,0.03), 0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex flex-col md:flex-row items-start gap-8 mb-12">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "rgba(34,197,94,0.1)" }}
                  >
                    <FlaskConical size={15} style={{ color: "#22c55e" }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "#f5f5f5" }}>Magnesium Levels</span>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-5xl font-bold tracking-tight tabular-nums" style={{ color: "#f5f5f5" }}>88</span>
                  <span className="text-sm font-light" style={{ color: "#888" }}>mg/dL</span>
                  <div
                    className="flex items-center gap-1.5 ml-3 px-3 py-1.5 rounded-xl"
                    style={{ backgroundColor: "rgba(34,197,94,0.1)" }}
                  >
                    <TrendingUp size={12} style={{ color: "#22c55e" }} />
                    <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>+22%</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                {[
                  { label: "Optimal Range", value: "75–95", icon: Activity },
                  { label: "Data Points", value: "24", icon: FlaskConical },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl px-6 py-5"
                    style={{ backgroundColor: "#0a0a0a", border: "1px solid #1a1a1a" }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <stat.icon size={10} style={{ color: "#555" }} />
                      <span className="text-[10px] uppercase tracking-[0.1em] font-medium" style={{ color: "#555" }}>
                        {stat.label}
                      </span>
                    </div>
                    <span className="text-xl font-bold tabular-nums" style={{ color: "#f5f5f5" }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <BiomarkerChart />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

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
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
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
    <div ref={ref} className="w-full max-w-[540px] mx-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-success)" />
          </linearGradient>
        </defs>

        <rect
          x={padding.left}
          y={scaleY(95)}
          width={chartW}
          height={scaleY(75) - scaleY(95)}
          fill="var(--color-success)"
          opacity="0.04"
          rx="4"
        />
        <line
          x1={padding.left}
          y1={scaleY(95)}
          x2={width - padding.right}
          y2={scaleY(95)}
          stroke="var(--color-success)"
          strokeWidth="0.5"
          strokeDasharray="4 3"
          opacity="0.2"
        />
        <line
          x1={padding.left}
          y1={scaleY(75)}
          x2={width - padding.right}
          y2={scaleY(75)}
          stroke="var(--color-success)"
          strokeWidth="0.5"
          strokeDasharray="4 3"
          opacity="0.2"
        />
        <text
          x={width - padding.right + 2}
          y={scaleY(85) + 3}
          className="text-[8px]"
          fill="var(--color-success)"
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
              stroke="#2a2a2a"
              strokeWidth="0.5"
            />
            <text
              x={padding.left - 8}
              y={scaleY(v) + 4}
              textAnchor="end"
              className="text-[10px]"
              fill="var(--color-text-tertiary)"
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
            fill="var(--color-text-tertiary)"
          >
            {m}
          </text>
        ))}

        <motion.path
          d={areaPath}
          fill="url(#areaFill)"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.5 }}
        />

        <motion.path
          d={linePath}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="2"
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
            transition={{ delay: 0.5 + i * 0.12 }}
          >
            <circle cx={scaleX(p.x)} cy={scaleY(p.y)} r="3.5" fill="var(--color-bg)" stroke="var(--color-success)" strokeWidth="1.5" />
          </motion.g>
        ))}

        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.5 }}
        >
          <rect x={scaleX(5) - 45} y={scaleY(88) - 32} width="60" height="24" rx="8" fill="var(--color-success)" />
          <text x={scaleX(5) - 15} y={scaleY(88) - 16} textAnchor="middle" className="text-[11px] font-medium" fill="#fff">
            88 mg/dL
          </text>
        </motion.g>
      </svg>
    </div>
  );
}

export default function BiomarkerLab() {
  return (
    <section id="biomarkers" className="section-spacing section-bg-subtle relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="section-container">
        <ScrollReveal>
          <div className="text-center mb-20">
            <p className="text-xs font-semibold text-success uppercase tracking-[0.2em] mb-4">
              Biomarker Lab
            </p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-text mb-6 leading-tight">
              Your lab results,
              <br />
              <span className="text-text-secondary font-medium">put to work.</span>
            </h2>
            <p className="text-base text-text-tertiary max-w-lg mx-auto leading-relaxed">
              Log biomarkers and see the direct impact of your nutrition on your
              biology. Track trends over months, not moments.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="bg-bg-card rounded-2xl border border-border p-8 md:p-10 card-depth">
            <div className="flex flex-col md:flex-row items-start gap-6 mb-10">
              <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <FlaskConical size={14} className="text-success" />
                  </div>
                  <span className="text-sm font-semibold text-text">Magnesium Levels</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight text-text tabular-nums">88</span>
                  <span className="text-sm text-text-secondary font-light">mg/dL</span>
                  <div className="flex items-center gap-1 ml-2 bg-success/10 px-2.5 py-1 rounded-lg">
                    <TrendingUp size={11} className="text-success" />
                    <span className="text-xs font-semibold text-success">+22%</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {[
                  { label: "Optimal Range", value: "75–95", icon: Activity },
                  { label: "Data Points", value: "24", icon: FlaskConical },
                ].map((stat) => (
                  <div key={stat.label} className="bg-bg rounded-xl px-5 py-4 border border-border">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <stat.icon size={10} className="text-text-tertiary" />
                      <span className="text-[10px] text-text-tertiary uppercase tracking-[0.08em] font-medium">
                        {stat.label}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-text tabular-nums">{stat.value}</span>
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

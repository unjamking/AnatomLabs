"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FileText, Calendar, BarChart3, Users, TrendingUp, Download } from "lucide-react";

const reports = [
  {
    title: "Daily Digest",
    description: "Comprehensive overview of your day's performance, including workouts, nutrition, recovery, and insights.",
    icon: Calendar,
    frequency: "Daily",
    color: "from-blue-500",
  },
  {
    title: "Weekly Summary",
    description: "Deep dive into your week's patterns with trend analysis, peak performance identification, and optimization tips.",
    icon: BarChart3,
    frequency: "Weekly",
    color: "from-green-500",
  },
  {
    title: "Monthly Review",
    description: "Month-long performance analysis showing progress trends, goal achievements, and strategic recommendations.",
    icon: FileText,
    frequency: "Monthly",
    color: "from-purple-500",
  },
];

function ReportCard({ report }: { report: typeof reports[0] }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay: (reports.indexOf(report) * 0.1) }}
      className="group relative bg-[#111111] rounded-2xl p-7 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 shadow-[0_2px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1"
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-${report.color.split('-')[1]}-500/[0.03] via-[#111111] to-[#111111] group-hover:from-${report.color.split('-')[1]}-500/[0.06] transition-all duration-500`} />

      <div className="relative flex items-start gap-4 mb-5">
        <div className="p-3 rounded-xl bg-white/[0.04] group-hover:opacity-100 transition-opacity" >
          <report.icon size={22} className="text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-text">{report.title}</h3>
            <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
              {report.frequency}
            </span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed font-light">
            {report.description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-400">✓</span>
          <TrendingUp size={14} className="text-purple-400" />
        </div>
        <button className="group/btn p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-300">
          <Download size={16} className="text-text-secondary group-hover/btn:text-text" />
        </button>
      </div>
    </motion.div>
  );
}

export default function Reports() {
  return (
    <section id="science" className="section-spacing relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20 max-w-2xl mx-auto"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-5">
            Advanced Analytics
          </p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Insights That Drive
            <br />
            Performance.
          </h2>
          <p className="text-xl text-text-secondary max-w-lg mx-auto leading-relaxed font-light">
            Transform your data into actionable intelligence. Shareable reports for coaches,
            training partners, and self-reflection.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reports.map((report, i) => (
            <ReportCard key={i} report={report} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-16 p-8 bg-gradient-to-br from-[#e74c3c]/[0.08] via-[#a855f7]/[0.04] to-[#111111] rounded-2xl border border-[#e74c3c]/10 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-grid-diagonal-[rgba(255,255,255,0.02)]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/0.1 to-transparent" />

          <h3 className="relative text-2xl font-bold mb-3">Share Your Progress</h3>
          <p className="relative text-text-secondary max-w-xl mx-auto mb-6 leading-relaxed">
            Generate reports to share with coaches, training partners, or document your
            journey. Every insight, every achievement.
          </p>

          <div className="flex flex-wrap justify-center gap-3 relative">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-text hover:border-white/[0.12] transition-colors cursor-default">
              <Calendar size={14} className="text-blue-400" />
              <span>PDF Export</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-text hover:border-white/[0.12] transition-colors cursor-default">
              <FileText size={14} className="text-purple-400" />
              <span>CSV Download</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-text hover:border-white/[0.12] transition-colors cursor-default">
              <Users size={14} className="text-green-400" />
              <span>Coach Share</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

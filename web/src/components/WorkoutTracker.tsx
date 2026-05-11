"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Dumbbell, Clock, TrendingUp, CheckCircle } from "lucide-react";

const workouts = [
  {
    id: "w001",
    name: "Lower Body Power",
    date: "Today",
    sets: 12,
    duration: "58 min",
    intensity: 82,
    status: "completed",
  },
  {
    id: "w002",
    name: "Upper Body Hypertrophy",
    date: "Yesterday",
    sets: 16,
    duration: "72 min",
    intensity: 88,
    status: "completed",
  },
  {
    id: "w003",
    name: "Rest & Recovery",
    date: "2 days ago",
    sets: 0,
    duration: "—",
    intensity: 0,
    status: "rest",
  },
];

function WorkoutItem({ workout }: { workout: typeof workouts[0] }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className="group relative bg-[#111111] rounded-xl p-4 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
    >
      <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${
        workout.status === "completed" ? "from-green-500 to-green-400" : "from-blue-500 to-blue-400"
      }`} />

      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-text">{workout.name}</h4>
        <span className="text-xs text-text-tertiary">{workout.date}</span>
      </div>

      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <div className="flex items-center gap-2">
          <Dumbbell size={12} className="text-text-secondary" />
          <span>{workout.sets} sets</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-text-secondary" />
          <span>{workout.duration}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor:
                workout.status === "completed"
                  ? "#22c55e"
                  : workout.status === "rest"
                    ? "#3b82f6"
                    : "#a855f7",
            }}
          />
          <span className="text-xs text-text-tertiary">
            {workout.status === "completed" ? "Completed" : workout.status === "rest" ? "Rest Day" : "Scheduled"}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-green-400 tabular-nums">{workout.intensity}%</div>
          <div className="text-[10px] text-text-tertiary/60">Intensity</div>
        </div>
      </div>
    </motion.div>
  );
}

function ProgressBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-4 bg-white/[0.02] rounded-xl border border-white/[0.04]">
      <div className="text-2xl font-bold text-text tabular-nums mb-1">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary/60">{label}</div>
    </div>
  );
}

export default function WorkoutTracker() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="relative py-24 bg-[#0a0a0a]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-2">
                  Today&apos;s Focus
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-text">
                  Push Your Limits.
                </h2>
              </div>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative px-6 py-3 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all duration-300 shadow-[0_0_20px_rgba(231,76,60,0.3)] hover:shadow-[0_0_30px_rgba(231,76,60,0.4)]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Workout
                  <motion.span
                    className="inline-block"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    →
                  </motion.span>
                </span>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 via-transparent to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.button>
            </div>

            <div className="flex items-center gap-4">
              <WorkoutItem workout={workouts[0]} />
              <WorkoutItem workout={workouts[1]} />
              <WorkoutItem workout={workouts[2]} />
            </div>
          </div>

          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-full bg-gradient-to-br from-green-500/[0.06] via-[#111111] to-[#111111] rounded-2xl p-7 border border-green-500/10 hover:border-green-500/20 transition-all duration-500 flex flex-col"
          >
            <div className="absolute inset-0 bg-grid-diagonal-[rgba(255,255,255,0.02)]" />

            <div className="relative flex items-center gap-2 mb-6">
              <Dumbbell size={18} className="text-green-400" />
              <h3 className="text-xl font-semibold">Progress Tracking</h3>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-3 mb-6">
              <ProgressBadge value="128" label="Sessions" />
              <ProgressBadge value="3.2k" label="Lifted" />
              <ProgressBadge value="14" label="PRs" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp size={16} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-text">Consistency Score</div>
                  <div className="text-lg font-bold text-green-400">92%</div>
                </div>
                <CheckCircle size={16} className="text-green-400 shrink-0" />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Clock size={16} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-text">Avg Session</div>
                  <div className="text-lg font-bold text-white">1h 12m</div>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/[0.06]">
              <button className="w-full py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-text hover:bg-white/[0.12] transition-colors">
                View Full History
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

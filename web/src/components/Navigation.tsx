"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Coaches", href: "#coaches" },
  { label: "Science", href: "#science" },
  { label: "Download", href: "#download" },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#0a0a0a]/70 backdrop-blur-3xl border-b border-white/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.5)]"
            : "bg-transparent"
        }`}
      >
        <div className="section-container h-[72px] flex items-center justify-between">
          <a href="#" className="flex items-center gap-0.5 group">
            <span className="text-lg font-bold tracking-tight text-text transition-colors duration-300">
              Anatom
            </span>
            <span className="text-lg font-bold tracking-tight text-primary transition-colors duration-300">
              Labs
            </span>
            <span className="text-lg font-light text-text-secondary/60 transition-colors duration-300 group-hover:text-text-secondary">
              +
            </span>
          </a>

          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="relative text-[13px] tracking-wide uppercase text-text-secondary hover:text-text transition-colors duration-300 py-1"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#download"
              className="group inline-flex items-center gap-2 text-[13px] bg-primary/90 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-primary transition-all duration-300 hover:shadow-[0_0_30px_rgba(231,76,60,0.3)] active:scale-95"
            >
              Get the App
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.06] text-text"
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              {mobileOpen ? (
                <motion.div
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={18} />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={18} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-[#0a0a0a]/98 backdrop-blur-3xl pt-24 px-8 md:hidden"
          >
            <div className="flex flex-col gap-2">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.08, duration: 0.3, ease: "easeOut" }}
                  className="text-3xl font-semibold text-text py-5 border-b border-white/[0.06] active:text-primary transition-colors duration-200"
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.a
                href="#download"
                onClick={() => setMobileOpen(false)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: navLinks.length * 0.08 + 0.1, duration: 0.3 }}
                className="mt-8 text-center text-lg bg-primary text-white py-4 rounded-2xl font-semibold hover:bg-primary-dark transition-colors duration-300 shadow-[0_0_40px_rgba(231,76,60,0.2)]"
              >
                Get the App
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

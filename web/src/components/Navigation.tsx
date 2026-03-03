"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Nutrition", href: "#nutrition" },
  { label: "Marketplace", href: "#marketplace" },
  { label: "Biomarkers", href: "#biomarkers" },
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

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          scrolled
            ? "bg-bg/80 backdrop-blur-2xl border-b border-border"
            : "bg-transparent"
        }`}
      >
        <div className="section-container h-16 flex items-center justify-between">
          <a href="#" className="text-base font-bold tracking-tight text-text">
            Anatom<span className="text-primary">Labs</span>
            <span className="font-light text-text-secondary">+</span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-text-secondary hover:text-text transition-colors duration-300"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#download"
              className="text-sm bg-primary text-white px-5 py-2 rounded-full font-medium hover:bg-primary-dark transition-colors duration-300"
            >
              Get the App
            </a>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-1 text-text"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-bg/95 backdrop-blur-2xl pt-20 px-6 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-2xl font-semibold text-text py-4 border-b border-border active:text-primary active:translate-x-1 transition-all duration-200"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#download"
                onClick={() => setMobileOpen(false)}
                className="mt-6 text-center text-lg bg-primary text-white py-3.5 rounded-xl font-semibold"
              >
                Get the App
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

const footerLinks = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#nutrition" },
      { label: "Marketplace", href: "#marketplace" },
      { label: "Biomarkers", href: "#biomarkers" },
      { label: "Pricing", href: "#" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Coach Applications", href: "#" },
      { label: "API Documentation", href: "#" },
      { label: "Research", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "HIPAA Compliance", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  },
];

const socials = [
  {
    name: "Twitter",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4l11.733 16h4.267l-11.733-16zM4 20l6.768-6.768M13.232 11.232L20 4" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="relative" style={{ backgroundColor: "#0a0a0a" }}>
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, #e74c3c33, #22c55e22, transparent)",
        }}
      />

      <div className="max-w-6xl mx-auto px-6 pt-20 pb-14">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-10 md:gap-12 mb-16">
          <div className="col-span-2 sm:col-span-4 md:col-span-1">
            <a href="#" className="text-base font-semibold tracking-tight" style={{ color: "#f5f5f5" }}>
              Anatom<span style={{ color: "#e74c3c" }}>Labs</span>
              <span className="font-light" style={{ color: "#666" }}>+</span>
            </a>
            <p className="text-xs mt-4 leading-relaxed max-w-[200px]" style={{ color: "#555" }}>
              The human performance science platform.
            </p>
          </div>

          {footerLinks.map((group) => (
            <div key={group.heading}>
              <h4
                className="text-[11px] font-medium uppercase tracking-[0.12em] mb-6"
                style={{ color: "#888" }}
              >
                {group.heading}
              </h4>
              <ul className="space-y-3.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs transition-colors duration-300"
                      style={{ color: "#555" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#f5f5f5"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#555"; }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-5"
          style={{ borderTop: "1px solid #1a1a1a" }}
        >
          <p className="text-[11px]" style={{ color: "#444" }}>
            &copy; 2026 AnatomLabs Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {socials.map((social) => (
              <a
                key={social.name}
                href={social.href}
                aria-label={social.name}
                className="transition-colors duration-300"
                style={{ color: "#444" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#f5f5f5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#444"; }}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

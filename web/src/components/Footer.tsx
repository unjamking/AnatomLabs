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

export default function Footer() {
  return (
    <footer className="bg-bg relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="section-container pt-16 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-8 md:gap-10 mb-14">
          <div className="col-span-2 sm:col-span-4 md:col-span-1">
            <a href="#" className="text-sm font-semibold tracking-tight text-text">
              Anatom<span className="text-primary">Labs</span>
              <span className="font-light text-text-secondary">+</span>
            </a>
            <p className="text-xs text-text-tertiary mt-3 leading-relaxed max-w-[180px]">
              The human performance science platform.
            </p>
          </div>

          {footerLinks.map((group) => (
            <div key={group.heading}>
              <h4 className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.1em] mb-5">
                {group.heading}
              </h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs text-text-tertiary hover:text-text transition-colors duration-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-text-tertiary">
            &copy; 2026 AnatomLabs Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {["Twitter", "Instagram", "LinkedIn"].map((social) => (
              <a
                key={social}
                href="#"
                className="text-[11px] text-text-tertiary hover:text-text transition-colors duration-300"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

import { Link } from "wouter";
import { BrainCircuit } from "lucide-react";

const LINKS: { heading: string; items: { label: string; href: string }[] }[] = [
  {
    heading: "Platform",
    items: [
      { label: "Assessments", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Profile", href: "/profile" },
    ],
  },
  {
    heading: "Company",
    items: [
      { label: "About", href: "/" },
      { label: "Careers", href: "/" },
      { label: "Contact", href: "/" },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Privacy", href: "/" },
      { label: "Terms", href: "/" },
      { label: "Security", href: "/" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative z-10 mt-auto border-t border-border/60 bg-background/60 backdrop-blur">
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-primary">
              <BrainCircuit className="h-5 w-5" />
              <span>Arvencor</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              AI-driven technical assessments calibrated for senior engineering talent.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 font-mono text-[11px] text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              All systems operational
            </div>
          </div>

          {LINKS.map((col) => (
            <div key={col.heading}>
              <h4 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {col.heading}
              </h4>
              <ul className="mt-3 space-y-2">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row">
          <p className="font-mono text-xs text-muted-foreground">
            © {new Date().getFullYear()} Arvencor. All rights reserved.
          </p>
          <p className="font-mono text-[11px] text-muted-foreground/70">
            SENIOR_ASSESSMENT_PROTOCOL // v3.0
          </p>
        </div>
      </div>
    </footer>
  );
}

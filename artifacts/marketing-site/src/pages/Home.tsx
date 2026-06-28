import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { MapPin, Ticket, Search, Calendar, QrCode, Users, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";

// ── Design System Tokens ───────────────────────────────────────────────────────

// Spacing scale (8-point grid)
const SP = { xs: 8, sm: 16, md: 24, lg: 32, xl: 48, xxl: 64, section: 96 } as const;

// Radius system — 3 levels + pill
const R = {
  xs:   8,    // inline badges, store buttons
  sm:   12,   // icon boxes, nav logo, tags
  md:   16,   // cards, all grids
  lg:   24,   // containers, CTA block, featured panels
  pill: 9999, // buttons, pills
} as const;

// Shadow system — 3 levels only
const SH = {
  subtle:   "0 1px 4px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.18)",
  medium:   "0 4px 24px rgba(0,0,0,0.4), 0 1px 6px rgba(0,0,0,0.18)",
  elevated: "0 8px 40px rgba(0,0,0,0.55), 0 2px 12px rgba(0,0,0,0.25)",
} as const;

// Special: primary CTA glow (brand color only, used once — main CTA button)
const SH_PRIMARY = "0 4px 20px rgba(124,58,237,0.4), 0 1px 4px rgba(0,0,0,0.2)";

// Background levels
const BG = {
  card:     "rgba(255,255,255,0.06)",
  elevated: "rgba(255,255,255,0.035)",
  section:  "rgba(0,0,0,0.13)",
  deep:     "linear-gradient(135deg, rgba(14,6,40,0.99) 0%, rgba(22,10,56,0.99) 100%)",
} as const;

// Typography
const TEXT = {
  secondary: "rgba(255,255,255,0.45)",
  tertiary:  "rgba(255,255,255,0.28)",
  accent:    "#c084fc",
} as const;

// Card padding — two sizes, used consistently
const PAD_CARD = `${SP.md}px ${SP.md}px`;       // 24 24 — feature/why cards
const PAD_PANEL = `${SP.lg}px ${SP.md + SP.xs}px`; // 32 20 — featured panels, how-it-works
// ──────────────────────────────────────────────────────────────────────────────

function InstagramLogo({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function TikTokLogo({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
    </svg>
  );
}

const base = import.meta.env.BASE_URL;

const screens = [
  { src: `${base}screens/events-feed.jpg`, label: "Events Feed" },
  { src: `${base}screens/search.jpg`, label: "Discover Events" },
  { src: `${base}screens/map.jpg`, label: "Campus Map" },
  { src: `${base}screens/tickets.jpg`, label: "My Tickets" },
  { src: `${base}screens/profile.jpg`, label: "Organization Profile" },
];

const PHONE_W = 368;
const PHONE_H = 796;

function IPhoneMockup() {
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [phoneScale, setPhoneScale] = useState(1);
  const [phase, setPhase] = useState<"home"|"opening"|"app">("home");
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      if (vw < 1024) {
        const available = Math.min(vw - 48, 420);
        setPhoneScale(Math.min(1, available / PHONE_W));
      } else {
        setPhoneScale(1);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const goTo = (idx: number) => {
    setCurrent(Math.max(0, Math.min(screens.length - 1, idx)));
    setOffsetX(0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setStartX(e.clientX);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffsetX(e.clientX - startX);
  };

  const onPointerUp = () => {
    if (Math.abs(offsetX) > 40) {
      if (offsetX < 0 && current < screens.length - 1) goTo(current + 1);
      else if (offsetX > 0 && current > 0) goTo(current - 1);
      else setOffsetX(0);
    } else {
      setOffsetX(0);
    }
    setDragging(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!dragging && phase === "app") setCurrent(c => (c + 1) % screens.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [dragging, phase]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("opening"), 4800);
    const t2 = setTimeout(() => setPhase("app"),     5850);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const translateX = (-current * 100) + (offsetX / 2.8);
  const scaledH = PHONE_H * phoneScale;
  const scaledW = PHONE_W * phoneScale;

  return (
    <div className="flex flex-col items-center select-none" style={{ width: scaledW }}>
      <div style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${phoneScale})`, transformOrigin: "top center", marginBottom: -(PHONE_H - scaledH), flexShrink: 0 }}>
        <div style={{ width: PHONE_W, height: PHONE_H, background: "linear-gradient(145deg, #1c1c1e 0%, #111 60%, #0a0a0a 100%)", borderRadius: 54, padding: 6, boxShadow: "0 0 0 1.5px #3a3a3c, 0 60px 140px rgba(0,0,0,0.98), 0 0 60px rgba(140,60,240,0.32), 0 0 120px rgba(130,50,230,0.18), 0 0 200px rgba(120,40,220,0.09), inset 0 1px 0 rgba(255,255,255,0.08)", position: "relative" }}>
          <div style={{ position: "absolute", left: -3, top: 110, width: 3, height: 36, background: "#2a2a2e", borderRadius: "2px 0 0 2px" }} />
          <div style={{ position: "absolute", left: -3, top: 160, width: 3, height: 68, background: "#2a2a2e", borderRadius: "2px 0 0 2px" }} />
          <div style={{ position: "absolute", left: -3, top: 240, width: 3, height: 68, background: "#2a2a2e", borderRadius: "2px 0 0 2px" }} />
          <div style={{ position: "absolute", right: -3, top: 180, width: 3, height: 96, background: "#2a2a2e", borderRadius: "0 2px 2px 0" }} />
          <div style={{ width: "100%", height: "100%", borderRadius: 49, overflow: "hidden", background: "#000", position: "relative" }}>
            <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", width: 110, height: 32, background: "#000", borderRadius: 22, zIndex: 10, boxShadow: "0 0 0 1px #1c1c1e" }} />
            <div
              ref={trackRef}
              style={{ display: "flex", width: `${screens.length * 100}%`, height: "100%", transform: `translateX(${translateX / screens.length}%)`, transition: dragging ? "none" : "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)", cursor: dragging ? "grabbing" : "grab" }}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            >
              {screens.map((s, i) => (
                <div key={i} style={{ width: `${100 / screens.length}%`, flexShrink: 0, height: "100%", background: "#000" }}>
                  <img src={s.src} alt={s.label} style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", pointerEvents: "none", userSelect: "none" }} draggable={false} />
                </div>
              ))}
            </div>
            {phase !== "app" && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 10,
                backgroundImage: `url(${base}wallpaper.png)`,
                backgroundSize: "cover", backgroundPosition: "center top",
                overflow: "hidden", pointerEvents: "none",
                opacity: phase === "home" ? 1 : undefined,
                animation: phase === "opening" ? "gatedScreenFade 1.0s cubic-bezier(0.4,0,0.2,1) forwards" : "none",
              }}>
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,12,0.14)" }} />
                {/* Status bar — top:14 aligns exactly with the dynamic island row */}
                <div style={{ position: "absolute", top: 14, left: 0, right: 0, height: 32, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 26, paddingRight: 26 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px", textShadow: "0 1px 4px rgba(0,0,0,0.35)" }}>2:20</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 11 }}>
                      {[5, 8, 11].map((h, i) => (
                        <div key={i} style={{ width: 3, height: h, borderRadius: 1, background: "#fff" }} />
                      ))}
                    </div>
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                      <circle cx="8" cy="11" r="1.5" fill="white"/>
                      <path d="M4.5 8a5 5 0 017 0" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M1.5 5a9 9 0 0113 0" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ width: 23, height: 11, borderRadius: 3, border: "1.5px solid rgba(255,255,255,0.65)", position: "relative" }}>
                        <div style={{ position: "absolute", inset: "1.5px 2px", background: "#fff", borderRadius: 1.5 }} />
                      </div>
                      <div style={{ width: 2, height: 5, background: "rgba(255,255,255,0.55)", borderRadius: "0 1px 1px 0" }} />
                    </div>
                  </div>
                </div>
                {/* Gated icon — large, top-left, absolute so position is pixel-precise */}
                <div style={{
                  position: "absolute", top: 88, left: 28,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  transformOrigin: "center center",
                  animation: phase === "opening" ? "gatedIconOpen 1.0s cubic-bezier(0.4,0,0.2,1) forwards" : "none",
                }}>
                  <img src={`${base}logo.png`} alt="Gated" style={{ width: 108, height: 108, objectFit: "contain", filter: "drop-shadow(0 0 16px rgba(148,60,240,0.7)) drop-shadow(0 3px 10px rgba(0,0,0,0.6))", marginBottom: 4 }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#fff", letterSpacing: "0.01em", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>Gated</span>
                </div>
                {/* Home indicator */}
                <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", width: 130, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.25)" }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Label + dots + controls — consistent SP spacing */}
      <div style={{ marginTop: SP.sm, color: TEXT.secondary, fontSize: 13, fontWeight: 500, letterSpacing: "0.02em" }}>{screens[current].label}</div>
      <div className="flex gap-2" style={{ marginTop: SP.xs }}>
        {screens.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} style={{ width: i === current ? 20 : 6, height: 6, borderRadius: 3, background: i === current ? "#a855f7" : "rgba(255,255,255,0.2)", transition: "all 0.3s ease", border: "none", cursor: "pointer", padding: 0 }} />
        ))}
      </div>
      <div className="flex gap-3" style={{ marginTop: SP.xs + 4 }}>
        <button onClick={() => goTo(current - 1)} disabled={current === 0} style={{ width: 32, height: 32, borderRadius: R.pill, display: "flex", alignItems: "center", justifyContent: "center", background: BG.elevated, color: TEXT.secondary, border: "none", cursor: "pointer", opacity: current === 0 ? 0.2 : 1, transition: "opacity 0.2s" }}>
          <ChevronLeft size={15} />
        </button>
        <button onClick={() => goTo(current + 1)} disabled={current === screens.length - 1} style={{ width: 32, height: 32, borderRadius: R.pill, display: "flex", alignItems: "center", justifyContent: "center", background: BG.elevated, color: TEXT.secondary, border: "none", cursor: "pointer", opacity: current === screens.length - 1 ? 0.2 : 1, transition: "opacity 0.2s" }}>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll("[data-sr]");
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("sr-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Community", href: "#social" },
    { label: "Contact Us", href: "mailto:support@gatedapp.us" },
  ];

  // Shared section header layout
  const SectionHeader = ({ eyebrow, title, subtitle, center = true }: { eyebrow?: string; title: string; subtitle?: string; center?: boolean }) => (
    <div style={{ textAlign: center ? "center" : "left", marginBottom: SP.xxl }}>
      {eyebrow && (
        <div style={{ display: "inline-block", background: "rgba(168,85,247,0.1)", borderRadius: R.pill, padding: "4px 14px", fontSize: 12, color: TEXT.accent, fontWeight: 600, marginBottom: SP.sm, letterSpacing: "0.04em" }}>
          {eyebrow}
        </div>
      )}
      <h2 style={{ fontSize: "clamp(1.8rem, 4.5vw, 2.8rem)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: SP.sm, lineHeight: 1.1 }}>{title}</h2>
      {subtitle && <p style={{ color: TEXT.secondary, fontSize: "clamp(14px, 3vw, 16px)", maxWidth: 480, margin: center ? "0 auto" : "0", lineHeight: 1.75 }}>{subtitle}</p>}
    </div>
  );

  return (
    <div style={{ background: "radial-gradient(ellipse 55% 55% at 72% 28%, rgba(148,60,240,0.28) 0%, transparent 65%), linear-gradient(180deg, #0c0428 0%, #180c55 12%, #2a1568 30%, #3b1d7a 48%, #281363 68%, #150840 85%, #0c0430 100%)", minHeight: "100vh", color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes gatedFadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gatedFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes gatedGlowBloom {
          0%   { opacity: 0; }
          45%  { opacity: 1; }
          72%  { opacity: 0.6; }
          100% { opacity: 0.8; }
        }
        @keyframes gatedPhoneReveal {
          from { opacity: 0; transform: translateY(72px) scale(0.93); filter: blur(5px); }
          to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
        }
        @keyframes gatedDividerReveal {
          from { transform: scaleX(0); opacity: 0; }
          to   { transform: scaleX(1); opacity: 1; }
        }
        @keyframes gatedIconOpen {
          0%   { transform: scale(1); }
          20%  { transform: scale(1.05); }
          100% { transform: scale(2.0); }
        }
        @keyframes gatedScreenFade {
          0%   { opacity: 1; }
          18%  { opacity: 1; }
          100% { opacity: 0; }
        }
        .gated-phone-inner {
          transition: transform 0.5s cubic-bezier(0.22,1,0.36,1);
        }
        .gated-screens:hover .gated-phone-inner {
          transform: translateY(-6px);
        }
        .gated-phone-glow {
          transition: opacity 0.5s cubic-bezier(0.22,1,0.36,1);
        }
        .gated-screens:hover .gated-phone-glow {
          opacity: 1 !important;
        }
        [data-sr] > * {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.75s cubic-bezier(0.22,1,0.36,1), transform 0.75s cubic-bezier(0.22,1,0.36,1);
        }
        [data-sr].sr-visible > * { opacity: 1; transform: translateY(0); }
        [data-sr].sr-visible > *:nth-child(2) { transition-delay: 0.1s; }
        [data-sr].sr-visible > *:nth-child(3) { transition-delay: 0.2s; }
        [data-sr].sr-visible > *:nth-child(4) { transition-delay: 0.3s; }
        [data-sr].sr-visible > *:nth-child(5) { transition-delay: 0.38s; }
        @media (prefers-reduced-motion: reduce) {
          [data-sr] > * { opacity: 1; transform: none; transition: none; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, transition: "background 0.3s, box-shadow 0.3s", background: navScrolled || mobileMenuOpen ? "rgba(18,8,52,0.92)" : "transparent", backdropFilter: navScrolled || mobileMenuOpen ? "blur(24px)" : "none", boxShadow: navScrolled ? SH.subtle : "none" }}>
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between" style={{ paddingTop: SP.sm, paddingBottom: SP.sm }}>
          <div className="flex items-center" style={{ gap: 6 }}>
            <img src={`${base}logo.png`} alt="Gated" style={{ width: 56, height: 56, objectFit: "contain", flexShrink: 0 }} />
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px" }}>Gated</span>
          </div>

          <div className="hidden md:flex items-center" style={{ gap: SP.xl }}>
            {navLinks.map(l => (
              <a key={l.label} href={l.href} style={{ color: TEXT.secondary, fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.color = "#fff")} onMouseLeave={e => (e.currentTarget.style.color = TEXT.secondary)}>{l.label}</a>
            ))}
          </div>

          <a href="https://testflight.apple.com/join/mf7CCamE" target="_blank" rel="noopener noreferrer" className="hidden md:inline-flex" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", padding: "10px 22px", borderRadius: R.pill, fontSize: 14, fontWeight: 600, textDecoration: "none", boxShadow: SH_PRIMARY, transition: "transform 0.2s" }} onMouseEnter={e => { (e.target as HTMLElement).style.transform = "scale(1.04)"; }} onMouseLeave={e => { (e.target as HTMLElement).style.transform = "scale(1)"; }}>
            Download Beta
          </a>

          <button className="md:hidden flex items-center justify-center" style={{ width: 38, height: 38, background: BG.card, borderRadius: R.sm, color: TEXT.secondary, border: "none", cursor: "pointer" }} onClick={() => setMobileMenuOpen(o => !o)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden px-5 pb-5 flex flex-col" style={{ gap: SP.xs, paddingTop: SP.xs }}>
            {navLinks.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMobileMenuOpen(false)} style={{ padding: "12px 16px", borderRadius: R.md, fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", textDecoration: "none", background: BG.card, display: "block" }}>{l.label}</a>
            ))}
            <a href="https://testflight.apple.com/join/mf7CCamE" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)} style={{ marginTop: SP.xs, display: "block", textAlign: "center", background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", padding: "14px 22px", borderRadius: R.pill, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: SH_PRIMARY }}>
              Download Beta
            </a>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-3xl mx-auto px-5 flex flex-col items-center text-center" style={{ gap: SP.xl, paddingTop: SP.xxl, paddingBottom: SP.xl }}>
        <div style={{ width: "100%", textAlign: "center", position: "relative" }}>
          <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: 560, height: 260, background: "radial-gradient(ellipse, rgba(124,58,237,0.13) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0, animation: "gatedGlowBloom 2.2s cubic-bezier(0.22,1,0.36,1) 0s forwards" }} />
          <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 3.75rem)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-2px", marginBottom: SP.md + 4, position: "relative", zIndex: 1 }}>
            <span style={{ display: "inline-block", animation: "gatedFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}>Unlock</span>{" "}
            <span style={{ display: "inline-block", animation: "gatedFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.26s both" }}>Your</span>
            <br />
            <span style={{ background: "linear-gradient(90deg, #c084fc, #a855f7, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block", paddingRight: "0.06em", paddingBottom: "0.05em", animation: "gatedFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.42s both" }}>
              Campus.
            </span>
          </h1>
          <div style={{ width: 240, height: 1, background: "rgba(200,190,255,0.18)", margin: `${SP.lg}px auto`, transformOrigin: "center", animation: "gatedDividerReveal 1.0s cubic-bezier(0.22,1,0.36,1) 0.55s both" }} />
          <div className="flex flex-col sm:flex-row gap-3 justify-center" style={{ marginTop: SP.xl, position: "relative", zIndex: 1, animation: "gatedFadeUp 0.65s cubic-bezier(0.22,1,0.36,1) 1.65s both" }}>
            <a href="https://testflight.apple.com/join/mf7CCamE" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", padding: "14px 28px", borderRadius: R.pill, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: SH_PRIMARY }}>
              Download Beta
            </a>
            <a href="#screens" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: BG.card, color: "rgba(255,255,255,0.75)", padding: "14px 28px", borderRadius: R.pill, fontSize: 15, fontWeight: 500, textDecoration: "none", backdropFilter: "blur(10px)" }}>
              See it in action
            </a>
          </div>
        </div>
        <div id="screens" className="flex justify-center gated-screens" style={{ width: "100%", position: "relative", animation: "gatedPhoneReveal 1.3s cubic-bezier(0.22,1,0.36,1) 2.65s both" }}>
          <div className="gated-phone-glow" style={{ position: "absolute", inset: "-8% -6%", background: "radial-gradient(ellipse 52% 68% at 50% 46%, rgba(180,100,255,0.42) 0%, rgba(148,60,240,0.26) 20%, rgba(120,40,220,0.12) 46%, rgba(90,20,200,0.04) 68%, transparent 84%)", filter: "blur(18px)", pointerEvents: "none", zIndex: 0, opacity: 0.88, animation: "gatedGlowBloom 1.8s cubic-bezier(0.22,1,0.36,1) 1.3s forwards" }} />
          <div className="gated-phone-inner" style={{ position: "relative", zIndex: 1 }}>
            <IPhoneMockup />
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.25)", backdropFilter: "blur(24px)" }}>
        <div className="max-w-5xl mx-auto px-5 grid grid-cols-3" style={{ paddingTop: SP.lg, paddingBottom: SP.lg }}>
          {[
            { value: "100%", label: "Revenue to orgs" },
            { value: "$0", label: "Platform fees ever" },
            { value: "iOS", label: "Beta live now" },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center text-center" style={{ borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
              <div style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 900, letterSpacing: "-2px", background: "linear-gradient(135deg, #e9d5ff, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: TEXT.tertiary, marginTop: 5, fontWeight: 500, letterSpacing: "0.02em" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES BENTO ── */}
      <section id="features" className="max-w-6xl mx-auto px-5" style={{ paddingTop: SP.section, paddingBottom: SP.section }}>
        <div data-sr style={{ textAlign: "center", marginBottom: SP.xxl }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: R.pill, padding: "5px 16px", fontSize: 11, color: TEXT.accent, fontWeight: 700, marginBottom: SP.md, letterSpacing: "0.08em" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 6px #a855f7" }} />
            BUILT FOR CAMPUS
          </div>
          <h2 style={{ fontSize: "clamp(2rem,5vw,3.4rem)", fontWeight: 900, letterSpacing: "-2.5px", lineHeight: 1.0, marginBottom: SP.sm }}>
            Everything campus life needs.<br />
            <span style={{ background: "linear-gradient(90deg, #c084fc 0%, #a855f7 50%, #7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>In one app.</span>
          </h2>
          <p style={{ color: TEXT.secondary, fontSize: 16, maxWidth: 460, margin: "0 auto", lineHeight: 1.7 }}>Six powerful tools woven into a single, beautifully designed experience.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3" style={{ gap: 12 }}>
          {[
            { icon: <Calendar size={22} />, title: "Events Feed", desc: "Real-time stream of every campus event — formals, rush, parties, and more.", grad: "linear-gradient(135deg,#7c3aed,#a855f7)", glow: "rgba(168,85,247,0.22)", border: "rgba(168,85,247,0.18)" },
            { icon: <MapPin size={22} />, title: "Campus Map", desc: "Interactive map shows every event near you. Tap any pin for details and tickets.", grad: "linear-gradient(135deg,#1d4ed8,#3b82f6)", glow: "rgba(59,130,246,0.18)", border: "rgba(59,130,246,0.18)" },
            { icon: <Ticket size={22} />, title: "Digital Tickets", desc: "Buy, store, and show tickets with a QR code. Zero paper, zero hassle.", grad: "linear-gradient(135deg,#059669,#22c55e)", glow: "rgba(34,197,94,0.16)", border: "rgba(34,197,94,0.18)" },
            { icon: <Search size={22} />, title: "Smart Search", desc: "Filter by org, date, or location. Find exactly what you want in seconds.", grad: "linear-gradient(135deg,#d97706,#f59e0b)", glow: "rgba(245,158,11,0.16)", border: "rgba(245,158,11,0.18)" },
            { icon: <Users size={22} />, title: "Org Profiles", desc: "Follow fraternities, sororities, and clubs. Get instant notifications.", grad: "linear-gradient(135deg,#be185d,#ec4899)", glow: "rgba(236,72,153,0.16)", border: "rgba(236,72,153,0.18)" },
            { icon: <QrCode size={22} />, title: "QR Check-In", desc: "Built-in scanner for orgs. Check in your guest list in minutes.", grad: "linear-gradient(135deg,#6d28d9,#8b5cf6)", glow: "rgba(139,92,246,0.22)", border: "rgba(139,92,246,0.2)" },
          ].map((f, i) => (
            <div key={i}
              className="feature-card"
              style={{ background: "rgba(255,255,255,0.038)", borderRadius: 18, border: `1px solid ${f.border}`, backdropFilter: "blur(20px)", position: "relative", overflow: "hidden", transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s", cursor: "default" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px) scale(1.01)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px ${f.glow}, 0 4px 20px rgba(0,0,0,0.3)`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0) scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: `radial-gradient(circle, ${f.glow} 0%, transparent 70%)`, pointerEvents: "none" }} />
              <div className="feature-card-inner">
                <div style={{ width: 46, height: 46, borderRadius: 14, background: f.grad, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, boxShadow: `0 6px 20px ${f.glow}`, position: "relative", flexShrink: 0 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 8, letterSpacing: "-0.3px", lineHeight: 1.2 }}>{f.title}</h3>
                <p style={{ color: TEXT.secondary, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <style>{`
          .feature-card-inner { padding: 18px 16px 16px; }
          @media (min-width: 640px) { .feature-card-inner { padding: 24px 22px 22px; } }
          @media (min-width: 1024px) { .feature-card-inner { padding: 28px 26px 26px; } }
        `}</style>
      </section>

      {/* ── FOR ORGS ── */}
      <section style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(14,6,40,0.5) 100%)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto px-5" style={{ paddingTop: SP.section, paddingBottom: SP.section }}>
          <div data-sr className="flex flex-col lg:flex-row items-center" style={{ gap: 72 }}>
            <div className="flex-1 w-full">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: R.pill, padding: "5px 16px", fontSize: 11, color: TEXT.accent, fontWeight: 700, marginBottom: SP.md, letterSpacing: "0.08em" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 6px #a855f7" }} />
                FOR ORGANIZATIONS
              </div>
              <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, letterSpacing: "-2px", marginBottom: SP.md, lineHeight: 1.05 }}>
                Run your chapter.<br />
                <span style={{ background: "linear-gradient(90deg,#c084fc,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sell tickets.<br />Get paid.</span>
              </h2>
              <p style={{ color: TEXT.secondary, fontSize: 16, lineHeight: 1.8, marginBottom: SP.xl, maxWidth: 420 }}>
                A full event management suite for Greek life and campus orgs. From creation to check-in — everything you need, nothing you don't.
              </p>
              <div className="flex flex-col" style={{ gap: 14 }}>
                {[
                  { title: "Publish events in under 2 minutes", sub: "Simple builder, live instantly" },
                  { title: "Set ticket pricing & capacity", sub: "Tiered pricing, hard limits, waitlists" },
                  { title: "Real-time check-in with QR", sub: "Scan at the door from any phone" },
                  { title: "Push notifications to followers", sub: "Instant reach to your entire audience" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start" style={{ gap: 14 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#059669,#22c55e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, boxShadow: "0 4px 12px rgba(34,197,94,0.3)" }}>
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.2px" }}>{item.title}</div>
                      <div style={{ color: TEXT.secondary, fontSize: 13, marginTop: 2 }}>{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex justify-center w-full" style={{ maxWidth: 440 }}>
              <div style={{ width: "100%", background: "rgba(255,255,255,0.04)", borderRadius: 28, padding: 28, border: "1px solid rgba(168,85,247,0.14)", backdropFilter: "blur(24px)", boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)" }}>
                <div style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(168,85,247,0.1))", borderRadius: 18, padding: "18px 20px", marginBottom: 16, border: "1px solid rgba(168,85,247,0.15)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: TEXT.accent, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>ACTIVE EVENT</div>
                      <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.3px" }}>Spring Formal 2025</div>
                      <div style={{ color: TEXT.secondary, fontSize: 12.5, marginTop: 3 }}>Dec 16 · 8:00 PM · Grand Ballroom</div>
                    </div>
                    <span style={{ background: "linear-gradient(135deg,#059669,#22c55e)", color: "#fff", padding: "4px 10px", borderRadius: R.pill, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", flexShrink: 0 }}>LIVE</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: "#22c55e", letterSpacing: "-1px" }}>142</div>
                      <div style={{ fontSize: 11, color: TEXT.secondary, marginTop: 1 }}>Tickets sold</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-1px" }}>$2,840</div>
                      <div style={{ fontSize: 11, color: TEXT.secondary, marginTop: 1 }}>Revenue earned</div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: TEXT.tertiary, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>RECENT ACTIVITY</div>
                {[
                  { name: "Jordan M.", action: "Ticket purchased", time: "2m ago" },
                  { name: "Alex R.", action: "Ticket purchased", time: "5m ago" },
                  { name: "Sam K.", action: "Checked in at door", time: "8m ago" },
                ].map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(168,85,247,0.2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#c084fc", flexShrink: 0 }}>{a.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</div>
                      <div style={{ color: TEXT.tertiary, fontSize: 11.5, marginTop: 1 }}>{a.action}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                      <span style={{ color: TEXT.tertiary, fontSize: 11 }}>{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── REVENUE ── */}
      <section style={{ background: BG.deep, borderTop: "1px solid rgba(255,255,255,0.04)", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 400, background: "radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div data-sr className="max-w-6xl mx-auto px-5 flex flex-col lg:flex-row items-center" style={{ gap: 72, paddingTop: SP.section, paddingBottom: SP.section, position: "relative" }}>
          <div className="flex-1 text-center lg:text-left">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: R.pill, padding: "5px 16px", fontSize: 11, color: "#4ade80", fontWeight: 700, marginBottom: SP.md, letterSpacing: "0.08em" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
              ZERO PLATFORM TAX
            </div>
            <div style={{ fontSize: "clamp(5rem,20vw,10rem)", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-6px", background: "linear-gradient(135deg, #e9d5ff 0%, #c084fc 40%, #a855f7 70%, #7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: SP.md }}>
              100%
            </div>
            <h2 style={{ fontSize: "clamp(1.3rem,3vw,1.8rem)", fontWeight: 800, letterSpacing: "-0.8px", marginBottom: SP.sm, lineHeight: 1.3 }}>
              Every ticket dollar goes<br />straight to your org.
            </h2>
            <p style={{ color: TEXT.secondary, fontSize: 15, lineHeight: 1.8, maxWidth: 400 }}>
              We never take a cut. Hosts keep every cent of their revenue. Attendees pay a small transparent service fee — you never see a deduction.
            </p>
          </div>

          <div className="flex-1 flex justify-center lg:justify-end w-full">
            <div style={{ width: "100%", maxWidth: 400 }}>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 24, padding: 24, border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: TEXT.tertiary, letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase" }}>How the money flows</div>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "14px 16px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: TEXT.secondary, fontSize: 13 }}>Ticket price (set by you)</span>
                    <span style={{ fontWeight: 800, fontSize: 18 }}>$20.00</span>
                  </div>
                </div>
                <div style={{ textAlign: "center", fontSize: 18, color: "rgba(34,197,94,0.5)", marginBottom: 8, fontWeight: 300 }}>↓</div>
                <div style={{ background: "rgba(34,197,94,0.08)", borderRadius: 14, padding: "16px", marginBottom: 8, border: "1px solid rgba(34,197,94,0.15)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Your org receives</div>
                      <div style={{ color: "rgba(74,222,128,0.7)", fontSize: 12, marginTop: 3, fontWeight: 500 }}>100% — deposited directly</div>
                    </div>
                    <span style={{ color: "#4ade80", fontWeight: 900, fontSize: 22, letterSpacing: "-1px" }}>$20.00</span>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ color: TEXT.secondary, fontSize: 13 }}>Service fee (paid by buyer)</div>
                      <div style={{ color: TEXT.tertiary, fontSize: 11.5, marginTop: 2 }}>Added at checkout — not deducted from you</div>
                    </div>
                    <span style={{ color: TEXT.tertiary, fontWeight: 600, fontSize: 13 }}>~$1–2</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["No monthly fees", "No setup fees", "No surprises"].map((t, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "10px 8px", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: TEXT.tertiary, fontWeight: 500, lineHeight: 1.3 }}>{t}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="app" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div data-sr className="max-w-5xl mx-auto px-5 text-center" style={{ paddingTop: SP.section, paddingBottom: SP.section }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: R.pill, padding: "5px 16px", fontSize: 11, color: TEXT.accent, fontWeight: 700, marginBottom: SP.md, letterSpacing: "0.08em" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 6px #a855f7" }} />
            GETTING STARTED
          </div>
          <h2 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.05, marginBottom: SP.sm }}>
            Simple for everyone.
          </h2>
          <p style={{ color: TEXT.secondary, fontSize: 16, maxWidth: 480, margin: `0 auto ${SP.xxl}px`, lineHeight: 1.7 }}>Whether you're a student finding events or an org managing hundreds of members — you're set up in minutes.</p>

          <div className="flex flex-col lg:flex-row" style={{ gap: 16 }}>
            {[
              {
                label: "For Students", emoji: "🎓",
                color: "#a855f7", glow: "rgba(168,85,247,0.15)",
                steps: [
                  { n: "01", title: "Download the beta", sub: "Get Gated on iOS via TestFlight in under a minute." },
                  { n: "02", title: "Discover events", sub: "Browse the feed or explore the interactive campus map." },
                  { n: "03", title: "Buy & show up", sub: "Secure checkout, digital QR ticket. Just scan at the door." },
                ],
              },
              {
                label: "For Organizations", emoji: "🏛️",
                color: "#7c3aed", glow: "rgba(124,58,237,0.18)",
                steps: [
                  { n: "01", title: "Create your profile", sub: "Set up your chapter or org in minutes with branding and links." },
                  { n: "02", title: "Post events & prices", sub: "Set capacity, pricing tiers, publish. Followers notified instantly." },
                  { n: "03", title: "Check in & collect", sub: "Scan QR codes at the door. 100% of ticket revenue goes to you." },
                ],
              },
            ].map((col) => (
              <div key={col.label} style={{ flex: 1, background: "rgba(255,255,255,0.035)", borderRadius: 24, padding: 28, border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", textAlign: "left", boxShadow: `0 0 60px ${col.glow}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `${col.glow.replace("0.15","0.2").replace("0.18","0.22")}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{col.emoji}</div>
                  <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" }}>{col.label}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {col.steps.map((s, si) => (
                    <div key={s.n} style={{ display: "flex", gap: 16, paddingBottom: si < 2 ? 20 : 0, position: "relative" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${col.color}40,${col.color}20)`, border: `1.5px solid ${col.color}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: col.color, flexShrink: 0 }}>{s.n}</div>
                        {si < 2 && <div style={{ width: 1.5, flex: 1, background: `linear-gradient(180deg,${col.color}40,transparent)`, minHeight: 16, marginTop: 4 }} />}
                      </div>
                      <div style={{ paddingTop: 6, paddingBottom: si < 2 ? 0 : 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, letterSpacing: "-0.2px" }}>{s.title}</div>
                        <div style={{ color: TEXT.secondary, fontSize: 13.5, lineHeight: 1.65 }}>{s.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL ── */}
      <section id="social" style={{ background: "linear-gradient(180deg,rgba(0,0,0,0.2) 0%,transparent 100%)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div data-sr className="max-w-4xl mx-auto px-5 text-center" style={{ paddingTop: SP.section, paddingBottom: SP.section }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: R.pill, padding: "5px 16px", fontSize: 11, color: TEXT.accent, fontWeight: 700, marginBottom: SP.md, letterSpacing: "0.08em" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 6px #a855f7" }} />
            COMMUNITY
          </div>
          <h2 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.05, marginBottom: SP.sm }}>Follow our journey.</h2>
          <p style={{ color: TEXT.secondary, fontSize: 16, maxWidth: 440, margin: `0 auto ${SP.xxl}px`, lineHeight: 1.7 }}>Stay up to date on new campus launches, features, and behind-the-scenes content.</p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            {[
              {
                href: "https://instagram.com/thegatedapp",
                handle: "@thegatedapp",
                platform: "Instagram",
                cta: "Follow us",
                iconBg: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
                border: "rgba(220,39,67,0.2)",
                glow: "rgba(220,39,67,0.12)",
                icon: <InstagramLogo size={22} color="#fff" />,
              },
              {
                href: "https://www.tiktok.com/@gatedapp",
                handle: "@gatedapp",
                platform: "TikTok",
                cta: "Follow us",
                iconBg: "#0a0a0a",
                border: "rgba(255,255,255,0.1)",
                glow: "rgba(255,255,255,0.04)",
                icon: <TikTokLogo size={22} color="#fff" />,
              },
            ].map((s) => (
              <a key={s.handle} href={s.href} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,0.04)", borderRadius: 22, padding: "20px 24px", textDecoration: "none", color: "#fff", border: `1px solid ${s.border}`, backdropFilter: "blur(20px)", transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s", flex: 1, maxWidth: 320, width: "100%", boxShadow: `0 0 40px ${s.glow}` }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px) scale(1.01)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px ${s.glow}, 0 4px 20px rgba(0,0,0,0.3)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0) scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px ${s.glow}`; }}
              >
                <div style={{ width: 50, height: 50, borderRadius: 15, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 6px 20px rgba(0,0,0,0.4)" }}>
                  {s.icon}
                </div>
                <div className="text-left" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.handle}</div>
                  <div style={{ color: TEXT.secondary, fontSize: 13, marginTop: 2 }}>{s.platform}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: TEXT.accent, background: "rgba(168,85,247,0.1)", padding: "6px 14px", borderRadius: R.pill, border: "1px solid rgba(168,85,247,0.2)", flexShrink: 0, whiteSpace: "nowrap" }}>{s.cta} →</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOWNLOAD CTA ── */}
      <section id="download" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(124,58,237,0.22) 0%, rgba(10,4,32,0.9) 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "30%", left: "10%", width: 300, height: 300, background: "radial-gradient(circle,rgba(168,85,247,0.12) 0%,transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "20%", right: "10%", width: 250, height: 250, background: "radial-gradient(circle,rgba(124,58,237,0.1) 0%,transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
        <div className="max-w-3xl mx-auto px-5 text-center" style={{ paddingTop: SP.section, paddingBottom: SP.section, position: "relative" }}>
          <div data-sr>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: R.pill, padding: "6px 18px", fontSize: 11, color: TEXT.accent, fontWeight: 700, marginBottom: SP.lg, letterSpacing: "0.08em" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 8px #a855f7", animation: "gatedGlowBloom 2s infinite alternate" }} />
              BETA NOW AVAILABLE ON IOS
            </div>
            <img src={`${base}logo.png`} alt="Gated" style={{ width: 100, height: 100, objectFit: "contain", display: "block", margin: `0 auto ${SP.lg}px`, filter: "drop-shadow(0 0 32px rgba(168,85,247,0.5))" }} />
            <h2 style={{ fontSize: "clamp(2rem,6vw,3.6rem)", fontWeight: 900, letterSpacing: "-2.5px", lineHeight: 1.0, marginBottom: SP.md }}>
              Your campus social life<br />
              <span style={{ background: "linear-gradient(90deg,#e9d5ff,#c084fc,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>starts here.</span>
            </h2>
            <p style={{ color: TEXT.secondary, fontSize: 16, lineHeight: 1.8, maxWidth: 400, margin: `0 auto ${SP.xl}px` }}>
              Join students already discovering events, connecting with orgs, and never missing a moment on campus.
            </p>
            <a href="https://testflight.apple.com/join/mf7CCamE" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 14, background: "#fff", color: "#000", padding: "16px 32px", borderRadius: R.pill, fontSize: 15, fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 40px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)", transition: "transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.04) translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 60px rgba(255,255,255,0.22), 0 8px 30px rgba(0,0,0,0.4)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1) translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 40px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.3)"; }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="black"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              <div className="text-left">
                <div style={{ fontSize: 10, color: "rgba(0,0,0,0.5)", lineHeight: 1, fontWeight: 500 }}>Download on the</div>
                <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.3px" }}>App Store</div>
              </div>
            </a>
            <p style={{ color: TEXT.tertiary, fontSize: 12, marginTop: SP.md }}>iOS only · TestFlight beta · Free to download</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(24px)" }}>
        <div className="max-w-6xl mx-auto px-5" style={{ paddingTop: SP.xl, paddingBottom: SP.xl }}>
          <div className="flex flex-col md:flex-row items-center justify-between" style={{ gap: SP.lg }}>
            <div className="flex items-center" style={{ gap: 10 }}>
              <img src={`${base}logo.png`} alt="Gated" style={{ width: 40, height: 40, objectFit: "contain" }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px" }}>Gated</div>
                <div style={{ fontSize: 11, color: TEXT.tertiary, marginTop: 1 }}>Campus life, unlocked.</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: SP.xl }}>
              <Link href="/terms" style={{ color: TEXT.tertiary, fontSize: 13, textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = TEXT.tertiary; }}>Terms</Link>
              <Link href="/privacy" style={{ color: TEXT.tertiary, fontSize: 13, textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = TEXT.tertiary; }}>Privacy</Link>
              <a href="mailto:support@gatedapp.us" style={{ color: TEXT.tertiary, fontSize: 13, textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = TEXT.tertiary; }}>Contact</a>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: SP.md }}>
              <a href="https://instagram.com/thegatedapp" target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: TEXT.tertiary, transition: "all 0.2s" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#e1306c"; (e.currentTarget as HTMLElement).style.background = "rgba(220,39,67,0.1)"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = TEXT.tertiary; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}>
                <InstagramLogo size={16} />
              </a>
              <a href="https://www.tiktok.com/@gatedapp" target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: TEXT.tertiary, transition: "all 0.2s" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = TEXT.tertiary; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}>
                <TikTokLogo size={16} />
              </a>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: SP.lg, paddingTop: SP.md, textAlign: "center" }}>
            <p style={{ color: TEXT.tertiary, fontSize: 12, margin: 0 }}>© 2025 The Greek Life Corp. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}


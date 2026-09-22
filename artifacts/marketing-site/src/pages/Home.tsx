import { useState, useRef, useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import {
  MapPin,
  Ticket,
  Search,
  Calendar,
  QrCode,
  Users,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

const C = {
  ink: "#0c0428",
  deep: "#150840",
  mid: "#2a1568",
  violet: "#7c3aed",
  accent: "#a855f7",
  soft: "#c084fc",
  mute: "rgba(255,255,255,0.45)",
  tertiary: "rgba(255,255,255,0.28)",
  hair: "rgba(255,255,255,0.1)",
  card: "rgba(255,255,255,0.045)",
  green: "#22c55e",
} as const;

function CountUp({
  to,
  prefix = "",
  suffix = "",
  duration = 1600,
  decimals = 0,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
}) {
  const [val, setVal] = useState(0);
  const spanRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const begin = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - begin) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            const cur =
              Math.round(eased * to * Math.pow(10, decimals)) /
              Math.pow(10, decimals);
            setVal(cur);
            if (p < 1) requestAnimationFrame(tick);
            else setVal(to);
          };
          requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration, decimals]);
  const display =
    decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString();
  return (
    <span ref={spanRef}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

function InstagramLogo({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function TikTokLogo({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
    </svg>
  );
}

const base = import.meta.env.BASE_URL;

const screens = [
  { src: `${base}screens/home-upcoming.png`, label: "Upcoming Events" },
  { src: `${base}screens/discover.png`, label: "Discover" },
  { src: `${base}screens/profile.png`, label: "Profile" },
  { src: `${base}screens/campus-map.png`, label: "Campus Map" },
  { src: `${base}screens/tickets.png`, label: "My Tickets" },
];

const PHONE_W = 368;
const PHONE_H = 796;

function IPhoneMockup() {
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [phoneScale, setPhoneScale] = useState(1);
  const [phase, setPhase] = useState<"home" | "opening" | "app">("home");
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
      if (!dragging && phase === "app") setCurrent((c) => (c + 1) % screens.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [dragging, phase]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("opening"), 4800);
    const t2 = setTimeout(() => setPhase("app"), 5850);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const translateX = -current * 100 + offsetX / 2.8;
  const scaledH = PHONE_H * phoneScale;
  const scaledW = PHONE_W * phoneScale;

  return (
    <div className="flex flex-col items-center select-none" style={{ width: scaledW }}>
      <div
        style={{
          width: PHONE_W,
          height: PHONE_H,
          transform: `scale(${phoneScale})`,
          transformOrigin: "top center",
          marginBottom: -(PHONE_H - scaledH),
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: PHONE_W,
            height: PHONE_H,
            background: "linear-gradient(145deg, #1c1c1e 0%, #111 60%, #0a0a0a 100%)",
            borderRadius: 54,
            padding: 6,
            boxShadow:
              "0 0 0 1.5px #3a3a3c, 0 60px 140px rgba(0,0,0,0.98), 0 0 60px rgba(140,60,240,0.32), 0 0 120px rgba(130,50,230,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -3,
              top: 110,
              width: 3,
              height: 36,
              background: "#2a2a2e",
              borderRadius: "2px 0 0 2px",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -3,
              top: 160,
              width: 3,
              height: 68,
              background: "#2a2a2e",
              borderRadius: "2px 0 0 2px",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -3,
              top: 240,
              width: 3,
              height: 68,
              background: "#2a2a2e",
              borderRadius: "2px 0 0 2px",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -3,
              top: 180,
              width: 3,
              height: 96,
              background: "#2a2a2e",
              borderRadius: "0 2px 2px 0",
            }}
          />
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 49,
              overflow: "hidden",
              background: "#000",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 14,
                left: "50%",
                transform: "translateX(-50%)",
                width: 110,
                height: 32,
                background: "#000",
                borderRadius: 22,
                zIndex: 10,
                boxShadow: "0 0 0 1px #1c1c1e",
              }}
            />
            <div
              ref={trackRef}
              style={{
                display: "flex",
                width: `${screens.length * 100}%`,
                height: "100%",
                transform: `translateX(${translateX / screens.length}%)`,
                transition: dragging
                  ? "none"
                  : "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                cursor: dragging ? "grabbing" : "grab",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {screens.map((s, i) => (
                <div
                  key={i}
                  style={{
                    width: `${100 / screens.length}%`,
                    flexShrink: 0,
                    height: "100%",
                    background: "#000",
                  }}
                >
                  <img
                    src={s.src}
                    alt={s.label}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      objectPosition: "center",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
            {phase !== "app" && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 10,
                  backgroundImage: `url(${base}wallpaper.png)`,
                  backgroundSize: "cover",
                  backgroundPosition: "center top",
                  overflow: "hidden",
                  pointerEvents: "none",
                  opacity: phase === "home" ? 1 : undefined,
                  animation:
                    phase === "opening"
                      ? "gatedScreenFade 1.0s cubic-bezier(0.4,0,0.2,1) forwards"
                      : "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,12,0.14)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    left: 0,
                    right: 0,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingLeft: 26,
                    paddingRight: 26,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#fff",
                      letterSpacing: "-0.3px",
                      textShadow: "0 1px 4px rgba(0,0,0,0.35)",
                    }}
                  >
                    2:20
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 2,
                        height: 11,
                      }}
                    >
                      {[5, 8, 11].map((h, i) => (
                        <div
                          key={i}
                          style={{
                            width: 3,
                            height: h,
                            borderRadius: 1,
                            background: "#fff",
                          }}
                        />
                      ))}
                    </div>
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                      <circle cx="8" cy="11" r="1.5" fill="white" />
                      <path
                        d="M4.5 8a5 5 0 017 0"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M1.5 5a9 9 0 0113 0"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div
                        style={{
                          width: 23,
                          height: 11,
                          borderRadius: 3,
                          border: "1.5px solid rgba(255,255,255,0.65)",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: "1.5px 2px",
                            background: "#fff",
                            borderRadius: 1.5,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          width: 2,
                          height: 5,
                          background: "rgba(255,255,255,0.55)",
                          borderRadius: "0 1px 1px 0",
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: 88,
                    left: 28,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    transformOrigin: "center center",
                    animation:
                      phase === "opening"
                        ? "gatedIconOpen 1.0s cubic-bezier(0.4,0,0.2,1) forwards"
                        : "none",
                  }}
                >
                  <img
                    src={`${base}logo.png`}
                    alt="Gated"
                    style={{
                      width: 108,
                      height: 108,
                      objectFit: "contain",
                      filter:
                        "drop-shadow(0 0 16px rgba(148,60,240,0.7)) drop-shadow(0 3px 10px rgba(0,0,0,0.6))",
                      marginBottom: 4,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#fff",
                      letterSpacing: "0.01em",
                      textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    }}
                  >
                    Gated
                  </span>
                </div>
                <div
                  style={{
                    position: "absolute",
                    bottom: 10,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 130,
                    height: 5,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.25)",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          color: C.mute,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.02em",
        }}
      >
        {screens[current].label}
      </div>
      <div className="flex gap-2" style={{ marginTop: 8 }}>
        {screens.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Show ${screens[i].label}`}
            style={{
              width: i === current ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === current ? C.accent : "rgba(255,255,255,0.2)",
              transition: "all 0.3s ease",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}
      </div>
      <div className="flex gap-3" style={{ marginTop: 12 }}>
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          aria-label="Previous screen"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: C.card,
            color: C.mute,
            border: `1px solid ${C.hair}`,
            cursor: "pointer",
            opacity: current === 0 ? 0.2 : 1,
          }}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          onClick={() => goTo(current + 1)}
          disabled={current === screens.length - 1}
          aria-label="Next screen"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: C.card,
            color: C.mute,
            border: `1px solid ${C.hair}`,
            cursor: "pointer",
            opacity: current === screens.length - 1 ? 0.2 : 1,
          }}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

const UNIVERSITIES = [
  "Rutgers",
  "USC",
  "Penn State",
  "Ohio State",
  "Tulane",
  "Michigan",
  "Northeastern",
];

const FEATURES = [
  {
    n: "01",
    tag: "DISCOVER",
    icon: <Calendar size={16} />,
    title: "Events Feed",
    desc: "Real-time stream of every campus event — formals, rush, parties, and more.",
  },
  {
    n: "02",
    tag: "NAVIGATE",
    icon: <MapPin size={16} />,
    title: "Campus Map",
    desc: "Interactive map shows every event near you. Tap any pin for details and tickets.",
  },
  {
    n: "03",
    tag: "ATTEND",
    icon: <Ticket size={16} />,
    title: "Digital Tickets",
    desc: "Buy, store, and show tickets with a QR code. Zero paper, zero hassle.",
  },
  {
    n: "04",
    tag: "FILTER",
    icon: <Search size={16} />,
    title: "Smart Search",
    desc: "Filter by org, date, or location. Find exactly what you want in seconds.",
  },
  {
    n: "05",
    tag: "FOLLOW",
    icon: <Users size={16} />,
    title: "Org Profiles",
    desc: "Follow fraternities, sororities, and clubs. Get instant notifications.",
  },
  {
    n: "06",
    tag: "RUN",
    icon: <QrCode size={16} />,
    title: "QR Check-In",
    desc: "Built-in scanner for orgs. Check in your guest list in minutes.",
  },
];

function Chip({ children, live }: { children: ReactNode; live?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase"
      style={{ color: C.mute }}
    >
      <span
        style={{
          width: live ? 8 : 6,
          height: live ? 8 : 6,
          borderRadius: 999,
          background: live ? C.green : C.accent,
          boxShadow: live ? `0 0 0 0 rgba(34,197,94,0.6)` : "none",
          animation: live ? "gatedLivePulse 2s infinite" : undefined,
        }}
      />
      {children}
    </span>
  );
}

export default function Home() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const phoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll("[data-sr]");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("sr-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (!phoneRef.current) return;
      const drift = Math.min(window.scrollY * 0.04, 36);
      phoneRef.current.style.transform = `translateY(${drift}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Community", href: "#community" },
    { label: "Contact Us", href: "#contact" },
  ];

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: `radial-gradient(ellipse 55% 55% at 78% 18%, rgba(148,60,240,0.22) 0%, transparent 65%), linear-gradient(180deg, ${C.ink} 0%, ${C.deep} 18%, ${C.mid} 42%, #281363 68%, ${C.deep} 88%, ${C.ink} 100%)`,
        color: "#fff",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
      }}
    >
      <style>{`
        .serif { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mono { font-family: 'JetBrains Mono', Menlo, monospace; }
        .underline-grow {
          background-image: linear-gradient(currentColor, currentColor);
          background-size: 0% 1px;
          background-repeat: no-repeat;
          background-position: 0 100%;
          transition: background-size .35s ease, color .2s ease;
        }
        .underline-grow:hover { background-size: 100% 1px; color: #fff !important; }
        @keyframes gatedScreenFade {
          0% { opacity: 1; } 18% { opacity: 1; } 100% { opacity: 0; }
        }
        @keyframes gatedIconOpen {
          0% { transform: scale(1); } 20% { transform: scale(1.05); } 100% { transform: scale(2.0); }
        }
        @keyframes marqueeScroll {
          from { transform: translateX(0); } to { transform: translateX(-50%); }
        }
        @keyframes gatedLivePulse {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,.55); }
          70% { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes gatedPhoneReveal {
          from { opacity: 0; transform: translateY(48px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes gatedFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        [data-sr] { opacity: 0; transform: translateY(18px); transition: opacity .85s cubic-bezier(.2,.7,.2,1), transform .85s cubic-bezier(.2,.7,.2,1); }
        [data-sr].sr-visible { opacity: 1; transform: none; }
        @media (prefers-reduced-motion: reduce) {
          [data-sr] { opacity: 1; transform: none; transition: none; }
          @keyframes marqueeScroll { from { transform: none; } to { transform: none; } }
        }
      `}</style>

      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div
          style={{
            backdropFilter: navScrolled || mobileMenuOpen ? "blur(20px)" : "none",
            background:
              navScrolled || mobileMenuOpen
                ? "rgba(12,4,40,0.88)"
                : "transparent",
            borderBottom:
              navScrolled || mobileMenuOpen
                ? `1px solid ${C.hair}`
                : "1px solid transparent",
            transition: "background .3s, border-color .3s",
          }}
        >
          <div className="max-w-[1400px] mx-auto px-5 md:px-10 h-16 flex items-center justify-between">
            <a href="#home" className="flex items-center gap-2">
              <img
                src={`${base}logo.png`}
                alt="Gated"
                style={{ width: 36, height: 36, objectFit: "contain" }}
              />
              <span className="serif text-[22px] tracking-tight">Gated</span>
            </a>

            <nav className="hidden md:flex items-center gap-9 text-[14px]">
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="underline-grow"
                  style={{ color: C.mute, textDecoration: "none" }}
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <a
                href="https://testflight.apple.com/join/v7XxS6fu"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center rounded-full px-4 py-2 text-[13px] font-medium"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  color: "#fff",
                  textDecoration: "none",
                  boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                }}
              >
                Download Beta
              </a>
              <button
                className="md:hidden w-10 h-10 grid place-items-center rounded-full"
                style={{ border: `1px solid ${C.hair}`, background: C.card, color: C.mute }}
                onClick={() => setMobileMenuOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div
              className="md:hidden px-5 pb-5 flex flex-col gap-3"
              style={{ borderTop: `1px solid ${C.hair}` }}
            >
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.85)",
                    textDecoration: "none",
                    background: C.card,
                  }}
                >
                  {l.label}
                </a>
              ))}
              <a
                href="https://testflight.apple.com/join/v7XxS6fu"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "block",
                  textAlign: "center",
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  color: "#fff",
                  padding: "14px 22px",
                  borderRadius: 9999,
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Download Beta
              </a>
            </div>
          )}
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="relative pt-16">
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 pt-10 md:pt-16 pb-10 md:pb-16">
          {/* items-start on desktop so headline sits under Live Now (not bottom-aligned with phone) */}
          <div className="grid md:grid-cols-12 gap-6 md:gap-10 items-start">
            <div className="md:col-span-6 relative z-10">
              <div
                className="flex items-center gap-3"
                style={{ animation: "gatedFadeUp .7s ease both" }}
              >
                <Chip live>Live Now</Chip>
              </div>
              <h1
                className="mt-4 md:mt-5"
                style={{ animation: "gatedFadeUp .75s ease .08s both" }}
              >
                <span
                  className="serif block leading-[.85] tracking-[-0.04em]"
                  style={{ fontSize: "clamp(4rem, 10vw, 8rem)" }}
                >
                  Gated
                  <span style={{ color: C.accent }}>.</span>
                </span>
              </h1>
              <p
                className="serif italic leading-[1.05] mt-3 md:mt-4 max-w-[16ch]"
                style={{
                  fontSize: "clamp(1.5rem, 3vw, 2.35rem)",
                  color: "rgba(255,255,255,0.92)",
                  animation: "gatedFadeUp .75s ease .18s both",
                }}
              >
                Unlock Your Campus.
              </p>
              <p
                className="mt-4 md:mt-5 max-w-[46ch] text-[15px] md:text-[16px] leading-relaxed"
                style={{ color: C.mute, animation: "gatedFadeUp .75s ease .28s both" }}
              >
                The event app for fraternities, sororities, and campus organizations.
                Discover what's happening, buy tickets in seconds, walk up and scan in.
              </p>

              <div
                className="mt-7 md:mt-8 flex flex-wrap items-center gap-3"
                style={{ animation: "gatedFadeUp .75s ease .4s both" }}
              >
                <a
                  href="https://testflight.apple.com/join/v7XxS6fu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full px-5 py-3 inline-flex items-center gap-3 text-[14px] font-medium"
                  style={{
                    background: "#fff",
                    color: C.ink,
                    textDecoration: "none",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Download Beta
                </a>
                <a
                  href="#screens"
                  className="rounded-full px-5 py-3 inline-flex items-center gap-2 text-[14px]"
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    border: `1px solid ${C.hair}`,
                    textDecoration: "none",
                  }}
                >
                  See it in action
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </a>
              </div>

              <div
                className="mt-8 md:mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] tracking-[0.14em] uppercase"
                style={{ color: C.tertiary, animation: "gatedFadeUp .75s ease .52s both" }}
              >
                <span>100% revenue to orgs</span>
                <span className="w-px h-3" style={{ background: "rgba(255,255,255,0.2)" }} />
                <span>$0 platform fees · ever</span>
                <span className="w-px h-3" style={{ background: "rgba(255,255,255,0.2)" }} />
                <span>iOS beta live now</span>
              </div>
            </div>

            <div
              id="screens"
              className="md:col-span-6 relative flex justify-center md:justify-end mt-8 md:mt-0"
              style={{ animation: "gatedPhoneReveal 1.1s cubic-bezier(.22,1,.36,1) .55s both" }}
            >
              <div
                className="absolute -inset-10 rounded-full blur-3xl opacity-50 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(168,85,247,.4), transparent 62%)",
                }}
              />
              <div ref={phoneRef} className="relative z-10">
                <IPhoneMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section
        data-sr
        style={{
          borderTop: `1px solid ${C.hair}`,
          borderBottom: `1px solid ${C.hair}`,
          background: "rgba(4,1,18,0.72)",
        }}
      >
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 py-14 md:py-20">
          <div className="grid md:grid-cols-3 gap-10 md:gap-6">
            {[
              {
                value: (
                  <>
                    <CountUp to={100} />
                    <span style={{ color: C.accent }}>%</span>
                  </>
                ),
                label: "Revenue to organizations",
                copy: "Every dollar from your ticket price goes directly to the org hosting the event.",
              },
              {
                value: "$0",
                label: "Platform fees · ever",
                copy: "No monthly subscriptions, no setup costs, no surprise surcharges. We mean it.",
              },
              {
                value: (
                  <>
                    iOS<span style={{ color: C.accent }}>.</span>
                  </>
                ),
                label: "Beta live now",
                copy: "Available through Apple TestFlight. Free to join, free to use, free to host.",
              },
            ].map((s) => (
              <div key={s.label}>
                <div
                  className="serif leading-[.95] tracking-[-0.03em]"
                  style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}
                >
                  {s.value}
                </div>
                <div
                  className="mt-2 text-[12px] tracking-[0.14em] uppercase"
                  style={{ color: C.mute }}
                >
                  {s.label}
                </div>
                <p className="mt-3 text-[15px] max-w-[38ch]" style={{ color: C.mute }}>
                  {s.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section
        className="py-10"
        style={{
          borderBottom: `1px solid ${C.hair}`,
          background: "rgba(0,0,0,0.22)",
        }}
      >
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 mb-6 flex items-center justify-between">
          <Chip>On campuses with</Chip>
        </div>
        <div className="overflow-hidden">
          <div
            className="serif whitespace-nowrap"
            style={{
              display: "flex",
              width: "max-content",
              gap: "0",
              fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
              color: "rgba(255,255,255,0.72)",
              animation: "marqueeScroll 28s linear infinite",
            }}
          >
            {[...Array(2)].map((_, rep) => (
              <div key={rep} className="flex items-center">
                {UNIVERSITIES.map((name) => (
                  <span key={`${rep}-${name}`} className="inline-flex items-center">
                    <span style={{ padding: "0 1.25rem" }}>{name}</span>
                    <span style={{ color: C.accent, opacity: 0.7 }}>·</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 md:py-32">
        <div className="max-w-[1400px] mx-auto px-5 md:px-10">
          <div
            data-sr
            className="flex items-end justify-between flex-wrap gap-6 mb-14 md:mb-20"
          >
            <div className="max-w-2xl">
              <Chip>The product</Chip>
              <h2
                className="serif leading-[1] tracking-[-0.02em] mt-4"
                style={{ fontSize: "clamp(2.4rem, 5vw, 4rem)" }}
              >
                Six tools. One pocket.{" "}
                <span className="italic" style={{ color: C.mute }}>
                  Zero friction.
                </span>
              </h2>
            </div>
            <p className="text-[15px] max-w-[40ch]" style={{ color: C.mute }}>
              Everything a student needs to find the night, and everything an org needs
              to run it — built for how campus actually moves.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <article
                key={f.n}
                data-sr
                className="p-7 transition-transform hover:-translate-y-1"
                style={{
                  background: C.card,
                  border: `1px solid ${C.hair}`,
                  borderRadius: 18,
                  backdropFilter: "blur(16px)",
                }}
              >
                <div className="flex items-center justify-between mb-8">
                  <span className="mono text-[11px]" style={{ color: C.mute }}>
                    {f.n} / {f.tag}
                  </span>
                  <span
                    className="w-9 h-9 rounded-full grid place-items-center"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      color: "#fff",
                    }}
                  >
                    {f.icon}
                  </span>
                </div>
                <h3 className="serif text-[1.75rem] leading-tight">{f.title}</h3>
                <p
                  className="mt-2 text-[14.5px] leading-relaxed"
                  style={{ color: C.mute }}
                >
                  {f.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FOR ORGS */}
      <section className="py-20 md:py-32">
        <div className="max-w-[1400px] mx-auto px-5 md:px-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div data-sr className="lg:col-span-5">
              <Chip>For organizations</Chip>
              <h2
                className="serif leading-[1] tracking-[-0.02em] mt-4"
                style={{ fontSize: "clamp(2.4rem, 5vw, 3.8rem)" }}
              >
                Run your chapter.
                <br />
                Sell tickets.
                <br />
                <span className="italic" style={{ color: C.mute }}>
                  Get paid.
                </span>
              </h2>
              <ul className="mt-8 space-y-4 text-[15px]">
                {[
                  {
                    title: "Publish events in under 2 minutes",
                    sub: "Simple builder, live instantly",
                  },
                  {
                    title: "Set ticket pricing & capacity",
                    sub: "Tiered pricing, hard limits, waitlists",
                  },
                  {
                    title: "Real-time check-in with QR",
                    sub: "Scan at the door from any phone",
                  },
                  {
                    title: "Push notifications to followers",
                    sub: "Instant reach to your entire audience",
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: C.accent }}
                    />
                    <span>
                      <span className="font-medium">{item.title}. </span>
                      <span style={{ color: C.mute }}>{item.sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div data-sr className="lg:col-span-7">
              <div
                className="p-6 md:p-8"
                style={{
                  background: C.card,
                  border: `1px solid rgba(168,85,247,0.18)`,
                  borderRadius: 24,
                  backdropFilter: "blur(20px)",
                }}
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div
                      className="text-[10px] tracking-[0.18em] uppercase"
                      style={{ color: C.soft }}
                    >
                      Active Event · Dashboard
                    </div>
                    <div className="serif text-[1.8rem] leading-tight mt-1">
                      Spring Formal 2025
                    </div>
                    <div className="text-[13px] mt-1" style={{ color: C.mute }}>
                      Dec 16 · 8:00 PM · Grand Ballroom
                    </div>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-[10px] font-800 tracking-[0.08em] uppercase"
                    style={{
                      background: "linear-gradient(135deg,#059669,#22c55e)",
                      color: "#fff",
                      fontWeight: 800,
                    }}
                  >
                    Live
                  </span>
                </div>

                <div className="my-6" style={{ height: 1, background: C.hair }} />

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div
                      className="text-[10px] tracking-[0.18em] uppercase"
                      style={{ color: C.tertiary }}
                    >
                      Tickets sold
                    </div>
                    <div className="serif text-[2.4rem] leading-none mt-2">
                      <CountUp to={142} duration={2000} />
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[10px] tracking-[0.18em] uppercase"
                      style={{ color: C.tertiary }}
                    >
                      Revenue earned
                    </div>
                    <div
                      className="serif text-[2.4rem] leading-none mt-2"
                      style={{ color: C.green }}
                    >
                      <CountUp to={2840} prefix="$" duration={2200} />
                    </div>
                  </div>
                </div>

                <div className="my-6" style={{ height: 1, background: C.hair }} />

                <div
                  className="text-[10px] tracking-[0.08em] font-700 mb-3"
                  style={{ color: C.tertiary, fontWeight: 700 }}
                >
                  RECENT ACTIVITY
                </div>
                {[
                  { name: "Jordan M.", action: "Ticket purchased", time: "2m ago" },
                  { name: "Alex R.", action: "Ticket purchased", time: "5m ago" },
                  { name: "Sam K.", action: "Checked in at door", time: "8m ago" },
                ].map((a, i) => (
                  <div
                    key={a.name}
                    className="flex items-center gap-3 py-2.5"
                    style={{
                      borderBottom:
                        i < 2 ? `1px solid ${C.hair}` : "none",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full grid place-items-center text-[13px] font-700 flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg,rgba(124,58,237,0.35),rgba(168,85,247,0.2))",
                        color: C.soft,
                        fontWeight: 700,
                      }}
                    >
                      {a.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[13px]">{a.name}</div>
                      <div className="text-[11.5px]" style={{ color: C.tertiary }}>
                        {a.action}
                      </div>
                    </div>
                    <span className="text-[11px]" style={{ color: C.tertiary }}>
                      {a.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REVENUE */}
      <section
        className="py-20 md:py-28 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(14,6,40,0.99) 0%, rgba(22,10,56,0.99) 100%)`,
          borderTop: `1px solid ${C.hair}`,
        }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(124,58,237,0.14) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 relative">
          <div data-sr className="max-w-3xl">
            <Chip>The money</Chip>
            <h2
              className="serif leading-[1.02] tracking-[-0.02em] mt-4"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.6rem)" }}
            >
              Your ticket price goes to the org.{" "}
              <span className="italic" style={{ color: C.mute }}>
                Full stop.
              </span>
            </h2>
            <p className="mt-5 max-w-[60ch]" style={{ color: C.mute }}>
              We never take a cut. Hosts keep every cent of their revenue. Attendees pay
              a small transparent service fee — you never see a deduction.
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-4 md:gap-6">
            {[
              {
                step: "Step 01",
                title: "Attendee pays",
                copy: "Ticket price set by the org — plus a small, transparent service fee (~$1–2) that keeps Gated running.",
                big: "$20",
                sub: "+ ~$1–2 fee",
              },
              {
                step: "Step 02",
                title: "Org keeps 100%",
                copy: "The full ticket price — every dollar — lands with the organization. No platform tax, ever.",
                big: "$20",
                sub: "to chapter",
                accent: true,
              },
              {
                step: "Step 03",
                title: "No surprises",
                copy: "No monthly subscription. No setup fee. No premium tier. The fee is disclosed before checkout, every time.",
                big: "$0",
                sub: "platform fees",
              },
            ].map((card) => (
              <div
                key={card.step}
                data-sr
                className="rounded-2xl p-7"
                style={{
                  border: `1px solid ${C.hair}`,
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div
                  className="text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: C.tertiary }}
                >
                  {card.step}
                </div>
                <div className="serif text-[1.6rem] mt-2">{card.title}</div>
                <p
                  className="mt-2 text-[14px] leading-relaxed"
                  style={{ color: C.mute }}
                >
                  {card.copy}
                </p>
                <div
                  className="mt-5 pt-5 flex items-baseline gap-2"
                  style={{ borderTop: `1px solid ${C.hair}` }}
                >
                  <span
                    className="serif text-[2rem]"
                    style={{ color: card.accent ? C.green : undefined }}
                  >
                    {card.big}
                  </span>
                  <span className="text-[11px]" style={{ color: C.tertiary }}>
                    {card.sub}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="app" className="py-20 md:py-32">
        <div className="max-w-[1400px] mx-auto px-5 md:px-10">
          <div data-sr className="text-center max-w-3xl mx-auto mb-14">
            <Chip>How it works</Chip>
            <h2
              className="serif leading-[1.02] tracking-[-0.02em] mt-4"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.4rem)" }}
            >
              Two sides. <span className="italic">One app.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div
              data-sr
              className="p-8 md:p-10"
              style={{
                background: C.card,
                border: `1px solid ${C.hair}`,
                borderRadius: 24,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="mono text-[11px]" style={{ color: C.mute }}>
                  FOR STUDENTS
                </span>
                <span
                  className="w-10 h-10 rounded-full grid place-items-center serif text-[18px]"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  }}
                >
                  S
                </span>
              </div>
              <h3 className="serif text-[2rem] mt-6 leading-tight">
                Find the night.
                <br />
                Walk in scanned.
              </h3>
              <ol className="mt-8 space-y-5">
                {[
                  {
                    n: "01",
                    title: "Download the beta",
                    sub: "Get Gated on iOS via TestFlight in under a minute.",
                  },
                  {
                    n: "02",
                    title: "Discover events",
                    sub: "Browse the feed or explore the interactive campus map.",
                  },
                  {
                    n: "03",
                    title: "Buy & show up",
                    sub: "Secure checkout, digital QR ticket. Just scan at the door.",
                  },
                ].map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span
                      className="serif text-[1.4rem] leading-none"
                      style={{ color: C.accent }}
                    >
                      {s.n}
                    </span>
                    <div>
                      <div className="font-medium">{s.title}</div>
                      <div className="text-[14px]" style={{ color: C.mute }}>
                        {s.sub}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div
              data-sr
              className="p-8 md:p-10"
              style={{
                background: "rgba(124,58,237,0.12)",
                border: `1px solid rgba(168,85,247,0.25)`,
                borderRadius: 24,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="mono text-[11px]" style={{ color: C.mute }}>
                  FOR ORGANIZATIONS
                </span>
                <span
                  className="w-10 h-10 rounded-full grid place-items-center serif text-[18px]"
                  style={{ background: C.accent, color: "#fff" }}
                >
                  O
                </span>
              </div>
              <h3 className="serif text-[2rem] mt-6 leading-tight">
                Post the event.
                <br />
                Collect the revenue.
              </h3>
              <ol className="mt-8 space-y-5">
                {[
                  {
                    n: "01",
                    title: "Create your profile",
                    sub: "Set up your chapter or org in minutes with branding and links.",
                  },
                  {
                    n: "02",
                    title: "Post events & prices",
                    sub: "Set capacity, pricing tiers, publish. Followers notified instantly.",
                  },
                  {
                    n: "03",
                    title: "Check in & collect",
                    sub: "Scan QR codes at the door. 100% of ticket revenue goes to you.",
                  },
                ].map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span
                      className="serif text-[1.4rem] leading-none"
                      style={{ color: C.accent }}
                    >
                      {s.n}
                    </span>
                    <div>
                      <div className="font-medium">{s.title}</div>
                      <div className="text-[14px]" style={{ color: C.mute }}>
                        {s.sub}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* COMMUNITY + CTA */}
      <section
        id="community"
        className="py-20 md:py-32"
        style={{
          borderTop: `1px solid ${C.hair}`,
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <div className="max-w-[1100px] mx-auto px-5 md:px-10 text-center">
          <div data-sr>
            <Chip>Community</Chip>
            <h2
              className="serif leading-[.95] tracking-[-0.02em] mt-5"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}
            >
              Your campus social life
              <br />
              <span className="italic" style={{ color: C.soft }}>
                starts here.
              </span>
            </h2>
            <p
              className="mt-6 text-[16px] max-w-[50ch] mx-auto"
              style={{ color: C.mute }}
            >
              Stay up to date on new campus launches, features, and behind-the-scenes
              content.
            </p>
          </div>

          <div
            data-sr
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <a
              href="https://instagram.com/thegatedapp"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-5 py-3 inline-flex items-center gap-2 text-[14px]"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <InstagramLogo size={15} color="#fff" />
              @thegatedapp
            </a>
            <a
              href="https://www.tiktok.com/@gatedapp"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-5 py-3 inline-flex items-center gap-2 text-[14px]"
              style={{
                border: `1px solid ${C.hair}`,
                background: C.card,
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <TikTokLogo size={14} />
              @gatedapp
            </a>
          </div>

          <div data-sr className="mt-14" id="download">
            <a
              href="https://testflight.apple.com/join/v7XxS6fu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-4 rounded-2xl px-6 py-4 transition hover:-translate-y-0.5"
              style={{
                background: "#fff",
                color: C.ink,
                textDecoration: "none",
                boxShadow: "0 8px 40px rgba(255,255,255,0.12)",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left">
                <div
                  className="text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: "rgba(12,4,40,0.55)" }}
                >
                  Download on the
                </div>
                <div className="serif text-[22px] leading-none -mt-0.5">
                  TestFlight Beta
                </div>
              </div>
            </a>
            <div
              className="mt-4 text-[12px] tracking-[0.14em] uppercase"
              style={{ color: C.tertiary }}
            >
              iOS only · TestFlight beta · Free
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-20 md:py-28">
        <div className="max-w-[1400px] mx-auto px-5 md:px-10">
          <div className="grid md:grid-cols-12 gap-10 items-end">
            <div data-sr className="md:col-span-7">
              <Chip>Contact</Chip>
              <h2
                className="serif leading-[1.02] tracking-[-0.02em] mt-4"
                style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.4rem)" }}
              >
                Questions, press, or a
                <br />
                chapter that wants in?
              </h2>
            </div>
            <div data-sr className="md:col-span-5 space-y-4">
              <a
                href="mailto:support@gatedapp.us"
                className="flex items-center justify-between p-5 rounded-2xl transition hover:-translate-y-0.5"
                style={{
                  border: `1px solid ${C.hair}`,
                  background: C.card,
                  textDecoration: "none",
                  color: "#fff",
                }}
              >
                <div>
                  <div
                    className="text-[11px] tracking-[0.18em] uppercase"
                    style={{ color: C.mute }}
                  >
                    General support
                  </div>
                  <div className="serif text-[1.35rem] mt-1">support@gatedapp.us</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: `1px solid ${C.hair}`,
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <img
                src={`${base}logo.png`}
                alt="Gated"
                style={{ width: 40, height: 40, objectFit: "contain" }}
              />
              <div>
                <div className="serif text-[18px]">Gated</div>
                <div className="text-[11px]" style={{ color: C.tertiary }}>
                  Campus life, unlocked.
                </div>
              </div>
            </div>

            <div className="flex gap-8">
              <Link
                href="/terms"
                style={{
                  color: C.tertiary,
                  fontSize: 13,
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                style={{
                  color: C.tertiary,
                  fontSize: 13,
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Privacy
              </Link>
              <a
                href="mailto:support@gatedapp.us"
                style={{
                  color: C.tertiary,
                  fontSize: 13,
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Contact
              </a>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/thegatedapp"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-[10px] grid place-items-center"
                style={{
                  background: C.card,
                  border: `1px solid ${C.hair}`,
                  color: C.mute,
                }}
                aria-label="Instagram"
              >
                <InstagramLogo size={16} />
              </a>
              <a
                href="https://www.tiktok.com/@gatedapp"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-[10px] grid place-items-center"
                style={{
                  background: C.card,
                  border: `1px solid ${C.hair}`,
                  color: C.mute,
                }}
                aria-label="TikTok"
              >
                <TikTokLogo size={16} />
              </a>
            </div>
          </div>
          <div
            className="mt-8 pt-6 text-center"
            style={{ borderTop: `1px solid ${C.hair}` }}
          >
            <p className="text-[12px] m-0" style={{ color: C.tertiary }}>
              © 2025 The Greak Life Corp. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

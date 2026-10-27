import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

type Props = {
  /** Scale relative to full phone size (default adapts to viewport). */
  maxScale?: number;
  className?: string;
  /** Skip wallpaper → open intro; show the scrolling app screens immediately. */
  skipIntro?: boolean;
  /** When false, pause auto-scroll (kept mounted but hidden). */
  active?: boolean;
};

export function IPhoneMockup({
  maxScale = 1,
  className,
  skipIntro = false,
  active = true,
}: Props) {
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, offsetX: 0 });
  const [offsetX, setOffsetX] = useState(0);
  const [phoneScale, setPhoneScale] = useState(Math.min(0.55, maxScale));
  const [compact, setCompact] = useState(false);
  const [phase, setPhase] = useState<"home" | "opening" | "app">(
    skipIntro ? "app" : "home",
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const introDone = useRef(skipIntro);

  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isCompact = vw < 768;
      setCompact(isCompact);
      if (isCompact) {
        const maxW = Math.min(vw - 88, 200);
        // topbar + footer/counter + label/dots under phone
        const maxH = Math.max(250, vh - 220);
        setPhoneScale(Math.min(maxScale, maxW / PHONE_W, maxH / PHONE_H));
        return;
      }
      const available =
        vw < 1100 ? Math.min(vw * 0.34, 320) : 340;
      setPhoneScale(Math.min(maxScale, available / PHONE_W));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [maxScale]);

  const goTo = (idx: number) => {
    setCurrent(Math.max(0, Math.min(screens.length - 1, idx)));
    dragRef.current.offsetX = 0;
    setOffsetX(0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    // Only preventDefault for touch — keeps click/focus working on desktop
    if (e.pointerType === "touch") e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, offsetX: 0 };
    setDragging(true);
    setOffsetX(0);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    e.stopPropagation();
    const next = e.clientX - dragRef.current.startX;
    dragRef.current.offsetX = next;
    setOffsetX(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!dragRef.current.active) return;
    const ox = dragRef.current.offsetX;
    const threshold = compact ? 28 : 40;
    if (Math.abs(ox) > threshold) {
      if (ox < 0) goTo(current + 1);
      else goTo(current - 1);
    } else {
      dragRef.current.offsetX = 0;
      setOffsetX(0);
    }
    dragRef.current.active = false;
    setDragging(false);
  };

  useEffect(() => {
    if (!active || phase !== "app") return;
    const interval = setInterval(() => {
      if (!dragRef.current.active) setCurrent((c) => (c + 1) % screens.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [active, phase]);

  useEffect(() => {
    if (skipIntro || introDone.current) {
      setPhase("app");
      introDone.current = true;
      return;
    }
    if (!active) return;
    const t1 = setTimeout(() => setPhase("opening"), 2200);
    const t2 = setTimeout(() => {
      setPhase("app");
      introDone.current = true;
    }, 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [skipIntro, active]);

  const translateX = -current * 100 + offsetX / 2.8;
  const scaledH = PHONE_H * phoneScale;
  const scaledW = PHONE_W * phoneScale;

  return (
    <div
      className={className}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: scaledW,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        touchAction: "none",
        userSelect: "none",
      }}
    >
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
              "0 0 0 1.5px #3a3a3c, 0 40px 100px rgba(0,0,0,0.85), 0 0 40px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", left: -3, top: 110, width: 3, height: 36, background: "#2a2a2e", borderRadius: "2px 0 0 2px" }} />
          <div style={{ position: "absolute", left: -3, top: 160, width: 3, height: 68, background: "#2a2a2e", borderRadius: "2px 0 0 2px" }} />
          <div style={{ position: "absolute", left: -3, top: 240, width: 3, height: 68, background: "#2a2a2e", borderRadius: "2px 0 0 2px" }} />
          <div style={{ position: "absolute", right: -3, top: 180, width: 3, height: 96, background: "#2a2a2e", borderRadius: "0 2px 2px 0" }} />
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
                  key={s.label}
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
                    decoding="async"
                    draggable={false}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "top center",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
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
                  backgroundColor: "#0a0a12",
                  backgroundImage: `url(${base}wallpaper.png)`,
                  backgroundSize: "cover",
                  backgroundPosition: "center top",
                  overflow: "hidden",
                  pointerEvents: "none",
                  opacity: phase === "home" ? 1 : undefined,
                  animation:
                    phase === "opening"
                      ? "gatedScreenFade 0.7s ease forwards"
                      : "none",
                }}
              >
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,12,0.14)" }} />
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
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>9:41</span>
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
                        ? "gatedIconOpen 0.7s ease forwards"
                        : "none",
                  }}
                >
                  <img
                    src={`${base}logo.png`}
                    alt="Gated"
                    style={{
                      width: 72,
                      height: 72,
                      objectFit: "contain",
                      filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.6))",
                      marginBottom: 4,
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Gated</span>
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
          marginTop: compact ? 8 : 10,
          color: "rgba(255,255,255,0.7)",
          fontSize: compact ? 10 : 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "'JetBrains Mono', monospace",
          textAlign: "center",
        }}
      >
        {screens[current].label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? 10 : 8,
          marginTop: compact ? 6 : 8,
        }}
      >
        {!compact && (
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            disabled={current === 0}
            aria-label="Previous screen"
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(255,255,255,0.2)",
              cursor: "pointer",
              opacity: current === 0 ? 0.25 : 1,
            }}
          >
            <ChevronLeft size={14} />
          </button>
        )}
        <div style={{ display: "flex", gap: 7 }}>
          {screens.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show ${s.label}`}
              style={{
                width: i === current ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === current ? "#fff" : "rgba(255,255,255,0.3)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.25s ease",
              }}
            />
          ))}
        </div>
        {!compact && (
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={current === screens.length - 1}
            aria-label="Next screen"
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(255,255,255,0.2)",
              cursor: "pointer",
              opacity: current === screens.length - 1 ? 0.25 : 1,
            }}
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { Link } from "wouter";

export const LEGAL = {
  bg: "#0a0a0a",
  text: "rgba(255,255,255,0.78)",
  muted: "rgba(255,255,255,0.45)",
  white: "#ffffff",
  accent: "#ffffff",
  subtle: "rgba(255,255,255,0.78)",
  line: "rgba(255,255,255,0.12)",
  soft: "rgba(255,255,255,0.06)",
};

type Props = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  meta?: ReactNode;
};

export function LegalLayout({ title, eyebrow = "The Greak Life Corp", children, meta }: Props) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: LEGAL.bg,
        color: LEGAL.text,
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.1rem 1.5rem",
          borderBottom: `1px solid ${LEGAL.line}`,
          background: "rgba(10,10,10,0.86)",
          backdropFilter: "blur(14px)",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.35rem",
            color: LEGAL.white,
            textDecoration: "none",
            letterSpacing: "-0.02em",
          }}
        >
          Gated
        </Link>
        <Link
          href="/"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: LEGAL.muted,
            textDecoration: "none",
            border: `1px solid ${LEGAL.line}`,
            borderRadius: 999,
            padding: "0.4rem 0.85rem",
          }}
        >
          Back
        </Link>
      </header>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 96px" }}>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: LEGAL.muted,
            marginBottom: 14,
          }}
        >
          {eyebrow}
        </p>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(2.4rem, 6vw, 3.6rem)",
            fontWeight: 400,
            color: LEGAL.white,
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            margin: "0 0 1.25rem",
          }}
        >
          {title}
        </h1>
        {meta}
        <div style={{ height: 1, background: LEGAL.line, margin: "2rem 0 2.5rem" }} />
        {children}
      </div>
    </div>
  );
}

export function LegalSection({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          color: LEGAL.white,
          fontSize: "1.45rem",
          fontWeight: 400,
          marginBottom: 12,
          letterSpacing: "-0.02em",
        }}
      >
        {n}. {title}
      </h2>
      <div style={{ lineHeight: 1.75, color: LEGAL.text, fontSize: 15 }}>{children}</div>
    </div>
  );
}

export function LegalSubSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: "rgba(255,255,255,0.88)",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      <div style={{ lineHeight: 1.75, color: LEGAL.text, fontSize: 15 }}>{children}</div>
    </div>
  );
}

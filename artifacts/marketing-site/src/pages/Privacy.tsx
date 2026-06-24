import { Link } from "wouter";

const SUPPORT = "support@gatedapp.us";
const EFFECTIVE = "April 30, 2026";

export default function Privacy() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0522 0%, #1a0a3e 50%, #0f0522 100%)", color: "rgba(220,210,255,0.9)", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 80px" }}>

        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(167,139,250,0.8)", fontSize: 14, textDecoration: "none", marginBottom: 40 }}>
          ← Back to home
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔒</div>
          <span style={{ fontSize: 13, color: "rgba(167,139,250,0.7)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>The Greek Life Corp</span>
        </div>

        <h1 style={{ fontSize: "clamp(28px,5vw,42px)", fontWeight: 800, color: "white", marginBottom: 8, lineHeight: 1.15 }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: "rgba(167,139,250,0.7)", marginBottom: 48 }}>Effective date: {EFFECTIVE}</p>

        <p style={{ marginBottom: 32, lineHeight: 1.7 }}>
          This Privacy Policy explains how The Greek Life Corp ("Gated," "we," "us") collects, uses, and shares information when you use the Platform. Application data is primarily stored in <strong style={{ color: "white" }}>Supabase</strong> (database, authentication, and file storage as configured), and payments may be processed by <strong style={{ color: "white" }}>Stripe</strong> or other processors.
        </p>

        <Section n="1" title="Information we collect">
          <p style={{ marginBottom: 12 }}>Depending on how you use Gated, we or our service providers may process:</p>
          <ul style={{ margin: "0 0 16px 1.1rem", padding: 0, listStyleType: "disc", lineHeight: 1.75 }}>
            <li style={{ marginBottom: 10 }}><strong style={{ color: "white" }}>Account and authentication data.</strong> For example, email address and credentials managed through Supabase Auth. Passwords are handled using industry-standard secure authentication practices; we do not intend for staff to access your plaintext password.</li>
            <li style={{ marginBottom: 10 }}><strong style={{ color: "white" }}>Profile and directory information you choose to provide</strong> (such as name, username or handle, school or university affiliation, profile photo, bio, or similar fields available in the app).</li>
            <li style={{ marginBottom: 10 }}><strong style={{ color: "white" }}>Event and organization data you submit</strong> (titles, descriptions, dates, times, locations, images, prices shown on listings, capacity, fundraising flags, and related metadata).</li>
            <li style={{ marginBottom: 10 }}><strong style={{ color: "white" }}>RSVPs, registrations, ticketing, and check-in data</strong> (for example, ticket codes, registration status, payment status fields as returned by our processor, and scan/check-in records needed to operate entry).</li>
            <li style={{ marginBottom: 10 }}><strong style={{ color: "white" }}>Organization membership and roles</strong> where applicable (such as admin or scan permissions for chapter tools).</li>
            <li style={{ marginBottom: 10 }}><strong style={{ color: "white" }}>Communications you send us</strong> (such as support emails to <a href={`mailto:${SUPPORT}`} style={{ color: "rgba(167,139,250,0.9)" }}>{SUPPORT}</a>).</li>
            <li style={{ marginBottom: 10 }}><strong style={{ color: "white" }}>Technical and security information</strong> automatically created when you use online services—for example, device/browser data, IP address, and logs from our hosting and database providers as needed to secure and operate the Platform.</li>
          </ul>
          <p><strong style={{ color: "white" }}>Payment card data:</strong> Full card numbers and CVV/CVC are processed by our payment processor; we do not store those values in our database. We may receive and store limited non-sensitive payment metadata from the processor (such as payment status or transaction identifiers).</p>
        </Section>

        <Section n="2" title="How we use information">
          We use information to create and secure accounts; provide event discovery, hosting, and registration features; process or facilitate payments through Stripe (or other processors); communicate with you about the Platform and support requests; detect abuse, fraud, and security issues; comply with law; and improve reliability and performance.
        </Section>

        <Section n="3" title="How we share information">
          <p style={{ marginBottom: 12 }}>We share information with <strong style={{ color: "white" }}>service providers</strong> that help us run the Platform—for example, Supabase (data hosting and authentication), Stripe (payments), and infrastructure or API providers as configured. We may disclose information if required by law, legal process, or to protect users and the public. We may share aggregated or de-identified information that cannot reasonably identify you.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: "white" }}>We do not sell your personal information</strong> (as "sell" is commonly understood for targeted advertising data brokerage). We do not share personal information for cross-context behavioral advertising unless we add that feature and update this Policy.</p>
          <p>Content you post publicly on the Platform (such as event listings) may be visible to other users according to product design and university or organization visibility rules.</p>
        </Section>

        <Section n="4" title="Retention">
          We retain information as long as your account is active and as needed to provide the service, comply with law, resolve disputes, and enforce our agreements. You may request deletion of your account or specific data subject to legal exceptions and technical feasibility; contact <a href={`mailto:${SUPPORT}`} style={{ color: "rgba(167,139,250,0.9)" }}>{SUPPORT}</a>.
        </Section>

        <Section n="5" title="Security">
          We use reasonable administrative, technical, and organizational measures appropriate to the nature of the service. No online service is completely secure; you should protect your password and device.
        </Section>

        <Section n="6" title="Your choices and rights">
          Depending on where you live, you may have rights to access, correct, delete, or export personal information, or to opt out of certain processing. Contact us at <a href={`mailto:${SUPPORT}`} style={{ color: "rgba(167,139,250,0.9)" }}>{SUPPORT}</a>. We will respond consistent with applicable law.
        </Section>

        <Section n="7" title="Children">
          The Platform is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe we have collected such information, contact us and we will take appropriate steps.
        </Section>

        <Section n="8" title="International users">
          We operate from the United States. If you access the Platform from other countries, you understand that information may be transferred to and processed in the United States or other jurisdictions where our providers operate.
        </Section>

        <Section n="9" title="Changes to this Policy">
          We may update this Privacy Policy. We will post the revised Policy in the app (and update the effective date) or provide notice as required by law.
        </Section>

        <Section n="10" title="Contact">
          Privacy inquiries: <a href={`mailto:${SUPPORT}`} style={{ color: "rgba(167,139,250,0.9)" }}>{SUPPORT}</a>
        </Section>

        <div style={{ marginTop: 56, padding: "24px", borderRadius: 16, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 14, color: "rgba(167,139,250,0.8)", margin: 0 }}>Also see our</p>
          <Link href="/terms" style={{ color: "white", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>Terms of Service →</Link>
        </div>

        <p style={{ marginTop: 40, fontSize: 12, color: "rgba(167,139,250,0.5)" }}>Last updated: {EFFECTIVE}</p>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ color: "white", fontSize: 17, fontWeight: 700, marginBottom: 12 }}>
        {n}. {title}
      </h2>
      <div style={{ lineHeight: 1.75, color: "rgba(220,210,255,0.85)", fontSize: 15 }}>{children}</div>
    </div>
  );
}

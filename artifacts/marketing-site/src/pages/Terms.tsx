import { Link } from "wouter";

const SUPPORT = "support@gatedapp.us";
const EFFECTIVE = "April 30, 2026";

export default function Terms() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0522 0%, #1a0a3e 50%, #0f0522 100%)", color: "rgba(220,210,255,0.9)", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 80px" }}>

        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(167,139,250,0.8)", fontSize: 14, textDecoration: "none", marginBottom: 40 }}>
          ← Back to home
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚖️</div>
          <span style={{ fontSize: 13, color: "rgba(167,139,250,0.7)", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>The Greek Life Corp</span>
        </div>

        <h1 style={{ fontSize: "clamp(28px,5vw,42px)", fontWeight: 800, color: "white", marginBottom: 8, lineHeight: 1.15 }}>Terms of Service</h1>
        <p style={{ fontSize: 14, color: "rgba(167,139,250,0.7)", marginBottom: 48 }}>Effective date: {EFFECTIVE}</p>

        <p style={{ marginBottom: 16 }}>
          <strong style={{ color: "white" }}>Company:</strong> The Greek Life Corp ("Gated," "we," "our," or "us").
        </p>
        <p style={{ marginBottom: 32, lineHeight: 1.7 }}>
          These Terms of Service ("Terms") govern your access to and use of the Gated mobile application, website, and related services (collectively, the "Platform"). By creating an account, browsing, hosting, administering, or attending events through the Platform, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Platform.
        </p>

        <Section n="1" title="What the Platform is (and is not)">
          Gated provides software for discovering, listing, and coordinating campus- and Greek-life-related events. We are a technology provider only. We do not sponsor, organize, host, supervise, or conduct in-person events listed on the Platform, and we are not responsible for what happens at any physical location.
        </Section>

        <Section n="2" title="Eligibility and accounts">
          You must meet the age and eligibility requirements shown in the app (including being at least the age of majority where you live, or eighteen (18), whichever is greater, unless we state otherwise for your account type). You agree that registration information is accurate and that you will protect your login credentials. If you create or manage an organization profile, you represent that you have authority to bind that organization to these Terms where applicable.
        </Section>

        <Section n="3" title="Acceptable use">
          You will use the Platform only for lawful purposes and in line with these Terms. You may not misuse, interfere with, reverse engineer, or overload the Platform; harass others; impersonate people or organizations; or share unlawful, defamatory, or infringing content.
        </Section>

        <Section n="4" title="Events, organizers, and attendees">
          Events are created and run by independent organizers (e.g., chapters, student groups, or hosts). Listings are user-generated. Gated does not verify the legality, safety, quality, attendance limits, or accuracy of every listing. Attendance is voluntary and at your own risk. To the fullest extent permitted by law, Gated is not liable for injury, loss, theft, illness, death, property damage, or other harm arising from or related to any event, venue, travel, or interaction with other users—whether or not the event was found through the Platform.
        </Section>

        <Section n="5" title="Alcohol, substances, health, and conduct">
          <p style={{ marginBottom: 12 }}><strong style={{ color: "white" }}>No alcohol or drug sales on the Platform.</strong> You may not use Gated to sell, ship, or commercially distribute alcohol, cannabis, or illegal drugs, or to facilitate unlawful transactions.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: "white" }}>Real-world events are not run by Gated.</strong> If alcohol or other substances appear at a real-world event, that is solely a matter between attendees, organizers, venues, universities, and the law. Gated does not check IDs, monitor consumption, enforce university or venue policies, or ensure compliance with alcohol or drug laws. Descriptions such as "social" or similar labels are informational only and are not an endorsement of drinking, hazing, or any illegal activity.</p>
          <p style={{ marginBottom: 12 }}>Organizers are solely responsible for lawful conduct at their events—including any age verification, permits, university risk-management rules, insurance, security, and safe transportation. Attendees are responsible for their own choices and safety.</p>
          <p>Nothing on the Platform is medical, legal, or safety advice.</p>
        </Section>

        <Section n="6" title="Payments and ticketing">
          <p style={{ marginBottom: 12 }}>Paid features may use payment processors such as <strong style={{ color: "white" }}>Stripe</strong> (or others we add). When you pay, you also agree to the applicable processor's terms and privacy notice. <strong style={{ color: "white" }}>Gated does not store full payment card numbers, card security codes (such as CVV/CVC), or magnetic-stripe data in our own application database.</strong> That sensitive card data is handled by the payment processor under its PCI-DSS obligations. We may store limited records needed to run the Platform—such as payment or checkout status, processor transaction or session identifiers, ticket and registration records, amounts, and similar non-card data.</p>
          <p>As between a buyer and an organizer, commercial terms (other than our Platform rules) are primarily between those parties; Gated's role is facilitating technology and, where applicable, payment flows through third parties.</p>
        </Section>

        <Section n="7" title="Refunds">
          <strong style={{ color: "white" }}>Refunds.</strong> Except where required by law, ticket purchases are generally <strong style={{ color: "white" }}>non-refundable</strong>. If an event is <strong style={{ color: "white" }}>cancelled</strong> by the organizer or removed from the Platform because the event is cancelled, you may request a refund by emailing <strong style={{ color: "white" }}>{SUPPORT}</strong> from the email associated with your account or purchase, including the event name and date. Gated reviews requests in its reasonable discretion. Approved refunds are processed to the original payment method through our payment processor and may take several business days to appear. Gated does not guarantee refunds for schedule conflicts, change of mind, no-shows, or other reasons except as stated here or as required by applicable law.
        </Section>

        <Section n="8" title="Organizer responsibilities">
          If you create or manage events or organization pages, you represent that you have authority to do so and will follow applicable laws, university and venue rules, and risk-management requirements. You are responsible for accurate listings (including date, time, location, price, capacity, and fundraising disclosures), for canceling or updating events honestly, and for how you treat attendees and their data in the real world.
        </Section>

        <Section n="9" title="Content and intellectual property">
          The Platform's software, branding, and our proprietary materials are owned by or licensed to Gated. You retain ownership of content you submit; you grant Gated a license to host, display, and distribute that content as needed to operate and promote the Platform (subject to your account settings and applicable law).
        </Section>

        <Section n="10" title="Disclaimers">
          <strong style={{ color: "white" }}>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE."</strong> WE DISCLAIM WARRANTIES TO THE MAXIMUM EXTENT PERMITTED BY LAW, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </Section>

        <Section n="11" title="Limitation of liability">
          To the fullest extent permitted by law, The Greek Life Corp shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or loss of profits, data, or goodwill. In no event shall Gated's aggregate liability arising out of these Terms or the Platform exceed the greater of (a) U.S. $100 or (b) the amounts you paid to Gated in fees for the Platform in the twelve (12) months before the claim (if any). Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the minimum permitted by law.
        </Section>

        <Section n="12" title="Indemnification">
          You agree to indemnify, defend, and hold harmless The Greek Life Corp and its affiliates, officers, and agents from third-party claims, damages, and expenses (including reasonable attorneys' fees) arising from your use of the Platform, your events or listings, your violation of these Terms, or your violation of others' rights.
        </Section>

        <Section n="13" title="Changes, suspension, and termination">
          We may modify these Terms or the Platform. We will post updated Terms in the app or as otherwise required by law. Continued use after changes means you accept the updates where permitted. We may suspend or terminate accounts that risk safety, legality, or the integrity of the Platform.
        </Section>

        <Section n="14" title="Governing law and venue">
          These Terms are governed by the laws of the State of New Jersey, United States, without regard to conflict-of-law rules. You agree to the exclusive jurisdiction of the state and federal courts located in Monmouth County, New Jersey, subject to applicable law.
        </Section>

        <Section n="15" title="Contact">
          Questions about these Terms: <a href={`mailto:${SUPPORT}`} style={{ color: "rgba(167,139,250,0.9)" }}>{SUPPORT}</a>
        </Section>

        <div style={{ marginTop: 56, padding: "24px", borderRadius: 16, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 14, color: "rgba(167,139,250,0.8)", margin: 0 }}>Also see our</p>
          <Link href="/privacy" style={{ color: "white", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>Privacy Policy →</Link>
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

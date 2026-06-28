import { Link } from "wouter";

const SUPPORT = "support@gated.us";
const EFFECTIVE = "June 22, 2026";
const LAST_UPDATED = "June 22, 2026";
const ADDRESS = "14 Arbach Lane, Manalapan, New Jersey 07726";

const C = {
  bg: "linear-gradient(135deg, #0f0522 0%, #1a0a3e 50%, #0f0522 100%)",
  text: "rgba(220,210,255,0.9)",
  muted: "rgba(167,139,250,0.7)",
  accent: "rgba(167,139,250,0.9)",
  white: "white",
  subtle: "rgba(220,210,255,0.85)",
};

export default function Privacy() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 80px" }}>

        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.accent, fontSize: 14, textDecoration: "none", marginBottom: 40 }}>
          ← Back to home
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔒</div>
          <span style={{ fontSize: 13, color: C.muted, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>The Greek Life Corp</span>
        </div>

        <h1 style={{ fontSize: "clamp(28px,5vw,42px)", fontWeight: 800, color: C.white, marginBottom: 8, lineHeight: 1.15 }}>Privacy Policy</h1>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>
          <span><strong style={{ color: C.white }}>Effective Date:</strong> {EFFECTIVE}</span>
          <span style={{ margin: "0 12px", opacity: 0.4 }}>|</span>
          <span><strong style={{ color: C.white }}>Last Updated:</strong> {LAST_UPDATED}</span>
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>
          <strong style={{ color: C.white }}>Legal Entity / Data Controller:</strong> The Greek Life Corp., a Delaware corporation
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>
          <strong style={{ color: C.white }}>Platform / Brand Name:</strong> Gated
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>
          <strong style={{ color: C.white }}>Privacy Contact / Consumer Requests:</strong> <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a>
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 48 }}>
          <strong style={{ color: C.white }}>Mailing Address:</strong> {ADDRESS}
        </div>

        {/* TOC */}
        <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 14, padding: "20px 24px", marginBottom: 48 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 12, letterSpacing: "0.06em" }}>TABLE OF CONTENTS</p>
          <ol style={{ margin: 0, padding: "0 0 0 1.2rem", lineHeight: 2, fontSize: 13, color: C.accent }}>
            {[
              "Introduction and Scope","Relationship to Terms of Service","Who This Policy Applies To",
              "Information We Collect","How We Collect Information","How We Use Information",
              "How We Share and Disclose Information","Cookies, Local Storage, and Similar Technologies",
              "Payment Information","Push Notifications and Device Tokens",
              "User Content, Event Listings, and Visibility","Automated Processing and Profiling",
              "Data Retention","Security","Children's Privacy","International and Cross-Border Processing",
              "Your Privacy Choices","U.S. State Privacy Rights (All 50 States)",
              "California Privacy Notice (CCPA / CPRA)","Other State-Specific Disclosures",
              "Changes to This Privacy Policy","Contact Us",
            ].map((item, i) => (
              <li key={i} style={{ paddingLeft: 4 }}>{item}</li>
            ))}
          </ol>
        </div>

        <Section n="1" title="Introduction and Scope">
          <p style={{ marginBottom: 12 }}>This Privacy Policy ("Policy") describes how The Greek Life Corp. ("Gated," "we," "us," or "our") collects, uses, discloses, and otherwise processes information when you access or use:</p>
          <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
            <li>the Gated mobile application (including iOS builds distributed through the Apple App Store and TestFlight);</li>
            <li>our website and web application, if any; and</li>
            <li>related services, APIs, support channels, and features (collectively, the "Platform").</li>
          </ul>
          <p style={{ marginBottom: 12 }}>We operate the Platform as a technology provider for discovering, listing, coordinating, registering for, ticketing, messaging about, and managing campus- and community-related events and organizations. We are not a university and are not directly associated with, affiliated with, or endorsed by any educational institution. See our Terms of Service for more information about the Platform's role and limitations.</p>
          <p>By using the Platform, you acknowledge that you have read this Policy. If you do not agree with this Policy, do not use the Platform.</p>
        </Section>

        <Section n="2" title="Relationship to Terms of Service">
          <p style={{ marginBottom: 12 }}>This Policy should be read together with our <Link href="/terms" style={{ color: C.accent }}>Terms of Service</Link>. Defined terms in the Terms of Service apply here unless this Policy defines them differently.</p>
          <p>If there is a conflict between this Policy and the Terms regarding privacy or data processing, this Policy controls for privacy matters. If there is a conflict regarding use of the Platform, events, payments, or liability, the Terms control.</p>
        </Section>

        <Section n="3" title="Who This Policy Applies To">
          <p style={{ marginBottom: 8 }}>This Policy applies to:</p>
          <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
            <li>Individual users who create accounts, browse events, register for events, purchase tickets, follow organizations, use maps, messaging, or event chat;</li>
            <li>Organization users who create or manage organization profiles, events, ticketing, team roles, payouts, or check-in tools; and</li>
            <li>Visitors who interact with the Platform without creating an account, to the extent we collect information from them.</li>
          </ul>
          <p style={{ marginBottom: 8 }}>This Policy does not apply to:</p>
          <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
            <li>Third-party websites, apps, or services linked from or integrated with the Platform (such as payment processors or map providers), which have their own privacy policies;</li>
            <li>In-person events hosted by independent organizers, which may have separate privacy practices outside our control; or</li>
            <li>Information you provide directly to another user or organizer outside the Platform.</li>
          </ul>
        </Section>

        <Section n="4" title="Information We Collect">
          <p style={{ marginBottom: 12 }}>The information we collect depends on how you use the Platform. We may collect the following categories of information:</p>

          <SubSection title="4.1 Account and Authentication Information">
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Email address</li>
              <li>Password or authentication credentials (processed through Supabase Auth; we do not intend for staff to access your plaintext password)</li>
              <li>Internal user identifiers (such as Supabase auth.users UUID)</li>
              <li>Account type (individual or organization)</li>
              <li>Session and authentication tokens stored on your device (including native app secure storage / preferences on iOS)</li>
            </ul>
          </SubSection>

          <SubSection title="4.2 Profile and Directory Information You Provide">
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Full name or display name</li>
              <li>Username or handle</li>
              <li>Profile photo or avatar (including images you upload or default avatar URLs)</li>
              <li>Bio or profile description</li>
              <li>Self-reported university or school affiliation</li>
              <li>Organization name, organization profile details, and related metadata</li>
              <li>Contact information you choose to provide in support requests</li>
            </ul>
          </SubSection>

          <SubSection title="4.3 Event, Organization, and Community Information">
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Event titles, descriptions, dates, times, locations, addresses, coordinates, images, prices, capacity, categories, and fundraising flags</li>
              <li>Organization pages, follow relationships, and membership or role assignments (such as admin, scan/check-in permissions)</li>
              <li>RSVP, registration, waitlist, and join-request status</li>
              <li>Ticket records, ticket codes, QR check-in / scan records, and attendance-related metadata</li>
              <li>Fundraiser or donation-related event settings, where enabled</li>
            </ul>
          </SubSection>

          <SubSection title="4.4 Messaging and Event Chat Information">
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Messages and content you send through Platform messaging or event chat features</li>
              <li>Message timestamps and sender identifiers associated with chat functionality</li>
              <li>Event chat participation tied to event registration eligibility</li>
            </ul>
          </SubSection>

          <SubSection title="4.5 Payment and Payout Information">
            <p style={{ marginBottom: 8 }}>We use third-party payment processors (such as Stripe) for paid tickets, registrations, and organizer payouts.</p>
            <p style={{ marginBottom: 8 }}><strong style={{ color: C.white }}>We do not store full payment card numbers, CVV/CVC codes, or magnetic-stripe data in our own application database.</strong></p>
            <p style={{ marginBottom: 8 }}>We may store or receive limited payment-related information such as:</p>
            <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Payment or checkout status</li>
              <li>Stripe customer, session, payment intent, charge, or Connect account identifiers</li>
              <li>Ticket purchase amounts, currency, timestamps, and refund status fields</li>
              <li>Payout onboarding status for eligible organization accounts</li>
            </ul>
            <p>Sensitive payment card data is processed directly by Stripe under its own privacy notice and PCI-DSS obligations.</p>
          </SubSection>

          <SubSection title="4.6 Push Notification and Device Information (Native App)">
            <p style={{ marginBottom: 8 }}>If you use the native mobile app and grant permission, we may collect:</p>
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Push notification device tokens (such as Apple Push Notification service tokens on iOS)</li>
              <li>Device platform (for example, ios)</li>
              <li>Notification delivery metadata and in-app notification history stored in our database</li>
            </ul>
          </SubSection>

          <SubSection title="4.7 Technical, Log, and Security Information">
            <p style={{ marginBottom: 8 }}>Automatically collected or generated information may include:</p>
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>IP address</li>
              <li>Browser or WebView type and version</li>
              <li>Device type, operating system, and app version</li>
              <li>General usage logs, error logs, and security logs from our hosting and database providers</li>
              <li>Date/time stamps and diagnostic data needed to operate, secure, and troubleshoot the Platform</li>
            </ul>
          </SubSection>

          <SubSection title="4.8 Camera and QR Check-In (Where Enabled)">
            <p>If you use QR ticket scanning or similar check-in features, the Platform may access your device camera locally through the browser or app to scan codes. We do not intend to store raw camera video; scan results and validation outcomes may be logged for event operations.</p>
          </SubSection>

          <SubSection title="4.9 Location-Related Information">
            <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Event and organization location data you or other users submit (addresses, map coordinates, campus-related place names)</li>
              <li>Map interactions processed through map providers such as Mapbox</li>
            </ul>
            <p>We do not currently use device GPS or precise real-time geolocation tracking as a core feature of the Platform, unless a specific feature you enable in the future requests that permission and we update this Policy.</p>
          </SubSection>

          <SubSection title="4.10 Communications with Us">
            <p>If you contact us at <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a> (or other support channels we provide), we collect the information you include in your message, such as your email address, name, event details, refund requests, and attachments.</p>
          </SubSection>

          <SubSection title="4.11 Information We Do Not Intentionally Collect">
            <p style={{ marginBottom: 8 }}>We do not intentionally collect:</p>
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Social Security numbers</li>
              <li>Driver's license numbers (except if you voluntarily include them in a support email, which we discourage)</li>
              <li>Health or medical records</li>
              <li>Biometric identifiers for identification purposes</li>
              <li>Information from children under 13 (see Section 15)</li>
            </ul>
          </SubSection>
        </Section>

        <Section n="5" title="How We Collect Information">
          <p style={{ marginBottom: 8 }}>We collect information:</p>
          <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
            <li>Directly from you when you register, create a profile, create or join events, purchase tickets, send messages, update settings, or contact support;</li>
            <li>Automatically when you use the Platform, through logs, cookies/local storage, session storage, and similar technologies;</li>
            <li>From your device when you grant permissions (such as push notifications or camera access for QR scanning);</li>
            <li>From payment processors (such as payment confirmation metadata from Stripe);</li>
            <li>From other users when they tag, list, register, message, or otherwise interact with content associated with you (for example, organization admins viewing attendee registration lists); and</li>
            <li>From service providers that help us operate the Platform (such as authentication, hosting, and notification delivery).</li>
          </ul>
        </Section>

        <Section n="6" title="How We Use Information">
          <p style={{ marginBottom: 12 }}>We use information for the following business and commercial purposes:</p>
          <SubSection title="6.1 Provide and Operate the Platform">
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Create, authenticate, and maintain accounts</li>
              <li>Display profiles, events, organizations, maps, tickets, and registrations</li>
              <li>Enable event discovery, search, filtering by university/community, and sharing</li>
              <li>Operate event chat, messaging, notifications, and check-in features</li>
              <li>Process or facilitate payments and payouts through third-party processors</li>
            </ul>
          </SubSection>
          <SubSection title="6.2 Communicate with You">
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Send service-related messages, security alerts, and support responses</li>
              <li>Send push notifications about events, registrations, reminders, followers, or Platform updates (subject to your device and in-app settings)</li>
            </ul>
          </SubSection>
          <SubSection title="6.3 Safety, Security, and Integrity">
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Detect, investigate, and prevent fraud, abuse, unauthorized access, and violations of our Terms</li>
              <li>Enforce our Terms and protect users and the public</li>
              <li>Debug, monitor performance, and improve reliability</li>
            </ul>
          </SubSection>
          <SubSection title="6.4 Legal and Compliance">
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Comply with applicable law, regulation, legal process, or governmental request</li>
              <li>Establish, exercise, or defend legal claims</li>
              <li>Maintain records required by tax, payment, or accounting rules</li>
            </ul>
          </SubSection>
          <SubSection title="6.5 Improve and Develop the Platform">
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Analyze aggregated or de-identified usage trends</li>
              <li>Develop new features and fix bugs</li>
            </ul>
          </SubSection>
          <SubSection title="6.6 With Your Direction or Consent">
            <p>For purposes disclosed at the time of collection or with your consent.</p>
          </SubSection>
        </Section>

        <Section n="7" title="How We Share and Disclose Information">
          <p style={{ marginBottom: 12 }}>We may disclose information in the following circumstances:</p>
          <SubSection title="7.1 Service Providers and Processors">
            <p style={{ marginBottom: 8 }}>We share information with vendors that process data on our behalf to help us operate the Platform, including providers for:</p>
            <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Database hosting, authentication, and file storage (Supabase)</li>
              <li>Payment processing and organizer payouts (Stripe)</li>
              <li>Backend/API hosting (Render or similar infrastructure)</li>
              <li>Map display and geocoding (Mapbox)</li>
              <li>Push notification delivery (Apple Push Notification service and related mobile platform services)</li>
              <li>Email or support tooling, if configured</li>
            </ul>
            <p>These providers are authorized to use information only as needed to provide services to us and subject to contractual or legal obligations.</p>
          </SubSection>
          <SubSection title="7.2 Other Users and Organizers (Platform Functionality)">
            <p style={{ marginBottom: 8 }}>Depending on product design and your actions, information may be visible to other users, such as:</p>
            <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Public or community-visible event listings</li>
              <li>Organization profile pages</li>
              <li>Attendee/registrant information visible to event organizers for events you join</li>
              <li>Messages you send in chats or conversations</li>
              <li>Profile details shown in search, tickets, or event contexts</li>
            </ul>
            <p>Organizers are independent third parties. If an organizer collects or uses your information outside the Platform, their use is governed by their own practices and applicable law.</p>
          </SubSection>
          <SubSection title="7.3 Business Transfers">
            <p>If we are involved in a merger, acquisition, financing, reorganization, bankruptcy, or sale of assets, information may be transferred as part of that transaction, subject to applicable law and notice requirements.</p>
          </SubSection>
          <SubSection title="7.4 Legal and Safety Disclosures">
            <p style={{ marginBottom: 8 }}>We may disclose information if we believe in good faith that disclosure is necessary to:</p>
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Comply with law, regulation, legal process, or governmental request;</li>
              <li>Protect the rights, property, or safety of Gated, our users, or the public;</li>
              <li>Detect or prevent fraud or security issues; or</li>
              <li>Enforce our Terms.</li>
            </ul>
          </SubSection>
          <SubSection title="7.5 Aggregated and De-Identified Information">
            <p>We may share aggregated or de-identified information that cannot reasonably be used to identify you.</p>
          </SubSection>
          <SubSection title="7.6 Sale or Sharing for Cross-Context Behavioral Advertising">
            <p style={{ marginBottom: 8 }}><strong style={{ color: C.white }}>We do not sell your personal information for money.</strong></p>
            <p style={{ marginBottom: 8 }}>We do not share your personal information for cross-context behavioral advertising (as those terms are defined under California law) as of the Effective Date of this Policy.</p>
            <p>If we change this practice in the future, we will update this Policy and provide any opt-out rights required by law.</p>
          </SubSection>
        </Section>

        <Section n="8" title="Cookies, Local Storage, and Similar Technologies">
          <p style={{ marginBottom: 8 }}>We and our service providers use cookies, local storage, session storage, and similar technologies to:</p>
          <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
            <li>Keep you signed in</li>
            <li>Remember preferences (such as dark mode)</li>
            <li>Store temporary signup or session hints</li>
            <li>Operate authentication securely, including native app session persistence through Capacitor Preferences on iOS</li>
          </ul>
          <p style={{ marginBottom: 12 }}>You can control cookies through browser settings, but disabling them may affect Platform functionality. Mobile OS settings control push notifications and camera permissions separately.</p>
          <p>We do not respond to "Do Not Track" browser signals in a uniform way because there is no industry standard for DNT. We treat DNT as a preference signal only where required by applicable law.</p>
        </Section>

        <Section n="9" title="Payment Information">
          <p style={{ marginBottom: 12 }}>Payments and payouts are handled by Stripe (and potentially other processors we add). When you make or receive payments through the Platform, Stripe's privacy policy and terms apply to Stripe's processing of payment information.</p>
          <p style={{ marginBottom: 12 }}>We may receive limited transaction metadata from Stripe to confirm purchases, issue tickets, support refunds for cancelled events, and operate organizer payout features.</p>
          <p>For more information, see Stripe's privacy notice at: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: C.accent }}>stripe.com/privacy</a></p>
        </Section>

        <Section n="10" title="Push Notifications and Device Tokens">
          <p style={{ marginBottom: 8 }}>If you use the native Gated app and opt in to notifications, we store your device push token in our database so our server can send notifications such as:</p>
          <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
            <li>Event reminders</li>
            <li>New event alerts from followed organizations</li>
            <li>New follower alerts</li>
            <li>Other service notifications we may add</li>
          </ul>
          <p>You can disable push notifications in your device settings at any time. Disabling notifications may not delete stored tokens immediately; you may request deletion as described in Section 17.</p>
        </Section>

        <Section n="11" title="User Content, Event Listings, and Visibility">
          <p style={{ marginBottom: 12 }}>You choose much of the information you provide on the Platform. Some content may be visible to other users based on product design, including public event listings and organization pages.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: C.white }}>Important:</strong> Content you publish may be seen, copied, or reused by other users outside our control. Please do not post sensitive personal information you do not want others to see.</p>
          <p>Because Gated is not affiliated with any university, your self-reported university affiliation and organization names are user-provided and do not mean the university has reviewed or approved your content.</p>
        </Section>

        <Section n="12" title="Automated Processing and Profiling">
          <p style={{ marginBottom: 12 }}>We do not use automated decision-making that produces legal or similarly significant effects about you without human review.</p>
          <p>We may use basic automated systems for fraud prevention, security, spam detection, and Platform reliability. We do not use personal information for targeted advertising profiling as of the Effective Date.</p>
        </Section>

        <Section n="13" title="Data Retention">
          <p style={{ marginBottom: 12 }}>We retain information for as long as reasonably necessary to:</p>
          <ul style={{ margin: "0 0 16px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
            <li>Provide the Platform and maintain your account</li>
            <li>Meet legal, tax, accounting, and payment record obligations</li>
            <li>Resolve disputes and enforce our agreements</li>
            <li>Maintain security and backup integrity</li>
          </ul>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(124,58,237,0.2)", marginBottom: 12 }}>
            {[
              ["Account/profile data", "While account is active, then deleted or anonymized subject to legal exceptions"],
              ["Event and ticket records", "As needed for event operations, refunds, disputes, and legal compliance"],
              ["Payment metadata", "As required for financial recordkeeping and processor rules"],
              ["Support emails", "As needed to resolve requests and maintain support history"],
              ["Logs/security data", "For a limited operational period unless needed for incident investigation"],
              ["Device push tokens", "Until you log out, uninstall, request deletion, or token is refreshed/replaced"],
            ].map(([type, approach], i) => (
              <div key={i} style={{ display: "flex", borderBottom: i < 5 ? "1px solid rgba(124,58,237,0.12)" : "none", background: i % 2 === 0 ? "rgba(124,58,237,0.06)" : "rgba(0,0,0,0.12)" }}>
                <div style={{ padding: "10px 14px", width: "38%", flexShrink: 0, color: C.muted, fontSize: 12, fontWeight: 600 }}>{type}</div>
                <div style={{ padding: "10px 14px", fontSize: 12, color: C.subtle, lineHeight: 1.5 }}>{approach}</div>
              </div>
            ))}
          </div>
          <p>You may request deletion as described in Section 17, subject to legal exceptions and technical feasibility.</p>
        </Section>

        <Section n="14" title="Security">
          <p style={{ marginBottom: 8 }}>We use reasonable administrative, technical, and organizational safeguards designed to protect information appropriate to the nature of the Platform, including:</p>
          <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
            <li>Authentication through Supabase Auth</li>
            <li>Access controls and row-level security in our database, where configured</li>
            <li>HTTPS/TLS for data in transit</li>
            <li>Use of reputable infrastructure and payment processors</li>
          </ul>
          <p>No method of transmission or storage is 100% secure. You are responsible for safeguarding your password and device. If you believe your account has been compromised, contact <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a> promptly.</p>
        </Section>

        <Section n="15" title="Children's Privacy">
          <p style={{ marginBottom: 12 }}>The Platform is not directed to children under 13, and we do not knowingly collect personal information from children under 13.</p>
          <p style={{ marginBottom: 12 }}>If you believe we have collected personal information from a child under 13, contact us at <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a> and we will take appropriate steps to delete it, consistent with applicable law.</p>
          <p>Users must meet the age requirements in our Terms of Service (generally at least 18 or the age of majority, unless otherwise stated for a specific account type).</p>
        </Section>

        <Section n="16" title="International and Cross-Border Processing">
          <p style={{ marginBottom: 12 }}>Gated is operated from the United States. If you access the Platform from outside the United States, you understand that your information may be transferred to, stored in, and processed in the United States and other countries where we or our service providers operate.</p>
          <p>Those countries may have data protection laws different from your country of residence. Where required, we will implement appropriate safeguards; contact us for more information.</p>
        </Section>

        <Section n="17" title="Your Privacy Choices">
          <p style={{ marginBottom: 8 }}>Depending on your location and the features you use, you may have choices including:</p>
          <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
            <li><strong style={{ color: C.white }}>Account settings:</strong> Update profile information in the app</li>
            <li><strong style={{ color: C.white }}>Notifications:</strong> Adjust device-level push notification permissions</li>
            <li><strong style={{ color: C.white }}>Camera:</strong> Allow or deny camera access for QR scanning</li>
            <li><strong style={{ color: C.white }}>Marketing:</strong> We do not currently sell personal information or use it for cross-context behavioral advertising</li>
            <li><strong style={{ color: C.white }}>Account deletion:</strong> Request account deletion by emailing <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a></li>
            <li><strong style={{ color: C.white }}>Access/correction/deletion:</strong> See Section 18 and Section 19</li>
          </ul>
          <p>We may need to verify your identity before fulfilling certain requests.</p>
        </Section>

        <Section n="18" title="U.S. State Privacy Rights (All 50 States)">
          <p style={{ marginBottom: 12 }}>Gated intends to operate across all 50 U.S. states. Privacy laws vary by state. Depending on where you live, you may have some or all of the following rights, subject to applicable exceptions:</p>
          <ul style={{ margin: "0 0 16px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
            <li><strong style={{ color: C.white }}>Right to know / access</strong> — confirm whether we process your personal information and obtain a copy of certain information;</li>
            <li><strong style={{ color: C.white }}>Right to correct</strong> — request correction of inaccurate personal information;</li>
            <li><strong style={{ color: C.white }}>Right to delete</strong> — request deletion of personal information we collected from you;</li>
            <li><strong style={{ color: C.white }}>Right to portability</strong> — obtain a portable copy of certain information, where applicable;</li>
            <li><strong style={{ color: C.white }}>Right to opt out of:</strong> sales of personal information (we do not sell personal information as of the Effective Date); sharing for targeted/cross-context behavioral advertising (we do not engage in this as of the Effective Date); certain profiling in furtherance of decisions producing legal or similarly significant effects (we do not engage in this as of the Effective Date);</li>
            <li><strong style={{ color: C.white }}>Right to limit use and disclosure of sensitive personal information,</strong> where applicable;</li>
            <li><strong style={{ color: C.white }}>Right to non-discrimination</strong> for exercising privacy rights.</li>
          </ul>

          <SubSection title="How to Submit a Request">
            <p style={{ marginBottom: 8 }}>Email <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a> with the subject line "Privacy Request" and include:</p>
            <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Your full name</li>
              <li>The email address associated with your Gated account</li>
              <li>The state you reside in</li>
              <li>The specific right you wish to exercise</li>
              <li>Enough detail for us to locate your account/records</li>
            </ul>
            <p>We will respond within the timeframe required by applicable law (for example, 45 days under California law, with a permitted extension where allowed).</p>
          </SubSection>

          <SubSection title="Verification">
            <p>We may request additional information to verify your identity before fulfilling a request. If you use an authorized agent, we may require proof of authorization and verification of your identity, as permitted by law.</p>
          </SubSection>

          <SubSection title="Appeals">
            <p>If we deny your request, you may appeal by replying to our decision email with "Privacy Appeal." If your appeal is denied and your state law provides a complaint right, we will explain how to contact your state regulator where applicable.</p>
          </SubSection>
        </Section>

        <Section n="19" title="California Privacy Notice (CCPA / CPRA)">
          <p style={{ marginBottom: 12 }}>This Section applies to California residents and supplements the rest of this Policy. California law uses defined terms such as "personal information," "sensitive personal information," "sell," "share," "business purpose," and "service provider/contractor." This Section uses those terms as defined in the California Consumer Privacy Act, as amended by the California Privacy Rights Act (collectively, "California Privacy Laws").</p>

          <SubSection title="19.1 Notice at Collection (California)">
            <p>In the preceding 12 months, we may collect the categories of personal information listed below for the business/commercial purposes described in Section 6. Sources of collection: See Section 5. Retention: See Section 13. Selling or Sharing: We do not sell personal information. We do not share personal information for cross-context behavioral advertising.</p>
          </SubSection>

          <SubSection title="19.2 Categories of Personal Information Collected (Summary)">
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(124,58,237,0.2)" }}>
              <div style={{ display: "flex", background: "rgba(124,58,237,0.15)", borderBottom: "1px solid rgba(124,58,237,0.2)", padding: "8px 14px" }}>
                <div style={{ width: "35%", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.06em" }}>CPRA CATEGORY</div>
                <div style={{ width: "45%", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.06em" }}>EXAMPLES ON GATED</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.06em" }}>COLLECTED</div>
              </div>
              {[
                ["A. Identifiers", "Name, email, username, user ID, device token, IP address", "Yes"],
                ["B. Personal information (Cal. Civ. Code § 1798.80)", "Name, email, phone if provided in support", "Yes"],
                ["C. Protected classification characteristics", "Not intentionally collected", "No*"],
                ["D. Commercial information", "Ticket purchases, registration/payment status", "Yes"],
                ["E. Biometrics", "Not intentionally collected for identification", "No"],
                ["F. Internet or other electronic network activity", "Logs, app/WebView interactions, security data", "Yes"],
                ["G. Geolocation data", "Event/map location data; not precise device GPS by default", "Limited**"],
                ["H. Sensory information", "Photos, images, chat content you submit", "Yes"],
                ["I. Professional or employment information", "Not intentionally collected", "No"],
                ["J. Education information", "Self-reported university affiliation", "Yes"],
                ["K. Inferences", "Not used for targeted advertising profiling", "No"],
                ["L. Sensitive personal information (CPRA)", "See 19.3", "Limited***"],
              ].map(([cat, ex, col], i) => (
                <div key={i} style={{ display: "flex", borderBottom: i < 11 ? "1px solid rgba(124,58,237,0.1)" : "none", background: i % 2 === 0 ? "rgba(124,58,237,0.05)" : "rgba(0,0,0,0.1)" }}>
                  <div style={{ padding: "8px 14px", width: "35%", fontSize: 12, color: C.muted, fontWeight: 500 }}>{cat}</div>
                  <div style={{ padding: "8px 14px", width: "45%", fontSize: 12, color: C.subtle }}>{ex}</div>
                  <div style={{ padding: "8px 14px", fontSize: 12, color: col === "Yes" ? "#4ade80" : col === "No" || col === "No*" || col === "No" ? "rgba(167,139,250,0.5)" : C.muted, fontWeight: 600 }}>{col}</div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 10, fontSize: 13, color: C.muted }}>* Unless voluntarily included in user content or support communications. ** We process location information primarily as event/venue/map data, not continuous precise device tracking. *** See Section 19.3.</p>
          </SubSection>

          <SubSection title="19.3 Sensitive Personal Information (California)">
            <p style={{ marginBottom: 8 }}>Under California Privacy Laws, certain data may be classified as sensitive personal information, such as account log-in credentials combined with passwords.</p>
            <p style={{ marginBottom: 8 }}>We use sensitive personal information only for purposes permitted by California Privacy Laws, including:</p>
            <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Providing the Platform and maintaining your account</li>
              <li>Security and fraud prevention</li>
              <li>Short-term transient use, debugging, and service improvement, where applicable</li>
            </ul>
            <p>If you are a California resident and wish to limit our use of sensitive personal information beyond what is permitted by law, email <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a> with subject "Limit Sensitive PI."</p>
          </SubSection>

          <SubSection title="19.4 Disclosures for Business Purposes">
            <p>In the preceding 12 months, we may disclose the categories of personal information in Appendix A to service providers/contractors for business purposes listed in Section 6, including hosting, authentication, payments, maps, notifications, and security. We require service providers to process personal information under contractual restrictions consistent with California Privacy Laws.</p>
          </SubSection>

          <SubSection title="19.5 Sale and Share Disclosures">
            <p style={{ marginBottom: 8 }}>Sold: None in the preceding 12 months. Shared for cross-context behavioral advertising: None in the preceding 12 months.</p>
            <p>Because we do not sell or share personal information for cross-context behavioral advertising, we do not operate a "Do Not Sell or Share My Personal Information" link at this time. If our practices change, we will update this Policy and provide legally required opt-out mechanisms.</p>
          </SubSection>

          <SubSection title="19.6 Your California Rights">
            <p style={{ marginBottom: 8 }}>California residents may have the right to:</p>
            <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Know what personal information we collected, used, disclosed, sold, or shared;</li>
              <li>Access specific pieces of personal information;</li>
              <li>Delete personal information, subject to exceptions;</li>
              <li>Correct inaccurate personal information;</li>
              <li>Opt out of sale/share (not applicable as of Effective Date);</li>
              <li>Limit use/disclosure of sensitive personal information, where applicable;</li>
              <li>Not receive discriminatory treatment for exercising privacy rights.</li>
            </ul>
            <p>Submit requests to <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a> as described in Section 18.</p>
          </SubSection>

          <SubSection title="19.7 Authorized Agents (California)">
            <p style={{ marginBottom: 8 }}>You may designate an authorized agent to submit a request on your behalf. We may require:</p>
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Proof of the agent's authority (such as a signed permission); and</li>
              <li>Direct verification of your identity, unless the agent has a valid power of attorney.</li>
            </ul>
          </SubSection>

          <SubSection title="19.8 Shine the Light (California Civil Code § 1798.83)">
            <p>California residents may request information about our disclosure of personal information to third parties for their direct marketing purposes. We do not disclose personal information to third parties for those third parties' direct marketing purposes as defined under that statute.</p>
          </SubSection>

          <SubSection title="19.9 Financial Incentives">
            <p>We do not currently offer financial incentives tied to the collection, sale, or deletion of personal information.</p>
          </SubSection>
        </Section>

        <Section n="20" title="Other State-Specific Disclosures">
          <p style={{ marginBottom: 12 }}>Several U.S. states have comprehensive privacy laws (including, without limitation, Virginia, Colorado, Connecticut, Utah, Oregon, Texas, Montana, and others). Depending on your state, you may have rights similar to those in Section 18.</p>

          <SubSection title="20.1 Virginia / Colorado / Connecticut / Other Comprehensive State Laws">
            <p style={{ marginBottom: 8 }}>Where applicable, residents may have rights to access, correct, delete, obtain a copy of, and opt out of certain processing (including targeted advertising, sale, or profiling in furtherance of legal/similarly significant decisions).</p>
            <p style={{ marginBottom: 8 }}>Our current practices:</p>
            <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>We do not sell personal information.</li>
              <li>We do not process personal information for targeted advertising as defined by those laws as of the Effective Date.</li>
              <li>We do not engage in profiling in furtherance of legal or similarly significant decisions.</li>
            </ul>
            <p>To exercise rights, contact <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a>.</p>
          </SubSection>

          <SubSection title="20.2 Nevada">
            <p>Nevada residents may submit a request directing us not to sell certain covered information. We do not sell covered information as defined under Nevada law. You may still contact us at <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a> with subject "Nevada Do Not Sell Request."</p>
          </SubSection>

          <SubSection title="20.3 New Jersey and Other States">
            <p>We will honor applicable privacy rights under the laws of the state where you reside, to the extent required. Contact us using the process in Section 18.</p>
          </SubSection>
        </Section>

        <Section n="21" title="Changes to This Privacy Policy">
          <p style={{ marginBottom: 12 }}>We may update this Policy from time to time. When we do, we will post the updated Policy in the app and/or on our website and revise the "Last Updated" date at the top.</p>
          <p style={{ marginBottom: 12 }}>If we make material changes, we will provide additional notice as required by law (such as in-app notice or email).</p>
          <p>Your continued use of the Platform after the effective date of an updated Policy means you acknowledge the updated Policy, where permitted by law.</p>
        </Section>

        <Section n="22" title="Contact Us">
          <p style={{ marginBottom: 16 }}>For privacy questions, requests, or complaints:</p>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(124,58,237,0.2)" }}>
            {[
              ["Legal Entity", "The Greek Life Corp."],
              ["Email", SUPPORT],
              ["Mailing Address", ADDRESS],
              ["Recommended subject line", "Privacy Request"],
            ].map(([label, value], i) => (
              <div key={i} style={{ display: "flex", borderBottom: i < 3 ? "1px solid rgba(124,58,237,0.12)" : "none", background: i % 2 === 0 ? "rgba(124,58,237,0.06)" : "rgba(0,0,0,0.12)" }}>
                <div style={{ padding: "12px 16px", width: "38%", flexShrink: 0, color: C.muted, fontSize: 13, fontWeight: 600 }}>{label}</div>
                <div style={{ padding: "12px 16px", fontSize: 13, color: C.subtle }}>
                  {label === "Email" ? <a href={`mailto:${value}`} style={{ color: C.accent }}>{value}</a> : value}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Appendix A */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ color: C.white, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Appendix A — Categories of Personal Information (California Format)</h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>A.1 Categories Collected in the Last 12 Months</p>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(124,58,237,0.2)", marginBottom: 16 }}>
            <div style={{ display: "flex", background: "rgba(124,58,237,0.15)", borderBottom: "1px solid rgba(124,58,237,0.2)", padding: "8px 14px" }}>
              {["Category", "Examples", "Business Purposes", "Disclosed to Service Providers?", "Sold/Shared?"].map((h, i) => (
                <div key={i} style={{ flex: i === 1 || i === 2 ? 2 : 1, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.05em" }}>{h}</div>
              ))}
            </div>
            {[
              ["Identifiers", "Email, username, user ID, IP, device token", "Account, security, notifications, support", "Yes", "No / No"],
              ["California customer records", "Name, email", "Account, profile, support", "Yes", "No / No"],
              ["Protected classifications", "—", "—", "—", "No / No"],
              ["Commercial information", "Ticket/registration/payment status", "Ticketing, refunds, payouts", "Yes", "No / No"],
              ["Biometric information", "—", "—", "—", "No / No"],
              ["Internet/electronic activity", "Logs, diagnostics", "Security, debugging, performance", "Yes", "No / No"],
              ["Geolocation data", "Event/map coordinates in listings", "Maps, event discovery", "Yes (e.g., Mapbox)", "No / No"],
              ["Sensory data", "Photos, images, chat content", "Profiles, events, chat", "Yes", "No / No"],
              ["Professional/employment", "—", "—", "—", "No / No"],
              ["Education information", "University affiliation (self-reported)", "Discovery, filtering, profiles", "Yes", "No / No"],
              ["Inferences", "—", "—", "—", "No / No"],
              ["Sensitive personal information", "Account credentials (via auth provider)", "Login/security only", "Yes", "No / No"],
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", borderBottom: i < 11 ? "1px solid rgba(124,58,237,0.1)" : "none", background: i % 2 === 0 ? "rgba(124,58,237,0.04)" : "rgba(0,0,0,0.1)" }}>
                {row.map((cell, j) => (
                  <div key={j} style={{ flex: j === 1 || j === 2 ? 2 : 1, padding: "8px 14px", fontSize: 11, color: C.subtle, lineHeight: 1.5 }}>{cell}</div>
                ))}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}><strong style={{ color: C.white }}>A.2 Sources:</strong> Directly from you; automatically from your device/browser; from payment processors; from other users via Platform interactions; from service providers supporting the Platform.</p>
        </div>

        {/* Appendix B */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ color: C.white, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Appendix B — Service Providers and Processors</h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>Current architecture. Vendor names may change as the product evolves.</p>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(124,58,237,0.2)" }}>
            <div style={{ display: "flex", background: "rgba(124,58,237,0.15)", borderBottom: "1px solid rgba(124,58,237,0.2)", padding: "8px 14px" }}>
              {["Provider / Service", "Role", "Typical Data Processed"].map((h, i) => (
                <div key={i} style={{ flex: i === 2 ? 2 : 1, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.05em" }}>{h}</div>
              ))}
            </div>
            {[
              ["Supabase", "Authentication, database, file storage, realtime features", "Account data, profiles, events, registrations, chat messages, device tokens, notification records"],
              ["Stripe", "Payment processing and Connect payouts", "Payment metadata, checkout status, payout onboarding status; card data processed by Stripe directly"],
              ["Render (or similar)", "Backend API hosting", "API request metadata, notification sending logic"],
              ["Mapbox", "Interactive maps", "Map usage data, event/location coordinates displayed on maps"],
              ["Apple Push Notification service (APNs)", "Mobile push delivery", "Device tokens and notification payloads"],
              ["Apple App Store / TestFlight", "App distribution", "Governed by Apple's policies"],
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", borderBottom: i < 5 ? "1px solid rgba(124,58,237,0.1)" : "none", background: i % 2 === 0 ? "rgba(124,58,237,0.04)" : "rgba(0,0,0,0.1)" }}>
                {row.map((cell, j) => (
                  <div key={j} style={{ flex: j === 2 ? 2 : 1, padding: "8px 14px", fontSize: 11, color: C.subtle, lineHeight: 1.5 }}>{cell}</div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 56, padding: "24px", borderRadius: 16, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Also see our</p>
          <Link href="/terms" style={{ color: C.white, fontWeight: 600, fontSize: 15, textDecoration: "none" }}>Terms of Service →</Link>
        </div>

        <p style={{ marginTop: 40, fontSize: 12, color: "rgba(167,139,250,0.5)" }}>Last updated: {LAST_UPDATED}</p>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ color: C.white, fontSize: 17, fontWeight: 700, marginBottom: 12 }}>
        {n}. {title}
      </h2>
      <div style={{ lineHeight: 1.75, color: C.subtle, fontSize: 15 }}>{children}</div>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ color: "rgba(220,210,255,0.95)", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      <div style={{ lineHeight: 1.75, color: C.subtle, fontSize: 15 }}>{children}</div>
    </div>
  );
}

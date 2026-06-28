import React from 'react';

const SUPPORT = 'support@greeklifeofficial.com';
const EFFECTIVE = 'April 30, 2026';

/**
 * Combined Terms of Service + Privacy Policy shown in signup modals.
 * Replace dates/support copy here when your attorney finalizes language.
 *
 * @param {{ acceptContext?: 'user' | 'organization' }} props
 */
export default function TermsAndPrivacyModalContent({ acceptContext = 'user' }) {
  const closing =
    acceptContext === 'organization'
      ? 'By clicking "Accept & Continue," you acknowledge that you have read and agree to these Terms of Service and Privacy Policy on behalf of your organization.'
      : 'By clicking "Accept & Continue," you acknowledge that you have read and agree to these Terms of Service and Privacy Policy.';

  return (
    <>
      <p style={{ marginBottom: '20px', padding: '12px', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.15)', border: '1px solid rgba(124, 58, 237, 0.35)', fontSize: '13px', color: 'rgba(196, 181, 253, 0.95)' }}>
        <strong style={{ color: 'white' }}>Draft for testing.</strong> This in-app copy describes how the Platform works today. Your counsel should review and replace or revise it before general public release.
      </p>

      {/* ——— Terms of Service ——— */}
      <h2 style={{ color: 'white', marginBottom: '8px', fontSize: '20px' }}>Greek Life LLC — Terms of Service</h2>
      <p style={{ marginBottom: '20px', fontSize: '13px', color: 'rgba(196, 181, 253, 0.8)' }}>
        Effective date: {EFFECTIVE}
      </p>

      <p style={{ marginBottom: '16px' }}>
        <strong style={{ color: 'white' }}>Company:</strong> Greek Life LLC, a New Jersey limited liability company (&quot;Greek Life,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;).
      </p>

      <p style={{ marginBottom: '20px' }}>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Greek Life mobile application, website, and related services (collectively, the &quot;Platform&quot;). By creating an account, browsing, hosting, administering, or attending events through the Platform, you agree to these Terms and our Privacy Policy below. If you do not agree, do not use the Platform.
      </p>

      <h3 style={{ color: 'white', marginTop: '24px', marginBottom: '12px', fontSize: '16px' }}>1. What the Platform is (and is not)</h3>
      <p style={{ marginBottom: '16px' }}>
        Greek Life provides software for discovering, listing, and coordinating campus- and Greek-life-related events. We are a technology provider only. We do not sponsor, organize, host, supervise, or conduct in-person events listed on the Platform, and we are not responsible for what happens at any physical location.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>2. Eligibility and accounts</h3>
      <p style={{ marginBottom: '16px' }}>
        You must meet the age and eligibility requirements shown in the app (including being at least the age of majority where you live, or eighteen (18), whichever is greater, unless we state otherwise for your account type). You agree that registration information is accurate and that you will protect your login credentials. If you create or manage an organization profile, you represent that you have authority to bind that organization to these Terms where applicable.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>3. Acceptable use</h3>
      <p style={{ marginBottom: '16px' }}>
        You will use the Platform only for lawful purposes and in line with these Terms. You may not misuse, interfere with, reverse engineer, or overload the Platform; harass others; impersonate people or organizations; or share unlawful, defamatory, or infringing content.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>4. Events, organizers, and attendees</h3>
      <p style={{ marginBottom: '16px' }}>
        Events are created and run by independent organizers (e.g., chapters, student groups, or hosts). Listings are user-generated. Greek Life does not verify the legality, safety, quality, attendance limits, or accuracy of every listing. Attendance is voluntary and at your own risk. To the fullest extent permitted by law, Greek Life is not liable for injury, loss, theft, illness, death, property damage, or other harm arising from or related to any event, venue, travel, or interaction with other users—whether or not the event was found through the Platform.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>5. Alcohol, substances, health, and conduct</h3>
      <p style={{ marginBottom: '16px' }}>
        <strong style={{ color: 'white' }}>No alcohol or drug sales on the Platform.</strong> You may not use Greek Life to sell, ship, or commercially distribute alcohol, cannabis, or illegal drugs, or to facilitate unlawful transactions.
      </p>
      <p style={{ marginBottom: '16px' }}>
        <strong style={{ color: 'white' }}>Real-world events are not run by Greek Life.</strong> If alcohol or other substances appear at a real-world event, that is solely a matter between attendees, organizers, venues, universities, and the law. Greek Life does not check IDs, monitor consumption, enforce university or venue policies, or ensure compliance with alcohol or drug laws. Descriptions such as &quot;social&quot; or similar labels are informational only and are not an endorsement of drinking, hazing, or any illegal activity.
      </p>
      <p style={{ marginBottom: '16px' }}>
        Organizers are solely responsible for lawful conduct at their events—including any age verification, permits, university risk-management rules, insurance, security, and safe transportation. Attendees are responsible for their own choices and safety.
      </p>
      <p style={{ marginBottom: '16px' }}>
        Nothing on the Platform is medical, legal, or safety advice.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>6. Payments and ticketing</h3>
      <p style={{ marginBottom: '16px' }}>
        Paid features may use payment processors such as <strong style={{ color: 'white' }}>Stripe</strong> (or others we add). When you pay, you also agree to the applicable processor&apos;s terms and privacy notice. <strong style={{ color: 'white' }}>Greek Life does not store full payment card numbers, card security codes (such as CVV/CVC), or magnetic-stripe data in our own application database (for example, in Supabase).</strong> That sensitive card data is handled by the payment processor under its PCI-DSS obligations. We may store limited records needed to run the Platform—such as payment or checkout status, processor transaction or session identifiers, ticket and registration records, amounts, and similar non-card data.
      </p>
      <p style={{ marginBottom: '16px' }}>
        As between a buyer and an organizer, commercial terms (other than our Platform rules) are primarily between those parties; Greek Life&apos;s role is facilitating technology and, where applicable, payment flows through third parties.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>7. Refunds</h3>
      <p style={{ marginBottom: '16px' }}>
        <strong style={{ color: 'white' }}>Refunds.</strong> Except where required by law, ticket purchases are generally <strong style={{ color: 'white' }}>non-refundable</strong>. If an event is <strong style={{ color: 'white' }}>cancelled</strong> by the organizer or removed from the Platform because the event is cancelled, you may request a refund by emailing{' '}
        <strong style={{ color: 'white' }}>{SUPPORT}</strong> from the email associated with your account or purchase, including the event name and date. Greek Life reviews requests in its reasonable discretion. Approved refunds are processed to the original payment method through our payment processor and may take several business days to appear. Greek Life does not guarantee refunds for schedule conflicts, change of mind, no-shows, or other reasons except as stated here or as required by applicable law.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>8. Organizer responsibilities</h3>
      <p style={{ marginBottom: '16px' }}>
        If you create or manage events or organization pages, you represent that you have authority to do so and will follow applicable laws, university and venue rules, and risk-management requirements. You are responsible for accurate listings (including date, time, location, price, capacity, and fundraising disclosures), for canceling or updating events honestly, and for how you treat attendees and their data in the real world.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>9. Content and intellectual property</h3>
      <p style={{ marginBottom: '16px' }}>
        The Platform&apos;s software, branding, and our proprietary materials are owned by or licensed to Greek Life. You retain ownership of content you submit; you grant Greek Life a license to host, display, and distribute that content as needed to operate and promote the Platform (subject to your account settings and applicable law).
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>10. Disclaimers</h3>
      <p style={{ marginBottom: '16px' }}>
        <strong style={{ color: 'white' }}>THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot;</strong> WE DISCLAIM WARRANTIES TO THE MAXIMUM EXTENT PERMITTED BY LAW, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>11. Limitation of liability</h3>
      <p style={{ marginBottom: '16px' }}>
        To the fullest extent permitted by law, Greek Life LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or loss of profits, data, or goodwill. In no event shall Greek Life&apos;s aggregate liability arising out of these Terms or the Platform exceed the greater of (a) U.S. $100 or (b) the amounts you paid to Greek Life in fees for the Platform in the twelve (12) months before the claim (if any). Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the minimum permitted by law.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>12. Indemnification</h3>
      <p style={{ marginBottom: '16px' }}>
        You agree to indemnify, defend, and hold harmless Greek Life LLC and its affiliates, officers, and agents from third-party claims, damages, and expenses (including reasonable attorneys&apos; fees) arising from your use of the Platform, your events or listings, your violation of these Terms, or your violation of others&apos; rights.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>13. Changes, suspension, and termination</h3>
      <p style={{ marginBottom: '16px' }}>
        We may modify these Terms or the Platform. We will post updated Terms in the app or as otherwise required by law. Continued use after changes means you accept the updates where permitted. We may suspend or terminate accounts that risk safety, legality, or the integrity of the Platform.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>14. Governing law and venue</h3>
      <p style={{ marginBottom: '16px' }}>
        These Terms are governed by the laws of the State of New Jersey, United States, without regard to conflict-of-law rules. You agree to the exclusive jurisdiction of the state and federal courts located in Monmouth County, New Jersey, subject to applicable law.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>15. Contact</h3>
      <p style={{ marginBottom: '24px' }}>
        Questions about these Terms: <strong style={{ color: 'white' }}>{SUPPORT}</strong>
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.15)', margin: '28px 0' }} />

      {/* ——— Privacy Policy ——— */}
      <h2 style={{ color: 'white', marginBottom: '8px', fontSize: '20px' }}>Privacy Policy</h2>
      <p style={{ marginBottom: '20px', fontSize: '13px', color: 'rgba(196, 181, 253, 0.8)' }}>
        Effective date: {EFFECTIVE}
      </p>

      <p style={{ marginBottom: '16px' }}>
        This Privacy Policy explains how Greek Life LLC (&quot;Greek Life,&quot; &quot;we,&quot; &quot;us&quot;) collects, uses, and shares information when you use the Platform. It is meant to match our current architecture: application data is primarily stored in <strong style={{ color: 'white' }}>Supabase</strong> (database, authentication, and file storage as configured), and payments may be processed by <strong style={{ color: 'white' }}>Stripe</strong> or other processors.
      </p>

      <h3 style={{ color: 'white', marginTop: '24px', marginBottom: '12px', fontSize: '16px' }}>1. Information we collect</h3>
      <p style={{ marginBottom: '12px' }}>Depending on how you use Greek Life, we or our service providers may process:</p>
      <ul style={{ margin: '0 0 16px 1.1rem', padding: 0, listStyleType: 'disc' }}>
        <li style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'white' }}>Account and authentication data.</strong> For example, email address and credentials managed through Supabase Auth. Passwords are handled using industry-standard secure authentication practices; we do not intend for staff to access your plaintext password.
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'white' }}>Profile and directory information you choose to provide</strong> (such as name, username or handle, school or university affiliation, profile photo, bio, or similar fields available in the app).
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'white' }}>Event and organization data you submit</strong> (titles, descriptions, dates, times, locations, images, prices shown on listings, capacity, fundraising flags, and related metadata).
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'white' }}>RSVPs, registrations, ticketing, and check-in data</strong> (for example, ticket codes, registration status, payment status fields as returned by our processor, and scan/check-in records needed to operate entry).
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'white' }}>Organization membership and roles</strong> where applicable (such as admin or scan permissions for chapter tools).
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'white' }}>Communications you send us</strong> (such as support emails to {SUPPORT}).
        </li>
        <li style={{ marginBottom: '8px' }}>
          <strong style={{ color: 'white' }}>Technical and security information</strong> automatically created when you use online services—for example, device/browser data, IP address, and logs from our hosting and database providers as needed to secure and operate the Platform.
        </li>
      </ul>
      <p style={{ marginBottom: '16px' }}>
        <strong style={{ color: 'white' }}>Payment card data:</strong> Full card numbers and CVV/CVC are processed by our payment processor; we do not store those values in our Supabase database. We may receive and store limited non-sensitive payment metadata from the processor (such as payment status or transaction identifiers) as described in Section 6 of the Terms.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>2. How we use information</h3>
      <p style={{ marginBottom: '16px' }}>
        We use information to create and secure accounts; provide event discovery, hosting, and registration features; process or facilitate payments through Stripe (or other processors); communicate with you about the Platform and support requests; detect abuse, fraud, and security issues; comply with law; and improve reliability and performance.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>3. How we share information</h3>
      <p style={{ marginBottom: '16px' }}>
        We share information with <strong style={{ color: 'white' }}>service providers</strong> that help us run the Platform—for example, Supabase (data hosting and authentication), Stripe (payments), and infrastructure or API providers as configured. We may disclose information if required by law, legal process, or to protect users and the public. We may share aggregated or de-identified information that cannot reasonably identify you.
      </p>
      <p style={{ marginBottom: '16px' }}>
        <strong style={{ color: 'white' }}>We do not sell your personal information</strong> (as &quot;sell&quot; is commonly understood for targeted advertising data brokerage). We do not share personal information for cross-context behavioral advertising unless we add that feature and update this Policy.
      </p>
      <p style={{ marginBottom: '16px' }}>
        Content you post publicly on the Platform (such as event listings) may be visible to other users according to product design and university or organization visibility rules.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>4. Retention</h3>
      <p style={{ marginBottom: '16px' }}>
        We retain information as long as your account is active and as needed to provide the service, comply with law, resolve disputes, and enforce our agreements. You may request deletion of your account or specific data subject to legal exceptions and technical feasibility; contact {SUPPORT}.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>5. Security</h3>
      <p style={{ marginBottom: '16px' }}>
        We use reasonable administrative, technical, and organizational measures appropriate to the nature of the service. No online service is completely secure; you should protect your password and device.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>6. Your choices and rights</h3>
      <p style={{ marginBottom: '16px' }}>
        Depending on where you live, you may have rights to access, correct, delete, or export personal information, or to opt out of certain processing. Contact us at {SUPPORT}. We will respond consistent with applicable law.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>7. Children</h3>
      <p style={{ marginBottom: '16px' }}>
        The Platform is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe we have collected such information, contact us and we will take appropriate steps.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>8. International users</h3>
      <p style={{ marginBottom: '16px' }}>
        We operate from the United States. If you access the Platform from other countries, you understand that information may be transferred to and processed in the United States or other jurisdictions where our providers operate.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>9. Changes to this Policy</h3>
      <p style={{ marginBottom: '16px' }}>
        We may update this Privacy Policy. We will post the revised Policy in the app (and update the effective date) or provide notice as required by law.
      </p>

      <h3 style={{ color: 'white', marginTop: '20px', marginBottom: '12px', fontSize: '16px' }}>10. Contact</h3>
      <p style={{ marginBottom: '16px' }}>
        Greek Life LLC — Privacy inquiries: <strong style={{ color: 'white' }}>{SUPPORT}</strong>
      </p>

      <p style={{ marginTop: '24px', fontSize: '13px', color: 'rgba(196, 181, 253, 0.7)', fontStyle: 'italic' }}>
        {closing}
      </p>

      <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(196, 181, 253, 0.6)' }}>
        Last updated: {EFFECTIVE}
      </p>
    </>
  );
}

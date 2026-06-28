import { Link } from "wouter";

const SUPPORT = "support@gated.us";
const EFFECTIVE = "April 30, 2026";
const LAST_UPDATED = "April 30, 2026";

const C = {
  bg: "linear-gradient(135deg, #0f0522 0%, #1a0a3e 50%, #0f0522 100%)",
  text: "rgba(220,210,255,0.9)",
  muted: "rgba(167,139,250,0.7)",
  accent: "rgba(167,139,250,0.9)",
  white: "white",
  subtle: "rgba(220,210,255,0.85)",
};

export default function Terms() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 80px" }}>

        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.accent, fontSize: 14, textDecoration: "none", marginBottom: 40 }}>
          ← Back to home
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚖️</div>
          <span style={{ fontSize: 13, color: C.muted, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>The Greek Life Corp</span>
        </div>

        <h1 style={{ fontSize: "clamp(28px,5vw,42px)", fontWeight: 800, color: C.white, marginBottom: 8, lineHeight: 1.15 }}>Terms of Service</h1>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>
          <span><strong style={{ color: C.white }}>Effective Date:</strong> {EFFECTIVE}</span>
          <span style={{ margin: "0 12px", opacity: 0.4 }}>|</span>
          <span><strong style={{ color: C.white }}>Last Updated:</strong> {LAST_UPDATED}</span>
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>
          <strong style={{ color: C.white }}>Legal Entity / Operator:</strong> The Greek Life Corp., a Delaware corporation
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>
          <strong style={{ color: C.white }}>Platform Name:</strong> Gated (the "Gated" mobile application, website, and related services)
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 48 }}>
          <strong style={{ color: C.white }}>Contact:</strong> <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a>
        </div>

        <Section n="1" title="Agreement to These Terms">
          <p style={{ marginBottom: 12 }}>These Terms of Service ("Terms") are a binding agreement between you and The Greek Life Corp. ("Gated," "we," "us," or "our").</p>
          <p style={{ marginBottom: 12 }}>By accessing or using the Gated mobile application, website, or related services (collectively, the "Platform"), including by creating an account, browsing events, registering for events, purchasing tickets, hosting or administering events, creating or managing an organization profile, using messaging or chat features, or otherwise interacting with the Platform, you agree to these Terms and our Privacy Policy (which is incorporated by reference).</p>
          <p style={{ marginBottom: 12 }}>If you do not agree to these Terms, do not use the Platform.</p>
          <p>If you use the Platform on behalf of an organization (such as a fraternity, sorority, club, team, or other student group), you represent and warrant that you have authority to bind that organization to these Terms.</p>
        </Section>

        <Section n="2" title="What Gated Is (and Is Not)">
          <SubSection title="2.1 Technology Platform Only">
            <p style={{ marginBottom: 12 }}>Gated provides software tools for discovering, listing, promoting, coordinating, registering for, ticketing, messaging about, and managing campus- and community-related events and organizations. Gated is a technology provider and marketplace-style platform only.</p>
            <p style={{ marginBottom: 8 }}>Gated does not:</p>
            <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Sponsor, organize, host, supervise, operate, or conduct in-person events listed on the Platform;</li>
              <li>Own or control venues, chapters, houses, or physical locations shown on the Platform;</li>
              <li>Employ, manage, or direct event organizers, hosts, chapters, or attendees;</li>
              <li>Guarantee the occurrence, quality, safety, legality, or accuracy of any event or listing;</li>
              <li>Provide security, medical, legal, or risk-management services at events.</li>
            </ul>
          </SubSection>
          <SubSection title="2.2 User-Generated Content and Independent Organizers">
            <p>Most content on the Platform — including event listings, descriptions, images, prices, locations, organization profiles, messages, and chat content — is created and controlled by users and independent third-party organizers, not by Gated. Organizers and hosts, not Gated, are responsible for their events, conduct, compliance with law, and interactions with attendees.</p>
          </SubSection>
          <SubSection title="2.3 No Professional Advice">
            <p>Nothing on the Platform constitutes medical, legal, financial, insurance, safety, or university-policy advice. Consult appropriate professionals and official university sources for those matters.</p>
          </SubSection>
        </Section>

        <Section n="3" title="No University Affiliation or Endorsement">
          <SubSection title="3.1 Independent Company">
            <p>Gated is operated by The Greek Life Corp., a private Delaware corporation. Gated is not a university, college, school district, campus department, student government body, Greek council, national fraternity or sorority headquarters, or official arm of any educational institution.</p>
          </SubSection>
          <SubSection title="3.2 No Partnership, Agency, or Endorsement">
            <p style={{ marginBottom: 12 }}>Gated is not directly associated with, affiliated with, endorsed by, sponsored by, or acting on behalf of any university, college, or other educational institution, even when:</p>
            <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Users select or display a university name during signup or on a profile;</li>
              <li>Events reference campus locations, buildings, or landmarks;</li>
              <li>Organization names resemble official chapter or club names;</li>
              <li>The Platform is used by students or organizations connected to a particular school.</li>
            </ul>
            <p>The display of a university name, campus map data, organization name, Greek letters, or similar information on the Platform does not mean that the referenced university has approved, partnered with, or assumed responsibility for Gated or any event listed on the Platform.</p>
          </SubSection>
          <SubSection title="3.3 Users Responsible for University Rules">
            <p>Users, not Gated, are solely responsible for understanding and complying with their school's codes of conduct, risk-management policies, fraternity/sorority governance rules, housing rules, alcohol policies, hazing prohibitions, fundraising rules, and any other applicable university requirements. Gated does not monitor, enforce, or guarantee compliance with university policies.</p>
          </SubSection>
          <SubSection title="3.4 Trademarks and Names">
            <p>University names, logos, organization names, Greek letter combinations, and other third-party marks may appear on the Platform as user-provided or descriptive content. All third-party trademarks belong to their respective owners. Gated's use of such references is for identification and platform functionality only and does not imply sponsorship or endorsement.</p>
          </SubSection>
        </Section>

        <Section n="4" title="Eligibility, Accounts, and Registration">
          <SubSection title="4.1 Age and Eligibility">
            <p>You must be at least eighteen (18) years old or the age of majority in your jurisdiction, whichever is greater, to create an account. By using the Platform, you represent that all registration information you provide is accurate, current, and complete.</p>
          </SubSection>
          <SubSection title="4.2 Account Types">
            <p>The Platform may support different account types, including individual user accounts and organization accounts. Organization accounts may include features such as event creation, ticketing, payout setup, team/role management, event insights, QR check-in, and organization profile pages. If you create or manage an organization account, you represent that you have authority to act on behalf of that organization.</p>
          </SubSection>
          <SubSection title="4.3 Account Security">
            <p>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Notify us promptly at <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a> if you suspect unauthorized access. We may suspend or terminate accounts that appear compromised, fraudulent, or abusive.</p>
          </SubSection>
          <SubSection title="4.4 University Selection">
            <p>During registration, users may select or identify a university or campus community. That selection is used for discovery, filtering, and product functionality. It does not create any relationship between Gated and the selected institution.</p>
          </SubSection>
        </Section>

        <Section n="5" title="Platform Features">
          <p style={{ marginBottom: 12 }}>These Terms apply to the Platform's current and future features, including:</p>
          <SubSection title="5.1 Event Discovery and Listings">
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Browsing, searching, and filtering upcoming events;</li>
              <li>Viewing event details (date, time, location, price, capacity, images, descriptions);</li>
              <li>Joining, requesting to join, or registering for events;</li>
              <li>Sharing events through in-app or device sharing tools.</li>
            </ul>
          </SubSection>
          <SubSection title="5.2 Organization Profiles and Community Features">
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Creating and viewing organization profiles;</li>
              <li>Following organizations and viewing organization-hosted events;</li>
              <li>Organization signup and profile management tools.</li>
            </ul>
          </SubSection>
          <SubSection title="5.3 Maps and Location Features">
            <p>Interactive maps showing event and organization locations. Location data may be approximate. Users should verify event locations independently before attending.</p>
          </SubSection>
          <SubSection title="5.4 Messaging and Event Chat">
            <p>Direct or organizational messaging and event chat features, where available. Event chat may open to registered attendees for a limited period before and after an event. Gated does not routinely monitor all messages but may review content for safety, abuse, or legal compliance.</p>
          </SubSection>
          <SubSection title="5.5 Ticketing, Payments, and Fundraising">
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Free and paid event registration;</li>
              <li>Ticket purchase flows using third-party payment processors such as Stripe;</li>
              <li>Digital tickets and QR code check-in, where enabled;</li>
              <li>Fundraiser or donation-style event flows, where enabled;</li>
              <li>Organizer payout setup through Stripe Connect, where enabled.</li>
            </ul>
          </SubSection>
          <SubSection title="5.6 Notifications and Account Settings">
            <p>Email and/or push notifications about events, registrations, followers, reminders, and Platform updates, depending on your settings. Profile editing, notification preferences, privacy and security settings, and help/support tools. Features may change, be added, or be removed at any time, with notice where reasonably practicable for material changes to paid features.</p>
          </SubSection>
        </Section>

        <Section n="6" title="Acceptable Use">
          <p style={{ marginBottom: 12 }}>You agree to use the Platform only for lawful purposes and in accordance with these Terms. You may not:</p>
          <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
            <li>Violate any applicable law, regulation, or third-party rights;</li>
            <li>Harass, threaten, abuse, stalk, defame, or harm others;</li>
            <li>Impersonate any person or organization, or misrepresent your affiliation with a university, chapter, or group;</li>
            <li>Upload or distribute unlawful, obscene, infringing, hateful, or fraudulent content;</li>
            <li>Use the Platform to promote hazing, unlawful discrimination, or illegal activity;</li>
            <li>Attempt to gain unauthorized access to accounts, systems, or data;</li>
            <li>Reverse engineer, scrape, overload, or interfere with the Platform;</li>
            <li>Circumvent security, payment, or access controls;</li>
            <li>Use the Platform to process unlawful transactions or evade applicable taxes, licensing, or reporting obligations.</li>
          </ul>
          <p>We may investigate violations and take action including content removal, feature restriction, suspension, or termination.</p>
        </Section>

        <Section n="7" title="Events, Organizers, and Attendees">
          <SubSection title="7.1 Independent Events">
            <p>Events listed on Gated are created and run by independent organizers such as student organizations, chapters, clubs, hosts, or other users. Gated does not verify every listing detail, including event safety, capacity limits, venue permissions, insurance coverage, accuracy of descriptions or pricing, whether an organizer has authority to host the event, or whether an event complies with university or local rules.</p>
          </SubSection>
          <SubSection title="7.2 Attendance at Your Own Risk">
            <p>Attendance at any in-person event is voluntary and at your own risk. To the fullest extent permitted by law, Gated is not liable for injury, illness, death, loss, theft, property damage, assault, harassment, travel incidents, or any other harm arising from or related to any event, venue, host, travel to or from an event, or interactions with other users on or off the Platform.</p>
          </SubSection>
          <SubSection title="7.3 No Guarantee of Event Occurrence">
            <p>Gated does not guarantee that any event will occur as listed. Events may be changed, postponed, or cancelled by organizers. Users should confirm important details directly with organizers.</p>
          </SubSection>
          <SubSection title="7.4 Assumption of Risk and Release of Claims">
            <p>You knowingly and voluntarily assume all risks, known and unknown, arising from or related to your participation in, travel to or from, or interaction with any event, organizer, venue, or other user. To the fullest extent permitted by law, you release, waive, and discharge The Greek Life Corp. and its affiliates, officers, directors, employees, contractors, ambassadors, and agents from any and all claims, demands, damages, causes of action, and liabilities arising from or related to your participation in any event or your interactions on or off the Platform.</p>
          </SubSection>
        </Section>

        <Section n="8" title="Alcohol, Substances, and Event Conduct">
          <SubSection title="8.1 Gated Does Not Prohibit Alcohol at Real-World Events">
            <p>Gated does not organize, operate, or control in-person events listed on the Platform. Event organizers, venues, and attendees — not Gated — are solely responsible for all aspects of event conduct, including any decisions regarding the presence, service, consumption, or sale of alcohol, provided such activity is lawful under applicable federal, state, local, and university rules. Gated has no ability to monitor or govern conduct at physical gatherings, regardless of whether those gatherings were coordinated through the Platform.</p>
          </SubSection>
          <SubSection title="8.2 Platform Restrictions on Alcohol and Drug Commerce">
            <p style={{ marginBottom: 8 }}>You may not use the Platform itself to:</p>
            <ul style={{ margin: "0 0 0 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Sell, ship, distribute, or commercially distribute alcohol, cannabis, or illegal drugs through Platform payment flows or listings in violation of applicable law;</li>
              <li>Facilitate unlawful alcohol sales to minors;</li>
              <li>Market or process payments for illegal substances or unlawful transactions.</li>
            </ul>
            <p style={{ marginTop: 8 }}>This restriction applies to transactions and commercial activity conducted through the Platform, not to all conduct that may occur independently at a physical event outside Gated's control.</p>
          </SubSection>
          <SubSection title="8.3 No Monitoring or Enforcement by Gated">
            <p>If alcohol or other substances are present at a real-world event, that is a matter between attendees, organizers, venues, universities, landlords, insurers, and applicable law enforcement and regulators. Gated does not check IDs, monitor consumption, enforce university alcohol policies, enforce venue rules, ensure compliance with liquor licensing laws, or provide bartenders, security, sober monitors, or medical staff. Event labels such as "social," "mixer," "party," or similar terms are descriptive only and are not endorsements of drinking, hazing, or any other activity.</p>
          </SubSection>
          <SubSection title="8.4 Organizer and Attendee Responsibilities">
            <p style={{ marginBottom: 8 }}>Organizers are solely responsible for lawful event conduct, including where applicable:</p>
            <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
              <li>Age verification;</li>
              <li>Liquor licenses and permits;</li>
              <li>University risk-management and social event policies;</li>
              <li>Security, crowd management, and safe transportation;</li>
              <li>Insurance; compliance with hazing and anti-discrimination laws.</li>
            </ul>
            <p>Attendees are responsible for their own choices, safety, and legal compliance, including legal drinking age requirements.</p>
          </SubSection>
          <SubSection title="8.5 Illegal Activity Prohibited">
            <p>Nothing in this Section permits illegal conduct. Users must comply with all applicable laws relating to alcohol, drugs, hazing, harassment, violence, and public safety.</p>
          </SubSection>
        </Section>

        <Section n="9" title="Organizer and Organization Responsibilities">
          <p style={{ marginBottom: 12 }}>If you create, promote, administer, or manage events or organization pages on Gated, you agree that:</p>
          <SubSection title="9.1 Authority">
            <p>You have authority to create listings and bind your organization where applicable.</p>
          </SubSection>
          <SubSection title="9.2 Accurate Listings">
            <p>You will provide accurate and non-misleading information about events, including date, time, location, price, capacity, refund practices, fundraising purpose, and any material restrictions.</p>
          </SubSection>
          <SubSection title="9.3 Legal and University Compliance">
            <p>You will comply with applicable laws and university/venue rules, including risk-management, alcohol, hazing, fire code, capacity, and fundraising requirements.</p>
          </SubSection>
          <SubSection title="9.4 Attendee Management">
            <p>You are responsible for attendee communication, check-in, cancellations, changes, and on-site conduct.</p>
          </SubSection>
          <SubSection title="9.5 Data Use Off Platform">
            <p>If you collect attendee information outside the Platform, you are responsible for your own privacy notices and legal obligations.</p>
          </SubSection>
          <SubSection title="9.6 Team Roles and Permissions">
            <p>If you grant admin, scan, payout, or other permissions to team members, you are responsible for managing those permissions and for actions taken by people you authorize.</p>
          </SubSection>
        </Section>

        <Section n="10" title="Payments, Ticketing, and Payouts">
          <SubSection title="10.1 Third-Party Payment Processors">
            <p>Paid features may use third-party payment processors such as Stripe. When you make or receive payments through the Platform, you also agree to the applicable processor's terms, privacy notices, and onboarding requirements.</p>
          </SubSection>
          <SubSection title="10.2 Card Data">
            <p>Gated does not store full payment card numbers, card security codes (such as CVV/CVC), or magnetic-stripe data in its own application database. Sensitive card data is handled by the payment processor under its PCI-DSS obligations. We may store limited non-sensitive payment records needed to operate the Platform, such as payment status, processor transaction identifiers, ticket and registration records, amounts, timestamps, and related metadata.</p>
          </SubSection>
          <SubSection title="10.3 Buyer and Organizer Relationship">
            <p>Commercial terms relating to the underlying event (other than Platform rules) are primarily between the ticket buyer and the organizer. Gated's role is to provide technology and, where applicable, facilitate payment flows through third parties.</p>
          </SubSection>
          <SubSection title="10.4 Fees and Payouts">
            <p>Platform fees, processor fees, payout timing, chargebacks, and disputes may apply as disclosed in the app or in separate organizer agreements. Organizers are responsible for taxes and reporting related to their event revenue, to the extent required by law.</p>
          </SubSection>
          <SubSection title="10.5 Chargebacks and Disputes">
            <p>Payment disputes may be handled through the payment processor's dispute process. Gated may provide reasonable cooperation but does not guarantee outcomes.</p>
          </SubSection>
        </Section>

        <Section n="11" title="Refunds">
          <p style={{ marginBottom: 12 }}>Unless required by applicable law, ticket purchases are generally <strong style={{ color: C.white }}>non-refundable</strong>. If an event is cancelled by the organizer, or if Gated removes an event listing due to cancellation or a material violation of these Terms, you may request a refund by emailing <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a> from the email associated with your account or purchase, including the event name and date.</p>
          <p>Gated reviews refund requests in its reasonable discretion. Approved refunds are processed to the original payment method and may take several business days to appear. Gated does not guarantee refunds for schedule conflicts, change of mind, no-shows, partial attendance, dissatisfaction with an event, or any reason other than as stated here or as required by law.</p>
        </Section>

        <Section n="12" title="User Content and License">
          <SubSection title="12.1 Your Content">
            <p>You retain ownership of content you submit to the Platform, including profile information, event listings, photos, messages, and organization materials, subject to third-party rights.</p>
          </SubSection>
          <SubSection title="12.2 License to Gated">
            <p>You grant The Greek Life Corp. a non-exclusive, worldwide, royalty-free, sublicensable license to host, store, reproduce, display, distribute, and otherwise use your content as reasonably necessary to operate, maintain, and improve the Platform; to promote the Platform and public listings; to enforce these Terms; and to comply with law. This license continues for a commercially reasonable period after content is removed, to allow for backups, logs, and legal compliance.</p>
          </SubSection>
          <SubSection title="12.3 Public Visibility">
            <p>Content you make public on the Platform, such as event listings or organization pages, may be visible to other users according to product design and visibility settings.</p>
          </SubSection>
          <SubSection title="12.4 Prohibited Content">
            <p>You may not upload content that infringes intellectual property, violates privacy rights, or violates these Terms.</p>
          </SubSection>
        </Section>

        <Section n="13" title="Gated Intellectual Property">
          <p style={{ marginBottom: 12 }}>The Platform software, branding, logos, design, and proprietary materials are owned by or licensed to The Greek Life Corp. and are protected by intellectual property laws. Except for the limited right to use the Platform under these Terms, no rights are granted to you. You may not copy, modify, distribute, sell, or lease any part of the Platform except as allowed by law or with our written permission.</p>
          <SubSection title="13.1 Copyright Complaints (DMCA)">
            <p>We respect intellectual property rights and respond to notices of alleged copyright infringement consistent with the Digital Millennium Copyright Act (DMCA). If you believe content on the Platform infringes your copyright, send a written notice to our designated DMCA agent at <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a> that includes: (a) your physical or electronic signature; (b) identification of the copyrighted work claimed to be infringed; (c) identification of the allegedly infringing material and information reasonably sufficient to locate it; (d) your contact information; (e) a statement that you have a good-faith belief that the use is not authorized by the copyright owner, its agent, or the law; and (f) a statement, made under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on the owner's behalf. We may remove or disable access to allegedly infringing material and may terminate the accounts of users who are repeat infringers.</p>
          </SubSection>
        </Section>

        <Section n="14" title="Privacy">
          <p>Your use of the Platform is also governed by our <Link href="/privacy" style={{ color: C.accent }}>Privacy Policy</Link>, which explains how we collect, use, and share information, including any rights you may have under applicable state privacy laws. By using the Platform, you acknowledge that we may process personal information as described in the Privacy Policy, including through service providers such as Supabase (authentication, database, and storage) and Stripe (payments). Gated does not knowingly act as a school official under FERPA and does not access education records maintained by any educational institution.</p>
        </Section>

        <Section n="15" title="Third-Party Services and Links">
          <p style={{ marginBottom: 12 }}>The Platform may integrate with or link to third-party services, websites, maps, payment systems, or content. Gated does not control and is not responsible for third-party services. Your use of third-party services is at your own risk and subject to their terms.</p>
          <SubSection title="15.1 Mobile Application and App Store Terms">
            <p>If you download the Gated application from the Apple App Store or Google Play, your use is also subject to the applicable app store's terms of service. You acknowledge that these Terms are between you and The Greek Life Corp. only, and not with Apple Inc. or Google LLC, and that those providers are not responsible for the application or its content. The app store providers have no obligation to furnish any maintenance or support services for the application, and are not responsible for addressing any claims relating to the application, including product liability, legal or regulatory non-compliance, or intellectual property claims. You represent that you are not located in a country subject to a U.S. Government embargo or designated as a "terrorist supporting" country, and are not listed on any U.S. Government list of prohibited or restricted parties. Apple Inc. and Google LLC, and their subsidiaries, are third-party beneficiaries of these Terms and may enforce them against you as a user.</p>
          </SubSection>
        </Section>

        <Section n="16" title="Disclaimers">
          <p style={{ marginBottom: 12 }}><strong style={{ color: C.white }}>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, GATED DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.</strong></p>
          <p style={{ marginBottom: 8 }}>Gated does not warrant that:</p>
          <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
            <li>The Platform will be uninterrupted, secure, or error-free;</li>
            <li>Listings or user content are accurate or reliable;</li>
            <li>Events will be safe, lawful, or occur as scheduled;</li>
            <li>Defects will be corrected.</li>
          </ul>
          <p>Some jurisdictions do not allow certain disclaimers; in those cases, disclaimers apply to the fullest extent permitted.</p>
        </Section>

        <Section n="17" title="Limitation of Liability">
          <p style={{ marginBottom: 12 }}><strong style={{ color: C.white }}>TO THE FULLEST EXTENT PERMITTED BY LAW, THE GREEK LIFE CORP. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR RELATED TO THESE TERMS, THE PLATFORM, ANY EVENT, ORGANIZER, ATTENDEE, OR USER CONTENT, ANY PAYMENT, TICKET, OR REFUND MATTER, OR ANY UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR CONTENT. THIS LIMITATION SHALL NOT APPLY TO LIABILITY ARISING FROM GATED'S GROSS NEGLIGENCE, WILLFUL MISCONDUCT, OR FRAUD, OR TO INDEMNIFICATION OBLIGATIONS UNDER SECTION 18.</strong></p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: C.white }}>IN NO EVENT SHALL THE GREEK LIFE CORP.'S AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM EXCEED THE GREATER OF: (A) U.S. $100, OR (B) THE TOTAL AMOUNTS YOU PAID TO THE GREEK LIFE CORP. FOR PLATFORM FEES IN THE TWELVE (12) MONTHS BEFORE THE CLAIM (IF ANY).</strong></p>
          <p>Some jurisdictions do not allow certain limitations of liability; in those cases, our liability is limited to the minimum extent permitted by law.</p>
        </Section>

        <Section n="18" title="Indemnification">
          <p style={{ marginBottom: 12 }}>You agree to indemnify, defend, and hold harmless The Greek Life Corp. and its affiliates, officers, employees, contractors, and agents from and against any third-party claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to:</p>
          <ul style={{ margin: "0 0 12px 1.2rem", padding: 0, listStyleType: "disc", lineHeight: 1.8 }}>
            <li>Your use of the Platform;</li>
            <li>Your events, listings, organization pages, or hosted activities;</li>
            <li>Your content or communications;</li>
            <li>Your violation of these Terms;</li>
            <li>Your violation of any law or third-party rights;</li>
            <li>Any allegation that your event conduct, including alcohol service or sales at a real-world event, caused harm, provided that such conduct was your or your organization's responsibility and not caused by Gated's intentional misconduct.</li>
          </ul>
          <p>We will provide you with prompt written notice of any indemnified claim. We may assume control of the defense of any indemnified matter, at our expense, and you agree to cooperate. We will not settle any claim that imposes liability or obligations on you without your prior written consent, which shall not be unreasonably withheld.</p>
        </Section>

        <Section n="19" title="Dispute Resolution; Governing Law; Venue">
          <SubSection title="19.1 Governing Law">
            <p>These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict-of-law principles.</p>
          </SubSection>
          <SubSection title="19.2 Venue">
            <p>You agree that the state and federal courts located in New Castle County, Delaware shall have exclusive jurisdiction over disputes arising out of or relating to these Terms or the Platform, subject to applicable law and any mandatory consumer protections in your jurisdiction.</p>
          </SubSection>
          <SubSection title="19.3 Time Limit">
            <p>To the extent permitted by law, any claim arising out of or relating to these Terms or the Platform must be filed within one (1) year after the claim accrues, unless a longer period is required by law.</p>
          </SubSection>
          <SubSection title="19.4 Binding Arbitration">
            <p>Except for (a) individual claims in small-claims court and (b) claims for injunctive or equitable relief to protect intellectual property or address unauthorized access to the Platform, any dispute, claim, or controversy arising out of or relating to these Terms or the Platform shall be resolved by final and binding arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules, before a single arbitrator. The Greek Life Corp. will pay all arbitration filing fees, arbitrator compensation, and administrative costs in excess of the amount you would be required to pay to file a complaint in court, unless the arbitrator determines that your claims are frivolous. The arbitration shall be conducted in New Castle County, Delaware, or by remote means, and judgment on the award may be entered in any court of competent jurisdiction. This Section is governed by the Federal Arbitration Act.</p>
          </SubSection>
          <SubSection title="19.5 Class Action Waiver; Opt-Out">
            <p>You and The Greek Life Corp. agree that each may bring claims against the other only in an individual capacity, and not as a plaintiff or class member in any purported class, collective, consolidated, or representative proceeding. The arbitrator may not consolidate more than one person's claims or preside over any form of class or representative proceeding. You may opt out of this arbitration and class-action waiver provision by sending written notice to <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a> within thirty (30) days of first accepting these Terms; if you opt out, the dispute-resolution, governing-law, and venue provisions in Sections 19.1 through 19.3 will apply.</p>
          </SubSection>
        </Section>

        <Section n="20" title="Changes to These Terms or the Platform">
          <p>We may modify these Terms or the Platform at any time. If we make material changes, we will provide at least thirty (30) days' prior notice by posting updated Terms in the app, sending an email to the address associated with your account, or through in-app notification, and updating the effective date. Your continued use of the Platform after the effective date of revised Terms constitutes acceptance of the revised Terms, where permitted by law. If you do not agree to revised Terms, you must stop using the Platform and may request account deletion subject to legal retention requirements.</p>
        </Section>

        <Section n="21" title="Suspension and Termination">
          <p>We may suspend or terminate your access to the Platform if we reasonably believe you violated these Terms; created legal, safety, or security risk; misused payment or ticketing features; engaged in fraud or impersonation; or harmed other users or the Platform. Except in cases involving fraud, illegal activity, or imminent safety risk, we will use reasonable efforts to provide notice and a reasonable opportunity to cure before termination. Upon termination, any pending payouts for completed events will be processed in accordance with Section 10, and any unused tickets for future events will be handled in accordance with Section 11. You may stop using the Platform at any time. Sections that by their nature should survive termination will survive, including ownership, disclaimers, limitation of liability, indemnification, and governing law.</p>
        </Section>

        <Section n="22" title="Electronic Communications">
          <p>You consent to receive communications from us electronically, including via email, in-app notices, or push notifications. You agree that electronic communications satisfy any legal requirement that such communications be in writing, where permitted by law.</p>
        </Section>

        <Section n="23" title="Miscellaneous">
          <SubSection title="23.1 Entire Agreement">
            <p>These Terms, together with the Privacy Policy and any additional terms presented for specific features, constitute the entire agreement between you and The Greek Life Corp. regarding the Platform.</p>
          </SubSection>
          <SubSection title="23.2 Severability">
            <p>If any provision is held invalid or unenforceable, the remaining provisions remain in effect.</p>
          </SubSection>
          <SubSection title="23.3 No Waiver">
            <p>Failure to enforce any provision is not a waiver of our right to enforce it later.</p>
          </SubSection>
          <SubSection title="23.4 Assignment">
            <p>You may not assign these Terms without our consent. We may assign these Terms in connection with a merger, acquisition, reorganization, or sale of assets.</p>
          </SubSection>
          <SubSection title="23.5 Force Majeure">
            <p>We are not liable for delays or failures caused by events beyond our reasonable control.</p>
          </SubSection>
          <SubSection title="23.6 Contact">
            <p>Questions about these Terms: The Greek Life Corp. | Email: <a href={`mailto:${SUPPORT}`} style={{ color: C.accent }}>{SUPPORT}</a></p>
          </SubSection>
        </Section>

        {/* Summary Table */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ color: C.white, fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Appendix A — Summary of Key User-Facing Policies</h2>
          <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(124,58,237,0.25)" }}>
            {[
              ["Operator", "The Greek Life Corp. (Delaware corporation), app brand: Gated"],
              ["University relationship", "Not affiliated with or endorsed by any university"],
              ["Who runs events", "Independent organizers/users, not Gated"],
              ["Alcohol at real-world events", "Gated does not prohibit lawful alcohol presence/service/sale at independent in-person events"],
              ["Alcohol on Platform", "No unlawful alcohol/drug sales or transactions through Platform payment flows"],
              ["Payments", "Stripe; no full card numbers stored in application database"],
              ["Refunds", "Generally non-refundable; cancelled events may be reviewed manually via support email"],
              ["Governing law", "Delaware"],
              ["Venue", "New Castle County, Delaware"],
              ["Support email", SUPPORT],
            ].map(([label, value], i) => (
              <div key={i} style={{ display: "flex", borderBottom: i < 9 ? "1px solid rgba(124,58,237,0.15)" : "none", background: i % 2 === 0 ? "rgba(124,58,237,0.06)" : "rgba(0,0,0,0.15)" }}>
                <div style={{ padding: "12px 16px", width: "42%", flexShrink: 0, color: C.muted, fontSize: 13, fontWeight: 600 }}>{label}</div>
                <div style={{ padding: "12px 16px", fontSize: 13, color: C.subtle, lineHeight: 1.6 }}>
                  {label === "Support email" ? <a href={`mailto:${value}`} style={{ color: C.accent }}>{value}</a> : value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 56, padding: "24px", borderRadius: 16, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Also see our</p>
          <Link href="/privacy" style={{ color: C.white, fontWeight: 600, fontSize: 15, textDecoration: "none" }}>Privacy Policy →</Link>
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

import { Linking } from "react-native";

import {
  Text,
} from "@/components/ui";
import { COMPANY } from "@/lib/company";
import { LegalScreen, Section, Para, Bullet } from "@/features/legal/Prose";

const mailto = (email: string) => Linking.openURL(`mailto:${email}`).catch(() => {});

export default function PrivacyPolicyScreen() {
  return (
    <LegalScreen
      eyebrow="Legal"
      title="Privacy Policy"
      updated={COMPANY.legalUpdated}
      intro={`${COMPANY.legalName} (“${COMPANY.brand}”, “we”, “us”) operates ${COMPANY.brandFull} at ${COMPANY.domain}. This policy explains how we handle your personal information in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).`}
    >
      <Section title="1. Who we are">
        <Para>
          {COMPANY.brandFull} is a platform for discovering communities, hubs, events and cultural
          experiences across Australia, with First Nations voices at the centre. The data controller
          is {COMPANY.legalName} ({COMPANY.abn}).
        </Para>
      </Section>

      <Section title="2. Information we collect">
        <Para>We collect the following kinds of personal information:</Para>
        <Bullet>
          <Text className="font-heading">Account details</Text> — your name, email address and
          authentication credentials when you sign up.
        </Bullet>
        <Bullet>
          <Text className="font-heading">Profile content</Text> — anything you choose to add, such as
          your bio, location, interests, avatar, professional details and social links.
        </Bullet>
        <Bullet>
          <Text className="font-heading">Hub & event content</Text> — information you publish as an
          organiser, including descriptions, images, locations and ticketing details.
        </Bullet>
        <Bullet>
          <Text className="font-heading">Purchase information</Text> — when you buy a ticket, your
          order and payment are processed by Stripe. We store order records (event, quantity, amount,
          status) but we do not store your full card details.
        </Bullet>
        <Bullet>
          <Text className="font-heading">Usage & device data</Text> — basic technical information such
          as app version, device type and approximate location used to show local weather and content.
        </Bullet>
      </Section>

      <Section title="3. How we use your information">
        <Para>We use personal information to:</Para>
        <Bullet>provide, maintain and improve the {COMPANY.brand} service;</Bullet>
        <Bullet>create and manage your account and profile;</Bullet>
        <Bullet>process ticket purchases and send receipts and order updates;</Bullet>
        <Bullet>surface relevant hubs, events and experiences near you;</Bullet>
        <Bullet>respond to your enquiries and provide support; and</Bullet>
        <Bullet>keep the platform safe and comply with our legal obligations.</Bullet>
      </Section>

      <Section title="4. Disclosure to third parties">
        <Para>
          We share personal information only as needed to run the service. Key providers include:
        </Para>
        <Bullet>
          <Text className="font-heading">Stripe</Text> — payment processing for ticket purchases.
        </Bullet>
        <Bullet>
          <Text className="font-heading">Supabase</Text> — secure database, authentication and file
          storage hosting.
        </Bullet>
        <Bullet>
          <Text className="font-heading">Event organisers</Text> — when you buy a ticket or RSVP, the
          relevant hub/organiser may receive your name and order details to manage attendance.
        </Bullet>
        <Para>
          We do not sell your personal information. We may disclose information where required by law.
        </Para>
      </Section>

      <Section title="5. Overseas disclosure">
        <Para>
          Some of our service providers may store or process data outside Australia. Where this
          happens we take reasonable steps to ensure your information is handled consistently with the
          APPs.
        </Para>
      </Section>

      <Section title="6. Storage and security">
        <Para>
          We take reasonable technical and organisational measures to protect your information,
          including encryption in transit, access controls and row-level security on our database. No
          method of transmission or storage is completely secure, so we cannot guarantee absolute
          security.
        </Para>
      </Section>

      <Section title="7. Accessing and correcting your information">
        <Para>
          You can view and update most of your information directly in the app. You may also request
          access to, or correction of, the personal information we hold about you, or ask us to delete
          your account, by contacting us at {COMPANY.privacyEmail}.
        </Para>
      </Section>

      <Section title="8. Cookies and analytics">
        <Para>
          On the web, we use essential cookies and local storage to keep you signed in and remember
          your preferences. We use only limited, privacy-respecting analytics to understand and
          improve the service.
        </Para>
      </Section>

      <Section title="9. Children">
        <Para>
          {COMPANY.brand} is not directed at children under 16. If you believe a child has provided us
          personal information, contact us and we will take appropriate steps to remove it.
        </Para>
      </Section>

      <Section title="10. Complaints">
        <Para>
          If you have a privacy concern, contact us first at {COMPANY.privacyEmail} and we will
          respond promptly. If you are not satisfied, you may contact the Office of the Australian
          Information Commissioner (OAIC) at oaic.gov.au.
        </Para>
      </Section>

      <Section title="11. Changes to this policy">
        <Para>
          We may update this policy from time to time. We will revise the “last updated” date above
          and, where appropriate, notify you in the app.
        </Para>
      </Section>

      <Section title="12. Contact us">
        <Para>
          Privacy enquiries:{" "}
          <Text tone="pink" onPress={() => mailto(COMPANY.privacyEmail)}>
            {COMPANY.privacyEmail}
          </Text>
          {"\n"}General support:{" "}
          <Text tone="pink" onPress={() => mailto(COMPANY.supportEmail)}>
            {COMPANY.supportEmail}
          </Text>
        </Para>
      </Section>
    </LegalScreen>
  );
}

import {
  Text,
} from "@/components/ui";
import { COMPANY } from "@/lib/company";
import { LegalScreen, Section, Para, Bullet } from "@/features/legal/Prose";

export default function TermsOfUseScreen() {
  return (
    <LegalScreen
      eyebrow="Legal"
      title="Terms of Use"
      updated={COMPANY.legalUpdated}
      intro={`These terms govern your use of ${COMPANY.brandFull} (the “Service”) at ${COMPANY.domain}, operated by ${COMPANY.legalName} (“${COMPANY.brand}”, “we”, “us”). By using the Service you agree to these terms.`}
    >
      <Section title="1. Acceptance">
        <Para>
          By creating an account or using the Service, you confirm you have read and agree to these
          terms and our Privacy Policy. If you do not agree, please do not use the Service.
        </Para>
      </Section>

      <Section title="2. Eligibility and accounts">
        <Para>
          You must be at least 16 years old to create an account. You are responsible for keeping your
          login details secure and for all activity under your account. Provide accurate information
          and keep it up to date.
        </Para>
      </Section>

      <Section title="3. First Nations respect">
        <Para>
          {COMPANY.brand} centres respect for Aboriginal and Torres Strait Islander peoples. You must
          not use the Service to misrepresent cultural authority, misappropriate cultural knowledge,
          or disrespect Country, communities or Elders.
        </Para>
      </Section>

      <Section title="4. Acceptable use">
        <Para>You agree not to:</Para>
        <Bullet>break any law or infringe the rights of others;</Bullet>
        <Bullet>post content that is misleading, hateful, harassing, or unlawful;</Bullet>
        <Bullet>impersonate any person or organisation, or run events you are not authorised to;</Bullet>
        <Bullet>upload malware, scrape the Service, or interfere with its operation; or</Bullet>
        <Bullet>use the Service to send spam or unsolicited marketing.</Bullet>
      </Section>

      <Section title="5. Your content">
        <Para>
          You retain ownership of the content you submit (profiles, hubs, events, images). You grant
          {" "}
          {COMPANY.legalName} a non-exclusive, royalty-free licence to host, display and distribute
          that content as needed to operate and promote the Service. You are responsible for ensuring
          you have the rights to everything you upload.
        </Para>
      </Section>

      <Section title="6. Organisers, hubs and events">
        <Para>
          If you create a hub or event, you are the organiser and are responsible for the accuracy of
          your listings, for running the event, and for complying with all applicable laws. You must
          honour the tickets you sell and handle attendee information responsibly.
        </Para>
      </Section>

      <Section title="7. Ticket purchases and payments">
        <Para>
          Paid tickets are processed securely through Stripe. When you buy a ticket you authorise the
          charge for the displayed price. The contract for attendance is between you and the
          organiser.
        </Para>
        <Bullet>
          Refunds, cancellations and changes are the responsibility of the organiser, subject to their
          stated policy and to your rights under the Australian Consumer Law.
        </Bullet>
        <Bullet>
          {COMPANY.brand} is not the seller of the event and is not responsible for an event being
          cancelled, postponed or not as described.
        </Bullet>
      </Section>

      <Section title="8. Intellectual property">
        <Para>
          The {COMPANY.brand} name, logo, software and design are owned by {COMPANY.legalName} and
          protected by law. You may not copy, modify or reverse-engineer the Service except as
          permitted by law.
        </Para>
      </Section>

      <Section title="9. Third-party links">
        <Para>
          The Service may link to third-party websites and services (such as organiser pages or ticket
          providers). We are not responsible for their content or practices.
        </Para>
      </Section>

      <Section title="10. Disclaimers and consumer rights">
        <Para>
          The Service is provided “as is”. Nothing in these terms excludes, restricts or modifies any
          guarantee, right or remedy you have under the Australian Consumer Law that cannot be
          excluded. To the extent permitted by law, we exclude all other warranties.
        </Para>
      </Section>

      <Section title="11. Limitation of liability">
        <Para>
          To the maximum extent permitted by law, {COMPANY.legalName} is not liable for indirect or
          consequential loss. Where our liability cannot be excluded, it is limited (at our option) to
          re-supplying the Service or paying the cost of doing so.
        </Para>
      </Section>

      <Section title="12. Suspension and termination">
        <Para>
          You may stop using the Service and delete your account at any time. We may suspend or
          terminate access if you breach these terms or to protect the Service and its community.
        </Para>
      </Section>

      <Section title="13. Governing law">
        <Para>
          These terms are governed by the laws of {COMPANY.jurisdiction}, and you submit to the
          non-exclusive jurisdiction of its courts.
        </Para>
      </Section>

      <Section title="14. Changes and contact">
        <Para>
          We may update these terms from time to time; continued use means you accept the changes.
          Questions? Contact{" "}
          <Text tone="pink">{COMPANY.supportEmail}</Text>.
        </Para>
      </Section>
    </LegalScreen>
  );
}

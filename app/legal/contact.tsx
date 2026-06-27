import { Linking, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { ListRow } from "@/components/ui/ListRow";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/lib/theme";
import { COMPANY } from "@/lib/company";
import { LegalScreen, Section, Para } from "@/features/legal/Prose";

const mailto = (email: string, subject?: string) =>
  Linking.openURL(`mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`).catch(
    () => {},
  );

export default function ContactSupportScreen() {
  return (
    <LegalScreen
      eyebrow="Help"
      title="Contact & Support"
      intro={`We’re here to help. Reach the ${COMPANY.brandFull} team and we’ll get back to you as soon as we can — usually within 2 business days.`}
    >
      <Card padded={false} className="px-5">
        <ListRow
          title="Email support"
          subtitle="Questions, feedback or anything else"
          left={<Icon name="mail" size={20} color={colors.ink} />}
          onPress={() => mailto(COMPANY.supportEmail, "CulturePass support")}
        />
        <Divider />
        <ListRow
          title="Report a problem"
          subtitle="Safety, abuse or a listing that needs attention"
          left={<Icon name="info" size={20} color={colors.ink} />}
          onPress={() => mailto(COMPANY.supportEmail, "Report a problem")}
        />
        <Divider />
        <ListRow
          title="Privacy requests"
          subtitle="Access, correction or account deletion"
          left={<Icon name="lock" size={20} color={colors.ink} />}
          onPress={() => mailto(COMPANY.privacyEmail, "Privacy request")}
        />
        <Divider />
        <ListRow
          title="Visit our website"
          subtitle={COMPANY.domain}
          left={<Icon name="globe" size={20} color={colors.ink} />}
          onPress={() => Linking.openURL(COMPANY.url).catch(() => {})}
        />
      </Card>

      <Section title="Tickets & payments">
        <Para>
          Ticket payments are processed securely by Stripe and a receipt is emailed to you. Refunds,
          cancellations and event changes are handled by the event organiser under their policy and
          your rights under the Australian Consumer Law. For purchase issues, email{" "}
          {COMPANY.supportEmail} with your order reference.
        </Para>
      </Section>

      <Section title="Account help">
        <Para>
          You can update your profile, privacy and notification settings in the app at any time. To
          delete your account, open Settings → Account, or email {COMPANY.privacyEmail}.
        </Para>
      </Section>

      <Section title="Organiser support">
        <Para>
          Running a hub or selling tickets? We can help with listings, verification and payouts. Email
          {" "}
          {COMPANY.supportEmail} and tell us about your community.
        </Para>
      </Section>

      <Section title="Company details">
        <Para>
          {COMPANY.legalName}{"\n"}
          {COMPANY.abn}{"\n"}
          {COMPANY.domain}
        </Para>
      </Section>

      <View />
    </LegalScreen>
  );
}

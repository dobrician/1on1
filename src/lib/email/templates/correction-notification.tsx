import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading as headingStyle,
  paragraph as paragraphStyle,
  button as buttonStyle,
} from "../styles";

interface CorrectionNotificationEmailProps {
  sessionUrl: string;
  // Translated string props — pre-interpolated by the caller
  heading: string;
  greeting: string;
  body: string;
  buttonLabel: string;
  footer: string;
}

export function CorrectionNotificationEmail({
  sessionUrl,
  heading,
  greeting,
  body,
  buttonLabel,
  footer,
}: CorrectionNotificationEmailProps) {
  return (
    <EmailLayout footerText={footer}>
      <Text style={headingStyle}>{heading}</Text>
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>{body}</Text>
      <Button style={buttonStyle} href={sessionUrl}>
        {buttonLabel}
      </Button>
    </EmailLayout>
  );
}

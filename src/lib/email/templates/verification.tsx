import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading as headingStyle,
  paragraph as paragraphStyle,
  button as buttonStyle,
} from "../styles";

interface VerificationEmailProps {
  verifyUrl: string;
  // Translated string props
  heading: string;
  body: string;
  buttonLabel: string;
  footer: string;
}

export function VerificationEmail({
  verifyUrl,
  heading,
  body,
  buttonLabel,
  footer,
}: VerificationEmailProps) {
  return (
    <EmailLayout footerText={footer}>
      <Text style={headingStyle}>{heading}</Text>
      <Text style={paragraphStyle}>{body}</Text>
      <Button style={buttonStyle} href={verifyUrl}>
        {buttonLabel}
      </Button>
    </EmailLayout>
  );
}

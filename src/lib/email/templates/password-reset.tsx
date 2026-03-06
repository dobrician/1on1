import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading as headingStyle,
  paragraph as paragraphStyle,
  button as buttonStyle,
} from "../styles";

interface PasswordResetEmailProps {
  resetUrl: string;
  // Translated string props
  heading: string;
  body: string;
  buttonLabel: string;
  footer: string;
}

export function PasswordResetEmail({
  resetUrl,
  heading,
  body,
  buttonLabel,
  footer,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout footerText={footer}>
      <Text style={headingStyle}>{heading}</Text>
      <Text style={paragraphStyle}>{body}</Text>
      <Button style={buttonStyle} href={resetUrl}>
        {buttonLabel}
      </Button>
    </EmailLayout>
  );
}

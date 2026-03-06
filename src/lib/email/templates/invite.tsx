import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading as headingStyle,
  paragraph as paragraphStyle,
  button as buttonStyle,
} from "../styles";

interface InviteEmailProps {
  inviteUrl: string;
  organizationName: string;
  inviterName: string;
  role: string;
  // Translated string props
  heading: string;
  body: string;
  buttonLabel: string;
  footer: string;
}

export function InviteEmail({
  inviteUrl,
  heading,
  body,
  buttonLabel,
  footer,
}: InviteEmailProps) {
  return (
    <EmailLayout footerText={footer}>
      <Text style={headingStyle}>{heading}</Text>
      <Text style={paragraphStyle}>{body}</Text>
      <Button style={buttonStyle} href={inviteUrl}>
        {buttonLabel}
      </Button>
    </EmailLayout>
  );
}

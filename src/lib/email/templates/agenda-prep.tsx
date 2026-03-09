import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading as headingStyle,
  paragraph as paragraphStyle,
  button as buttonStyle,
} from "../styles";

interface AgendaPrepEmailProps {
  variant: "manager" | "report";
  recipientName: string;
  otherPartyName: string;
  meetingDate: string;
  seriesUrl: string;
  // Translated string props
  heading: string;
  greeting: string;
  body: string;              // caller picks bodyReport or bodyManager and pre-interpolates
  buttonLabel: string;
  footer: string;
}

export function AgendaPrepEmail({
  seriesUrl,
  heading,
  greeting,
  body,
  buttonLabel,
  footer,
}: AgendaPrepEmailProps) {
  return (
    <EmailLayout footerText={footer}>
      <Text style={headingStyle}>{heading}</Text>
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>{body}</Text>

      <Button style={buttonStyle} href={seriesUrl}>
        {buttonLabel}
      </Button>
    </EmailLayout>
  );
}

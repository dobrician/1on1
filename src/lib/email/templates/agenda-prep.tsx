import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading as headingStyle,
  paragraph as paragraphStyle,
  subheading,
  button as buttonStyle,
  card,
  listItem,
  metadataRow,
} from "../styles";

interface Nudge {
  content: string;
  reason: string;
}

interface AgendaPrepEmailProps {
  variant: "manager" | "report";
  recipientName: string;
  otherPartyName: string;
  meetingDate: string;
  seriesUrl: string;
  nudges?: Nudge[];
  // Translated string props
  heading: string;
  greeting: string;
  body: string;              // caller picks bodyReport or bodyManager and pre-interpolates
  aiNudgesLabel: string;
  buttonLabel: string;
  footer: string;
}

export function AgendaPrepEmail({
  variant,
  seriesUrl,
  nudges,
  heading,
  greeting,
  body,
  aiNudgesLabel,
  buttonLabel,
  footer,
}: AgendaPrepEmailProps) {
  return (
    <EmailLayout footerText={footer}>
      <Text style={headingStyle}>{heading}</Text>
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>{body}</Text>

      {variant === "manager" && nudges && nudges.length > 0 && (
        <>
          <Text style={subheading}>{aiNudgesLabel}</Text>
          {nudges.map((nudge, i) => (
            <div key={i} style={card}>
              <Text style={{ ...listItem, marginBottom: "4px" }}>
                {nudge.content}
              </Text>
              <Text style={metadataRow}>{nudge.reason}</Text>
            </div>
          ))}
        </>
      )}

      <Button style={buttonStyle} href={seriesUrl}>
        {buttonLabel}
      </Button>
    </EmailLayout>
  );
}

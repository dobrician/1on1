import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading as headingStyle,
  subheading,
  paragraph as paragraphStyle,
  button as buttonStyle,
  badge,
  listItem,
  metadataRow,
  card,
  divider,
} from "../styles";

interface AiSummary {
  overallSentiment: string;
  keyTakeaways: string[];
  areasOfConcern: string[];
}

interface ActionItem {
  title: string;
  assigneeName: string;
  dueDate: string | null;
  assignedToLabel: string;   // pre-interpolated "Assigned to: Name"
  dueLabel: string | null;   // pre-interpolated "Due: date" or null
}

interface AiAddendum {
  sentimentAnalysis: string;
  coachingSuggestions: string[];
  riskIndicators: string[];
}

interface SessionSummaryLabels {
  heading: string;           // pre-interpolated by caller: "Session #N Summary"
  greeting: string;          // pre-interpolated by caller: "Hi Name, here is the summary..."
  score: string;             // pre-interpolated by caller: "Score: X / 5.0"
  keyTakeaways: string;
  areasOfConcern: string;
  aiPending: string;
  actionItems: string;
  assignedTo: string;        // label prefix used by caller for assignedToLabel
  due: string;               // label prefix used by caller for dueLabel
  managerInsights: string;
  coachingSuggestions: string;
  riskIndicators: string;
  button: string;
  footer: string;
}

interface SessionSummaryEmailProps {
  variant: "manager" | "report";
  recipientName: string;
  otherPartyName: string;
  sessionNumber: number;
  sessionScore: number | null;
  aiSummary: AiSummary | null;
  actionItems: ActionItem[];
  viewSessionUrl: string;
  aiAddendum?: AiAddendum | null;
  // Translated labels
  labels: SessionSummaryLabels;
}

export function SessionSummaryEmail({
  variant,
  sessionScore,
  aiSummary,
  actionItems,
  viewSessionUrl,
  aiAddendum,
  labels,
}: SessionSummaryEmailProps) {
  return (
    <EmailLayout footerText={labels.footer}>
      <Text style={headingStyle}>{labels.heading}</Text>
      <Text style={paragraphStyle}>{labels.greeting}</Text>

      {sessionScore !== null && (
        <Text style={{ ...badge, marginBottom: "24px" }}>
          {labels.score}
        </Text>
      )}

      {aiSummary ? (
        <>
          <Text style={subheading}>{labels.keyTakeaways}</Text>
          {aiSummary.keyTakeaways.map((takeaway, i) => (
            <Text key={i} style={listItem}>
              {takeaway}
            </Text>
          ))}

          {aiSummary.areasOfConcern.length > 0 && (
            <>
              <Text style={subheading}>{labels.areasOfConcern}</Text>
              {aiSummary.areasOfConcern.map((concern, i) => (
                <Text key={i} style={listItem}>
                  {concern}
                </Text>
              ))}
            </>
          )}
        </>
      ) : (
        <Text style={{ ...paragraphStyle, fontStyle: "italic" }}>
          {labels.aiPending}
        </Text>
      )}

      {actionItems.length > 0 && (
        <>
          <Text style={subheading}>{labels.actionItems}</Text>
          {actionItems.map((item, i) => (
            <div key={i} style={card}>
              <Text style={{ ...listItem, marginBottom: "4px" }}>
                {item.title}
              </Text>
              <Text style={metadataRow}>
                {item.assignedToLabel}
                {item.dueLabel ? ` | ${item.dueLabel}` : ""}
              </Text>
            </div>
          ))}
        </>
      )}

      {variant === "manager" && aiAddendum && (
        <>
          <div style={divider} />
          <Text style={subheading}>{labels.managerInsights}</Text>
          <Text style={paragraphStyle}>{aiAddendum.sentimentAnalysis}</Text>

          {aiAddendum.coachingSuggestions.length > 0 && (
            <>
              <Text style={{ ...metadataRow, fontWeight: "600" as const }}>
                {labels.coachingSuggestions}
              </Text>
              {aiAddendum.coachingSuggestions.map((suggestion, i) => (
                <Text key={i} style={listItem}>
                  {suggestion}
                </Text>
              ))}
            </>
          )}

          {aiAddendum.riskIndicators.length > 0 && (
            <>
              <Text style={{ ...metadataRow, fontWeight: "600" as const }}>
                {labels.riskIndicators}
              </Text>
              {aiAddendum.riskIndicators.map((risk, i) => (
                <Text key={i} style={listItem}>
                  {risk}
                </Text>
              ))}
            </>
          )}
        </>
      )}

      <Button style={buttonStyle} href={viewSessionUrl}>
        {labels.button}
      </Button>
    </EmailLayout>
  );
}

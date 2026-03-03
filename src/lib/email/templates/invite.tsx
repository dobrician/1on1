import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";

interface InviteEmailProps {
  inviteUrl: string;
  organizationName: string;
  inviterName: string;
  role: string;
}

export function InviteEmail({
  inviteUrl,
  organizationName,
  inviterName,
  role,
}: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={section}>
            <Text style={brand}>1on1</Text>
            <Text style={heading}>You have been invited</Text>
            <Text style={paragraph}>
              {inviterName} has invited you to join{" "}
              <strong>{organizationName}</strong> as a {role}.
            </Text>
            <Text style={paragraph}>
              Click the button below to set up your account and get started.
            </Text>
            <Button style={button} href={inviteUrl}>
              Accept Invitation
            </Button>
            <Hr style={hr} />
            <Text style={footer}>
              This invitation expires in 7 days. If you did not expect this
              invitation, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Reuse the same inline style objects from verification.tsx
const body = {
  backgroundColor: "#f9fafb",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container = {
  maxWidth: "480px",
  margin: "0 auto",
  padding: "40px 20px",
};

const section = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "40px 32px",
};

const brand = {
  fontSize: "20px",
  fontWeight: "700" as const,
  color: "#0a0a0a",
  marginBottom: "24px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "600" as const,
  color: "#0a0a0a",
  marginBottom: "8px",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#525252",
  marginBottom: "24px",
};

const button = {
  backgroundColor: "#0a0a0a",
  color: "#fafafa",
  fontSize: "15px",
  fontWeight: "500" as const,
  padding: "12px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block" as const,
};

const hr = {
  borderColor: "#e5e5e5",
  margin: "24px 0",
};

const footer = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#a3a3a3",
};

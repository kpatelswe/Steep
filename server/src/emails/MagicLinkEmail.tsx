import { Body, Button, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import { GUTTER, WIDTH, colors, fonts } from "./theme.js";
import type { MagicLinkData } from "./types.js";

export function magicLinkSubject(data: MagicLinkData): string {
  return data.isNewUser ? "Your Steep sign-in link" : "Sign in to Steep";
}

export default function MagicLinkEmail(data: MagicLinkData) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{data.isNewUser ? "One tap and you’re in." : "Your sign-in link, good for a few minutes."}</Preview>
      <Body style={{ backgroundColor: colors.porcelain, margin: 0, padding: "24px 0", fontFamily: fonts.ui, color: colors.brew }}>
        <Container style={{ width: `${WIDTH}px`, maxWidth: "100%", margin: "0 auto", backgroundColor: colors.cup }}>
          <Section style={{ padding: `26px ${GUTTER}px 30px` }}>
            <Text style={{ margin: 0, fontFamily: fonts.display, fontSize: "30px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: "34px" }}>
              Steep
            </Text>
            <div style={{ height: "3px", width: "64px", marginTop: "4px", backgroundColor: colors.amber }} />
            <div style={{ height: "24px" }} />
            <Text style={{ margin: 0, fontFamily: fonts.body, fontSize: "18px", lineHeight: "27px" }}>
              {data.isNewUser ? "Welcome. Tap below to pick your topics." : "Tap below to sign in."}
            </Text>
            <div style={{ height: "20px" }} />
            <Button
              href={data.url}
              style={{
                backgroundColor: colors.brew,
                color: colors.cup,
                fontFamily: fonts.display,
                fontSize: "15px",
                fontWeight: 700,
                borderRadius: "8px",
                padding: "12px 20px",
              }}
            >
              {data.isNewUser ? "Choose my topics" : "Sign in to Steep"}
            </Button>
            <div style={{ height: "20px" }} />
            <Text style={{ margin: 0, fontFamily: fonts.ui, fontSize: "12px", lineHeight: "18px", color: colors.steam }}>
              {`This link works once and expires in ${data.expiresInMinutes} minutes. If you didn’t ask for it, ignore this email.`}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

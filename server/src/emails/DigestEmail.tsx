import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { GUTTER, WIDTH, colors, fonts } from "./theme";
import type { DigestData, EmailStory, EmailTopic } from "./types";

const reset = { margin: 0, padding: 0 } as const;

const styles = {
  body: { backgroundColor: colors.porcelain, margin: 0, padding: "24px 0", fontFamily: fonts.ui, color: colors.brew },
  container: { width: `${WIDTH}px`, maxWidth: "100%", margin: "0 auto", backgroundColor: colors.cup },
  pad: { padding: `0 ${GUTTER}px` },
  wordmark: {
    ...reset,
    fontFamily: fonts.display,
    fontSize: "30px",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: "34px",
    color: colors.brew,
  },
  date: { ...reset, fontFamily: fonts.ui, fontSize: "13px", color: colors.steam, lineHeight: "18px" },
  greeting: { ...reset, fontFamily: fonts.body, fontSize: "18px", lineHeight: "26px", color: colors.brew },
  stats: { ...reset, fontFamily: fonts.ui, fontSize: "13px", lineHeight: "20px", color: colors.steam },
  topicLabel: (accent: string) => ({
    ...reset,
    fontFamily: fonts.display,
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: accent,
    lineHeight: "18px",
  }),
  leadTitle: {
    ...reset,
    fontFamily: fonts.display,
    fontSize: "23px",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    lineHeight: "29px",
    color: colors.brew,
  },
  rowTitle: {
    ...reset,
    fontFamily: fonts.display,
    fontSize: "16px",
    fontWeight: 600,
    letterSpacing: "-0.01em",
    lineHeight: "22px",
    color: colors.brew,
  },
  meta: { ...reset, fontFamily: fonts.ui, fontSize: "12px", lineHeight: "18px", color: colors.steam },
  snippet: { ...reset, fontFamily: fonts.body, fontSize: "15px", lineHeight: "23px", color: colors.brewSoft },
  numeral: (accent: string) => ({
    ...reset,
    fontFamily: fonts.display,
    fontSize: "18px",
    fontWeight: 800,
    lineHeight: "22px",
    color: accent,
    width: "30px",
    verticalAlign: "top" as const,
    paddingRight: "8px",
  }),
  link: { color: colors.brew, textDecoration: "none" },
  hairline: { borderColor: colors.leaf, borderTop: `1px solid ${colors.leaf}`, margin: 0 },
  badge: {
    display: "inline-block",
    fontFamily: fonts.ui,
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: "16px",
    letterSpacing: "0.02em",
    color: colors.amber,
    backgroundColor: colors.amberSoft,
    borderRadius: "999px",
    padding: "2px 8px",
    verticalAlign: "middle",
  },
  feedback: { ...reset, fontFamily: fonts.ui, fontSize: "12px", lineHeight: "18px", color: colors.steam },
  footer: { ...reset, fontFamily: fonts.ui, fontSize: "12px", lineHeight: "18px", color: colors.steam },
  footerLink: { color: colors.steam, textDecoration: "underline" },
};

function StoryMeta({ story }: { story: EmailStory }) {
  return (
    <Text style={styles.meta}>
      {`${story.source} · ${story.timeAgo}`}
      {story.clusterSize >= 3 ? (
        <>
          {"  "}
          <span style={styles.badge}>{`Covered by ${story.clusterSize} sources`}</span>
        </>
      ) : null}
    </Text>
  );
}

function LeadStory({ story }: { story: EmailStory }) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: "12px" }}>
      <tbody>
        {story.imageUrl ? (
          <tr>
            <td style={{ paddingBottom: "12px" }}>
              <Link href={story.url}>
                <Img
                  src={story.imageUrl}
                  alt=""
                  width={WIDTH - GUTTER * 2}
                  style={{ width: "100%", height: "auto", borderRadius: "6px", display: "block" }}
                />
              </Link>
            </td>
          </tr>
        ) : null}
        <tr>
          <td>
            <Text style={styles.leadTitle}>
              <Link href={story.url} style={styles.link}>
                {story.title}
              </Link>
            </Text>
            <div style={{ height: "6px" }} />
            <StoryMeta story={story} />
            {story.snippet ? (
              <>
                <div style={{ height: "8px" }} />
                <Text style={styles.snippet}>{story.snippet}</Text>
              </>
            ) : null}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function StoryRow({ story, index, accent }: { story: EmailStory; index: number; accent: string }) {
  return (
    <tr>
      <td style={{ padding: "14px 0", borderTop: `1px solid ${colors.leaf}` }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td style={styles.numeral(accent)}>{index}</td>
              <td style={{ verticalAlign: "top" }}>
                <Text style={styles.rowTitle}>
                  <Link href={story.url} style={styles.link}>
                    {story.title}
                  </Link>
                </Text>
                <div style={{ height: "3px" }} />
                <StoryMeta story={story} />
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function TopicBlock({ topic }: { topic: EmailTopic }) {
  const [lead, ...rest] = topic.stories;
  if (!lead) return null;
  return (
    <Section style={{ ...styles.pad, paddingTop: "28px" }}>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td>
              <Text style={styles.topicLabel(topic.accent)}>{`${topic.stories.length} things in ${topic.name}`}</Text>
              <div style={{ height: "6px", borderBottom: `2px solid ${topic.accent}`, width: "36px" }} />
            </td>
          </tr>
          <tr>
            <td>
              <LeadStory story={lead} />
            </td>
          </tr>
        </tbody>
      </table>
      {rest.length > 0 ? (
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: "14px" }}>
          <tbody>
            {rest.map((s, i) => (
              <StoryRow key={s.id} story={s} index={i + 2} accent={topic.accent} />
            ))}
          </tbody>
        </table>
      ) : null}
      <Text style={{ ...styles.feedback, paddingTop: "10px" }}>
        Tomorrow:{" "}
        <Link href={topic.moreUrl} style={styles.footerLink}>{`more ${topic.name}`}</Link>
        {" · "}
        <Link href={topic.lessUrl} style={styles.footerLink}>{`less ${topic.name}`}</Link>
      </Text>
    </Section>
  );
}

export function digestSubject(data: DigestData): string {
  const names = data.topics.map((t) => t.name);
  if (names.length === 0) return `Quiet morning · your ${data.dateLabel.split(",")[0]} steep`;
  const head = names.slice(0, 3).join(", ");
  const more = names.length > 3 ? ` +${names.length - 3}` : "";
  return `${data.totalStories} things in ${head}${more}`;
}

export function digestPreviewText(data: DigestData): string {
  const lead = data.topics[0]?.stories[0];
  return lead ? `${lead.title} — and ${data.totalStories - 1} more, ~${data.readMinutes} min` : "Your morning steep is ready.";
}

export default function DigestEmail(data: DigestData) {
  const statParts = [
    data.steepedFor ? `Steeped for ${data.steepedFor}` : "Your first steep",
    `${data.totalStories} ${data.totalStories === 1 ? "story" : "stories"}`,
    `~${data.readMinutes} min`,
  ];
  if (data.streakDays >= 2) statParts.push(`Day ${data.streakDays} streak`);

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{digestPreviewText(data)}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Masthead */}
          <Section style={{ ...styles.pad, paddingTop: "26px" }}>
            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "bottom" }}>
                    <Text style={styles.wordmark}>Steep</Text>
                    <div
                      style={{
                        height: "3px",
                        width: "64px",
                        marginTop: "4px",
                        backgroundColor: colors.amber,
                        backgroundImage: `linear-gradient(90deg, ${colors.amber}, ${colors.cup})`,
                      }}
                    />
                  </td>
                  <td style={{ verticalAlign: "bottom", textAlign: "right" }}>
                    <Text style={styles.date}>{data.dateLabel}</Text>
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ height: "22px" }} />
            <Text style={styles.greeting}>{data.greeting}</Text>
            <div style={{ height: "4px" }} />
            <Text style={styles.stats}>{statParts.join("  ·  ")}</Text>
          </Section>

          {data.topics.map((t) => (
            <TopicBlock key={t.id} topic={t} />
          ))}

          {data.quietTopics.length > 0 ? (
            <Section style={{ ...styles.pad, paddingTop: "26px" }}>
              <Text style={styles.meta}>{`Quiet day in ${data.quietTopics.join(", ")} — nothing new worth your time.`}</Text>
            </Section>
          ) : null}

          {data.suggestions.length > 0 ? (
            <Section style={{ ...styles.pad, paddingTop: "28px" }}>
              <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td style={{ backgroundColor: colors.porcelain, borderRadius: "8px", padding: "16px 18px" }}>
                      <Text style={{ ...styles.rowTitle, fontSize: "15px" }}>Follow something new</Text>
                      <div style={{ height: "4px" }} />
                      <Text style={styles.meta}>
                        Readers like you are into{" "}
                        {data.suggestions.map((s, i) => (
                          <span key={s.name}>
                            <Link href={s.url} style={{ color: colors.brew, textDecoration: "underline" }}>
                              {s.name}
                            </Link>
                            {i < data.suggestions.length - 1 ? ", " : ""}
                          </span>
                        ))}
                        .
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          ) : null}

          {/* Footer */}
          <Section style={{ ...styles.pad, paddingTop: "32px", paddingBottom: "28px" }}>
            <Hr style={styles.hairline} />
            <div style={{ height: "14px" }} />
            <Text style={styles.footer}>
              <Link href={data.links.manage} style={styles.footerLink}>
                Manage topics
              </Link>{" "}
              ·{" "}
              <Link href={data.links.viewInBrowser} style={styles.footerLink}>
                View in browser
              </Link>{" "}
              ·{" "}
              <Link href={data.links.unsubscribe} style={styles.footerLink}>
                Unsubscribe
              </Link>
            </Text>
            <div style={{ height: "6px" }} />
            <Text style={styles.footer}>{`Steeped at ${data.sentAtLabel}. Links open at the publisher.`}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

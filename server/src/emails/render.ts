import { render } from "@react-email/render";
import DigestEmail, { digestSubject } from "./DigestEmail";
import MagicLinkEmail, { magicLinkSubject } from "./MagicLinkEmail";
import type { DigestData, MagicLinkData } from "./types";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export async function renderDigest(data: DigestData): Promise<RenderedEmail> {
  const el = DigestEmail(data);
  const [html, text] = await Promise.all([render(el), render(el, { plainText: true })]);
  return { subject: digestSubject(data), html, text };
}

export async function renderMagicLink(data: MagicLinkData): Promise<RenderedEmail> {
  const el = MagicLinkEmail(data);
  const [html, text] = await Promise.all([render(el), render(el, { plainText: true })]);
  return { subject: magicLinkSubject(data), html, text };
}

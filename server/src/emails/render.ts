import { render } from "@react-email/render";
import DigestEmail, { digestSubject } from "./DigestEmail.js";
import MagicLinkEmail, { magicLinkSubject } from "./MagicLinkEmail.js";
import type { DigestData, MagicLinkData } from "./types.js";

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

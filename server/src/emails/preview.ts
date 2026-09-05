/**
 * Render the sample issue and the magic-link email to HTML files so they can be
 * opened in a browser or screenshotted. Usage: tsx src/emails/preview.ts [outDir]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sampleDigest } from "./fixtures";
import { renderDigest, renderMagicLink } from "./render";

const outDir = process.argv[2] ?? ".preview";
mkdirSync(outDir, { recursive: true });
const digest = await renderDigest(sampleDigest);
writeFileSync(join(outDir, "digest.html"), digest.html);
writeFileSync(join(outDir, "digest.txt"), digest.text);
const magic = await renderMagicLink({ url: "https://steep.example/auth/verify?token=demo", expiresInMinutes: 15, isNewUser: true });
writeFileSync(join(outDir, "magic-link.html"), magic.html);
console.log(`subject: ${digest.subject}\nwrote ${outDir}/digest.html, digest.txt, magic-link.html`);

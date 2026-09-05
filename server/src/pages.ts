/** Minimal branded HTML for the few pages that must work without the SPA (email link landings). */
export function tinyPage(opts: { title: string; body: string; cta?: { href: string; label: string } }): string {
  const cta = opts.cta
    ? `<p style="margin-top:20px"><a href="${opts.cta.href}" style="display:inline-block;background:#22170F;color:#fff;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:8px">${opts.cta.label}</a></p>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${opts.title} · Steep</title></head>
<body style="margin:0;background:#FAFAF7;font-family:-apple-system,'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif;color:#22170F">
<div style="max-width:520px;margin:48px auto;padding:32px 28px;background:#fff">
<div style="font-size:28px;font-weight:800;letter-spacing:-0.03em">Steep</div><div style="height:3px;width:56px;background:#C4761B;margin-top:4px"></div>
<h1 style="font-size:22px;letter-spacing:-0.02em;margin:26px 0 8px">${opts.title}</h1>
<p style="font-family:Georgia,serif;font-size:17px;line-height:26px;color:#4A3B31;margin:0">${opts.body}</p>${cta}
</div></body></html>`;
}

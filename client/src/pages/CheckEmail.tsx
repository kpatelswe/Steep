import { Link, useLocation } from "react-router";
import { Card, Wordmark } from "../ui";

export default function CheckEmail() {
  const state = (useLocation().state ?? {}) as { email?: string; devLink?: string };
  const domain = state.email?.split("@")[1] ?? "";
  const webmail = domain.includes("gmail") ? "https://mail.google.com" : domain.includes("outlook") || domain.includes("hotmail") ? "https://outlook.live.com" : null;
  return (
    <main className="mx-auto max-w-xl px-6">
      <header className="py-6">
        <Wordmark />
      </header>
      <Card className="mt-10 p-8">
        <h1 className="display text-[32px] font-extrabold leading-tight">Check your email</h1>
        <p className="prose-steep mt-3 text-[18px] leading-[1.55] text-brew-soft">
          We sent a sign-in link to <strong className="text-brew">{state.email ?? "your inbox"}</strong>. It works once and expires in 15 minutes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {webmail ? (
            <a href={webmail} className="rounded-lg bg-brew px-4 py-2.5 text-[15px] font-semibold text-cup">
              Open {domain.includes("gmail") ? "Gmail" : "Outlook"}
            </a>
          ) : null}
          <Link to="/" className="rounded-lg border border-leaf px-4 py-2.5 text-[15px] font-semibold">
            Use a different email
          </Link>
        </div>
        {state.devLink ? (
          <p className="mt-6 rounded-lg bg-amber-soft px-3 py-2 text-[13px] text-brew-soft">
            Local dev, no email provider configured:{" "}
            <a className="font-semibold underline" href={state.devLink}>
              open the sign-in link
            </a>
          </p>
        ) : null}
      </Card>
    </main>
  );
}

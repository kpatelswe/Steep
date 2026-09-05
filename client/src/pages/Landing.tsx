import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { api, ApiError } from "../api";
import { ScaledFrame } from "../ScaledFrame";
import { Button, Notice, Steam, Wordmark } from "../ui";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.requestLink(email);
      navigate("/check-email", { state: { email, devLink: r.devLink } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20">
      <header className="flex items-center justify-between py-6">
        <Wordmark />
        <a href="#signin" className="text-[14px] text-brew-soft underline-offset-4 hover:underline">
          Already steeping? Sign in
        </a>
      </header>

      <section className="grid grid-cols-[minmax(0,1fr)] items-start gap-12 pt-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-16 md:pt-14">
        <div>
          <div className="mb-5 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-amber">
            <Steam /> One email, every morning
          </div>
          <h1 className="display text-[44px] font-extrabold leading-[0.98] sm:text-[60px] md:text-[68px]">
            Your news,
            <br />
            steeped overnight.
          </h1>
          <p className="prose-steep mt-6 max-w-[34rem] text-[19px] leading-[1.55] text-brew-soft">
            Pick what you care about. While you sleep, Steep reads every source it can find and pours the{" "}
            <strong className="font-semibold text-brew">five things worth knowing</strong> in each topic into one short email. About four minutes, then on with your day.
          </p>

          <form id="signin" onSubmit={submit} className="mt-8 flex max-w-[30rem] flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 flex-1 rounded-lg border border-leaf bg-cup px-4 text-[16px] placeholder:text-steam"
            />
            <Button type="submit" disabled={busy} className="h-12 px-5">
              {busy ? "Sending…" : "Get tomorrow’s steep"}
            </Button>
          </form>
          {error ? <div className="mt-3 max-w-[30rem]"><Notice tone="error">{error}</Notice></div> : null}
          <p className="mt-3 text-[13px] text-steam">Free. No password, we email you a link. Unsubscribe in one tap.</p>

          <dl className="mt-14 grid gap-6 sm:grid-cols-3">
            {[
              ["Follow anything", "Eight curated topics, or type a team, a company, a city. Anything Google News knows about."],
              ["Ranked, not dumped", "Stories covered by several publishers rise to the top, and you never see the same one twice."],
              ["Trained by taps", "“More like this” and “less like this” in every issue tune tomorrow’s."],
            ].map(([t, d]) => (
              <div key={t}>
                <dt className="display text-[17px] font-bold">{t}</dt>
                <dd className="mt-1 text-[14px] leading-[1.5] text-brew-soft">{d}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className="relative min-w-0">
          <figcaption className="mb-3 flex items-center justify-between text-[13px] text-steam">
            <span>
              This morning’s issue, built from <span className="font-semibold text-brew">live</span> stories
            </span>
            <span className="rounded-full bg-amber-soft px-2.5 py-0.5 font-semibold text-amber">Sample issue</span>
          </figcaption>
          <div className="overflow-hidden rounded-2xl border border-leaf bg-cup shadow-[0_30px_60px_-30px_rgba(34,23,15,0.35)]">
            <div className="flex items-center gap-2 border-b border-leaf px-4 py-2.5 text-[12px] text-steam">
              <span className="h-2.5 w-2.5 rounded-full bg-leaf" />
              <span className="h-2.5 w-2.5 rounded-full bg-leaf" />
              <span className="h-2.5 w-2.5 rounded-full bg-leaf" />
              <span className="ml-3 truncate">From: Steep · Subject: 15 things in Technology, World, Sports</span>
            </div>
            <ScaledFrame title="Sample Steep issue" src="/api/digest/sample" height={720} className="bg-porcelain" />
          </div>
        </figure>
      </section>
    </main>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api, ApiError, type Me, type Stats } from "../api";
import { ScaledFrame } from "../ScaledFrame";
import { Button, Card, Notice, Wordmark, hourLabel } from "../ui";

export default function Home() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const first = params.get("first") === "1";

  async function load() {
    try {
      const [m, s] = await Promise.all([api.me(), api.stats()]);
      setMe(m);
      setStats(s);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) navigate("/", { replace: true });
    }
  }
  useEffect(() => {
    let active = true;
    Promise.all([api.me(), api.stats()])
      .then(([m, s]) => {
        if (!active) return;
        setMe(m);
        setStats(s);
      })
      .catch((err: unknown) => {
        if (active && err instanceof ApiError && err.status === 401) navigate("/", { replace: true });
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function sendNow() {
    setSending(true);
    setNotice(null);
    try {
      const { outcome } = await api.sendNow();
      if (outcome.status === "sent")
        setNotice({ tone: "info", text: outcome.dryRun ? `Rendered ${outcome.articleCount} stories to the local outbox (no email provider configured).` : `Sent. ${outcome.articleCount} stories are on their way to ${me?.user.email}.` });
      else if (outcome.status === "skipped_empty") setNotice({ tone: "info", text: "Nothing fresh enough to send right now. Try again in an hour." });
      else setNotice({ tone: "error", text: "Couldn't send. Try again in a minute." });
      params.delete("first");
      setParams(params, { replace: true });
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Couldn't send. Try again." });
    } finally {
      setSending(false);
    }
  }

  async function nudge(topicId: string, weight: number) {
    if (!me) return;
    const w = Math.min(7, Math.max(1, weight));
    setMe({ ...me, topics: me.topics.map((t) => (t.id === topicId ? { ...t, weight: w } : t)) });
    try {
      await api.setWeight(topicId, w);
    } catch {
      await load();
    }
  }

  async function toggleActive() {
    if (!me) return;
    const { user } = await api.patchMe({ active: !me.user.active });
    setMe({ ...me, user });
  }

  async function logout() {
    await api.logout();
    navigate("/");
  }

  if (!me) {
    return (
      <main className="mx-auto max-w-4xl px-6">
        <header className="py-6">
          <Wordmark to="/home" />
        </header>
        <div className="mt-10 h-40 animate-pulse rounded-xl border border-leaf bg-cup" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24">
      <header className="flex items-center justify-between py-6">
        <Wordmark to="/home" />
        <nav className="flex items-center gap-5 text-[14px] text-brew-soft">
          <Link to="/follow" className="underline-offset-4 hover:underline">
            Topics
          </Link>
          <button onClick={logout} className="underline-offset-4 hover:underline">
            Sign out
          </button>
        </nav>
      </header>

      {first ? (
        <Card className="mt-6 border-amber bg-amber-soft p-6">
          <h1 className="display text-[30px] font-extrabold leading-tight">You’re set. First issue lands at {hourLabel(me.user.sendHour)}.</h1>
          <p className="prose-steep mt-2 text-[17px] text-brew-soft">Don’t want to wait? Pour one now and see what it looks like in your inbox.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={sendNow} disabled={sending}>
              {sending ? "Steeping…" : "Send my first steep now"}
            </Button>
            <Button variant="ghost" onClick={() => setShowPreview((s) => !s)}>
              {showPreview ? "Hide preview" : "Preview in browser"}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-[40px] font-extrabold leading-[1.02]">Good to see you.</h1>
            <p className="mt-2 text-[15px] text-brew-soft">
              {me.user.active ? (
                <>
                  Next issue at <strong className="text-brew">{hourLabel(me.user.sendHour)}</strong> {me.user.timezone.split("/").pop()?.replace(/_/g, " ")} time.
                </>
              ) : (
                <>Issues are paused.</>
              )}
              {me.lastDigest ? <> Last one: {new Date(me.lastDigest.sentAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}, {me.lastDigest.articleCount} stories.</> : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => setShowPreview((s) => !s)}>
              {showPreview ? "Hide preview" : "Preview today’s issue"}
            </Button>
            <Button onClick={sendNow} disabled={sending}>
              {sending ? "Steeping…" : "Send me one now"}
            </Button>
          </div>
        </div>
      )}

      {notice ? <div className="mt-4"><Notice tone={notice.tone}>{notice.text}</Notice></div> : null}

      {showPreview ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-leaf bg-cup">
          <ScaledFrame title="Today's issue" src="/api/digest/preview" height={820} className="bg-porcelain" />
        </div>
      ) : null}

      <section className="mt-10 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-[22px] font-bold">Your topics</h2>
            <Link to="/follow" className="text-[14px] text-brew-soft underline-offset-4 hover:underline">
              Edit
            </Link>
          </div>
          <p className="mt-1 text-[13px] text-steam">How many stories each topic gets per issue. Taps in the email change this too.</p>
          <ul className="mt-4 divide-y divide-leaf">
            {me.topics.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <span className="display text-[17px] font-bold" style={{ color: t.accent }}>
                  {t.name}
                </span>
                <span className="flex items-center gap-2">
                  <button aria-label={`Fewer ${t.name} stories`} onClick={() => nudge(t.id, t.weight - 1)} disabled={t.weight <= 1} className="h-8 w-8 rounded-full border border-leaf text-[16px] disabled:opacity-40">
                    −
                  </button>
                  <span className="w-14 text-center text-[14px] text-brew-soft">
                    {t.weight} {t.weight === 1 ? "story" : "stories"}
                  </span>
                  <button aria-label={`More ${t.name} stories`} onClick={() => nudge(t.id, t.weight + 1)} disabled={t.weight >= 7} className="h-8 w-8 rounded-full border border-leaf text-[16px] disabled:opacity-40">
                    +
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="display text-[22px] font-bold">Your month</h2>
          {stats ? (
            <>
              <dl className="mt-4 grid grid-cols-3 gap-3">
                {[
                  [stats.issuesReceived, "issues"],
                  [stats.storiesOpened, "stories opened"],
                  [stats.streakDays, stats.streakDays === 1 ? "day streak" : "day streak"],
                ].map(([n, label]) => (
                  <div key={String(label)} className="rounded-lg bg-porcelain p-3">
                    <dt className="text-[12px] text-steam">{label}</dt>
                    <dd className="display text-[28px] font-extrabold leading-none">{n}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4">
                <h3 className="text-[13px] font-semibold text-steam">What you actually open</h3>
                {stats.topTopics.length ? (
                  <ul className="mt-2 space-y-2">
                    {stats.topTopics.map((t) => {
                      const max = stats.topTopics[0]?.n ?? 1;
                      return (
                        <li key={t.id} className="text-[14px]">
                          <div className="flex justify-between">
                            <span className="font-semibold" style={{ color: t.accent }}>
                              {t.name}
                            </span>
                            <span className="text-steam">{t.n}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-leaf">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.max(6, (t.n / max) * 100)}%`, backgroundColor: t.accent }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-[14px] text-brew-soft">Open a story from an issue and it shows up here.</p>
                )}
              </div>
            </>
          ) : (
            <div className="mt-4 h-24 animate-pulse rounded-lg bg-porcelain" />
          )}
        </Card>
      </section>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="display text-[18px] font-bold">{me.user.active ? "Need a break?" : "Issues are paused"}</h2>
          <p className="text-[14px] text-brew-soft">{me.user.active ? "Pause anytime. Your topics stay saved." : "Resume to get tomorrow’s issue."}</p>
        </div>
        <Button variant={me.user.active ? "danger" : "primary"} onClick={toggleActive}>
          {me.user.active ? "Pause issues" : "Resume issues"}
        </Button>
      </Card>
    </main>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { api, ApiError, browserTimezone, type FollowedTopic, type TopicSummary } from "../api";
import { Button, Card, Notice, Wordmark, hourLabel } from "../ui";

export default function Follow() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [topics, setTopics] = useState<TopicSummary[] | null>(null);
  const [custom, setCustom] = useState<FollowedTopic[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [timezone, setTimezone] = useState(browserTimezone());
  const [sendHour, setSendHour] = useState(7);
  const [customName, setCustomName] = useState("");
  const [busy, setBusy] = useState<"save" | "custom" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setTimezone(me.user.timezone);
        setSendHour(me.user.sendHour);
        setIsNew(me.topics.length === 0);
        setCustom(me.topics.filter((t) => t.kind === "custom"));
        const { topics } = await api.topics();
        setTopics(topics);
        const pre = new Set([...me.topics.map((t) => t.id)]);
        const add = params.get("add");
        if (add) {
          const t = topics.find((x) => x.slug === add);
          if (t) pre.add(t.id);
        }
        setSelected(pre);
        if (me.topics.length === 0) {
          // A fresh reader: keep whatever timezone the browser reports.
          setTimezone(browserTimezone());
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) navigate("/", { replace: true });
        else setError("Couldn't load topics. Refresh to try again.");
      }
    })();
  }, [navigate, params]);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function addCustom(e: FormEvent) {
    e.preventDefault();
    if (!customName.trim()) return;
    setBusy("custom");
    setError(null);
    try {
      const { topic } = await api.addCustom(customName);
      setCustom((c) => (c.some((x) => x.id === topic.id) ? c : [...c, topic]));
      setSelected((s) => new Set(s).add(topic.id));
      setCustomName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that topic.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (selected.size === 0) {
      setError("Pick at least one topic.");
      return;
    }
    setBusy("save");
    setError(null);
    try {
      await api.follow([...selected]);
      await api.patchMe({ timezone, sendHour });
      navigate(isNew ? "/home?first=1" : "/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 pb-24">
      <header className="flex items-center justify-between py-6">
        <Wordmark to="/home" />
        {!isNew ? (
          <button className="text-[14px] text-brew-soft underline-offset-4 hover:underline" onClick={() => navigate("/home")}>
            Back to home
          </button>
        ) : null}
      </header>

      <h1 className="display mt-6 text-[40px] font-extrabold leading-[1.02] sm:text-[52px]">{isNew ? "What should we steep for you?" : "Your topics"}</h1>
      <p className="prose-steep mt-3 max-w-[36rem] text-[18px] leading-[1.55] text-brew-soft">
        Each topic gets its own “5 things” block every morning. Two or three is a good start.
      </p>

      {error ? <div className="mt-6"><Notice tone="error">{error}</Notice></div> : null}

      <ul className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Curated topics">
        {(topics ?? Array.from({ length: 8 }, () => null)).map((t, i) => (
          <li key={t?.id ?? i}>
            {t ? (
              <button
                type="button"
                aria-pressed={selected.has(t.id)}
                onClick={() => toggle(t.id)}
                className={`w-full rounded-xl border bg-cup p-4 text-left transition ${selected.has(t.id) ? "border-brew shadow-[inset_0_0_0_1px_#22170F]" : "border-leaf hover:border-steam"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="display text-[20px] font-bold" style={{ color: t.accent }}>
                    {t.name}
                  </span>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[13px] ${selected.has(t.id) ? "border-brew bg-brew text-cup" : "border-leaf text-transparent"}`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-[14px] leading-[1.45] text-brew-soft">
                  {t.latest ? (
                    <>
                      <span className="text-steam">Right now · {t.latest.source} — </span>
                      {t.latest.title}
                    </>
                  ) : (
                    <span className="text-steam">Filling up…</span>
                  )}
                </p>
              </button>
            ) : (
              <div className="h-[92px] animate-pulse rounded-xl border border-leaf bg-cup" />
            )}
          </li>
        ))}
      </ul>

      <Card className="mt-8 p-5">
        <h2 className="display text-[22px] font-bold">Follow anything</h2>
        <p className="mt-1 text-[14px] text-brew-soft">A team, a company, a person, a city. If it makes headlines, it can be a topic.</p>
        <form onSubmit={addCustom} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            aria-label="Custom topic name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Formula 1, Raptors, OpenAI, Waterloo…"
            maxLength={40}
            className="h-11 flex-1 rounded-lg border border-leaf bg-porcelain px-3 text-[15px] placeholder:text-steam"
          />
          <Button type="submit" variant="ghost" disabled={busy === "custom" || !customName.trim()} className="h-11">
            {busy === "custom" ? "Adding…" : "Add topic"}
          </Button>
        </form>
        {custom.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {custom.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={selected.has(t.id)}
                  onClick={() => toggle(t.id)}
                  className={`rounded-full border px-3 py-1.5 text-[14px] font-semibold ${selected.has(t.id) ? "border-brew bg-brew text-cup" : "border-leaf text-brew-soft"}`}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="display text-[22px] font-bold">When do you wake up?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-[14px] text-brew-soft">
            Deliver at
            <select value={sendHour} onChange={(e) => setSendHour(Number(e.target.value))} className="mt-1 h-11 w-full rounded-lg border border-leaf bg-porcelain px-3 text-[15px] text-brew">
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[14px] text-brew-soft">
            Your timezone
            <input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-leaf bg-porcelain px-3 text-[15px] text-brew" />
          </label>
        </div>
        <p className="mt-3 text-[13px] text-steam">Detected from your browser. Issues go out at the top of the hour.</p>
      </Card>

      <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-4 border-t border-leaf bg-porcelain/95 py-4 backdrop-blur">
        <span className="text-[14px] text-brew-soft">
          {selected.size} {selected.size === 1 ? "topic" : "topics"} · about {Math.max(1, Math.round((selected.size * 5 * 15) / 60))} min a morning
        </span>
        <Button onClick={save} disabled={busy === "save" || !topics} className="h-12 px-5">
          {busy === "save" ? "Saving…" : isNew ? "Start steeping" : "Save changes"}
        </Button>
      </div>
    </main>
  );
}

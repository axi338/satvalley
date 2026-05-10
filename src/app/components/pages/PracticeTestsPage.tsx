import {
  Play,
  Clock,
  Info,
  Calculator,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface PracticeTestsPageProps {
  onNavigate: (page: string, params?: any) => void;
  user: any;
  profile?: any;
}

type ApiTestsResponse = { tests?: any[] };
type ApiResultsResponse = { results?: any[] };

async function fetchJson<T>(
  url: string,
  opts?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts?.headers || {}),
    },
  });

  // Don’t blindly r.json() — this is a common crash source.
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // If backend returns HTML/error page, we fail gracefully.
    data = null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

export function PracticeTestsPage({ onNavigate, user, profile }: PracticeTestsPageProps) {
  const [tests, setTests] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const apiBase = (import.meta as any).env?.VITE_BACKEND_URL || "";
  const abortRef = useRef<AbortController | null>(null);

  const loadTests = async () => {
    // Cancel any in-flight request to avoid “setState on unmounted component”
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      setLoading(true);
      setErrorMsg(null);

      const testsUrl = `${apiBase}/api/tests?isOlympiad=false`;
      const resultsUrl = user?.email
        ? `${apiBase}/api/results?userEmail=${encodeURIComponent(user.email)}`
        : null;

      const [testsRes, resultsRes] = await Promise.all([
        fetchJson<ApiTestsResponse>(testsUrl, { signal: ac.signal }),
        resultsUrl
          ? fetchJson<ApiResultsResponse>(resultsUrl, { signal: ac.signal })
          : Promise.resolve({ results: [] }),
      ]);

      const safeTests = Array.isArray(testsRes?.tests) ? testsRes.tests : [];
      const safeResults = Array.isArray(resultsRes?.results)
        ? resultsRes.results
        : [];

      setTests(safeTests);
      setResults(safeResults);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Failed to fetch tests:", err);
      setErrorMsg(err?.message || "Failed to load practice tests.");
      setTests([]);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, user?.email]);

  const resultsByTestId = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const r of results) {
      const key = String(r?.testId ?? r?.test_id ?? "");
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [results]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "from-emerald-400 to-teal-500";
      case "Medium":
        return "from-indigo-400 to-indigo-600";
      case "Hard":
        return "from-amber-400 to-orange-500";
      case "Very Hard":
        return "from-rose-400 to-pink-500";
      default:
        return "from-slate-400 to-slate-500";
    }
  };

  const getLastAttempt = (testId: string) => {
    const arr = resultsByTestId.get(String(testId)) || [];
    if (!arr.length) return null;
    // safest: sort by createdAt/date if exists, else take last
    const sorted = [...arr].sort((a, b) => {
      const da = new Date(a?.createdAt || a?.created_at || 0).getTime();
      const db = new Date(b?.createdAt || b?.created_at || 0).getTime();
      return db - da;
    });
    return sorted[0] || arr[arr.length - 1];
  };

  return (
    <div className="min-h-screen pt-40 pb-24 px-6">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border-white/20 shadow-xl mb-8 bg-white/5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white/90">
              Practice Tests
            </span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4">
            {profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Scholar'}, take a full-length test like test day
          </h1>
          <p className="text-white/70 max-w-2xl mx-auto text-base sm:text-lg">
            Fast load, stable navigation, and clean timing behavior. No random
            crashes. No jank.
          </p>
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3 text-white/70 text-sm">
            <Activity className="w-4 h-4" />
            <span>
              {loading
                ? "Loading tests…"
                : `${tests.length} test${tests.length === 1 ? "" : "s"} available`}
            </span>
          </div>

          <button
            onClick={loadTests}
            className="h-10 px-4 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold transition"
          >
            Refresh
          </button>
        </div>

        {/* Error state */}
        {errorMsg && !loading && (
          <div className="mb-10 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-bold">Couldn’t load tests</div>
                <div className="text-white/80 text-sm mt-1">{errorMsg}</div>
              </div>
              <button
                onClick={loadTests}
                className="h-9 px-4 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-white text-sm font-semibold transition"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 animate-pulse"
              >
                <div className="h-4 w-1/2 bg-white/10 rounded mb-3" />
                <div className="h-6 w-3/4 bg-white/10 rounded mb-6" />
                <div className="h-10 w-full bg-white/10 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Tests grid */}
        {!loading && !errorMsg && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {tests.map((t) => {
              const id = String(t?.id ?? t?.testId ?? "");
              const difficulty = String(t?.difficulty || "Medium");
              const last = id ? getLastAttempt(id) : null;

              const totalMin =
                typeof t?.durationMinutes === "number"
                  ? t.durationMinutes
                  : t?.duration
                    ? Math.round(Number(t.duration) / 60)
                    : 134; // fallback feel

              const hasAttempt = Boolean(last);
              const score = last?.score ?? last?.totalScore ?? null;

              return (
                <div
                  key={id || Math.random()}
                  className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/7 transition shadow-lg shadow-black/10 overflow-hidden"
                >
                  <div
                    className={`h-1 w-full bg-gradient-to-r ${getDifficultyColor(
                      difficulty
                    )}`}
                  />

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="text-xs font-bold tracking-wider text-white/60 uppercase">
                          {difficulty}
                        </div>
                        <div className="text-xl font-black text-white leading-tight mt-1">
                          {t?.title || t?.name || "Practice Test"}
                        </div>
                      </div>

                      {hasAttempt && (
                        <div className="flex items-center gap-1 text-emerald-300 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          Attempted
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-white/70 text-sm mb-5">
                      <div className="inline-flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{totalMin} min</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        <span>Desmos</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        <span>{t?.questionCount || t?.qcount || "Adaptive"}</span>
                      </div>
                      <div className="inline-flex items-center gap-2 text-indigo-400 font-bold">
                        <UserRound className="w-4 h-4" />
                        <span>{t?.user_count || 0} users</span>
                      </div>
                    </div>

                    {hasAttempt && (
                      <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-white/80 text-sm mb-5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">Last attempt</span>
                          <span className="text-white/60 text-xs">
                            {last?.createdAt || last?.created_at
                              ? new Date(last.createdAt || last.created_at).toLocaleString()
                              : ""}
                          </span>
                        </div>
                        <div className="mt-1 text-white">
                          Score:{" "}
                          <span className="font-black">
                            {score ?? "—"}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => onNavigate("test-session", { testId: id })}
                      className="w-full h-11 rounded-xl bg-[#001E3C] hover:bg-[#002D5C] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/10"
                    >
                      <Play className="w-4 h-4" />
                      Start
                    </button>
                  </div>
                </div>
              );
            })}

            {!tests.length && (
              <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-white/70">
                No practice tests found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

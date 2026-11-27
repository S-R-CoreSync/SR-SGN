"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Sparkles, Send, Bot, Loader2, Languages, BarChart3, Newspaper, ArrowRight, Activity } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";

type Tab = "suggest" | "news" | "translate" | "sentiment" | "ops";

type OpsData = {
  total: number;
  failed: number;
  avgLatencyMs: number;
  byProvider: { provider: string; count: number }[];
  recent: { id: string; route: string; status: string; latencyMs: number; createdAt: string }[];
  pendingApprovals: number;
  approvals: { id: string; kind: string; title: string | null; payload: string; createdAt: string }[];
};

export default function AIPage() {
  const { status } = useSession();
  const t = useTranslations("dashboard.aiPage");
  const tOps = useTranslations("dashboardAIOps");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("suggest");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const [postId, setPostId] = useState("");
  const [posts, setPosts] = useState<{ id: string; title: string }[]>([]);
  const [translateFrom, setTranslateFrom] = useState("ar");
  const [translateTo, setTranslateTo] = useState("nl");
  const [translateText, setTranslateText] = useState("");

  const [ops, setOps] = useState<OpsData | null>(null);
  const [opsError, setOpsError] = useState("");
  const [tool, setTool] = useState("search_news");
  const [toolQuery, setToolQuery] = useState("");
  const [toolBody, setToolBody] = useState("");
  const [toolResult, setToolResult] = useState<Record<string, unknown> | null>(null);
  const [toolRunning, setToolRunning] = useState(false);

  const loadOps = async () => {
    try {
      const res = await fetch("/api/dashboard/ai/ops", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setOps(data as OpsData);
        setOpsError("");
      } else {
        setOpsError(data.error || tOps("errorGeneric"));
      }
    } catch {
      setOpsError(tOps("errorGeneric"));
    }
  };

  useEffect(() => {
    if (tab === "ops") void loadOps();
  }, [tab]);

  const runTool = async () => {
    setToolRunning(true);
    setToolResult(null);
    setOpsError("");
    try {
      const input: Record<string, string> =
        tool === "search_news"
          ? { query: toolQuery }
          : tool === "request_statement"
          ? { title: toolQuery, body: toolBody }
          : {};
      const res = await fetch("/api/dashboard/ai/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_tool", tool, input }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setOpsError(data.error || tOps("runError"));
      } else {
        setToolResult(data);
        await loadOps();
      }
    } catch {
      setOpsError(tOps("runError"));
    } finally {
      setToolRunning(false);
    }
  };

  const reviewApproval = async (id: string, decision: "approve" | "reject") => {
    try {
      const res = await fetch("/api/dashboard/ai/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review", id, decision }),
      });
      if (!res.ok) {
        const data = await res.json();
        setOpsError(data.error || tOps("errorGeneric"));
      }
      await loadOps();
    } catch {
      setOpsError(tOps("errorGeneric"));
    }
  };

  useEffect(() => {
    fetch("/api/news?limit=50")
      .then(r => r.json())
      .then(d => setPosts(Array.isArray(d) ? d.map((p: any) => ({ id: p.id, title: p.title })) : []))
      .catch((e) => console.error("Failed to load posts:", e));
  }, []);

  const handleSubmit = async () => {
    setLoading(true); setError(""); setResult("");
    try {
      let url = "/api/ai/suggest";
      let body: any = {};

      if (tab === "suggest") {
        url = "/api/ai/suggest";
        body = { action: "suggest", prompt };
      } else if (tab === "news") {
        url = "/api/ai/news";
        body = { action: "summarize", postId, from: "ar" };
      } else if (tab === "translate") {
        url = "/api/ai/news";
        body = { action: "translate", content: translateText, from: translateFrom, to: translateTo };
      } else if (tab === "sentiment") {
        url = "/api/ai/sentiment";
        body = { action: "analyze-all" };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("errorGeneric")); setResult(data.result || ""); }
      else { setResult(data.result); }
    } catch { setError(t("errorConn")); }
    setLoading(false);
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "suggest", label: t("suggestTab"), icon: Sparkles },
    { key: "news", label: t("summariseTab"), icon: Newspaper },
    { key: "translate", label: t("translateTab"), icon: Languages },
    { key: "sentiment", label: t("sentimentTab"), icon: BarChart3 },
    { key: "ops", label: tOps("title"), icon: Activity },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("title")}</h1>
      <p className="text-gray-500 mb-6">{t("desc")}</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border transition-colors ${
              tab === t.key ? "bg-[#1a5632] text-white border-[#1a5632]" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Input forms */}
      {tab !== "ops" && (
      <div className="bg-white rounded-2xl border p-4 mb-6">
        {tab === "suggest" && (
          <div className="flex gap-2">
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={t("suggestPlaceholder")}
              className="flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5632]"
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-2 bg-[#1a5632] hover:bg-[#0f3d23] text-white px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        )}

        {tab === "news" && (
          <div className="space-y-3">
            <select
              value={postId}
              onChange={e => setPostId(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5632]"
            >
              <option value="">{t("articleSelect")}</option>
              {posts.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <button
              onClick={handleSubmit}
              disabled={loading || !postId}
              className="flex items-center gap-2 bg-[#1a5632] hover:bg-[#0f3d23] text-white px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Newspaper className="w-4 h-4" />}
              {t("summariseBtn")}
            </button>
            <button
              onClick={async () => {
                setLoading(true); setError(""); setResult("");
                try {
                  const res = await fetch("/api/ai/news", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "batch-summarize" }),
                  });
                  const data = await res.json();
                  if (!res.ok) { setError(data.error); }
                  else { setResult(t("summariseSuccess", { count: data.results?.length || 0 })); }
                } catch { setError(t("errorConn")); }
                setLoading(false);
              }}
              disabled={loading}
              className="flex items-center gap-2 bg-[#c8a84e] hover:bg-[#b8973f] text-[#1a1a2e] px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 mr-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {t("summariseAllBtn")}
            </button>
          </div>
        )}

        {tab === "translate" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <select value={translateFrom} onChange={e => setTranslateFrom(e.target.value)} className="px-3 py-2.5 border rounded-xl text-sm">
                <option value="ar">{t("arabic")}</option>
                <option value="nl">{t("dutch")}</option>
                <option value="en">{t("english")}</option>
              </select>
              <ArrowRight className="w-5 h-5 text-gray-400 self-center" />
              <select value={translateTo} onChange={e => setTranslateTo(e.target.value)} className="px-3 py-2.5 border rounded-xl text-sm">
                <option value="nl">{t("dutch")}</option>
                <option value="ar">{t("arabic")}</option>
                <option value="en">{t("english")}</option>
              </select>
            </div>
            <textarea
              value={translateText}
              onChange={e => setTranslateText(e.target.value)}
              placeholder={t("translatePlaceholder")}
              rows={4}
              className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5632]"
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !translateText.trim()}
              className="flex items-center gap-2 bg-[#1a5632] hover:bg-[#0f3d23] text-white px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
              {t("translateBtn")}
            </button>
          </div>
        )}

        {tab === "sentiment" && (
          <div>
            <p className="text-sm text-gray-500 mb-3">{t("sentimentDesc")}</p>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-[#1a5632] hover:bg-[#0f3d23] text-white px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              {t("sentimentBtn")}
            </button>
          </div>
        )}
      </div>
      )}

      {tab === "ops" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{tOps("usageTitle")}</h2>
            {ops ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-xs text-emerald-800">{tOps("totalCalls")}</p>
                    <p className="text-2xl font-black text-emerald-900">{formatLocalizedDigits(ops.total, locale)}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-4">
                    <p className="text-xs text-amber-800">{tOps("failedCalls")}</p>
                    <p className="text-2xl font-black text-amber-900">{formatLocalizedDigits(ops.failed, locale)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-600">{tOps("avgLatency")}</p>
                    <p className="text-2xl font-black text-slate-900">{formatLocalizedDigits(ops.avgLatencyMs, locale)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  {tOps("providers")}: {ops.byProvider.map(p => `${p.provider} (${formatLocalizedDigits(p.count, locale)})`).join(" · ") || "-"}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">{tOps("noUsage")}</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border p-5 space-y-3">
            <h2 className="text-lg font-bold text-gray-900">{tOps("toolsTitle")}</h2>
            <p className="text-sm text-gray-500">{tOps("toolsHint")}</p>
            <select
              value={tool}
              onChange={e => setTool(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5632]"
            >
              <option value="search_news">{tOps("tool_search_news")}</option>
              <option value="upcoming_events">{tOps("tool_upcoming_events")}</option>
              <option value="community_stats">{tOps("tool_community_stats")}</option>
              <option value="request_statement">{tOps("tool_request_statement")}</option>
            </select>
            {(tool === "search_news" || tool === "request_statement") && (
              <input
                value={toolQuery}
                onChange={e => setToolQuery(e.target.value)}
                placeholder={tool === "search_news" ? tOps("queryPlaceholder") : tOps("statementTitle")}
                className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5632]"
              />
            )}
            {tool === "request_statement" && (
              <textarea
                value={toolBody}
                onChange={e => setToolBody(e.target.value)}
                placeholder={tOps("statementBody")}
                rows={4}
                className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5632]"
              />
            )}
            <button
              onClick={runTool}
              disabled={toolRunning}
              className="flex items-center gap-2 bg-[#1a5632] text-white px-5 py-2.5 rounded-xl text-sm disabled:opacity-50"
            >
              {toolRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              {toolRunning ? tOps("running") : tOps("runTool")}
            </button>
            {toolResult && (
              <pre className="bg-slate-50 rounded-xl p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(toolResult, null, 2)}
              </pre>
            )}
          </div>

          <div className="bg-white rounded-2xl border p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tOps("approvalsTitle")}</h2>
            {ops?.approvals.length ? (
              <ul className="space-y-3">
                {ops.approvals.map(a => (
                  <li key={a.id} className="border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{a.title || a.kind}</p>
                      <p className="text-[11px] text-gray-400">{new Date(a.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : locale === "nl" ? "nl-NL" : "en-US")}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => void reviewApproval(a.id, "approve")} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs">{tOps("approve")}</button>
                      <button onClick={() => void reviewApproval(a.id, "reject")} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs">{tOps("reject")}</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">{tOps("noApprovals")}</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border p-5 overflow-x-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-3">{tOps("recentTitle")}</h2>
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="text-start py-2">{tOps("colRoute")}</th>
                  <th className="text-start py-2">{tOps("colStatus")}</th>
                  <th className="text-start py-2">{tOps("colLatency")}</th>
                  <th className="text-start py-2">{tOps("colTime")}</th>
                </tr>
              </thead>
              <tbody>
                {(ops?.recent || []).map(r => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="py-2 font-mono">{r.route}</td>
                    <td className="py-2">{r.status === "success" ? tOps("statusSuccess") : tOps("statusError")}</td>
                    <td className="py-2">{formatLocalizedDigits(r.latencyMs, locale)}</td>
                    <td className="py-2">{new Date(r.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : locale === "nl" ? "nl-NL" : "en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(error || opsError) && <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-sm mb-4 border border-amber-200">{error || opsError}</div>}

      {tab !== "ops" && result && (
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-[#1a5632]" />
            <span className="font-bold text-gray-900">{t("result")}</span>
          </div>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{result}</p>
        </div>
      )}
    </div>
  );
}

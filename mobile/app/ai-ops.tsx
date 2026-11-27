import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useI18n } from "../lib/i18n-context";
import { apiFetch } from "../lib/api";
import { toArabicDigits } from "../lib/prayers";

type OpsSummary = {
  windowDays: number;
  total: number;
  failed: number;
  avgLatencyMs: number;
  byProvider: { provider: string; count: number }[];
  recent: {
    id: string;
    route: string;
    provider: string | null;
    status: string;
    latencyMs: number;
    createdAt: string;
  }[];
  pendingApprovals: number;
  approvals: {
    id: string;
    kind: string;
    title: string;
    payload: unknown;
    createdAt: string;
  }[];
};

const TOOLS = ["search_news", "upcoming_events", "community_stats", "request_statement"] as const;

export default function AIOpsScreen() {
  const router = useRouter();
  const { t, locale, isRTL } = useI18n();
  const [data, setData] = useState<OpsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [runningTool, setRunningTool] = useState<string | null>(null);
  const [toolResult, setToolResult] = useState<unknown>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const digits = (val: number | string) => {
    const str = typeof val === "number" ? val.toLocaleString() : String(val);
    return locale === "ar" ? toArabicDigits(str) : str;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/dashboard/ai/ops");
      setData(res as OpsSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dashboardAIOps.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function runTool(tool: string) {
    setRunningTool(tool);
    setToolResult(null);
    try {
      const input = tool === "search_news" ? { query: query.trim() || "سوريا" } : {};
      const res = await apiFetch("/dashboard/ai/ops", {
        method: "POST",
        body: JSON.stringify({ action: "run_tool", tool, input }),
      });
      setToolResult(res);
      await load();
    } catch (e) {
      setToolResult({ error: e instanceof Error ? e.message : t("dashboardAIOps.runError") });
    } finally {
      setRunningTool(null);
    }
  }

  async function review(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    try {
      await apiFetch("/dashboard/ai/ops", {
        method: "POST",
        body: JSON.stringify({ action: "review", id, decision }),
      });
      await load();
    } catch {
      // تظهر الحالة الجديدة بعد إعادة التحميل.
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !data) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />;
  }

  const cards = [
    { label: t("dashboardAIOps.totalCalls"), value: data?.total ?? 0, color: "#1a5632" },
    { label: t("dashboardAIOps.failedCalls"), value: data?.failed ?? 0, color: "#dc2626" },
    { label: t("dashboardAIOps.avgLatency"), value: digits(data?.avgLatencyMs ?? 0) + " ms", color: "#2563eb" },
    { label: t("dashboardAIOps.approvalsTitle"), value: data?.pendingApprovals ?? 0, color: "#c8a84e" },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: COLORS.text, textAlign: isRTL ? "right" : "left" }}>
            {t("dashboardAIOps.title")}
          </Text>
          <Text style={{ fontSize: 11, color: COLORS.textSecondary, textAlign: isRTL ? "right" : "left" }}>
            {t("dashboardAIOps.subtitle")}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={{ backgroundColor: "#fee2e2", borderRadius: 12, padding: 12 }}>
          <Text style={{ color: "#991b1b", fontSize: 12 }}>{error}</Text>
        </View>
      )}

      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flexWrap: "wrap", gap: 10 }}>
        {cards.map((card, i) => (
          <View key={i} style={{ width: "47%", backgroundColor: COLORS.card, borderRadius: 16, padding: 14, gap: 6, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: card.color }}>{card.value}</Text>
            <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>{card.label}</Text>
          </View>
        ))}
      </View>

      {(data?.byProvider ?? []).length > 0 && (
        <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 14, gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "bold", color: COLORS.text }}>{t("dashboardAIOps.providers")}</Text>
          {data?.byProvider.map((p) => (
            <View key={p.provider} style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>{p.provider}</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: COLORS.text }}>{digits(p.count)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 14, gap: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: "bold", color: COLORS.text }}>{t("dashboardAIOps.toolsTitle")}</Text>
        <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>{t("dashboardAIOps.toolsHint")}</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("dashboardAIOps.queryPlaceholder")}
          style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, color: COLORS.text, textAlign: isRTL ? "right" : "left" }}
        />
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool}
            onPress={() => runTool(tool)}
            disabled={runningTool === tool}
            style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f1f5f4", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
          >
            <Text style={{ fontSize: 11, color: COLORS.text, flexShrink: 1 }}>{t(`dashboardAIOps.tool_${tool}`)}</Text>
            {runningTool === tool ? <ActivityIndicator size="small" color="#1a5632" /> : <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={15} color="#1a5632" />}
          </TouchableOpacity>
        ))}
        {toolResult !== null && (
          <View style={{ backgroundColor: "#0c2e17", borderRadius: 10, padding: 10 }}>
            <Text style={{ fontSize: 10, color: "#edd28a", marginBottom: 4 }}>{t("dashboardAIOps.resultTitle")}</Text>
            <Text style={{ fontSize: 10, color: "#ffffff" }} numberOfLines={12}>{JSON.stringify(toolResult, null, 2)}</Text>
          </View>
        )}
      </View>

      <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "bold", color: COLORS.text }}>{t("dashboardAIOps.approvalsTitle")}</Text>
        {(data?.approvals ?? []).length === 0 ? (
          <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>{t("dashboardAIOps.noApprovals")}</Text>
        ) : (
          data?.approvals.map((a) => (
            <View key={a.id} style={{ borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 10, gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: COLORS.text }}>{a.title}</Text>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
                <TouchableOpacity disabled={busyId === a.id} onPress={() => review(a.id, "approve")} style={{ backgroundColor: "#1a5632", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ color: "#fff", fontSize: 10 }}>{t("dashboardAIOps.approve")}</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={busyId === a.id} onPress={() => review(a.id, "reject")} style={{ backgroundColor: "#dc2626", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ color: "#fff", fontSize: 10 }}>{t("dashboardAIOps.reject")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "bold", color: COLORS.text }}>{t("dashboardAIOps.recentTitle")}</Text>
        {(data?.recent ?? []).length === 0 ? (
          <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>{t("dashboardAIOps.noUsage")}</Text>
        ) : (
          data?.recent.map((r) => (
            <View key={r.id} style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#f1f1f1", paddingVertical: 6 }}>
              <Text style={{ fontSize: 10, color: COLORS.textSecondary, flexShrink: 1 }} numberOfLines={1}>{r.route}</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: r.status === "error" ? "#dc2626" : "#1a5632" }}>
                {r.status === "error" ? t("dashboardAIOps.statusError") : t("dashboardAIOps.statusSuccess")} · {digits(r.latencyMs)}ms
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

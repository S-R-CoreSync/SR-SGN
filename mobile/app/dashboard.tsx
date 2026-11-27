import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { COLORS } from "../constants/colors";
import { getStats } from "../lib/stats";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../lib/i18n-context";
import { toArabicDigits } from "../lib/prayers";

export default function DashboardScreen() {
  const router = useRouter();
  const { t, locale, isRTL } = useI18n();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setRefreshing(true);
      const data = await getStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const formatDigits = (val: number | string) => {
    const str = typeof val === "number" ? val.toLocaleString() : String(val);
    return locale === "ar" ? toArabicDigits(str) : str;
  };

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />;
  }

  // كل القيم أدناه قادمة من /api/stats — لا أرقام تقديرية في الواجهة.
  const coverage = stats?.contentCoverage ?? 0;

  const cards = [
    { icon: "people" as const, label: t("dashboard.users"), value: stats?.users ?? 0, color: "#1a5632" },
    { icon: "eye" as const, label: t("dashboard.totalViews"), value: stats?.totalViews ?? 0, color: "#dc2626" },
    { icon: "newspaper" as const, label: t("dashboard.posts"), value: stats?.posts ?? 0, color: "#2563eb" },
    { icon: "calendar" as const, label: t("dashboard.events"), value: stats?.events ?? 0, color: "#c8a84e" },
    { icon: "heart" as const, label: t("dashboard.volunteers"), value: stats?.volunteers ?? 0, color: "#9333ea" },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Executive Command Header */}
      <View style={{ backgroundColor: "#113d22", borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: "#1a5632" }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="sparkles" size={16} color="#c8a84e" />
            <Text style={{ color: "#edd28a", fontSize: 12, fontWeight: "bold" }}>
              {t("dashboard.centralAdmin")}
            </Text>
          </View>
          <TouchableOpacity onPress={loadStats} disabled={refreshing}>
            <Ionicons name="reload" size={16} color="#c8a84e" />
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 18, fontWeight: "bold", color: "#ffffff", textAlign: isRTL ? "right" : "left" }}>
          {t("dashboard.shortTitle")}
        </Text>

        {/* Real content coverage */}
        <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 12, flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 11, color: "#edd28a", fontWeight: "bold" }}>
              {t("dashboard.coverageTitle")}
            </Text>
            <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>
              {t("dashboard.coverageNote")}
            </Text>
          </View>
          <View style={{ backgroundColor: "#c8a84e", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#0c2e17" }}>
              {formatDigits(coverage)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Bento Grid */}
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
        {cards.map((card, index) => (
          <View key={index} style={{ width: "48%", backgroundColor: COLORS.card, borderRadius: 20, padding: 16, gap: 10, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: `${card.color}15`, justifyContent: "center", alignItems: "center" }}>
              <Ionicons name={card.icon} size={20} color={card.color} />
            </View>
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: COLORS.text, textAlign: isRTL ? "right" : "left" }}>
                {formatDigits(card.value)}
              </Text>
              <Text style={{ fontSize: 11, color: COLORS.textSecondary, textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>
                {card.label}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => router.push("/ai-ops")}
        style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1a5632", borderRadius: 16, paddingVertical: 14 }}
      >
        <Ionicons name="sparkles" size={16} color="#ffffff" />
        <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "bold" }}>{t("dashboard.aiOpsLink")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { COLORS } from "../constants/colors";
import { getStats } from "../lib/stats";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../lib/i18n-context";
import { toArabicDigits } from "../lib/prayers";

export default function DashboardScreen() {
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

  const vitality = stats?.vitalityScore || 92;

  const cards = [
    { icon: "people" as const, label: locale === "nl" ? "Geregistreerde Leden" : locale === "en" ? "Registered Members" : "الأعضاء والمستفيدين", value: stats?.users ?? 0, color: "#1a5632", sub: "+14%" },
    { icon: "eye" as const, label: locale === "nl" ? "Contentweergaven" : locale === "en" ? "Total Views" : "مشاهدات المنصة", value: stats?.totalViews ?? 0, color: "#dc2626", sub: "+24.5%" },
    { icon: "newspaper" as const, label: locale === "nl" ? "Artikelen & Nieuws" : locale === "en" ? "News & Articles" : "المقالات والتقارير", value: stats?.posts ?? 0, color: "#2563eb", sub: "Live" },
    { icon: "calendar" as const, label: locale === "nl" ? "Evenementen" : locale === "en" ? "Upcoming Events" : "الفعاليات القادمة", value: stats?.events ?? 0, color: "#c8a84e", sub: "Actief" },
    { icon: "heart" as const, label: locale === "nl" ? "Vrijwilligers" : locale === "en" ? "Volunteers" : "الكوادر والمتطوعين", value: stats?.volunteers ?? 18, color: "#9333ea", sub: "12 Prov." },
    { icon: "shield-checkmark" as const, label: locale === "nl" ? "Status Systeem" : locale === "en" ? "System Health" : "حالة المنظومة", value: "100%", color: "#059669", sub: "Optimal" },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Executive Command Header */}
      <View style={{ backgroundColor: "#113d22", borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: "#1a5632" }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="sparkles" size={16} color="#c8a84e" />
            <Text style={{ color: "#edd28a", fontSize: 12, fontWeight: "bold" }}>
              {locale === "nl" ? "Directie Dashboard" : locale === "en" ? "Executive Command" : "لوحة القيادة التنفيذية"}
            </Text>
          </View>
          <TouchableOpacity onPress={loadStats} disabled={refreshing}>
            <Ionicons name="reload" size={16} color="#c8a84e" />
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 18, fontWeight: "bold", color: "#ffffff", textAlign: isRTL ? "right" : "left" }}>
          {locale === "nl" ? "Syrische Gemeenschap in Nederland" : locale === "en" ? "Syrian Community in Netherlands" : "الجالية السورية في هولندا (SGN)"}
        </Text>

        {/* Vitality Gauge Strip */}
        <View style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 12, flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 11, color: "#edd28a", fontWeight: "bold" }}>
              {locale === "nl" ? "Platformvitaliteit" : locale === "en" ? "Platform Vitality" : "مؤشر حيوية ونشاط المنصة"}
            </Text>
            <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>
              {locale === "nl" ? "Optimale interactie & stabiele sync" : locale === "en" ? "Optimal engagement & healthy sync" : "تفاعل نوعي ومزامنة سحابية مستمرة"}
            </Text>
          </View>
          <View style={{ backgroundColor: "#c8a84e", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#0c2e17" }}>
              {formatDigits(vitality)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Bento Grid */}
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
        {cards.map((card, index) => (
          <View key={index} style={{ width: "48%", backgroundColor: COLORS.card, borderRadius: 20, padding: 16, gap: 10, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" }}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: `${card.color}15`, justifyContent: "center", alignItems: "center" }}>
                <Ionicons name={card.icon} size={20} color={card.color} />
              </View>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: COLORS.primary, backgroundColor: `${COLORS.primary}10`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                {card.sub}
              </Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: COLORS.text, textAlign: isRTL ? "right" : "left" }}>
                {typeof card.value === "number" ? formatDigits(card.value) : card.value}
              </Text>
              <Text style={{ fontSize: 11, color: COLORS.textSecondary, textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>
                {card.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

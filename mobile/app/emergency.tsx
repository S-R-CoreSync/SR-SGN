import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useI18n } from "../lib/i18n-context";

export default function EmergencyScreen() {
  const { t, isRTL, locale } = useI18n();
  const isAr = locale === "ar";

  const handleCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleWhatsApp = () => {
    Linking.openURL("https://wa.me/31684603406");
  };

  const emergencyContacts = [
    {
      id: "112",
      title: isAr ? "طوارئ هولندا الرسمية (١١٢)" : locale === "nl" ? "Alarmnummer 112" : "National Emergency 112",
      badge: isAr ? "حالات طارئة مهددة للحياة" : locale === "nl" ? "Alleen spoed" : "Life-threatening only",
      desc: isAr ? "إسعاف، شرطة، إطفاء. اتصل فوراً في الحالات الحرجة. متاح ٢٤/٧ ومجاني." : locale === "nl" ? "Politie, ambulance, brandweer bij acute nood." : "Ambulance, police, fire for critical situations.",
      tel: "112",
      icon: "alert-circle" as const,
      color: "#DC2626",
    },
    {
      id: "0900-8844",
      title: isAr ? "الشرطة للحالات غير الطارئة" : locale === "nl" ? "Politie (Geen spoed)" : "Police Non-Emergency",
      badge: "0900-8844",
      desc: isAr ? "للإبلاغ عن سرقات، شكاوى، ضياع وثائق، بدون وجود خطر فوري." : locale === "nl" ? "Voor meldingen zonder spoed en aangiftes." : "To report thefts or non-urgent police matters.",
      tel: "09008844",
      icon: "shield-checkmark" as const,
      color: "#2563EB",
    },
    {
      id: "113",
      title: isAr ? "خط الدعم النفسي والوقاية (١١٣)" : locale === "nl" ? "Zelfmoordpreventie 113" : "Crisis Helpline 113",
      badge: isAr ? "سري ومجاني ٢٤/٧" : "24/7 Gratis",
      desc: isAr ? "دعم نفسي فوري وسري للمشاعر الصعبة والضغوط الحادة." : locale === "nl" ? "Gratis en anonieme hulplijn bij psychische nood." : "Free and confidential mental health hotline.",
      tel: "113",
      icon: "heart" as const,
      color: "#059669",
    },
    {
      id: "community-hotline",
      title: isAr ? "طوارئ الجالية وصندوق التكافل" : locale === "nl" ? "SGN Noodhulplijn" : "SGN Community Emergency",
      badge: "WhatsApp 24/7",
      desc: isAr ? "مساندة عاجلة لحالات الوفاة، نقل الجثامين، والترجمة الإسعافية في المشافي." : locale === "nl" ? "Acute bijstand bij overlijden, repatriëring en medische tolk." : "Urgent support for bereavement, repatriation, and hospital assistance.",
      tel: "wa",
      icon: "people" as const,
      color: "#D97706",
      isWhatsapp: true,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner */}
      <View style={styles.banner}>
        <View style={styles.badge}>
          <Ionicons name="warning" size={16} color="#DC2626" />
          <Text style={styles.badgeText}>SOS EMERGENCY GUIDE</Text>
        </View>
        <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
          {t("emergency.title") || (isAr ? "دليل الطوارئ وخط الإغاثة السريع" : "Emergency Guide")}
        </Text>
        <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>
          {t("emergency.subtitle") || (isAr ? "أرقام الطوارئ المباشرة وإرشادات التصرف العاجل في هولندا" : "Direct emergency contacts and urgent guidance in the Netherlands")}
        </Text>
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ {t("emergency.dial112Warning") || (isAr ? "١١٢ مخصص فقط للحالات الإسعافية الطارئة والمهددة للحياة" : "112 is reserved strictly for life-threatening emergencies")}
          </Text>
        </View>
      </View>

      {/* Emergency Cards */}
      <View style={styles.cardsContainer}>
        {emergencyContacts.map((c) => (
          <View key={c.id} style={styles.card}>
            <View style={[styles.cardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.iconWrapper, { backgroundColor: c.color }]}>
                <Ionicons name={c.icon} size={22} color="#fff" />
              </View>
              <View style={{ flex: 1, paddingHorizontal: 10 }}>
                <Text style={[styles.cardTitle, { textAlign: isRTL ? "right" : "left" }]}>
                  {c.title}
                </Text>
                <Text style={[styles.cardBadge, { textAlign: isRTL ? "right" : "left" }]}>
                  {c.badge}
                </Text>
              </View>
            </View>

            <Text style={[styles.cardDesc, { textAlign: isRTL ? "right" : "left" }]}>
              {c.desc}
            </Text>

            <TouchableOpacity
              onPress={() => (c.isWhatsapp ? handleWhatsApp() : handleCall(c.tel))}
              style={[styles.callBtn, { backgroundColor: c.color }]}
            >
              <Ionicons name={c.isWhatsapp ? "logo-whatsapp" : "call"} size={18} color="#fff" />
              <Text style={styles.callBtnText}>
                {c.isWhatsapp
                  ? (isAr ? "محادثة فورية عبر واتساب" : "Chat on WhatsApp")
                  : `${isAr ? "اتصال بـ " : "Call "}${c.id}`}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Repatriation & ANBI Box */}
      <View style={styles.anbiCard}>
        <View style={[styles.anbiHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Ionicons name="shield-checkmark" size={24} color="#CCAA00" />
          <Text style={styles.anbiTitle}>
            {t("emergency.repatriationTitle") || (isAr ? "صندوق التكافل لنقل الجثامين (ANBI)" : "Repatriation & Solidarity Fund")}
          </Text>
        </View>
        <Text style={[styles.anbiDesc, { textAlign: isRTL ? "right" : "left" }]}>
          {t("emergency.repatriationDesc") || (isAr ? "تنسيق عاجل وتغطية نفقات نقل الجثامين ومساندة الأسر بشفافية تامة." : "Direct support for bereavement and repatriation.")}
        </Text>
        <View style={styles.ibanBox}>
          <Text style={styles.ibanLabel}>Official IBAN (ANBI):</Text>
          <Text style={styles.ibanValue}>NL90 ABNA 0148 7498 95</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  banner: {
    backgroundColor: "#1F1214",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#EF444440",
    padding: 20,
    gap: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EF444420",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "bold",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 13,
    color: "#D1D5DB",
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: "#EF444420",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EF444440",
  },
  warningText: {
    fontSize: 12,
    color: "#FCA5A5",
    fontWeight: "600",
  },
  cardsContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    alignItems: "center",
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.text,
  },
  cardBadge: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  callBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  anbiCard: {
    backgroundColor: "#0B132B",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#CCAA0060",
    padding: 18,
    gap: 12,
  },
  anbiHeader: {
    alignItems: "center",
    gap: 8,
  },
  anbiTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#CCAA00",
    flex: 1,
  },
  anbiDesc: {
    fontSize: 13,
    color: "#E2E8F0",
    lineHeight: 18,
  },
  ibanBox: {
    backgroundColor: "#050B1B",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  ibanLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "monospace",
    textTransform: "uppercase",
  },
  ibanValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#CCAA00",
    fontFamily: "monospace",
    marginTop: 4,
  },
});

import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useI18n } from "../lib/i18n-context";
import { DUTCH_CITIES, calculatePrayerTimes, PrayerTimesResult } from "../lib/prayers";

export default function PrayersScreen() {
  const { t, isRTL, locale } = useI18n();
  const isAr = locale === "ar";
  const [selectedCity, setSelectedCity] = useState("amsterdam");
  const [data, setData] = useState<PrayerTimesResult>(calculatePrayerTimes("amsterdam", new Date(), locale));

  useEffect(() => {
    const updated = calculatePrayerTimes(selectedCity, new Date(), locale);
    setData(updated);
  }, [selectedCity, locale]);

  const prayersList = [
    { key: "fajr", label: t("prayers.fajr") || (isAr ? "الفجر" : "Fajr"), time: data.fajr, icon: "moon-outline" as const },
    { key: "sunrise", label: t("prayers.sunrise") || (isAr ? "الشروق" : "Sunrise"), time: data.sunrise, icon: "sunny-outline" as const },
    { key: "dhuhr", label: t("prayers.dhuhr") || (isAr ? "الظهر" : "Dhuhr"), time: data.dhuhr, icon: "sunny" as const },
    { key: "asr", label: t("prayers.asr") || (isAr ? "العصر" : "Asr"), time: data.asr, icon: "partly-sunny" as const },
    { key: "maghrib", label: t("prayers.maghrib") || (isAr ? "المغرب" : "Maghrib"), time: data.maghrib, icon: "cloudy-night-outline" as const },
    { key: "isha", label: t("prayers.isha") || (isAr ? "العشاء" : "Isha"), time: data.isha, icon: "moon" as const },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* City Switcher */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.citySelector, { flexDirection: isRTL ? "row-reverse" : "row" }]}
      >
        {DUTCH_CITIES.map((c) => {
          const isSelected = c.id === selectedCity;
          const cityName = locale === "ar" ? c.nameAr : locale === "nl" ? c.nameNl : c.nameEn;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedCity(c.id)}
              style={[
                styles.cityChip,
                isSelected && styles.cityChipSelected,
              ]}
            >
              <Text style={[styles.cityChipText, isSelected && styles.cityChipTextSelected]}>
                {cityName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Main Focus Card: Hijri Date & Next Prayer */}
      <View style={styles.focusCard}>
        <View style={[styles.dateBadge, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Ionicons name="calendar-outline" size={14} color="#CCAA00" />
          <Text style={styles.dateBadgeText}>{data.hijriDate}</Text>
        </View>

        <Text style={[styles.focusTitle, { textAlign: isRTL ? "right" : "left" }]}>
          {t("prayers.nextPrayer") || (isAr ? "الصلاة القادمة" : "Next Prayer")}:{" "}
          <Text style={{ color: "#CCAA00" }}>
            {prayersList.find(p => p.key === data.nextPrayer.key)?.label || data.nextPrayer.key}
          </Text>
        </Text>

        <View style={[styles.timeRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Ionicons name="time-outline" size={18} color="#94A3B8" />
          <Text style={styles.remainingText}>
            {t("prayers.remaining") || (isAr ? "متبقي" : "Remaining")} {data.nextPrayer.remainingMinutes} {t("prayers.minutes") || (isAr ? "دقيقة" : "min")} ({data.nextPrayer.time})
          </Text>
        </View>

        {/* Qibla Compass Note */}
        <View style={[styles.qiblaBox, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Ionicons name="compass-outline" size={20} color="#CCAA00" />
          <Text style={[styles.qiblaText, { textAlign: isRTL ? "right" : "left" }]}>
            {t("prayers.qiblaDirection") || (isAr ? "اتجاه القبلة في هولندا: ١٢٨° نحو الجنوب الشرقي" : "Qibla: approx 128° South-East")}
          </Text>
        </View>
      </View>

      {/* Prayers List Grid */}
      <View style={styles.prayersGrid}>
        {prayersList.map((p) => {
          const isNext = p.key === data.nextPrayer.key;
          return (
            <View
              key={p.key}
              style={[
                styles.prayerCard,
                isNext && styles.prayerCardNext,
              ]}
            >
              <View style={[styles.prayerHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.prayerIconBg, isNext && styles.prayerIconBgNext]}>
                  <Ionicons name={p.icon} size={20} color={isNext ? "#10B981" : COLORS.textSecondary} />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={[styles.prayerName, isNext && styles.prayerNameNext, { textAlign: isRTL ? "right" : "left" }]}>
                    {p.label}
                  </Text>
                  {isNext && (
                    <Text style={[styles.nextBadge, { textAlign: isRTL ? "right" : "left" }]}>
                      {t("prayers.nextPrayer") || (isAr ? "الصلاة القادمة" : "Next")}
                    </Text>
                  )}
                </View>
                <Text style={[styles.prayerTime, isNext && styles.prayerTimeNext]}>
                  {p.time}
                </Text>
              </View>
            </View>
          );
        })}
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
  citySelector: {
    gap: 8,
    paddingVertical: 4,
  },
  cityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cityChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  cityChipText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
  },
  cityChipTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  focusCard: {
    backgroundColor: "#0B132B",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#CCAA0060",
    padding: 20,
    gap: 12,
  },
  dateBadge: {
    alignItems: "center",
    gap: 6,
    backgroundColor: "#CCAA0020",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateBadgeText: {
    color: "#CCAA00",
    fontSize: 12,
    fontWeight: "bold",
  },
  focusTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  timeRow: {
    alignItems: "center",
    gap: 6,
  },
  remainingText: {
    color: "#CBD5E1",
    fontSize: 13,
  },
  qiblaBox: {
    backgroundColor: "#050B1B",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  qiblaText: {
    color: "#94A3B8",
    fontSize: 11,
    flex: 1,
  },
  prayersGrid: {
    gap: 10,
  },
  prayerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  prayerCardNext: {
    borderColor: "#10B981",
    backgroundColor: "#064E3B15",
    borderWidth: 1.5,
  },
  prayerHeader: {
    alignItems: "center",
  },
  prayerIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  prayerIconBgNext: {
    backgroundColor: "#10B98125",
  },
  prayerName: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.text,
  },
  prayerNameNext: {
    color: "#10B981",
  },
  nextBadge: {
    fontSize: 10,
    color: "#10B981",
    fontWeight: "bold",
    marginTop: 2,
  },
  prayerTime: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "monospace",
    color: COLORS.text,
  },
  prayerTimeNext: {
    color: "#10B981",
    fontSize: 20,
  },
});

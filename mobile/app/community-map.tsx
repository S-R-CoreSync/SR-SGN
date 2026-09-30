import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useI18n } from "../lib/i18n-context";

interface CommunityLocation {
  id: string;
  name: string;
  category: "center" | "doctor" | "discount" | "mosque";
  categoryLabelAr: string;
  categoryLabelNl: string;
  province: string;
  city: string;
  address: string;
  phone?: string;
  discountBadge?: string;
}

const LOCATIONS: CommunityLocation[] = [
  {
    id: "sgn-hq",
    name: "المقر الرئيسي للجالية السورية في هولندا (SGN)",
    category: "center",
    categoryLabelAr: "مقر رئيسي ومكتب خدمات",
    categoryLabelNl: "Hoofdkantoor SGN",
    province: "Zuid-Holland",
    city: "Den Haag",
    address: "Laan van Meerdervoort 53-D, 2517 AE Den Haag",
    phone: "+31684603406",
  },
  {
    id: "dr-ahmad-rotterdam",
    name: "عيادة د. أحمد (طب عام واستشارات)",
    category: "doctor",
    categoryLabelAr: "طبيب عام معتمد",
    categoryLabelNl: "Huisartsenpraktijk",
    province: "Zuid-Holland",
    city: "Rotterdam",
    address: "Coolsingel 104, Rotterdam",
    phone: "+31102003000",
  },
  {
    id: "damas-market-amsterdam",
    name: "سوبرماركت دمشق (شريك شبكة الخصومات)",
    category: "discount",
    categoryLabelAr: "متجر أغذية ومونة",
    categoryLabelNl: "Supermarkt Partner",
    province: "Noord-Holland",
    city: "Amsterdam",
    address: "Kinkerstraat 72, Amsterdam",
    discountBadge: "خصم 10% لحاملي البطاقة",
    phone: "+31206123456",
  },
  {
    id: "utrecht-cultural-center",
    name: "مركز بيت سوريا الثقافي والاجتماعي",
    category: "center",
    categoryLabelAr: "مركز ثقافي واجتماعي",
    categoryLabelNl: "Cultureel Centrum",
    province: "Utrecht",
    city: "Utrecht",
    address: "Vleutenseweg 280, Utrecht",
    phone: "+31302934567",
  },
  {
    id: "eindhoven-translator",
    name: "مكتب الترجمة المحلفة والاستشارات",
    category: "center",
    categoryLabelAr: "ترجمة واستشارات قانونية",
    categoryLabelNl: "Beëdigde Vertalingen",
    province: "Noord-Brabant",
    city: "Eindhoven",
    address: "Stratumsedijk 45, Eindhoven",
    phone: "+31402345678",
  },
];

const PROVINCES = [
  "الكل",
  "Zuid-Holland",
  "Noord-Holland",
  "Utrecht",
  "Noord-Brabant",
  "Gelderland",
  "Overijssel",
  "Groningen",
];

export default function CommunityMapScreen() {
  const { t, isRTL, locale } = useI18n();
  const isAr = locale === "ar";
  const [selectedProvince, setSelectedProvince] = useState("الكل");
  const [search, setSearch] = useState("");

  const filtered = LOCATIONS.filter(loc => {
    const matchProv = selectedProvince === "الكل" || loc.province === selectedProvince;
    const matchSearch = !search || loc.name.toLowerCase().includes(search.toLowerCase()) || loc.city.toLowerCase().includes(search.toLowerCase());
    return matchProv && matchSearch;
  });

  const openMap = (address: string) => {
    const query = encodeURIComponent(address);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "center": return "business-outline" as const;
      case "doctor": return "medkit-outline" as const;
      case "discount": return "pricetag-outline" as const;
      default: return "location-outline" as const;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.banner}>
        <View style={styles.badge}>
          <Ionicons name="map" size={16} color="#0284C7" />
          <Text style={styles.badgeText}>COMMUNITY DIRECTORY & MAP</Text>
        </View>
        <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
          {t("nav.communityMap") || (isAr ? "خريطة الجالية والمراكز الخدمية" : "Community Map & Centers")}
        </Text>
        <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>
          {t("nav.communityMapSub") || (isAr ? "دليل المقرات، الأطباء، ومواقع شركاء الخصومات في مقاطعات هولندا." : "Directory of headquarters, doctors, and discount partners.")}
        </Text>
      </View>

      {/* Search Input */}
      <View style={[styles.searchBar, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={isAr ? "بحث عن مركز أو مدينة..." : "Search center or city..."}
          placeholderTextColor={COLORS.textSecondary}
          style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
        />
      </View>

      {/* Provinces Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.provinceRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
      >
        {PROVINCES.map((p) => {
          const isSelected = p === selectedProvince;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => setSelectedProvince(p)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {p}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Locations List */}
      <View style={styles.listContainer}>
        {filtered.map((item) => (
          <View key={item.id} style={styles.locationCard}>
            <View style={[styles.cardTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={styles.iconBg}>
                <Ionicons name={getCategoryIcon(item.category)} size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, paddingHorizontal: 10 }}>
                <Text style={[styles.locName, { textAlign: isRTL ? "right" : "left" }]}>
                  {item.name}
                </Text>
                <Text style={[styles.locCategory, { textAlign: isRTL ? "right" : "left" }]}>
                  {isAr ? item.categoryLabelAr : item.categoryLabelNl} • {item.city} ({item.province})
                </Text>
              </View>
            </View>

            {item.discountBadge && (
              <View style={[styles.discountBadge, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Ionicons name="gift-outline" size={14} color="#CCAA00" />
                <Text style={styles.discountBadgeText}>{item.discountBadge}</Text>
              </View>
            )}

            <View style={[styles.addressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Ionicons name="navigate-outline" size={16} color={COLORS.textSecondary} />
              <Text style={[styles.addressText, { textAlign: isRTL ? "right" : "left" }]}>
                {item.address}
              </Text>
            </View>

            {/* Actions: Maps & Call */}
            <View style={[styles.cardActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <TouchableOpacity
                onPress={() => openMap(item.address)}
                style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
              >
                <Ionicons name="map-outline" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {isAr ? "فتح في الخريطة" : "Open in Maps"}
                </Text>
              </TouchableOpacity>

              {item.phone && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                  style={[styles.actionBtn, { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border }]}
                >
                  <Ionicons name="call-outline" size={16} color={COLORS.text} />
                  <Text style={[styles.actionBtnText, { color: COLORS.text }]}>
                    {isAr ? "اتصال" : "Call"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
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
    gap: 14,
  },
  banner: {
    backgroundColor: "#082F49",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#0284C740",
    padding: 18,
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0284C720",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "bold",
  },
  title: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 13,
    color: "#BAE6FD",
    lineHeight: 18,
  },
  searchBar: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  provinceRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.text,
  },
  chipTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  listContainer: {
    gap: 12,
  },
  locationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
  },
  cardTop: {
    alignItems: "center",
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  locName: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.text,
  },
  locCategory: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  discountBadge: {
    alignItems: "center",
    gap: 6,
    backgroundColor: "#CCAA0015",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  discountBadgeText: {
    color: "#CCAA00",
    fontSize: 11,
    fontWeight: "bold",
  },
  addressRow: {
    alignItems: "center",
    gap: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cardActions: {
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
});

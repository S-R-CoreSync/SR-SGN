import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Linking, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useI18n } from "../lib/i18n-context";

interface MarktItem {
  id: string;
  title: string;
  city: string;
  category: string;
  isFree: boolean;
  price?: string;
  condition: string;
  image: string;
  whatsapp: string;
  description: string;
}

const SAMPLE_ITEMS: MarktItem[] = [
  {
    id: "item-1",
    title: "طقم كنبايات صالون مريح بحالة جيدة جداً",
    city: "Utrecht",
    category: "أثاث منزلي",
    isFree: true,
    condition: "مستعمل بحالة ممتازة",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
    whatsapp: "31684603406",
    description: "طقم كنبايات ٣ مقاعد ومقعدين مناسب للقادمين الجدد، جاهز للاستلام الفوري من الطابق الأرضي.",
  },
  {
    id: "item-2",
    title: "مكتب دراسة خشب مع كرسي دوار للطلاب",
    city: "Rotterdam",
    category: "دراسة ومكاتب",
    isFree: true,
    condition: "شبه جديد",
    image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80",
    whatsapp: "31684603406",
    description: "مكتب مناسب للطلاب أو للعمل من البيت، متين ونظيف جداً.",
  },
  {
    id: "item-3",
    title: "عربة أطفال وسرير رضع بحالة ممتازة",
    city: "Amsterdam",
    category: "مستلزمات أطفال",
    isFree: true,
    condition: "مستعمل خفيف",
    image: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=600&q=80",
    whatsapp: "31684603406",
    description: "عربة أطفال ماركة هولندية أصلية مع سرير خشب قابل للتعديل مجاناً لعائلة محتاجة.",
  },
  {
    id: "item-4",
    title: "غسالة ملابس بوش موفرة للطاقة A+++",
    city: "Den Haag",
    category: "أجهزة كهربائية",
    isFree: false,
    price: "€ 45",
    condition: "تعمل بكفاءة 100%",
    image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80",
    whatsapp: "31684603406",
    description: "غسالة ٧ كغ بحالة فنية ممتازة، سعر رمزي لمساندة عائلة سورية.",
  },
];

export default function MarktplaatsScreen() {
  const { t, isRTL, locale } = useI18n();
  const isAr = locale === "ar";
  const [search, setSearch] = useState("");
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);

  const filtered = SAMPLE_ITEMS.filter(i => {
    const matchFree = !filterFreeOnly || i.isFree;
    const matchSearch = !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.city.toLowerCase().includes(search.toLowerCase());
    return matchFree && matchSearch;
  });

  const contactSeller = (item: MarktItem) => {
    const message = encodeURIComponent(`مرحباً، أنا مهتم بالإعلان المنشور في تطبيق الجالية: ${item.title} (${item.city})`);
    Linking.openURL(`https://wa.me/${item.whatsapp}?text=${message}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Banner */}
      <View style={styles.banner}>
        <View style={styles.badge}>
          <Ionicons name="gift" size={16} color="#0D9488" />
          <Text style={styles.badgeText}>COMMUNITY EXCHANGE</Text>
        </View>
        <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
          {t("tabs.marktplaats") || (isAr ? "سوق الجالية والأثاث المجاني" : "Community Marktplaats")}
        </Text>
        <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>
          {isAr
            ? "أثاث مجاني ومستلزمات منزلية للقادمين الجدد وعروض تبادل مجتمعية بتواصل مباشر عبر واتساب."
            : "Free furniture, household items, and community exchange for newcomers in the Netherlands."}
        </Text>
      </View>

      {/* Search and Filters */}
      <View style={[styles.searchBar, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={isAr ? "بحث عن أثاث، غسالة، مكتب..." : "Search items..."}
          placeholderTextColor={COLORS.textSecondary}
          style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
        />
      </View>

      <View style={[styles.filterRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity
          onPress={() => setFilterFreeOnly(prev => !prev)}
          style={[styles.filterChip, filterFreeOnly && styles.filterChipActive]}
        >
          <Ionicons name="heart" size={14} color={filterFreeOnly ? "#fff" : COLORS.primary} />
          <Text style={[styles.filterChipText, filterFreeOnly && styles.filterChipTextActive]}>
            {isAr ? "المجاني فقط (Gratis)" : "Free Only"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items Grid */}
      <View style={styles.itemsList}>
        {filtered.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
            <View style={styles.itemBody}>
              <View style={[styles.itemHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.tag, { backgroundColor: item.isFree ? "#10B98120" : "#CCAA0020" }]}>
                  <Text style={[styles.tagText, { color: item.isFree ? "#10B981" : "#CCAA00" }]}>
                    {item.isFree ? (isAr ? "مجاني ١٠٠٪" : "100% Free") : item.price}
                  </Text>
                </View>
                <Text style={styles.cityTag}>
                  <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} /> {item.city}
                </Text>
              </View>

              <Text style={[styles.itemTitle, { textAlign: isRTL ? "right" : "left" }]}>
                {item.title}
              </Text>
              <Text style={[styles.itemDesc, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>
                {item.description}
              </Text>

              <TouchableOpacity
                onPress={() => contactSeller(item)}
                style={styles.contactBtn}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                <Text style={styles.contactBtnText}>
                  {isAr ? "تواصل لحجز الغرض (واتساب)" : "Contact on WhatsApp"}
                </Text>
              </TouchableOpacity>
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
    backgroundColor: "#042F2E",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#0D948840",
    padding: 18,
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0D948820",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#2DD4BF",
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
    color: "#99F6E4",
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
  filterRow: {
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  itemsList: {
    gap: 14,
  },
  itemCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    gap: 12,
  },
  itemImage: {
    width: "100%",
    height: 180,
  },
  itemBody: {
    padding: 14,
    paddingTop: 2,
    gap: 8,
  },
  itemHeader: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  cityTag: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.text,
  },
  itemDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  contactBtn: {
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  contactBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
});

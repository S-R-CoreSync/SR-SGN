import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, TextInput, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { COLORS } from "../../constants/colors";
import { getNews } from "../../lib/news";
import { getImageUrl } from "../../lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../../lib/i18n-context";
import { formatDate } from "../../lib/date";
import { toArabicDigits } from "../../lib/prayers";

export default function HomeScreen() {
  const router = useRouter();
  const { t, isRTL, locale } = useI18n();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const categories = [
    { key: "all", apiValue: "" },
    { key: "communityNews", apiValue: "أخبار الجالية" },
    { key: "netherlandsNews", apiValue: "أخبار هولندا" },
    { key: "europeNews", apiValue: "أخبار أوروبا" },
    { key: "economy", apiValue: "اقتصاد" },
    { key: "cultureEuronews", apiValue: "ثقافيات" },
    { key: "culture", apiValue: "ثقافة وفن" },
    { key: "services", apiValue: "خدمات" },
    { key: "humanitarian", apiValue: "عمل إنساني" },
    { key: "sports", apiValue: "رياضة" },
    { key: "tech", apiValue: "تكنولوجيا" },
  ];

  const getCategoryTranslation = (cat: string) => {
    if (!cat) return "";
    if (cat === "أخبار الجالية") return t("categories.communityNews");
    if (cat === "أخبار هولندا") return t("categories.netherlandsNews");
    if (cat === "أخبار أوروبا") return t("categories.europeNews");
    if (cat === "اقتصاد") return t("categories.economy");
    if (cat === "ثقافيات") return t("categories.cultureEuronews");
    if (cat === "ثقافة وفن") return t("categories.culture");
    if (cat === "خدمات") return t("categories.services");
    if (cat === "عمل إنساني") return t("categories.humanitarian");
    if (cat === "رياضة") return t("categories.sports");
    if (cat === "تكنولوجيا") return t("categories.tech");
    return cat;
  };

  useEffect(() => {
    loadNews();
  }, [category]);

  async function loadNews() {
    setLoading(true);
    try {
      const data = await getNews(1, category || undefined, locale);
      setPosts(Array.isArray(data) ? data : data.posts || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const filtered = search
    ? posts.filter((p: any) => p.title?.includes(search))
    : posts;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12 }}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("home.searchPlaceholder")}
            placeholderTextColor={COLORS.textSecondary}
            style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, textAlign: isRTL ? "right" : "left" }}
          />
        </View>
      </View>

      {/* Quick Services Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingVertical: 4, flexDirection: isRTL ? "row-reverse" : "row" }}
        style={{ maxHeight: 72, marginBottom: 8 }}
      >
        <TouchableOpacity
          onPress={() => router.push("/emergency")}
          style={{
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#DC262615",
            borderWidth: 1,
            borderColor: "#DC262640",
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 8,
            minWidth: 70,
          }}
        >
          <Ionicons name="warning" size={20} color="#DC2626" />
          <Text style={{ fontSize: 11, fontWeight: "bold", color: "#DC2626", marginTop: 2 }}>SOS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/prayers")}
          style={{
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 8,
            minWidth: 70,
          }}
        >
          <Ionicons name="moon-outline" size={20} color="#CCAA00" />
          <Text style={{ fontSize: 11, fontWeight: "600", color: COLORS.text, marginTop: 2 }}>
            {locale === "ar" ? "الصلاة" : "Prayers"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/brief-scanner")}
          style={{
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 8,
            minWidth: 70,
          }}
        >
          <Ionicons name="scan-outline" size={20} color="#A855F7" />
          <Text style={{ fontSize: 11, fontWeight: "600", color: COLORS.text, marginTop: 2 }}>
            {locale === "ar" ? "ماسح الرسائل" : "Scanner"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/inburgering")}
          style={{
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 8,
            minWidth: 70,
          }}
        >
          <Ionicons name="school-outline" size={20} color="#F59E0B" />
          <Text style={{ fontSize: 11, fontWeight: "600", color: COLORS.text, marginTop: 2 }}>
            {locale === "ar" ? "الاندماج" : "Inburgering"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/community-map")}
          style={{
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 8,
            minWidth: 70,
          }}
        >
          <Ionicons name="map-outline" size={20} color="#0284C7" />
          <Text style={{ fontSize: 11, fontWeight: "600", color: COLORS.text, marginTop: 2 }}>
            {locale === "ar" ? "الخريطة" : "Map"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/marktplaats")}
          style={{
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 8,
            minWidth: 70,
          }}
        >
          <Ionicons name="gift-outline" size={20} color="#0D9488" />
          <Text style={{ fontSize: 11, fontWeight: "600", color: COLORS.text, marginTop: 2 }}>
            {locale === "ar" ? "سوق الأثاث" : "Markt"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Category filter */}

      <FlatList
        horizontal
        data={categories}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        style={{ maxHeight: 44, marginBottom: 8 }}
        renderItem={({ item }: { item: { key: string; apiValue: string } }) => {
          const isSelected = category === item.apiValue;
          return (
            <TouchableOpacity
              onPress={() => setCategory(item.apiValue)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: isSelected ? COLORS.primary : COLORS.card,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ color: isSelected ? "#fff" : COLORS.text, fontSize: 13, fontWeight: "500" }}>
                {item.key === "all" ? t("home.all") : t("categories." + item.key)}
              </Text>
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item.key}
      />

      {/* News list */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              onPress={() => router.push(`/news/${item.slug}`)}
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 16,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <Image source={{ uri: getImageUrl(item.image, item.title, item.category) }} style={{ width: "100%", height: 180 }} resizeMode="cover" />
              <View style={{ padding: 14 }}>
                <Text style={{ fontSize: 11, color: COLORS.accent, fontWeight: "600", marginBottom: 4 }}>
                  {getCategoryTranslation(item.category)}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: COLORS.text, marginBottom: 6, lineHeight: 22 }}>
                  {locale === "ar" ? toArabicDigits(item.title) : item.title}
                </Text>
                {item.excerpt && (
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 8 }} numberOfLines={2}>
                    {locale === "ar" ? toArabicDigits(item.excerpt) : item.excerpt}
                  </Text>
                )}
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>
                    {item.author?.name} • {formatDate(item.createdAt, locale)}
                  </Text>
                  <Ionicons name="eye-outline" size={16} color={COLORS.textSecondary} />
                </View>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item: any) => item.id}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40, paddingHorizontal: 20 }}>
              <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: "bold", textAlign: "center", marginBottom: 6 }}>
                {t("home.noNews") || "لا توجد أخبار"}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: "center", marginBottom: 16 }}>
                {t("home.checkConnection") || "تأكد من اتصالك بالإنترنت وحاول مرة أخرى"}
              </Text>
              <TouchableOpacity
                onPress={loadNews}
                style={{ backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                  {t("home.retry") || "إعادة المحاولة"}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      {/* Floating Action Button for Smart Chat */}
      <TouchableOpacity
        onPress={() => router.push("/messages")}
        style={{
          position: "absolute",
          bottom: 20,
          right: isRTL ? undefined : 20,
          left: isRTL ? 20 : undefined,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: COLORS.primary,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 5,
          elevation: 6,
          zIndex: 9999,
        }}
      >
        <Ionicons name="chatbubbles" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

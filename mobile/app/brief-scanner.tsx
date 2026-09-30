import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useI18n } from "../lib/i18n-context";
import { CONFIG } from "../constants/config";

interface ScanResult {
  sender: string;
  urgency: "high" | "medium" | "low";
  subject: string;
  deadline: string;
  amount: string;
  summary: string[];
  actionRequired: string;
  legalTip: string;
}

export default function BriefScannerScreen() {
  const { t, isRTL, locale } = useI18n();
  const isAr = locale === "ar";
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(isAr ? "تنبيه" : "Permission Denied", isAr ? "يرجى منح إذن الوصول للكاميرا" : "Camera access required");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setImageUri(res.assets[0].uri);
      analyzeLetter(res.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setImageUri(res.assets[0].uri);
      analyzeLetter(res.assets[0].uri);
    }
  };

  const analyzeLetter = async (uri?: string, sampleType?: string) => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`${CONFIG.API_URL}/ai/scan-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letterType: sampleType || "cjib",
          locale,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data);
      } else {
        Alert.alert(isAr ? "خطأ" : "Error", isAr ? "تعذر تحليل الرسالة" : "Failed to parse letter");
      }
    } catch (err: any) {
      Alert.alert(isAr ? "خطأ في الاتصال" : "Network Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else if (result) {
      const textToRead = `${result.subject}. ${result.summary.join(". ")}. ${result.actionRequired}`;
      Speech.speak(textToRead, {
        language: isAr ? "ar" : locale === "nl" ? "nl" : "en",
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
      setIsSpeaking(true);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.banner}>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={16} color="#A855F7" />
          <Text style={styles.badgeText}>AI DOCUMENT SCANNER</Text>
        </View>
        <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
          {isAr ? "قارئ ومترجم الرسائل الرسمية الذكي" : "Official Letter Scanner"}
        </Text>
        <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>
          {isAr
            ? "التقط صورة لخطابات البلدية، الضرائب، أو الـ IND لفهم المطلوب والمهلة القانونية وطريقة الرد فوراً."
            : "Snap a photo of your Belastingdienst, Gemeente, or IND letters to get an instant explanation."}
        </Text>
      </View>

      {/* Action Buttons: Camera & Gallery */}
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={takePhoto} style={[styles.scanBtn, { backgroundColor: COLORS.primary }]}>
          <Ionicons name="camera" size={20} color="#fff" />
          <Text style={styles.scanBtnText}>
            {isAr ? "تصوير بالكاميرا" : "Camera"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={pickImage} style={[styles.scanBtn, { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border }]}>
          <Ionicons name="images-outline" size={20} color={COLORS.text} />
          <Text style={[styles.scanBtnText, { color: COLORS.text }]}>
            {isAr ? "اختيار من المعرض" : "Gallery"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Test Samples */}
      <View style={styles.samplesBox}>
        <Text style={[styles.samplesTitle, { textAlign: isRTL ? "right" : "left" }]}>
          {isAr ? "أو جرب نموذجاً جاهزاً سريعاً:" : "Or test with a sample letter:"}
        </Text>
        <View style={styles.sampleChips}>
          <TouchableOpacity onPress={() => analyzeLetter(undefined, "cjib")} style={styles.chip}>
            <Text style={styles.chipText}>CJIB (مخالفة مرور)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => analyzeLetter(undefined, "ind")} style={styles.chip}>
            <Text style={styles.chipText}>IND (تجديد إقامة)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => analyzeLetter(undefined, "belastingdienst")} style={styles.chip}>
            <Text style={styles.chipText}>Belastingdienst (ضرائب)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Preview Image */}
      {imageUri && (
        <View style={styles.previewBox}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
        </View>
      )}

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {isAr ? "جاري قراءة الخطاب وتحليل النقاط القانونية..." : "Analyzing letter with AI..."}
          </Text>
        </View>
      )}

      {/* Analysis Result */}
      {result && !loading && (
        <View style={styles.resultBox}>
          <View style={[styles.resultHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.resultSender, { textAlign: isRTL ? "right" : "left" }]}>
                {result.sender}
              </Text>
              <Text style={[styles.resultSubject, { textAlign: isRTL ? "right" : "left" }]}>
                {result.subject}
              </Text>
            </View>
            <TouchableOpacity onPress={toggleSpeech} style={styles.speechBtn}>
              <Ionicons name={isSpeaking ? "volume-mute" : "volume-high"} size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            {result.amount && (
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{isAr ? "المبلغ المطلوب" : "Amount"}</Text>
                <Text style={styles.metricValueRed}>{result.amount}</Text>
              </View>
            )}
            {result.deadline && (
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{isAr ? "آخر موعد" : "Deadline"}</Text>
                <Text style={styles.metricValue}>{result.deadline}</Text>
              </View>
            )}
          </View>

          {/* Key Summary */}
          <View style={styles.sectionBox}>
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>
              {isAr ? "📌 ملخص الخطاب:" : "📌 Letter Summary:"}
            </Text>
            {result.summary.map((point, idx) => (
              <View key={idx} style={[styles.bulletRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={[styles.bulletText, { textAlign: isRTL ? "right" : "left" }]}>
                  {point}
                </Text>
              </View>
            ))}
          </View>

          {/* Action Required */}
          <View style={[styles.sectionBox, { backgroundColor: "#10B98115", borderColor: "#10B98140" }]}>
            <Text style={[styles.sectionTitle, { color: "#10B981", textAlign: isRTL ? "right" : "left" }]}>
              {isAr ? "✅ الإجراء المطلوب منك:" : "✅ Action Required:"}
            </Text>
            <Text style={[styles.actionText, { textAlign: isRTL ? "right" : "left" }]}>
              {result.actionRequired}
            </Text>
          </View>

          {/* Legal Tip */}
          <View style={[styles.sectionBox, { backgroundColor: "#F59E0B15", borderColor: "#F59E0B40" }]}>
            <Text style={[styles.sectionTitle, { color: "#D97706", textAlign: isRTL ? "right" : "left" }]}>
              {isAr ? "⚖️ نصيحة قانونية وحق الاعتراض:" : "⚖️ Legal Tip & Objection:"}
            </Text>
            <Text style={[styles.actionText, { textAlign: isRTL ? "right" : "left" }]}>
              {result.legalTip}
            </Text>
          </View>
        </View>
      )}
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
    backgroundColor: "#1A102F",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#A855F740",
    padding: 20,
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#A855F720",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#C084FC",
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
    color: "#D8B4FE",
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  scanBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  scanBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  samplesBox: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  samplesTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  sampleChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: 11,
    color: COLORS.text,
  },
  previewBox: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  loadingBox: {
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  resultBox: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 14,
  },
  resultHeader: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultSender: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.text,
  },
  resultSubject: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  speechBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 2,
  },
  metricValueRed: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#EF4444",
    marginTop: 2,
  },
  sectionBox: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.text,
  },
  bulletRow: {
    gap: 6,
    alignItems: "flex-start",
  },
  bulletDot: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 16,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
  },
});

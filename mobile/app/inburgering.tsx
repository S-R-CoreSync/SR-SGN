import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useI18n } from "../lib/i18n-context";
import { CONFIG } from "../constants/config";

interface Question {
  id: string;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export default function InburgeringScreen() {
  const { t, isRTL, locale } = useI18n();
  const isAr = locale === "ar";
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { key: "all", label: t("inburgeringQuiz.all") || (isAr ? "الكل" : "All") },
    { key: "knm", label: t("inburgeringQuiz.knm") || (isAr ? "المجتمع (KNM)" : "Society (KNM)") },
    { key: "health", label: t("inburgeringQuiz.health") || (isAr ? "الصحة" : "Health") },
    { key: "work", label: t("inburgeringQuiz.work") || (isAr ? "العمل" : "Work") },
    { key: "housing", label: t("inburgeringQuiz.housing") || (isAr ? "السكن" : "Housing") },
  ];

  useEffect(() => {
    fetchQuestions();
  }, [selectedCategory, locale]);

  const fetchQuestions = async () => {
    setLoading(true);
    setCurrentIndex(0);
    setSelectedIndex(null);
    setShowExplanation(false);
    setScore(0);
    setCompleted(false);

    try {
      const res = await fetch(`${CONFIG.API_URL}/inburgering/quiz?category=${selectedCategory}&locale=${locale}`);
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (selectedIndex !== null) return; // prevent changing
    setSelectedIndex(idx);
    setShowExplanation(true);
    if (idx === questions[currentIndex].correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedIndex(null);
      setShowExplanation(false);
    } else {
      setCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedIndex(null);
    setShowExplanation(false);
    setScore(0);
    setCompleted(false);
  };

  const currentQ = questions[currentIndex];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner */}
      <View style={styles.banner}>
        <View style={styles.badge}>
          <Ionicons name="school" size={16} color="#F59E0B" />
          <Text style={styles.badgeText}>INBURGERING EXAM PRACTICE</Text>
        </View>
        <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
          {t("inburgeringQuiz.title") || (isAr ? "بنك أسئلة الاندماج (KNM)" : "Inburgering Practice Quiz")}
        </Text>
        <Text style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}>
          {t("inburgeringQuiz.subtitle") || (isAr ? "تدريب يومي تفاعلي على أسئلة المجتمع الهولندي وقوانين الإقامة والعمل." : "Interactive practice for Dutch society and integration exams.")}
        </Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.categoryRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
      >
        {categories.map((c) => {
          const isSelected = c.key === selectedCategory;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setSelectedCategory(c.key)}
              style={[styles.catChip, isSelected && styles.catChipSelected]}
            >
              <Text style={[styles.catChipText, isSelected && styles.catChipTextSelected]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {/* Completed State */}
      {!loading && completed && (
        <View style={styles.resultBox}>
          <Ionicons name="trophy" size={60} color="#CCAA00" />
          <Text style={styles.resultTitle}>
            {isAr ? "أحسنت! أتممت الاختبار" : "Quiz Completed!"}
          </Text>
          <Text style={styles.scoreText}>
            {isAr ? `نتيجتك: ${score} من ${questions.length}` : `Your score: ${score} of ${questions.length}`}
          </Text>
          <TouchableOpacity onPress={handleRestart} style={styles.restartBtn}>
            <Ionicons name="reload" size={18} color="#fff" />
            <Text style={styles.restartBtnText}>
              {t("inburgeringQuiz.restart") || (isAr ? "إعادة الاختبار" : "Restart Quiz")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Question Card */}
      {!loading && !completed && currentQ && (
        <View style={styles.questionCard}>
          {/* Progress header */}
          <View style={[styles.qHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={styles.qProgress}>
              {t("inburgeringQuiz.question") || (isAr ? "السؤال" : "Question")} {currentIndex + 1} {t("inburgeringQuiz.of") || (isAr ? "من" : "of")} {questions.length}
            </Text>
            <Text style={styles.scoreBadge}>
              {t("inburgeringQuiz.score") || (isAr ? "النقاط" : "Score")}: {score}
            </Text>
          </View>

          {/* Question Text */}
          <Text style={[styles.qText, { textAlign: isRTL ? "right" : "left" }]}>
            {currentQ.question}
          </Text>

          {/* Options */}
          <View style={styles.optionsList}>
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedIndex === idx;
              const isCorrect = idx === currentQ.correctIndex;
              let btnStyle = styles.optionBtn;
              let textStyle = styles.optionText;

              if (selectedIndex !== null) {
                if (isCorrect) {
                  btnStyle = styles.optionBtnCorrect;
                  textStyle = styles.optionTextCorrect;
                } else if (isSelected) {
                  btnStyle = styles.optionBtnWrong;
                  textStyle = styles.optionTextWrong;
                }
              }

              return (
                <TouchableOpacity
                  key={idx}
                  disabled={selectedIndex !== null}
                  onPress={() => handleSelectOption(idx)}
                  style={[btnStyle, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                >
                  <View style={styles.optionIndex}>
                    <Text style={styles.optionIndexText}>{idx + 1}</Text>
                  </View>
                  <Text style={[textStyle, { flex: 1, textAlign: isRTL ? "right" : "left" }]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Explanation Box */}
          {showExplanation && (
            <View style={[styles.explanationBox, { backgroundColor: selectedIndex === currentQ.correctIndex ? "#10B98115" : "#EF444415" }]}>
              <Text style={[styles.explanationTitle, { color: selectedIndex === currentQ.correctIndex ? "#10B981" : "#EF4444", textAlign: isRTL ? "right" : "left" }]}>
                {selectedIndex === currentQ.correctIndex
                  ? (t("inburgeringQuiz.correct") || (isAr ? "إجابة صحيحة! أحسنت 👏" : "Correct! Well done 👏"))
                  : (t("inburgeringQuiz.incorrect") || (isAr ? "إجابة غير صحيحة، راجع الشرح أدناه:" : "Incorrect. Review below:"))}
              </Text>
              <Text style={[styles.explanationText, { textAlign: isRTL ? "right" : "left" }]}>
                {currentQ.explanation}
              </Text>
              <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
                <Text style={styles.nextBtnText}>
                  {t("inburgeringQuiz.nextQuestion") || (isAr ? "السؤال التالي" : "Next Question")}
                </Text>
                <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
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
    backgroundColor: "#20180B",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#F59E0B40",
    padding: 20,
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F59E0B20",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#FBBF24",
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
    color: "#FDE68A",
    lineHeight: 18,
  },
  categoryRow: {
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catChipText: {
    fontSize: 12,
    color: COLORS.text,
  },
  catChipTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
  },
  questionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 16,
  },
  qHeader: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  qProgress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  scoreBadge: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "bold",
  },
  qText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    lineHeight: 24,
  },
  optionsList: {
    gap: 10,
  },
  optionBtn: {
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  optionBtnCorrect: {
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#10B98115",
    borderWidth: 1.5,
    borderColor: "#10B981",
    gap: 10,
  },
  optionBtnWrong: {
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#EF444415",
    borderWidth: 1.5,
    borderColor: "#EF4444",
    gap: 10,
  },
  optionIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  optionIndexText: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.text,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  optionTextCorrect: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "bold",
  },
  optionTextWrong: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "bold",
  },
  explanationBox: {
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: "bold",
  },
  explanationText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 19,
  },
  nextBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  nextBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  resultBox: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 30,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  scoreText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  restartBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 8,
  },
  restartBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});

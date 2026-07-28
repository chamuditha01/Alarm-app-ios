// src/Screens/QuizScreen.js
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { QUIZ } from "../data/content";
import { setLockState } from "../lib/lockState";
import { colors } from "../theme/colors";

export default function QuizScreen() {
  const router = useRouter();
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const question = QUIZ[qIdx];
  const total = QUIZ.length; // 5 questions

  useEffect(() => {
    setLockState({ isLocked: true, currentStep: "QUIZ" });

    // Block back button during quiz
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  const handleSelectOption = (index) => {
    if (picked !== null) return;
    setPicked(index);

    const isCorrect = index === question.correct;
    const newScore = score + (isCorrect ? 1 : 0);

    if (isCorrect) {
      setScore(newScore);
    }

    setTimeout(() => {
      if (qIdx < total - 1) {
        setQIdx(qIdx + 1);
        setPicked(null);
      } else {
        setLockState({ isLocked: false, currentStep: "UNLOCKED", lastQuizScore: newScore });
        router.replace({
          pathname: "/unlocked",
          params: { correctCount: String(newScore), total: String(total) },
        });
      }
    }, 500);
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>📝</Text>
          <Text style={styles.badgeText}>COMPREHENSION CHECK</Text>
        </View>
        <Text style={styles.counterText}>
          Question {qIdx + 1} of {total}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSeg,
              { backgroundColor: i <= qIdx ? colors.forestDark : "#DCEADB" },
            ]}
          />
        ))}
      </View>

      {/* Question Card */}
      <View style={styles.questionCard}>
        <Text style={styles.questionTitle}>{question.q}</Text>
      </View>

      {/* Options List */}
      <View style={styles.optionsList}>
        {question.options.map((opt, i) => {
          const isAnswered = picked !== null;
          const isCorrectOption = i === question.correct;
          const isUserPicked = picked === i;

          let cardBg = "#F2F7F2";
          let borderColor = "#DCEADB";
          let textColor = colors.textDark;

          if (isAnswered) {
            if (isCorrectOption) {
              cardBg = colors.pillGreenBg;
              borderColor = colors.forestDark;
              textColor = colors.pillGreenText;
            } else if (isUserPicked) {
              cardBg = "#FCEAE6";
              borderColor = colors.ember;
              textColor = colors.ember;
            }
          }

          return (
            <TouchableOpacity
              key={i}
              disabled={picked !== null}
              activeOpacity={0.85}
              onPress={() => handleSelectOption(i)}
              style={[
                styles.optionBtn,
                { backgroundColor: cardBg, borderColor },
              ]}
            >
              <Text style={[styles.optionText, { color: textColor }]}>
                {opt}
              </Text>
              {isAnswered && isCorrectOption && (
                <Text style={styles.correctGlyph}>✓</Text>
              )}
              {isAnswered && isUserPicked && !isCorrectOption && (
                <Text style={styles.wrongGlyph}>×</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.footerNote}>
        Answer correctly to unlock your phone and start your day.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLight,
    padding: 20,
    paddingTop: 52,
    paddingBottom: 20,
    justifyContent: "space-between",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.pillGreenBg,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  badgeIcon: {
    fontSize: 12,
  },
  badgeText: {
    color: colors.pillGreenText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  counterText: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 20,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2EAE1",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  questionTitle: {
    color: colors.textDark,
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 27,
  },
  optionsList: {
    gap: 12,
    flex: 1,
  },
  optionBtn: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionText: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    lineHeight: 21,
  },
  correctGlyph: {
    color: colors.forestDark,
    fontSize: 20,
    fontWeight: "800",
    marginLeft: 10,
  },
  wrongGlyph: {
    color: colors.ember,
    fontSize: 20,
    fontWeight: "800",
    marginLeft: 10,
  },
  footerNote: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 8,
    fontWeight: "600",
  },
});
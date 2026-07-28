// src/Screens/ReadingScreen.js
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PAGES } from "../data/content";
import { setLockState } from "../lib/lockState";
import { colors } from "../theme/colors";

export default function ReadingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const total = PAGES.length; // 10 pages
  const page = PAGES[index];

  useEffect(() => {
    setLockState({ isLocked: true, currentStep: "READING" });

    // Block Android hardware back button while reading
    const onBack = () => true;
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, []);

  const handleNext = () => {
    if (index < total - 1) {
      setIndex(index + 1);
    } else {
      setLockState({ isLocked: true, currentStep: "QUIZ" });
      router.replace("/quiz");
    }
  };

  const handlePrev = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.lockedBadge}>
          <Text style={styles.lockGlyph}>🔒</Text>
          <Text style={styles.lockedText}>LOCKED UNTIL PAGE {total}</Text>
        </View>
        <Text style={styles.pageCountText}>Page {index + 1} of {total}</Text>
      </View>

      {/* Progress Segments */}
      <View style={styles.progressRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSeg,
              { backgroundColor: i <= index ? colors.forestDark : "#DCEADB" },
            ]}
          />
        ))}
      </View>

      {/* Main Book Card */}
      <View style={styles.bookCard}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.bookLabel}>{"BOOK SUMMARY • THE OWNER'S HOUR"}</Text>
          <Text style={styles.title}>{page.title}</Text>
          <View style={styles.divider} />
          <Text style={styles.body}>{page.body}</Text>
        </ScrollView>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.bottomNav}>
        {index > 0 ? (
          <TouchableOpacity style={styles.prevBtn} onPress={handlePrev}>
            <Text style={styles.prevBtnText}>‹ Previous</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <TouchableOpacity
          style={styles.nextBtn}
          activeOpacity={0.85}
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>
            {index === total - 1 ? "Start 5-Question Quiz" : "Next Page"}
          </Text>
          <Text style={styles.chevronGlyph}>›</Text>
        </TouchableOpacity>
      </View>
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.pillGreenBg,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  lockGlyph: {
    fontSize: 12,
  },
  lockedText: {
    color: colors.pillGreenText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  pageCountText: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 14,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  bookCard: {
    flex: 1,
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
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  bookLabel: {
    color: colors.textMuted,
    fontSize: 10.5,
    letterSpacing: 1.2,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: colors.textDark,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
    lineHeight: 30,
  },
  divider: {
    height: 3,
    backgroundColor: colors.forestDark,
    width: 36,
    marginBottom: 16,
    borderRadius: 2,
  },
  body: {
    color: "#2C4234",
    fontSize: 15.5,
    lineHeight: 26,
  },
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  prevBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#E4ECE2",
  },
  prevBtnText: {
    color: colors.textDark,
    fontSize: 13.5,
    fontWeight: "700",
  },
  nextBtn: {
    flex: 2,
    backgroundColor: colors.forestDark,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    shadowColor: colors.forestDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
  },
  chevronGlyph: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
});
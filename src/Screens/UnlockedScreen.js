// src/Screens/UnlockedScreen.js
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { stopAlarmSound } from "../lib/audioService";
import { cancelAllAlarmNotifications } from "../lib/notifeeHandler";
import { getLockState, incrementStreak, setLockState, subscribeLockState } from "../lib/lockState";
import { clearPersistedAlarmState } from "../lib/alarms";
import { colors } from "../theme/colors";

export default function UnlockedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const correctCount = params.correctCount ? String(params.correctCount) : "5";
  const total = params.total ? String(params.total) : "5";

  const [streakVal, setStreakVal] = useState(() => getLockState().streak);

  useEffect(() => {
    stopAlarmSound();
    cancelAllAlarmNotifications();
    // Clear iOS persisted alarm state so a completed session doesn't re-restore
    clearPersistedAlarmState().catch(() => {});

    const unsubscribe = subscribeLockState((state) => {
      setStreakVal(state.streak);
    });

    incrementStreak();
    setLockState({ isLocked: false, currentStep: "UNLOCKED" });

    return () => unsubscribe();
  }, []);

  const handleUnlockAndExit = () => {
    stopAlarmSound();
    setLockState({ isLocked: false, currentStep: "IDLE" });
    // Minimizes app activity to display phone lock / home screen
    BackHandler.exitApp();
  };

  const handleReturnHome = () => {
    stopAlarmSound();
    setLockState({ isLocked: false, currentStep: "IDLE" });
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentCard}>
        <View style={styles.badgeRow}>
          <Text style={styles.unlockedIcon}>🔓</Text>
        </View>

        <Text style={styles.title}>PHONE UNLOCKED</Text>

        <Text style={styles.subtitle}>
          You completed your 10-page morning focus ritual and passed the check-in!
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>QUIZ SCORE</Text>
            <Text style={styles.statValue}>
              {correctCount}/{total}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DAY STREAK</Text>

            <View style={styles.streakValRow}>
              <Text style={styles.streakIcon}>✦</Text>
              <Text style={styles.statValue}>
                {streakVal}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            {"\"Protect your first hour of attention like cash flow. Whatever gets that hour sets the tone for the rest of your day.\""}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.unlockExitBtn}
          activeOpacity={0.85}
          onPress={handleUnlockAndExit}
        >
          <Text style={styles.unlockExitIcon}>🔓</Text>
          <Text style={styles.unlockExitText}>UNLOCK PHONE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dashboardBtn}
          activeOpacity={0.7}
          onPress={handleReturnHome}
        >
          <Text style={styles.dashboardBtnText}>Return to App Dashboard →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLight,
    padding: 24,
    paddingTop: 56,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  contentCard: {
    alignItems: "center",
    gap: 16,
  },
  badgeRow: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#C6E4C5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    shadowColor: colors.forestDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  unlockedIcon: {
    fontSize: 40,
  },
  title: {
    color: colors.textDark,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 8,
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: colors.cardSage,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardSageBorder,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 6,
  },
  statBox: {
    alignItems: "center",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValue: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: "900",
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.cardSageBorder,
  },
  streakValRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakIcon: {
    color: colors.accentGreen,
    fontSize: 18,
  },
  quoteCard: {
    backgroundColor: colors.inputBg,
    borderLeftWidth: 4,
    borderLeftColor: colors.forestDark,
    borderRadius: 14,
    padding: 16,
    marginTop: 6,
  },
  quoteText: {
    color: colors.textDark,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 20,
  },
  actionSection: {
    gap: 12,
  },
  unlockExitBtn: {
    backgroundColor: colors.forestDark,
    borderRadius: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: colors.forestDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  unlockExitIcon: {
    fontSize: 20,
  },
  unlockExitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  dashboardBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  dashboardBtnText: {
    color: colors.textMuted,
    fontSize: 13.5,
    fontWeight: "700",
  },
});

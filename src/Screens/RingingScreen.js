// src/Screens/RingingScreen.js
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Animated,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { isAlarmSoundPlaying, startAlarmSound, stopAlarmSound } from "../lib/audioService";
import { cancelAllAlarmNotifications } from "../lib/notifeeHandler";
import { setLockState } from "../lib/lockState";
import { persistStep } from "../lib/alarms";
import { colors } from "../theme/colors";

function pad(n) {
  return n.toString().padStart(2, "0");
}

function fmtTime(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { time: `${h12}:${pad(m)}`, period };
}

export default function RingingScreen() {
  const router = useRouter();
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const now = new Date();
  const { time, period } = fmtTime(now);

  useEffect(() => {
    // Lock state tracking
    setLockState({ isLocked: true, currentStep: "RINGING" });

    // Ensure audio sound plays
    if (!isAlarmSoundPlaying()) {
      startAlarmSound();
    }

    // Block back button during alarm ring
    const onBackPress = () => true;
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);

    // Pulsating animation loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 450,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      sub.remove();
      pulseLoop.stop();
    };
  }, [pulseAnim]);

  const handleStopAndRead = async () => {
    await stopAlarmSound();
    await cancelAllAlarmNotifications();
    setLockState({ isLocked: true, currentStep: "READING" });
    // Persist step to UserDefaults on iOS so crash-recovery works
    persistStep("READING").catch(() => {});
    router.replace("/reading");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Active Pill */}
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeDot}>●</Text>
          <Text style={styles.topBadgeText}>Alarm Active • Phone Locked</Text>
        </View>

        {/* Center Animated Bell */}
        <View style={styles.bellContainer}>
          <Animated.View
            style={[
              styles.pulseCircle,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={styles.bellIcon}>🔔</Text>
          </Animated.View>
        </View>

        {/* Clock & Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.clockTime}>
            {time} <Text style={styles.periodText}>{period}</Text>
          </Text>
          <Text style={styles.alarmTitle}>LockIn Founder Ritual</Text>
        </View>

        {/* The LockIn Agreement Card */}
        <View style={styles.agreementCard}>
          <View style={styles.agreementHeader}>
            <View style={styles.agreementHeaderLeft}>
              <Text style={styles.lockGlyph}>🔒</Text>
              <Text style={styles.agreementTitle}>THE LOCKIN AGREEMENT</Text>
            </View>
            <Text style={styles.shieldWatermark}>🛡️</Text>
          </View>

          {/* Step 1 */}
          <View style={styles.stepRow}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Commit to Focus</Text>
              <Text style={styles.stepBody}>
                No apps or notifications will be accessible until the reading task is verified.
              </Text>
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.stepRow}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Complete 10 Pages</Text>
              <Text style={styles.stepBody}>
                Engage with your chosen material. The camera will verify physical page turns.
              </Text>
            </View>
          </View>

          {/* Step 3 */}
          <View style={styles.stepRow}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNumText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Earn Your Unlock</Text>
              <Text style={styles.stepBody}>
                A summary quiz ensures deep work was achieved. Success unlocks the phone.
              </Text>
            </View>
          </View>
        </View>

        {/* Main Action Button */}
        <TouchableOpacity
          style={styles.stopBtn}
          activeOpacity={0.88}
          onPress={handleStopAndRead}
        >
          <Text style={styles.stopBtnText}>▶  STOP ALARM & BEGIN READING</Text>
          <Text style={styles.stopBtnSub}>10 PAGES TO UNLOCK</Text>
        </TouchableOpacity>

        {/* Footer Note */}
        <Text style={styles.footerNote}>Snoozing is disabled for the Founder Ritual</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLight,
  },
  scrollContent: {
    padding: 22,
    paddingTop: 52,
    paddingBottom: 40,
    alignItems: "center",
    gap: 16,
  },
  topBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E4ECE2",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  topBadgeDot: {
    color: colors.accentGreen,
    fontSize: 10,
  },
  topBadgeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  bellContainer: {
    marginVertical: 4,
  },
  pulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.pillGreenBg,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.forestDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  bellIcon: {
    fontSize: 36,
  },
  titleBlock: {
    alignItems: "center",
    gap: 4,
  },
  clockTime: {
    color: colors.textDark,
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -1,
  },
  periodText: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textDark,
  },
  alarmTitle: {
    color: colors.forestDark,
    fontSize: 17,
    fontWeight: "800",
  },
  agreementCard: {
    backgroundColor: colors.cardSage,
    borderWidth: 1,
    borderColor: colors.cardSageBorder,
    borderRadius: 22,
    padding: 20,
    width: "100%",
    gap: 16,
    marginTop: 4,
  },
  agreementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  agreementHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lockGlyph: {
    fontSize: 16,
  },
  agreementTitle: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  shieldWatermark: {
    fontSize: 20,
    opacity: 0.4,
  },
  stepRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  stepNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#C6E4C5",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  stepNumText: {
    color: colors.textDark,
    fontSize: 13,
    fontWeight: "800",
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
  stepBody: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
  },
  stopBtn: {
    backgroundColor: colors.forestDark,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: "100%",
    alignItems: "center",
    shadowColor: colors.forestDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 8,
  },
  stopBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  stopBtnSub: {
    color: "#D0E4D4",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  footerNote: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
  },
});
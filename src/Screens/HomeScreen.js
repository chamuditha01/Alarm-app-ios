// src/Screens/HomeScreen.js
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  cancelAlarm,
  requestPermissions,
  scheduleAlarm,
  scheduleTestAlarm5Sec,
  startAlarmMonitor,
  stopAlarmMonitor,
  updateActiveAlarmsList,
} from "../lib/alarms";
import { startAlarmSound } from "../lib/audioService";
import { getLockState, setLockState, subscribeLockState } from "../lib/lockState";
import { colors } from "../theme/colors";

function pad(n) {
  return n.toString().padStart(2, "0");
}

function fmtTime(h, m) {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${pad(m)} ${period}`;
}

function getCountdownText(alarms) {
  const active = alarms.filter((a) => a.enabled);
  if (active.length === 0) return { title: "No Active Alarms", sub: "Set an alarm for morning focus" };

  const now = new Date();
  let minDiff = Infinity;
  let nextAlarm = null;

  for (const alarm of active) {
    const target = new Date();
    target.setHours(alarm.hour, alarm.minute, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    const diff = target.getTime() - now.getTime();
    if (diff < minDiff) {
      minDiff = diff;
      nextAlarm = alarm;
    }
  }

  if (!nextAlarm) return { title: "No Active Alarms", sub: "Set an alarm for morning focus" };

  const hours = Math.floor(minDiff / (1000 * 60 * 60));
  const mins = Math.floor((minDiff % (1000 * 60 * 60)) / (1000 * 60));

  let timeString = "";
  if (hours === 0 && mins === 0) timeString = "less than 1m";
  else if (hours === 0) timeString = `${mins}m`;
  else timeString = `${hours}h ${mins}m`;

  return {
    title: `Ringing in ${timeString}`,
    sub: `${nextAlarm.label || "Founder's ritual"} • ${fmtTime(nextAlarm.hour, nextAlarm.minute)}`,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  const [lockState, setLocalLockState] = useState(getLockState());
  const [testCountdown, setTestCountdown] = useState(null);

  const [alarms, setAlarms] = useState([
    { id: 1, hour: 6, minute: 30, enabled: true, label: "Founder's ritual", notificationId: "1", days: "M, T, W, T, F" },
    { id: 2, hour: 8, minute: 0, enabled: false, label: "Quiet Reading", notificationId: "2", days: "Sat, Sun" },
  ]);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState(null);
  const [draftAlarm, setDraftAlarm] = useState({
    hour: "06",
    minute: "30",
    label: "",
    enabled: true,
  });

  // Clock ticker & lockState subscription
  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    const unsubscribe = subscribeLockState(setLocalLockState);
    return () => {
      clearInterval(clockTimer);
      unsubscribe();
    };
  }, []);

  // Update active alarms list & start live alarm monitor loop
  useEffect(() => {
    updateActiveAlarmsList(alarms);

    startAlarmMonitor((_triggeredAlarm) => {
      setLockState({ isLocked: true, currentStep: "RINGING" });
      router.push("/ringing");
    });

    return () => {
      stopAlarmMonitor();
    };
  }, [alarms, router]);

  const toggleAlarm = async (id) => {
    const alarm = alarms.find((item) => item.id === id);
    if (!alarm) return;

    const enabled = !alarm.enabled;
    let notificationId = alarm.notificationId;

    try {
      if (enabled) {
        await requestPermissions();
        notificationId = await scheduleAlarm(alarm.hour, alarm.minute, alarm.id, alarm.label, () => {
          setLockState({ isLocked: true, currentStep: "RINGING" });
          router.push("/ringing");
        });
      } else if (notificationId) {
        await cancelAlarm(notificationId);
        notificationId = null;
      }
    } catch (err) {
      console.warn("Toggle alarm error:", err);
    }

    setAlarms((current) =>
      current.map((item) => (item.id === id ? { ...item, enabled, notificationId } : item))
    );
  };

  const deleteAlarm = async (id) => {
    const alarm = alarms.find((item) => item.id === id);
    if (alarm?.notificationId) {
      try {
        await cancelAlarm(alarm.notificationId);
      } catch {
        // ignore
      }
    }
    setAlarms((current) => current.filter((item) => item.id !== id));
  };

  const openNewAlarmEditor = () => {
    setEditingAlarmId(null);
    setDraftAlarm({ hour: "06", minute: "30", label: "", enabled: true });
    setEditorVisible(true);
  };

  const openEditAlarmEditor = (alarm) => {
    setEditingAlarmId(alarm.id);
    setDraftAlarm({
      hour: pad(alarm.hour),
      minute: pad(alarm.minute),
      label: alarm.label,
      enabled: alarm.enabled,
    });
    setEditorVisible(true);
  };

  const saveAlarm = async () => {
    const hour = Math.max(0, Math.min(23, Number.parseInt(draftAlarm.hour, 10) || 0));
    const minute = Math.max(0, Math.min(59, Number.parseInt(draftAlarm.minute, 10) || 0));
    const label = draftAlarm.label.trim() || "Deep Work Session";
    const alarmId = editingAlarmId === null ? Date.now() : editingAlarmId;

    if (draftAlarm.enabled) {
      try {
        await requestPermissions();
        await scheduleAlarm(hour, minute, alarmId, label, () => {
          setLockState({ isLocked: true, currentStep: "RINGING" });
          router.push("/ringing");
        });
      } catch {
        // ignore
      }
    }

    const nextAlarm = {
      id: alarmId,
      hour,
      minute,
      label,
      enabled: draftAlarm.enabled,
      notificationId: String(alarmId),
      days: "Monday - Friday",
    };

    setAlarms((current) => {
      if (editingAlarmId === null) {
        return [...current, nextAlarm];
      }
      return current.map((alarm) => (alarm.id === editingAlarmId ? nextAlarm : alarm));
    });

    setEditorVisible(false);
  };

  // 5-Second Test Trigger
  const triggerTestAlarm5Sec = async () => {
    try {
      await requestPermissions();
      await scheduleTestAlarm5Sec();
    } catch (err) {
      console.warn("Failed to schedule test trigger:", err);
    }

    setTestCountdown(5);
    let count = 5;

    const timer = setInterval(() => {
      count -= 1;
      setTestCountdown(count);

      if (count <= 0) {
        clearInterval(timer);
        setTestCountdown(null);
        const current = getLockState();
        if (!current.isLocked) {
          startAlarmSound();
          setLockState({ isLocked: true, currentStep: "RINGING" });
          router.push("/ringing");
        }
      }
    }, 1000);
  };

  const alertData = getCountdownText(alarms);
  const formattedNow = fmtTime(now.getHours(), now.getMinutes());

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Bar */}
        <View style={styles.headerRow}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>🔓</Text>
            </View>
            <Text style={styles.logoText}>LockIn</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Current Time Section */}
        <View style={styles.timeSection}>
          <Text style={styles.timeLabel}>CURRENT TIME</Text>
          <Text style={styles.clockDisplay}>{formattedNow}</Text>
          <View style={styles.streakPill}>
            <Text style={styles.streakArrow}>‹</Text>
            <Text style={styles.streakText}>{lockState.streak}-Day Streak</Text>
          </View>
        </View>

        {/* Next Alert Card */}
        <View style={styles.nextAlertCard}>
          <Text style={styles.nextAlertLabel}>NEXT ALERT</Text>
          <Text style={styles.nextAlertTitle}>{alertData.title}</Text>
          <Text style={styles.nextAlertSub}>{alertData.sub}</Text>
          <View style={styles.progressBarTrack}>
            <View style={styles.progressBarFill} />
          </View>
        </View>

        {/* Scheduled Alarms Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Scheduled Alarms</Text>
          <TouchableOpacity style={styles.addAlarmLink} onPress={openNewAlarmEditor}>
            <Text style={styles.addAlarmLinkText}>+ Add Alarm</Text>
          </TouchableOpacity>
        </View>

        {/* Alarms List */}
        <View style={styles.alarmsList}>
          {alarms.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              style={[
                styles.alarmCard,
                item.enabled ? styles.alarmCardActive : styles.alarmCardInactive,
              ]}
              onPress={() => openEditAlarmEditor(item)}
            >
              <View style={styles.alarmCardLeft}>
                <View style={[styles.iconCircle, item.enabled ? styles.iconCircleActive : styles.iconCircleInactive]}>
                  <Text style={styles.alarmIconGlyph}>{item.enabled ? "⏰" : "🔔"}</Text>
                </View>
                <View style={styles.alarmMeta}>
                  <Text style={[styles.alarmTimeText, !item.enabled && styles.alarmTimeDisabled]}>
                    {fmtTime(item.hour, item.minute)}
                  </Text>
                  <Text style={styles.alarmLabelText}>
                    {item.label} {item.days ? `- ${item.days}` : ""}
                  </Text>
                </View>
              </View>

              <View style={styles.alarmCardRight}>
                <TouchableOpacity onPress={() => deleteAlarm(item.id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteIcon}>✕</Text>
                </TouchableOpacity>
                <Switch
                  value={item.enabled}
                  onValueChange={() => toggleAlarm(item.id)}
                  trackColor={{ false: "#D2DCD0", true: colors.forestDark }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid Widgets */}
        <View style={styles.statsGrid}>
          <View style={styles.statWidgetCard}>
            <Text style={styles.widgetIcon}>📊</Text>
            <Text style={styles.widgetLabel}>Weekly Adherence</Text>
            <Text style={styles.widgetValue}>94%</Text>
          </View>

          <View style={styles.statWidgetCard}>
            <Text style={styles.widgetIcon}>📖</Text>
            <Text style={styles.widgetLabel}>Pages Read</Text>
            <Text style={styles.widgetValue}>142</Text>
          </View>
        </View>

        {/* Quick Test Trigger Controls */}
        <View style={styles.testControlCard}>
          <Text style={styles.testCardTitle}>⚡ QUICK TEST CONTROLS</Text>
          <View style={styles.testBtnRow}>
            <TouchableOpacity
              style={styles.testBtn5s}
              disabled={testCountdown !== null}
              onPress={triggerTestAlarm5Sec}
            >
              <Text style={styles.testBtn5sText}>
                {testCountdown !== null
                  ? `Ringing in ${testCountdown}s...`
                  : "Test 5s Alarm"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.testBtnPreview}
              onPress={() => {
                startAlarmSound();
                setLockState({ isLocked: true, currentStep: "RINGING" });
                router.push("/ringing");
              }}
            >
              <Text style={styles.testBtnPreviewText}>Preview Screen →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button (+ FAB) */}
      <TouchableOpacity style={styles.fabBtn} activeOpacity={0.9} onPress={openNewAlarmEditor}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Edit / Add Alarm Modal (Image 2) */}
      <Modal visible={editorVisible} transparent animationType="fade" onRequestClose={() => setEditorVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetCard}>
            <Text style={styles.modalSheetTitle}>
              {editingAlarmId === null ? "Add Alarm" : "Edit Alarm"}
            </Text>
            <Text style={styles.modalSheetSubtitle}>
              Set your ritual for a calm morning.
            </Text>

            {/* Time Selectors */}
            <View style={styles.timePickerContainer}>
              <View style={styles.timeCol}>
                <Text style={styles.inputHeaderLabel}>HOUR</Text>
                <TextInput
                  value={draftAlarm.hour}
                  onChangeText={(hour) => setDraftAlarm((c) => ({ ...c, hour }))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="06"
                  placeholderTextColor={colors.textLight}
                  style={styles.timePillInput}
                />
              </View>

              <Text style={styles.timeColon}>:</Text>

              <View style={styles.timeCol}>
                <Text style={styles.inputHeaderLabel}>MINUTE</Text>
                <TextInput
                  value={draftAlarm.minute}
                  onChangeText={(minute) => setDraftAlarm((c) => ({ ...c, minute }))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="30"
                  placeholderTextColor={colors.textLight}
                  style={styles.timePillInput}
                />
              </View>
            </View>

            {/* Label Input */}
            <View style={styles.fieldBlock}>
              <Text style={styles.inputHeaderLabel}>LABEL</Text>
              <TextInput
                value={draftAlarm.label}
                onChangeText={(label) => setDraftAlarm((c) => ({ ...c, label }))}
                placeholder="Deep Work Session"
                placeholderTextColor={colors.textLight}
                style={styles.labelPillInput}
              />
            </View>

            {/* Enable Switch Block */}
            <View style={styles.enableAlarmCard}>
              <View>
                <Text style={styles.enableAlarmTitle}>Enable Alarm</Text>
                <Text style={styles.enableAlarmSub}>Active for Monday - Friday</Text>
              </View>
              <Switch
                value={draftAlarm.enabled}
                onValueChange={(enabled) => setDraftAlarm((c) => ({ ...c, enabled }))}
                trackColor={{ false: "#D2DCD0", true: colors.forestDark }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditorVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveAlarm}>
                <Text style={styles.modalSaveText}>Save Alarm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLight,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 52,
    paddingBottom: 90,
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.pillGreenBg,
    justifyContent: "center",
    alignItems: "center",
  },
  logoIcon: {
    fontSize: 16,
  },
  logoText: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E4ECE2",
    justifyContent: "center",
    alignItems: "center",
  },
  profileIcon: {
    fontSize: 16,
  },
  timeSection: {
    alignItems: "center",
    gap: 6,
    marginVertical: 4,
  },
  timeLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  clockDisplay: {
    color: colors.textDark,
    fontSize: 46,
    fontWeight: "900",
    letterSpacing: -1,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.pillGreenBg,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginTop: 2,
  },
  streakArrow: {
    color: colors.pillGreenText,
    fontSize: 14,
    fontWeight: "800",
  },
  streakText: {
    color: colors.pillGreenText,
    fontSize: 13,
    fontWeight: "700",
  },
  nextAlertCard: {
    backgroundColor: colors.forestDark,
    borderRadius: 22,
    padding: 20,
    gap: 8,
    shadowColor: colors.forestDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  nextAlertLabel: {
    color: colors.forestDarkText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  nextAlertTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  nextAlertSub: {
    color: "#D0E4D4",
    fontSize: 13,
    fontWeight: "500",
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "#25442F",
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  progressBarFill: {
    width: "40%",
    height: "100%",
    backgroundColor: colors.forestDarkText,
    borderRadius: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sectionHeaderTitle: {
    color: colors.textDark,
    fontSize: 17,
    fontWeight: "800",
  },
  addAlarmLink: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  addAlarmLinkText: {
    color: colors.accentGreen,
    fontSize: 13.5,
    fontWeight: "700",
  },
  alarmsList: {
    gap: 12,
  },
  alarmCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
  },
  alarmCardActive: {
    backgroundColor: colors.cardSage,
    borderColor: colors.cardSageBorder,
  },
  alarmCardInactive: {
    backgroundColor: "#F1F5F0",
    borderColor: "#E2EAE1",
    opacity: 0.7,
  },
  alarmCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircleActive: {
    backgroundColor: "#C6E4C5",
  },
  iconCircleInactive: {
    backgroundColor: "#E3EBE2",
  },
  alarmIconGlyph: {
    fontSize: 20,
  },
  alarmMeta: {
    gap: 2,
  },
  alarmTimeText: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: "800",
  },
  alarmTimeDisabled: {
    color: colors.textMuted,
  },
  alarmLabelText: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontWeight: "500",
  },
  alarmCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteIcon: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 14,
  },
  statWidgetCard: {
    flex: 1,
    backgroundColor: colors.cardSage,
    borderWidth: 1,
    borderColor: colors.cardSageBorder,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  widgetIcon: {
    fontSize: 22,
  },
  widgetLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  widgetValue: {
    color: colors.textDark,
    fontSize: 22,
    fontWeight: "800",
  },
  testControlCard: {
    backgroundColor: colors.cardLight,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2EAE1",
    gap: 10,
    marginTop: 4,
  },
  testCardTitle: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  testBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  testBtn5s: {
    flex: 1,
    backgroundColor: colors.forestDark,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  testBtn5sText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  testBtnPreview: {
    flex: 1,
    backgroundColor: "#F2F7F2",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.cardSageBorder,
    alignItems: "center",
  },
  testBtnPreviewText: {
    color: colors.textDark,
    fontSize: 12.5,
    fontWeight: "700",
  },
  fabBtn: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.forestDark,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.forestDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "400",
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalSheetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 24,
    gap: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalSheetTitle: {
    color: colors.textDark,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  modalSheetSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: -10,
  },
  timePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginVertical: 4,
  },
  timeCol: {
    alignItems: "center",
    flex: 1,
  },
  inputHeaderLabel: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  timePillInput: {
    width: "100%",
    backgroundColor: colors.inputBg,
    borderRadius: 16,
    textAlign: "center",
    color: colors.textDark,
    fontSize: 26,
    fontWeight: "800",
    paddingVertical: 14,
  },
  timeColon: {
    color: colors.textDark,
    fontSize: 26,
    fontWeight: "700",
    marginTop: 18,
  },
  fieldBlock: {
    width: "100%",
  },
  labelPillInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textDark,
    fontSize: 15,
    fontWeight: "600",
  },
  enableAlarmCard: {
    backgroundColor: colors.inputBg,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  enableAlarmTitle: {
    color: colors.textDark,
    fontSize: 15,
    fontWeight: "700",
  },
  enableAlarmSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#D8E3D7",
    alignItems: "center",
  },
  modalCancelText: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
  modalSaveBtn: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 16,
    backgroundColor: colors.forestDark,
    alignItems: "center",
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
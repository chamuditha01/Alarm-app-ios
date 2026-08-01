// targets/LockInAlarmWidget/SnoozeIntent.swift
//
// AppIntent executed when the user taps "Snooze 10 min" on the lock-screen alarm alert.
// This runs in the widget extension process, without needing the main app to be running.

import AlarmKit
import AppIntents
import Foundation

// MARK: - Snooze Intent

struct SnoozeAlarmIntent: AppIntent {
    static var title: LocalizedStringResource = "Snooze LockIn Alarm"
    static var description = IntentDescription("Snooze the active LockIn alarm by 10 minutes.")

    func perform() async throws -> some IntentResult {
        // Load current alarm state from shared App Group UserDefaults
        guard let state = AlarmStorage.load() else {
            return .result()
        }

        // Cancel the currently ringing alarm
        if let uuid = UUID(uuidString: state.alarmId) {
            try? await AlarmManager.shared.cancel(id: uuid)
        }

        // Reschedule +10 minutes from now
        let snoozeDate = Date().addingTimeInterval(10 * 60)
        let newUUID = UUID()

        let metadata = LockInAlarmMetadata(
            alarmId: newUUID.uuidString,
            label: state.label,
            bookId: state.bookId
        )

        let alert = AlarmPresentation.Alert(
            title: "rise & chime.",
            stopButton: AlarmButton(text: "Start Reading", systemImageName: "book.fill"),
            secondaryButton: AlarmButton(text: "Snooze 10 min", systemImageName: "zzz")
        )

        let attributes = LockInAlarmAttributes(
            presentation: AlarmPresentation(alert: alert),
            metadata: metadata,
            tintColor: UIColor(red: 0.831, green: 0.635, blue: 0.298, alpha: 1.0)
        )

        let config = AlarmManager.AlarmConfiguration.fixed(date: snoozeDate)

        do {
            try await AlarmManager.shared.schedule(id: newUUID, configuration: config, attributes: attributes)

            // Persist new alarm ID to shared storage
            AlarmStorage.save(
                alarmId: newUUID.uuidString,
                bookId: state.bookId,
                label: state.label,
                pagesRead: 0,
                quizPassed: false,
                currentStep: "SCHEDULED"
            )
        } catch {
            // Swallow error — alarm will be missed but app won't crash
        }

        return .result()
    }
}

// MARK: - Stop/Start Reading Intent

struct StartReadingIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Reading — LockIn"
    static var description = IntentDescription("Dismiss alarm and open LockIn reading session.")

    func perform() async throws -> some IntentResult {
        // The main "Stop" button is handled by the system via AlarmPresentation.Alert.stopButton.
        // We use this intent only to ensure a clean deep-link when the app opens.
        // The actual navigation happens in _layout.tsx via expo-linking.
        return .result()
    }
}

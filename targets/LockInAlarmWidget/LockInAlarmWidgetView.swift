// targets/LockInAlarmWidget/LockInAlarmWidgetView.swift
//
// SwiftUI views for the LockIn alarm Live Activity.
// Rendered by the system on the Lock Screen and in the Dynamic Island
// when a LockIn alarm is active.
//
// Design tokens (matching the React Native app):
//   Background  : #1F4CB8  (ink blue)
//   Primary text: #FFFFFF  (white)
//   Gold accent : #D4A24C
//   Ember accent: #E2603D

import ActivityKit
import AlarmKit
import SwiftUI
import WidgetKit

// MARK: - Design System

private extension Color {
    static let lockInInkBlue    = Color(red: 0.122, green: 0.298, blue: 0.722)  // #1F4CB8
    static let lockInGold       = Color(red: 0.831, green: 0.635, blue: 0.298)  // #D4A24C
    static let lockInPaper      = Color(red: 0.953, green: 0.933, blue: 0.882)  // #F3EEE1
    static let lockInEmber      = Color(red: 0.886, green: 0.376, blue: 0.239)  // #E2603D
}

// MARK: - Lock Screen / Notification Banner View

struct LockInAlarmLockScreenView: View {
    let context: ActivityViewContext<LockInAlarmAttributes>

    private var currentTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm"
        return formatter.string(from: Date())
    }

    private var currentPeriod: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "a"
        return formatter.string(from: Date())
    }

    var body: some View {
        ZStack {
            // Full bleed ink-blue background
            Color.lockInInkBlue
                .ignoresSafeArea()

            VStack(spacing: 0) {

                // ── Top: Branding row ─────────────────────────────────────────
                VStack(spacing: 4) {
                    HStack(spacing: 6) {
                        Image(systemName: "sun.horizon.fill")
                            .foregroundColor(.lockInGold)
                            .font(.system(size: 16, weight: .semibold))

                        Text("rise & chime.")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundColor(.lockInGold)
                            .tracking(0.4)

                        Spacer()

                        // Active indicator dot
                        HStack(spacing: 4) {
                            Circle()
                                .fill(Color.lockInEmber)
                                .frame(width: 7, height: 7)
                            Text("ALARM ACTIVE")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.white.opacity(0.65))
                                .tracking(0.8)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 18)

                // ── Large Clock ───────────────────────────────────────────────
                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text(currentTime)
                        .font(.system(size: 64, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                        .monospacedDigit()

                    Text(currentPeriod)
                        .font(.system(size: 26, weight: .heavy, design: .rounded))
                        .foregroundColor(.white.opacity(0.75))
                        .padding(.bottom, 4)
                }
                .padding(.top, 12)

                // ── Motivational tagline ──────────────────────────────────────
                Text("Good things are coming.")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.65))
                    .padding(.top, 4)

                Spacer(minLength: 12)

                // ── Alarm label / mission ─────────────────────────────────────
                VStack(spacing: 6) {
                    Text(context.attributes.metadata.label.uppercased())
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.lockInGold.opacity(0.8))
                        .tracking(1.4)

                    // Step indicators (pill-shaped dots matching app S5 design)
                    HStack(spacing: 6) {
                        ForEach(0..<3, id: \.self) { i in
                            Capsule()
                                .fill(i == 0 ? Color.lockInGold : Color.white.opacity(0.25))
                                .frame(width: i == 0 ? 24 : 8, height: 5)
                        }
                    }
                }
                .padding(.bottom, 16)

                // ── Divider ───────────────────────────────────────────────────
                Rectangle()
                    .fill(Color.white.opacity(0.12))
                    .frame(height: 1)
                    .padding(.horizontal, 20)

                // ── Action hint (actual buttons rendered by AlarmPresentation) ─
                Text("Tap  Start Reading  to begin your focus session.")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.5))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
            }
        }
    }
}

// MARK: - Dynamic Island Views

struct LockInAlarmDynamicIslandView: View {
    let context: ActivityViewContext<LockInAlarmAttributes>

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "sun.horizon.fill")
                .foregroundColor(.lockInGold)
                .font(.system(size: 14))
            Text("rise & chime.")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Previews

#if DEBUG
#Preview("Lock Screen", as: .content, using: LockInAlarmAttributes(
    presentation: AlarmPresentation(
        alert: AlarmPresentation.Alert(
            title: "rise & chime.",
            stopButton: AlarmButton(text: "Start Reading", systemImageName: "book.fill"),
            secondaryButton: AlarmButton(text: "Snooze 10 min", systemImageName: "zzz")
        )
    ),
    metadata: LockInAlarmMetadata(
        alarmId: "preview-alarm",
        label: "LockIn Founder Ritual",
        bookId: "default"
    ),
    tintColor: UIColor(red: 0.831, green: 0.635, blue: 0.298, alpha: 1.0)
)) {
    LockInAlarmAttributes.ContentState()
} contentStates: {
    LockInAlarmAttributes.ContentState()
}
#endif

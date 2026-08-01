// targets/LockInAlarmWidget/LockInAlarmWidget.swift
//
// Main entry point for the LockInAlarmWidget WidgetKit extension target.
// Registers the ActivityConfiguration that powers the Live Activity lock-screen UI.

import ActivityKit
import AlarmKit
import SwiftUI
import WidgetKit

// MARK: - Widget Bundle

@main
struct LockInAlarmWidgetBundle: WidgetBundle {
    var body: some Widget {
        LockInAlarmLiveActivityWidget()
    }
}

// MARK: - Live Activity Widget

struct LockInAlarmLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LockInAlarmAttributes.self) { context in
            // ──────────────────────────────────────────────────────────────
            // LOCK SCREEN / NOTIFICATION BANNER VIEW
            // Shown on the lock screen when the alarm is active.
            // The system renders this view inside the alarm alert overlay.
            // ──────────────────────────────────────────────────────────────
            LockInAlarmLockScreenView(context: context)
                .activitySystemActionForegroundColor(.white)

        } dynamicIsland: { context in
            // ──────────────────────────────────────────────────────────────
            // DYNAMIC ISLAND — expanded, compact, and minimal states
            // ──────────────────────────────────────────────────────────────
            DynamicIsland {
                // Expanded (long-press)
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Image(systemName: "sun.horizon.fill")
                            .foregroundColor(Color(red: 0.831, green: 0.635, blue: 0.298))
                            .font(.system(size: 18, weight: .semibold))
                        Text("LockIn")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    Text("rise & chime.")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundColor(Color(red: 0.831, green: 0.635, blue: 0.298))
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text(context.attributes.metadata.label)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.white.opacity(0.8))
                        Spacer()
                        Text("ALARM ACTIVE")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.white.opacity(0.5))
                            .tracking(0.8)
                    }
                    .padding(.horizontal, 4)
                }

            } compactLeading: {
                // Compact leading — shown next to the camera
                Image(systemName: "sun.horizon.fill")
                    .foregroundColor(Color(red: 0.831, green: 0.635, blue: 0.298))
                    .font(.system(size: 12, weight: .semibold))

            } compactTrailing: {
                // Compact trailing — small label
                Text("LockIn")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

            } minimal: {
                // Minimal — single dot when two activities compete
                Image(systemName: "alarm.fill")
                    .foregroundColor(Color(red: 0.831, green: 0.635, blue: 0.298))
                    .font(.system(size: 12))
            }
            .widgetURL(URL(string: "lockinapp://alarm/start"))
            .keylineTint(Color(red: 0.831, green: 0.635, blue: 0.298))
        }
    }
}

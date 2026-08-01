// targets/LockInAlarmWidget/LockInAlarmAttributes.swift
//
// Defines the AlarmAttributes type that bridges AlarmKit ↔ ActivityKit (Live Activities).
// AlarmAttributes carries the static metadata for the alarm and the presentation configuration
// that drives both the lock-screen UI and the Dynamic Island.

import AlarmKit
import Foundation
import SwiftUI

// MARK: - Metadata

/// Static metadata attached to every LockIn alarm.
/// Survives for the entire lifecycle of the alarm (from schedule to dismiss).
struct LockInAlarmMetadata: AlarmMetadata {
    /// Unique alarm identifier (matches the UUID stored in AlarmStorage / JS side)
    var alarmId: String
    /// Display label shown on the lock screen (e.g. "LockIn Founder Ritual")
    var label: String
    /// Book identifier — for future use when different books are supported
    var bookId: String
}

// MARK: - AlarmAttributes

/// Full AlarmAttributes type used when scheduling and building the Live Activity.
typealias LockInAlarmAttributes = AlarmAttributes<LockInAlarmMetadata>

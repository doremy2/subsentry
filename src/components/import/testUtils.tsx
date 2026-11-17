import { vi } from "vitest";
import type { ReactNode } from "react";
import { DEFAULT_PREFERENCES } from "../../data/types";
import { DEFAULT_SIZES } from "../../../electron/shared/windowSizes";
import type { DetectionClient } from "../../data/detectionClient";
import { mockDetector } from "../../domain/detection/mock";
import { runDetection } from "../../domain/detection/run";
import type { DetectionOutcome } from "../../domain/detection/types";
import { AppContext, type AppActions, type AppState } from "../../state/appContext";

export const TODAY = new Date().toISOString().slice(0, 10);

export function appValue(overrides: Partial<AppState & AppActions> = {}): AppState & AppActions {
  return {
    status: "ready",
    fatalError: null,
    subscriptions: [],
    preferences: DEFAULT_PREFERENCES,
    notice: null,
    platform: "web",
    addSubscription: vi.fn(async () => {}),
    updateSubscription: vi.fn(async () => {}),
    removeSubscription: vi.fn(async () => {}),
    updatePreferences: vi.fn(async () => {}),
    setMode: vi.fn(async () => {}),
    hideWindow: vi.fn(async () => {}),
    beginResize: vi.fn(async () => {}),
    endResize: vi.fn(async () => {}),
    resetWindowSize: vi.fn(async () => {}),
    setLayoutSize: vi.fn(async (_layout, size) => size),
    getLayoutSizes: vi.fn(async () => DEFAULT_SIZES),
    quit: vi.fn(async () => {}),
    showTestNotification: vi.fn(async () => {}),
    reportError: vi.fn(),
    dismissNotice: vi.fn(),
    retry: vi.fn(),
    ...overrides,
  };
}

export function withApp(value: AppState & AppActions, children: ReactNode) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** A detection client backed by the labelled MOCK detector, with a spy to inspect calls. */
export function mockClient(): DetectionClient & { analyze: ReturnType<typeof vi.fn> } {
  return {
    analyze: vi.fn((transactions) => runDetection(mockDetector, transactions, { existingSubscriptions: [], today: TODAY })),
  };
}

export function failingClient(outcome: DetectionOutcome): DetectionClient {
  return { analyze: async () => outcome };
}

export const SAMPLE_CSV = "Date,Description,Amount\n01/15/2026,NETFLIX.COM,-15.49\n02/15/2026,NETFLIX.COM,-15.49\n02/16/2026,PAYROLL ACME,2450.00\n";

export const csvFile = (text = SAMPLE_CSV, name = "statement.csv") => new File([text], name, { type: "text/csv" });

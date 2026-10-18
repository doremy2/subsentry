import { ACCENTS, OPACITY_RANGE, REMINDER_LEAD_OPTIONS, type Accent } from "../../data/types";
import { useApp } from "../../state/appContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

const SWATCH: Record<Accent, string> = { indigo: "#8b8cff", teal: "#4fd1c5", rose: "#ff7a9c", amber: "#f5b84b" };

/** Appearance and window preferences. Every control here is persisted. */
export function SettingsPanel() {
  const { preferences, updatePreferences, reportError, hideWindow, quit, showTestNotification, platform } = useApp();
  const trayName = platform === "darwin" ? "menu bar" : "tray";
  const update = (patch: Parameters<typeof updatePreferences>[0]) => void updatePreferences(patch).catch(reportError);

  return (
    <section aria-label="Appearance and window settings" className="space-y-4">
      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-white/40">Accent</h3>
        <div role="radiogroup" aria-label="Accent color" className="flex gap-2">
          {ACCENTS.map((accent) => (
            <button
              key={accent}
              type="button"
              role="radio"
              aria-checked={preferences.accent === accent}
              aria-label={accent}
              title={accent}
              onClick={() => update({ accent })}
              className={`size-7 rounded-full border-2 transition hover:scale-110 ${preferences.accent === accent ? "border-white" : "border-transparent"}`}
              style={{ background: SWATCH[accent] }}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-white/40">Transparency</h3>
          <span className="text-xs tabular-nums text-white/50">{Math.round(preferences.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          aria-label="Surface opacity"
          min={OPACITY_RANGE.min}
          max={OPACITY_RANGE.max}
          step={0.02}
          value={preferences.opacity}
          onChange={(e) => update({ opacity: Number(e.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span>
          <span className="block text-sm">Always on top</span>
          <span className="block text-xs text-white/45">Keep above other windows</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={preferences.alwaysOnTop}
          onChange={(e) => update({ alwaysOnTop: e.target.checked })}
          className="size-4 accent-[var(--accent)]"
        />
      </label>

      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span>
          <span className="block text-sm">Launch at login</span>
          <span className="block text-xs text-white/45">Start SubSentry when you sign in</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={preferences.launchOnLogin}
          onChange={(e) => update({ launchOnLogin: e.target.checked })}
          className="size-4 accent-[var(--accent)]"
        />
      </label>

      <div>
        <label className="mb-2 flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="block text-sm">Renewal reminders</span>
            <span className="block text-xs text-white/45">Native notification before a charge</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={preferences.remindersEnabled}
            onChange={(e) => update({ remindersEnabled: e.target.checked })}
            className="size-4 accent-[var(--accent)]"
          />
        </label>
        <div className={`grid grid-cols-2 gap-2 transition-opacity ${preferences.remindersEnabled ? "" : "pointer-events-none opacity-40"}`}>
          <label className="block">
            <span className="mb-1 block text-[11px] text-white/45">Days before</span>
            <select
              className="field !py-1.5 text-xs"
              aria-label="Days before renewal"
              disabled={!preferences.remindersEnabled}
              value={preferences.reminderLeadDays}
              onChange={(e) => update({ reminderLeadDays: Number(e.target.value) })}
            >
              {REMINDER_LEAD_OPTIONS.map((d) => (
                <option key={d} value={d}>{d === 0 ? "Same day" : d === 1 ? "1 day" : `${d} days`}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-white/45">Not before</span>
            <select
              className="field !py-1.5 text-xs"
              aria-label="Reminder time"
              disabled={!preferences.remindersEnabled}
              value={preferences.reminderHour}
              onChange={(e) => update({ reminderHour: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" })}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <Button className="w-full !py-1.5 text-xs" onClick={() => void showTestNotification().catch(reportError)}>
        Send test notification
      </Button>

      <div className="flex gap-2 pt-1">
        <Button className="flex-1 !px-2 text-xs" onClick={() => void hideWindow().catch(reportError)}>
          <Icon name="hide" size={14} className="mr-1 inline" />Hide to {trayName}
        </Button>
        <Button variant="ghost" className="flex-1 !px-2 text-xs" onClick={() => void quit().catch(reportError)}>
          <Icon name="power" size={14} className="mr-1 inline" />Quit
        </Button>
      </div>
    </section>
  );
}

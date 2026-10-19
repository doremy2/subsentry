import { ACCENTS, COMPACT_LAYOUTS, OPACITY_RANGE, REMINDER_LEAD_OPTIONS, THEMES, type Accent, type CompactLayout, type Theme } from "../../data/types";
import { useApp } from "../../state/appContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { CustomSizeForm } from "./CustomSizeForm";

const SWATCH: Record<Accent, string> = { indigo: "#8b8cff", teal: "#4fd1c5", rose: "#ff7a9c", amber: "#f5b84b" };

/** Mini previews for the theme picker: card background + highlight. */
const THEME_PREVIEW: Record<Theme, { label: string; background: string }> = {
  midnight: { label: "Midnight", background: "linear-gradient(135deg, #1b1d2b, #0f1018)" },
  graphite: { label: "Graphite", background: "linear-gradient(135deg, #3a3a40, #1d1d20)" },
  aurora: { label: "Aurora", background: "linear-gradient(135deg, #14707a 0%, #06151e 55%, #3a3f9a 100%)" },
  sunset: { label: "Sunset", background: "linear-gradient(135deg, #b4521f 0%, #1f0e1d 55%, #a11d63 100%)" },
  light: { label: "Light", background: "linear-gradient(135deg, #ffffff, #e4e7f2)" },
};

const LAYOUT_LABEL: Record<CompactLayout, string> = { detailed: "Detailed", minimal: "Minimal" };

/** Appearance and window preferences. Every control here is persisted. */
export function SettingsPanel() {
  const { preferences, updatePreferences, reportError, hideWindow, quit, showTestNotification, platform, resetWindowSize } = useApp();
  const trayName = platform === "darwin" ? "menu bar" : "tray";
  const update = (patch: Parameters<typeof updatePreferences>[0]) => void updatePreferences(patch).catch(reportError);

  return (
    <section aria-label="Appearance and window settings" className="space-y-4">
      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-white/40">Theme</h3>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-5 gap-1.5">
          {THEMES.map((theme) => {
            const { label, background } = THEME_PREVIEW[theme];
            const selected = preferences.theme === theme;
            return (
              <button
                key={theme}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={label}
                title={label}
                onClick={() => update({ theme })}
                className={`group flex flex-col items-center gap-1 rounded-xl p-1 transition hover:scale-105 active:scale-95 ${selected ? "bg-white/10" : ""}`}
              >
                <span className={`block h-7 w-full rounded-lg border transition ${selected ? "border-accent" : "border-white/15"}`} style={{ background }} />
                <span className={`text-[10px] ${selected ? "text-white" : "text-white/50"}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

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

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-white/40">Widget layout</h3>
        <div role="radiogroup" aria-label="Compact layout" className="flex gap-1 rounded-xl bg-white/[0.05] p-1">
          {COMPACT_LAYOUTS.map((layout) => (
            <button
              key={layout}
              type="button"
              role="radio"
              aria-checked={preferences.compactLayout === layout}
              onClick={() => update({ compactLayout: layout })}
              className={`flex-1 rounded-lg px-3 py-1 text-xs font-medium transition ${preferences.compactLayout === layout ? "bg-white/15 text-white" : "text-white/55 hover:text-white"}`}
            >
              {LAYOUT_LABEL[layout]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-white/40">Drag the widget's right or bottom edge, or its corner, to resize it.</p>
        <CustomSizeForm />
        {platform !== "web" && (
          <Button className="mt-2 w-full !py-1.5 text-xs" onClick={() => void resetWindowSize().catch(reportError)}>Reset window size</Button>
        )}
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

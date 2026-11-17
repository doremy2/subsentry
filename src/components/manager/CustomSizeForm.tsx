import { useEffect, useState, type FormEvent } from "react";
import { cardLimits, parseCustomSize, toCardSize, type LayoutKey, type Size } from "../../../electron/shared/windowSizes";
import { useApp } from "../../state/appContext";
import { useWindowSize } from "../../state/useWindowSize";
import { Button } from "../ui/Button";

const LAYOUT_LABEL: Record<LayoutKey, string> = {
  compact: "Compact (Detailed)",
  minimal: "Compact (Minimal)",
  expanded: "Expanded manager",
};

/**
 * Type an exact width and height for a layout. Uses the same path as dragging the grips
 * (clamp to min/max, remember per device, fit on screen), just with typed numbers.
 * Sizes are the VISIBLE widget in screen points (the same number on Retina and standard displays).
 */
export function CustomSizeForm() {
  const { platform, getLayoutSizes, setLayoutSize, reportError } = useApp();
  const windowSize = useWindowSize();
  const [layout, setLayout] = useState<LayoutKey>("compact");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<{ width?: string; height?: string }>({});
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const show = (windowSizeToShow: Size) => {
    const card = toCardSize(windowSizeToShow);
    setWidth(String(card.width));
    setHeight(String(card.height));
  };

  // Show the current size of the selected layout; keep it fresh while dragging, but never overwrite typing.
  useEffect(() => {
    if (dirty) return;
    let cancelled = false;
    getLayoutSizes().then(
      (sizes) => !cancelled && show(sizes[layout]),
      reportError,
    );
    return () => {
      cancelled = true;
    };
  }, [layout, dirty, windowSize.width, windowSize.height, getLayoutSizes, reportError]);

  if (platform === "web") return null;

  const limits = cardLimits(layout);

  async function apply(event: FormEvent) {
    event.preventDefault();
    const parsed = parseCustomSize(width, height, layout);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setNote(null);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const fitted = await setLayoutSize(layout, parsed.size);
      const shown = toCardSize(fitted);
      const adjusted = fitted.width !== parsed.size.width || fitted.height !== parsed.size.height;
      setNote(adjusted ? `Fitted to your screen: ${shown.width} × ${shown.height} px.` : `Applied ${shown.width} × ${shown.height} px.`);
      setDirty(false);
      show(fitted);
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }

  const input = (label: string, value: string, set: (v: string) => void, error: string | undefined) => (
    <label className="block min-w-0 flex-1">
      <span className="mb-1 block text-[11px] text-white/45">{label}</span>
      <input
        className="field !py-1.5 text-xs tabular-nums"
        inputMode="numeric"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        value={value}
        onChange={(e) => {
          set(e.target.value);
          setDirty(true);
          setNote(null);
          setErrors({});
        }}
      />
      {error && <span role="alert" className="mt-1 block text-[11px] text-danger">{error}</span>}
    </label>
  );

  return (
    <form onSubmit={apply} noValidate aria-label="Custom size" className="mt-3 space-y-2">
      <h4 className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">Custom size</h4>
      <select
        className="field !py-1.5 text-xs"
        aria-label="Layout to resize"
        value={layout}
        onChange={(e) => {
          setLayout(e.target.value as LayoutKey);
          setDirty(false);
          setErrors({});
          setNote(null);
        }}
      >
        {(Object.keys(LAYOUT_LABEL) as LayoutKey[]).map((key) => (
          <option key={key} value={key}>{LAYOUT_LABEL[key]}</option>
        ))}
      </select>
      <div className="flex gap-2">
        {input("Width (px)", width, setWidth, errors.width)}
        {input("Height (px)", height, setHeight, errors.height)}
      </div>
      <p className="text-[11px] text-white/40">
        {limits.min.width}–{limits.max.width} × {limits.min.height}–{limits.max.height} px · saved for this computer
      </p>
      <Button type="submit" className="w-full !py-1.5 text-xs" disabled={busy}>Apply size</Button>
      {note && <p role="status" className="text-[11px] text-ok">{note}</p>}
    </form>
  );
}

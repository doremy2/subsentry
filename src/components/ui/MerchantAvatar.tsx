/** Letter tile with a color derived from the name, so the same merchant always looks the same. */
const HUES = [255, 190, 340, 40, 150, 20, 290, 210];

function hueFor(name: string): number {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[hash % HUES.length] ?? 255;
}

export function MerchantAvatar({ name, size = 36, dimmed }: { name: string; size?: number; dimmed?: boolean }) {
  const hue = hueFor(name);
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-xl font-semibold ${dimmed ? "opacity-50 grayscale" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(145deg, hsl(${hue} 60% 45% / 0.55), hsl(${hue} 60% 30% / 0.55))`,
        border: `1px solid hsl(${hue} 70% 65% / 0.3)`,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: IconName;
  /** Required: also used as the tooltip. */
  label: string;
  tone?: "default" | "danger" | "accent";
  active?: boolean;
}

const TONES = {
  default: "text-white/60 hover:text-white hover:bg-white/10",
  danger: "text-white/60 hover:text-danger hover:bg-danger/15",
  accent: "text-accent hover:bg-accent/15",
};

export function IconButton({ icon, label, tone = "default", active, className = "", ...rest }: Props) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid size-8 place-items-center rounded-lg transition active:scale-90 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent ${TONES[tone]} ${active ? "bg-accent/20 text-accent" : ""} ${className}`}
      {...rest}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

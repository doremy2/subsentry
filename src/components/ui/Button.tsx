import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
}

const VARIANTS = {
  primary: "bg-accent text-[#0d0e16] font-semibold hover:brightness-110",
  ghost: "bg-white/[0.07] text-white/85 hover:bg-white/[0.12]",
  danger: "bg-danger/90 text-[#1a0b0e] font-semibold hover:brightness-110",
};

export function Button({ variant = "ghost", className = "", type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      className={`rounded-xl px-4 py-2 text-sm transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}

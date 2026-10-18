import type { SVGProps } from "react";

const PATHS = {
  logo: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" /></>,
  expand: <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />,
  collapse: <path d="M20 10h-6V4M4 14h6v6M14 10l7-7M10 14l-7 7" />,
  hide: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />,
  trash: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>,
  pin: <path d="M9 4h6l-1 6 3 3H7l3-3-1-6zM12 13v7" />,
  power: <path d="M12 3v8M6.3 7.3a8 8 0 1 0 11.4 0" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  undo: <path d="M9 7L4 12l5 5M4 12h10a6 6 0 0 1 0 12" />,
  alert: <path d="M12 8v5M12 16.5v.01M10.3 4.4L2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0z" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, ...rest }: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

type IconName =
  | "home"
  | "info"
  | "form"
  | "table"
  | "upload"
  | "message"
  | "settings"
  | "sun"
  | "moon"
  | "check"
  | "send"
  | "refresh";

type IconProps = {
  name: IconName;
  label?: string;
};

const paths: Record<IconName, string> = {
  home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z",
  info: "M12 17v-6m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  form: "M7 4h10l3 3v13H7zM9 12h6M9 16h4M16 4v4h4",
  table: "M4 6h16v12H4zM4 10h16M10 6v12",
  upload: "M12 15V4m0 0 4 4m-4-4-4 4M5 15v4h14v-4",
  message: "M4 5h16v11H8l-4 4z",
  settings:
    "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm8.5 4a7.8 7.8 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L16 3h-4l-.4 3a7 7 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.4 3h4l.4-3a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z",
  sun: "M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z",
  moon: "M20 15.5A8.5 8.5 0 0 1 8.5 4a7 7 0 1 0 11.5 11.5Z",
  check: "m5 12 4 4L19 6",
  send: "m4 12 16-8-6 16-2-7z",
  refresh: "M20 11a8 8 0 0 0-14.9-4M4 7V3h4m-4 10a8 8 0 0 0 14.9 4M20 17v4h-4",
};

export function Icon({ name, label }: IconProps) {
  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className="icon"
      fill="none"
      role={label ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d={paths[name]} />
    </svg>
  );
}

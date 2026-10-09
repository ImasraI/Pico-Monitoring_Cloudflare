import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  arrow: "M19 12H5m6-6-6 6 6 6",
  chevron: "m6 9 6 6 6-6",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  target: "M21 12a9 9 0 1 1-9-9m0 4a5 5 0 1 0 5 5m-5 0 9-9m-4 0h4v4",
  message:
    "M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2a8.5 8.5 0 0 1 8.5 8.5ZM7 9h10M7 13h6",
  calendar:
    "M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Zm2-3v6m10-6v6M3 11h18m-14 4h2m4 0h2",
  camera: "M8 5 6 8H3v12h18V8h-3l-2-3H8Zm4 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  phone:
    "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 3h4m-3 14h2",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18",
  aligner:
    "M4 5c-4 4-2 15 8 16 10-1 12-12 8-16M5 7c-2 4 0 11 7 12 7-1 9-8 7-12M8 5v5m4-6v6m4-5v5",
  braces:
    "M3 8c3 4 15 4 18 0M3 15c3 4 15 4 18 0M5 7v4h3V7H5Zm6 1v4h3V8h-3Zm6-1v4h3V7h-3",
  check: "m5 12 4 4L19 6",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  menu: "M3 6h18M3 12h18M3 18h18",
  search: "M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM16 16l5 5",
  book: "M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15",
  research: "M7 3h10v18H3V7l4-4Zm0 0v4H3m4 5h6m-6 4h4m4-1 2 2 4-5",
  copy: "M8 8h13v13H8V8Zm8-3V3H3v13h2",
  call: "M7 3H3c-1 10 8 19 18 18v-4l-5-2-2 2a15 15 0 0 1-7-7l2-2-2-5",
  lock: "M5 10h14v11H5V10Zm3 0V6a4 4 0 0 1 8 0v4m-4 5v2",
  sun: "M12 4.5V2m0 20v-2.5M19.5 12H22M2 12h2.5m13.4-5.9 1.8-1.8M4.3 19.7l1.8-1.8m0-11.8L4.3 4.3m15.4 15.4-1.8-1.8M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  moon: "M20.5 14.8A8.6 8.6 0 0 1 9.2 3.5a8.6 8.6 0 1 0 11.3 11.3Z",
};
export function Icon({
  name,
  size = 24,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name] || paths.eye} />
    </svg>
  );
}

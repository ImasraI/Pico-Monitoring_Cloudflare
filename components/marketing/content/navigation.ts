import { scanboxProductName } from "./scanbox";

export const solutions = [
  { label: scanboxProductName, to: "/scanbox", note: "شروع مسیر ثبت تصویر", icon: "camera" },
  { label: "PM Dashboard", to: "/dashboard", note: "محیط تیم درمان", icon: "eye" },
  { label: "PM App", to: "/app", note: "مسیر ارتباط بیمار", icon: "phone" },
  { label: "PM Kids", to: "/kids", note: "تجربه کودکان و خانواده‌ها", icon: "message" },
];

export const navigation = [
  { label: "راهکارهای ما", hover: true, items: solutions },
  {
    label: "برای شما",
    items: [
      { label: "ارتودنتیست‌ها", to: "/orthodontists", note: "تصمیم بالینی با شماست" },
      { label: "کلینیک‌ها و مطب‌ها", to: "/clinics", note: "جریان کار منظم‌تر" },
      { label: "بیماران و خانواده‌ها", to: "/patients", note: "در ارتباط با درمان" },
    ],
  },
  { label: "شواهد و پژوهش‌ها", to: "/evidence" },
  { label: "امنیت و حریم خصوصی", to: "/privacy" },
];

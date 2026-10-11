export function phoneNumber(value: string, required = false) {
  let phone = value.replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632)).replace(/[\s()-]/g, "");
  if (phone.startsWith("+98")) phone = "0" + phone.slice(3);
  else if (phone.startsWith("0098")) phone = "0" + phone.slice(4);
  else if (/^9\d{9}$/.test(phone)) phone = "0" + phone;
  if ((required && !phone) || (phone && !/^09\d{9}$/.test(phone))) throw new Error("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود");
  return phone;
}

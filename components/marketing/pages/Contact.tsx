import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Page } from "../content/types";
import { config } from "../config";
import { Hero } from "../components/Sections";
import { Icon } from "../components/Icon";
export const normalizePhone = (s: string) =>
  s
    .replace(/[۰-۹]/g, (ch) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(ch)))
    .replace(/[٠-٩]/g, (ch) => String("٠١٢٣٤٥٦٧٨٩".indexOf(ch)))
    .replace(/[\s()-]/g, "");
export function Contact({ page }: { page: Page }) {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  function prepare(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const phone = normalizePhone(String(data.get("phone") || ""));
    if (!/^(?:09\d{9}|\+989\d{9}|00989\d{9})$/.test(phone)) {
      setError("شماره موبایل معتبر وارد کنید؛ برای نمونه ۰۹۱۲۱۲۳۴۵۶۷.");
      e.currentTarget
        .querySelector<HTMLInputElement>('[name="phone"]')
        ?.focus();
      return;
    }
    setError("");
    setStatus("درخواست آماده شد. این متن هنوز برای PM ارسال نشده است.");
    setDraft(
      `درخواست آشنایی با Pico Monitoring\nنام: ${String(data.get("name")).trim()}\nنام کلینیک: ${String(data.get("clinic") || "").trim() || "—"}\nشماره تماس: ${phone}\nشهر: ${String(data.get("city") || "").trim() || "—"}\nنوع مخاطب: ${data.get("audience")}\nتوضیحات: ${String(data.get("message") || "").trim() || "درخواست دمو و آشنایی با مسیر همکاری"}`,
    );
    requestAnimationFrame(() => resultRef.current?.focus());
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setStatus(
        "متن درخواست کپی شد. این درخواست هنوز ارسال نشده است؛ برای هماهنگی دمو با تیم PM تماس بگیرید.",
      );
    } catch {
      setStatus(
        "کپی خودکار ممکن نشد. متن را انتخاب و کپی کنید، یا نسخه متنی را دریافت کنید.",
      );
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([draft], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "PM-demo-request.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(
      "نسخه متنی درخواست دریافت شد. این درخواست هنوز برای PM ارسال نشده است.",
    );
  }
  return (
    <>
      <Hero page={page} />
      <section className="section contact-section">
        <div className="container contact-grid">
          <div className="contact-info">
            <span className="eyebrow">گفت‌وگو درباره نیاز شما</span>
            <h2>از مطب شما شروع می‌کنیم.</h2>
            <p>
              درباره مسیر پایش، PM ScanBoxᴾʳᵒ و امکان اجرای راهکار در مطب یا کلینیک
              شما گفت‌وگو می‌کنیم.
            </p>
            <div className="phone-links">
              {config.phones.map((phone, i) => (
                <a href={`tel:${phone}`} key={phone}>
                  <span>
                    <small>
                      تماس با تیم PM · {i === 0 ? "شماره اول" : "شماره دوم"}
                    </small>
                    <strong dir="ltr">{phone}</strong>
                  </span>
                  <Icon name="call" size={25} />
                </a>
              ))}
            </div>
            <div className="contact-topics">
              <span>
                <Icon name="check" size={18} /> مشاهده دمو و آشنایی با محصول
              </span>
              <span>
                <Icon name="check" size={18} /> بررسی مسیر شروع همکاری
              </span>
              <span>
                <Icon name="check" size={18} /> اجرای پایش در مطب و کلینیک
              </span>
            </div>
            <p className="contact-patient-note">
              بیمار هستید؟ مناسب بودن پایش برای درمان خود را از ارتودنتیستتان
              بپرسید.
            </p>
          </div>
          <div className="contact-form-panel">
            <h2>درخواست خود را آماده کنید.</h2>
            <p className="form-intro">
              این فرم متن درخواست شما را آماده می‌کند. ارسال آنلاین هنوز فعال
              نیست؛ برای هماهنگی دمو با شماره‌های کنار فرم تماس بگیرید.
            </p>
            <form onSubmit={prepare}>
              <div className="form-grid">
                <label>
                  نام <span aria-hidden="true">*</span>
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                    placeholder="نام و نام خانوادگی"
                  />
                </label>
                <label>
                  نام کلینیک
                  <input
                    name="clinic"
                    autoComplete="organization"
                    maxLength={120}
                    placeholder="نام مطب یا کلینیک"
                  />
                </label>
                <label>
                  شماره تماس <span aria-hidden="true">*</span>
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    maxLength={20}
                    placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                    aria-invalid={!!error}
                    aria-describedby={error ? "phone-error" : undefined}
                    onChange={() => setError("")}
                  />
                </label>
                <label>
                  شهر
                  <input
                    name="city"
                    autoComplete="address-level2"
                    maxLength={80}
                    placeholder="شهر شما"
                  />
                </label>
                <label className="full">
                  نوع مخاطب <span aria-hidden="true">*</span>
                  <select name="audience" required defaultValue="">
                    <option value="" disabled>
                      انتخاب کنید
                    </option>
                    <option>ارتودنتیست</option>
                    <option>کلینیک</option>
                    <option>سایر</option>
                  </select>
                </label>
                <label className="full">
                  توضیحات
                  <textarea
                    name="message"
                    rows={4}
                    maxLength={2000}
                    placeholder="درباره نیاز مطب و پرسش‌های شما"
                  />
                </label>
              </div>
              {error && (
                <p id="phone-error" role="alert" className="form-error">
                  {error}
                </p>
              )}
              <p className="form-note">
                <Icon name="lock" size={16} /> اطلاعات در این فرم به سرور ارسال
                یا در مرورگر ذخیره نمی‌شود. اطلاعات بیمار وارد نکنید.
              </p>
              <button className="button" type="submit">
                آماده‌سازی درخواست <Icon name="arrow" size={19} />
              </button>
            </form>
            {draft && (
              <div className="request-result" ref={resultRef} tabIndex={-1}>
                <h3>متن درخواست</h3>
                <textarea
                  readOnly
                  aria-label="متن درخواست آماده‌شده"
                  value={draft}
                  rows={8}
                />
                <div className="draft-actions">
                  <button className="button secondary" onClick={copy}>
                    <Icon name="copy" size={18} /> کپی متن
                  </button>
                  <button className="text-link" onClick={download}>
                    دریافت نسخه متنی <Icon name="arrow" size={18} />
                  </button>
                </div>
              </div>
            )}
            <p role="status" className="form-status">
              {status}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

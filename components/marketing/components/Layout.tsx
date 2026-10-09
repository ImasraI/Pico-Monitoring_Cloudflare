import { useEffect, useRef, useState, useId, useContext } from "react";
import { Link, NavLink, PublicPathContext } from "../navigation";
import { scanboxProductName } from "../content/scanbox";
import { config } from "../config";
import { navigation } from "../content/navigation";
import { Icon } from "./Icon";

export function Logo() {
  return (
    <Link to="/" className="brand" aria-label="پیکو مانیتورینگ، صفحه خانه">
      {config.logoUrl ? (
        <img
          src={config.logoUrl}
          alt="Pico Monitoring"
          width="190"
          height="48"
        />
      ) : (
        <>
          <span className="brand-mark" dir="ltr">
            PM
            <span />
          </span>
          <span className="brand-name" dir="ltr">
            Pico<span>Monitoring</span>
          </span>
        </>
      )}
    </Link>
  );
}
export function LoginButton() {
  const helpId = useId();
  return config.appUrl ? (
    <a className="login" href={config.appUrl}>
      ورود <Icon name="arrow" size={16} />
    </a>
  ) : (
    <span className="login-holder">
      <button className="login" disabled aria-describedby={helpId}>
        ورود <Icon name="lock" size={15} />
      </button>
      <span id={helpId} className="login-help">
        ورود به سامانه در حال آماده‌سازی است
      </span>
    </span>
  );
}
export function Header() {
  const publicPath = useContext(PublicPathContext);
  const onScanboxPage = publicPath === "/scanbox";
  const contactLabel = publicPath === "/evidence" ? "تماس با تیم تخصصی PM" : "درخواست دمو";
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    dialog.current?.close();
  }, [open]);
  const close = () => {
    setOpen(false);
    menuButton.current?.focus();
  };
  return (
    <>
      <a className="skip-link" href="#main">
        رفتن به محتوای اصلی
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="ناوبری اصلی">
            {navigation.map((item) =>
              item.items ? (
                <details
                  className="nav-group"
                  key={item.label}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.currentTarget.open = false;
                      e.currentTarget.querySelector("summary")?.focus();
                    }
                  }}
                >
                  <summary>
                    {item.label}
                    <Icon name="chevron" size={13} />
                  </summary>
                  <div className="nav-dropdown">
                    {item.items.map((sub) => (
                      <NavLink key={sub.to} to={sub.to}>
                        {sub.label}
                        <small>{sub.note}</small>
                      </NavLink>
                    ))}
                  </div>
                </details>
              ) : (
                <NavLink key={item.to} to={item.to!}>
                  {onScanboxPage && item.to === "/scanbox" ? scanboxProductName : item.label}
                </NavLink>
              ),
            )}
          </nav>
          <div className="header-actions">
            <LoginButton />
            <Link className="button small" to="/contact">
              {contactLabel} <Icon name="arrow" size={17} />
            </Link>
            <button
              className="menu-toggle"
              ref={menuButton}
              onClick={() => setOpen(true)}
              aria-label="باز کردن فهرست"
              aria-expanded={open}
              aria-controls="mobile-navigation"
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>
      <dialog
        ref={dialog}
        id="mobile-navigation"
        aria-label="فهرست صفحات پیکو مانیتورینگ"
        className="mobile-dialog"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="mobile-panel">
          <div className="mobile-top">
            <Logo />
            <button
              onClick={close}
              className="icon-button"
              aria-label="بستن فهرست"
            >
              <Icon name="close" />
            </button>
          </div>
          <nav aria-label="ناوبری موبایل">
            {navigation.map((item) =>
              item.items ? (
                <details key={item.label}>
                  <summary>
                    {item.label}
                    <Icon name="chevron" size={18} />
                  </summary>
                  {item.items.map((sub) => (
                    <NavLink to={sub.to} key={sub.to}>
                      {sub.label}
                    </NavLink>
                  ))}
                </details>
              ) : (
                <NavLink key={item.to} to={item.to!}>
                  {onScanboxPage && item.to === "/scanbox" ? scanboxProductName : item.label}
                </NavLink>
              ),
            )}
            <NavLink to="/contact">تماس و شروع همکاری</NavLink>
          </nav>
          <div className="mobile-bottom">
            <Link className="button" to="/contact">
              {contactLabel} <Icon name="arrow" />
            </Link>
            <LoginButton />
          </div>
        </div>
      </dialog>
    </>
  );
}
export function Footer() {
  const publicPath = useContext(PublicPathContext);
  const onScanboxPage = publicPath === "/scanbox";
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>
            پایش ارتودنسی از راه دور،
            <br />
            با محوریت ارتودنتیست.
          </p>
          <Link className="text-link" to="/contact">
            شروع همکاری <Icon name="arrow" size={19} />
          </Link>
        </div>
        <div>
          <h2>راهکارها</h2>
          <Link to="/monitoring">پایش ارتودنسی</Link>
          <Link to="/aligners">الاینر</Link>
          <Link to="/braces">براکت</Link>
          <Link to="/scanbox">{onScanboxPage ? scanboxProductName : "PM ScanBox"}</Link>
        </div>
        <div>
          <h2>برای شما</h2>
          <Link to="/orthodontists">ارتودنتیست‌ها</Link>
          <Link to="/clinics">کلینیک‌ها و مطب‌ها</Link>
          <Link to="/patients">بیماران و خانواده‌ها</Link>
          <LoginButton />
        </div>
        <div>
          <h2>بیشتر بدانید</h2>
          <Link to="/evidence">شواهد و پژوهش</Link>
          <Link to="/resources">منابع</Link>
          <Link to="/articles">مقالات و راهنماها</Link>
          <Link to="/faq">پرسش‌های متداول</Link>
        </div>
        <div>
          <h2>در ارتباط باشیم</h2>
          <Link to="/contact">{publicPath === "/evidence" ? "تماس با تیم تخصصی PM" : "تماس و درخواست دمو"}</Link>
          {config.phones.map((phone) => (
            <a
              className="footer-phone"
              key={phone}
              href={`tel:${phone}`}
              dir="ltr"
            >
              {phone}
            </a>
          ))}
          <span className="footer-contact-note">
            آشنایی با PM و بررسی همکاری
          </span>
        </div>
      </div>
      <div className="container footer-base">
        <span>
          ©{" "}
          {new Date()
            .getFullYear()
            .toLocaleString("fa-IR", { useGrouping: false })}{" "}
          پیکو مانیتورینگ
        </span>
        <span>پایش مکمل مراقبت حضوری است. تصمیم درمانی با ارتودنتیست است.</span>
        <span dir="ltr">PICO MONITORING</span>
      </div>
    </footer>
  );
}

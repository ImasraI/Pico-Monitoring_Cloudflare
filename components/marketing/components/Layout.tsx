import { useEffect, useRef, useState, useId, useContext } from "react";
import { Link, NavLink, PublicPathContext } from "../navigation";
import { config } from "../config";
import { navigation, solutions } from "../content/navigation";
import { Icon } from "./Icon";
import { ThemeToggle } from "./Motion";

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
function DesktopNavGroup({ item }: { item: { label: string; hover?: boolean; items: { label: string; to: string; note: string }[] } }) {
  const group = useRef<HTMLDetailsElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => { if (timer.current) clearTimeout(timer.current); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <details ref={group} className="nav-group"
    onPointerEnter={e => {
      if (!item.hover || e.pointerType !== "mouse") return;
      clearTimer();
      timer.current = setTimeout(() => { if (group.current) group.current.open = true; }, 100);
    }}
    onPointerLeave={e => {
      if (!item.hover || e.pointerType !== "mouse") return;
      clearTimer();
      timer.current = setTimeout(() => {
        if (group.current && !group.current.matches(":hover") && !group.current.querySelector(":focus-visible")) group.current.open = false;
      }, 180);
    }}
    onBlur={e => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !(item.hover && e.currentTarget.matches(":hover"))) {
        clearTimer(); e.currentTarget.open = false;
      }
    }}
    onKeyDown={e => {
      if (e.key === "Escape") {
        e.preventDefault(); clearTimer(); e.currentTarget.open = false;
        e.currentTarget.querySelector("summary")?.focus();
      }
    }}>
    <summary>{item.label}<Icon name="chevron" size={13}/></summary>
    <div className="nav-dropdown" onPointerEnter={e => {
      if (item.hover && e.pointerType === "mouse") clearTimer();
    }}>{item.items.map(sub=><NavLink key={sub.to} to={sub.to}>
      {sub.label}<small>{sub.note}</small>
    </NavLink>)}</div>
  </details>;
}
export function Header() {
  const publicPath = useContext(PublicPathContext);
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
                <DesktopNavGroup key={item.label} item={item}/>
              ) : (
                <NavLink key={item.to} to={item.to!}>
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <LoginButton />
            <Link className="button small" to="/contact" data-magnetic>
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
        className="mobile-dialog"
        aria-label="فهرست صفحات پیکو مانیتورینگ"
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
            <ThemeToggle />
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
                  {item.label}
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
  return (
    <footer className="site-footer">
      <div className="container footer-grid" data-reveal-group="70">
        <div className="footer-brand" data-reveal="up">
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
        <div data-reveal="up">
          <h2>راهکارهای ما</h2>
          {solutions.map(s=><Link key={s.to} to={s.to}>{s.label}</Link>)}
        </div>
        <div data-reveal="up">
          <h2>برای شما</h2>
          <Link to="/orthodontists">ارتودنتیست‌ها</Link>
          <Link to="/clinics">کلینیک‌ها و مطب‌ها</Link>
          <Link to="/patients">بیماران و خانواده‌ها</Link>
          <LoginButton />
        </div>
        <div data-reveal="up">
          <h2>بیشتر بدانید</h2>
          <Link to="/evidence">شواهد و پژوهش‌ها</Link>
          <Link to="/privacy">امنیت و حریم خصوصی</Link>
          <Link to="/faq">پرسش‌های متداول</Link>
        </div>
        <div data-reveal="up">
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

import { useId } from "react";
import { assets } from "../content";
import { Icon } from "./Icon";

function Teeth({ braces = false }: { braces?: boolean }) {
  return (
    <svg viewBox="0 0 380 230" aria-hidden="true">
      <path
        d="M48 64c-10 84 31 133 142 137 111-4 152-53 142-137"
        fill="none"
        stroke="#a8d7d9"
        strokeWidth="23"
      />
      {Array.from({ length: 10 }, (_, i) => {
        const x = 59 + i * 28;
        const y = 81 + Math.sin((i / 9) * Math.PI) * 48;
        return (
          <g
            key={i}
            transform={`translate(${x} ${y}) rotate(${(i - 4.5) * -7})`}
          >
            <rect
              x="-10"
              y="-28"
              width="25"
              height="45"
              rx="9"
              fill="#fff"
              stroke="#d3e4e4"
              strokeWidth="1.5"
            />
            {braces && (
              <rect
                x="-2"
                y="-9"
                width="10"
                height="10"
                rx="2"
                fill="#80a9af"
              />
            )}
          </g>
        );
      })}
      {braces && (
        <path
          d="M54 73c60 85 206 84 271 0"
          fill="none"
          stroke="#517c85"
          strokeWidth="3"
        />
      )}
      {!braces && (
        <path
          d="M50 71c1 75 49 119 140 120 91-1 139-45 140-120"
          fill="none"
          stroke="#67c6cc"
          strokeWidth="7"
          opacity=".6"
        />
      )}
    </svg>
  );
}
function ScanboxArt() {
  const id = useId().replaceAll(":", "");
  return (
    <svg className="scanbox-art" viewBox="0 0 620 520" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-box`} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#c7e0df" />
        </linearGradient>
        <linearGradient id={`${id}-edge`}>
          <stop stopColor="#7eacad" />
          <stop offset="1" stopColor="#e7f4f1" />
        </linearGradient>
        <filter
          id={`${id}-shadow`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="13" />
        </filter>
      </defs>
      <ellipse
        cx="330"
        cy="437"
        rx="196"
        ry="22"
        fill="#135b61"
        opacity=".12"
        filter={`url(#${id}-shadow)`}
      />
      <g transform="translate(75 62) rotate(-13 240 210)">
        <rect x="223" y="22" width="162" height="323" rx="28" fill="#17444d" />
        <rect x="229" y="27" width="150" height="310" rx="24" fill="#eef7f4" />
        <rect x="273" y="35" width="61" height="10" rx="5" fill="#17444d" />
        <circle cx="306" cy="89" r="19" fill="#d0edeb" />
        <path
          d="m298 89 5 5 10-11"
          fill="none"
          stroke="#009fa8"
          strokeWidth="3"
        />
        <rect x="251" y="122" width="109" height="68" rx="5" fill="#cde5e3" />
        <path
          d="M263 150c10 30 73 30 85 0"
          fill="none"
          stroke="#fff"
          strokeWidth="13"
        />
        <rect x="251" y="206" width="73" height="4" rx="2" fill="#819a9e" />
        <rect x="251" y="217" width="106" height="3" rx="1.5" fill="#c4d7d8" />
        <rect x="251" y="238" width="106" height="25" rx="4" fill="#009fa8" />
        <path d="m299 251 5 4 8-9" stroke="#fff" strokeWidth="2" fill="none" />
        <path
          d="M110 255c11-31 56-44 105-35l98 19c34 7 50 34 46 62l-6 54c-2 27-26 47-54 43l-134-23c-38-7-65-42-64-78Z"
          fill={`url(#${id}-box)`}
          stroke="#bfd8d7"
        />
        <path
          d="M125 255c-25 5-39 23-36 53l3 22c3 25 17 41 44 39 31-3 46-33 39-64-6-32-24-55-50-50Z"
          fill={`url(#${id}-edge)`}
        />
        <ellipse
          cx="127"
          cy="313"
          rx="29"
          ry="48"
          fill="#17444d"
          transform="rotate(-9 127 313)"
        />
        <ellipse
          cx="130"
          cy="313"
          rx="21"
          ry="37"
          fill="#336773"
          transform="rotate(-9 130 313)"
        />
        <path
          d="M244 281c24 6 44 7 60 7"
          stroke="#fff"
          strokeWidth="4"
          opacity=".8"
        />
        <text
          x="227"
          y="334"
          fill="#307c81"
          fontSize="23"
          fontFamily="sans-serif"
          fontWeight="700"
        >
          PM
        </text>
        <rect x="211" y="254" width="175" height="22" rx="7" fill="#c7dedd" />
        <rect x="215" y="252" width="174" height="12" rx="6" fill="#eef7f4" />
      </g>
    </svg>
  );
}
function ClinicalArt() {
  return (
    <div className="clinical-frame">
      <div className="frame-top">
        <span className="mini-brand" dir="ltr">
          PM <small>Monitoring</small>
        </span>
        <span className="frame-dots">● ● ●</span>
      </div>
      <div className="clinical-body">
        <div className="clinical-side">
          <span>مسیر پایش</span>
          <div className="skeleton active" />
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton short" />
        </div>
        <div className="clinical-main">
          <div className="clinical-heading">
            <b>مرور تصاویر</b>
            <span>نمای مفهومی</span>
          </div>
          <div className="photo-pair">
            <div>
              <Teeth />
              <small>ثبت پیشین</small>
            </div>
            <div>
              <Teeth braces />
              <small>ثبت جدید</small>
            </div>
          </div>
          <div className="review-row">
            <span className="review-icon">
              <Icon name="eye" size={18} />
            </span>
            <span>
              بررسی توسط ارتودنتیست<small>تصمیم بالینی در اختیار پزشک</small>
            </span>
            <Icon name="arrow" size={18} />
          </div>
          <div className="timeline">
            <i />
            <span />
            <i />
            <span />
            <i />
          </div>
        </div>
      </div>
    </div>
  );
}
function PatientArt() {
  return (
    <div className="patient-art">
      <div className="patient-ring" />
      <div className="concept-phone">
        <div className="phone-notch" />
        <div className="phone-head">
          <span dir="ltr">PM</span>
          <Icon name="message" size={20} />
        </div>
        <p>در ارتباط با درمان</p>
        <div className="phone-teeth">
          <Teeth />
        </div>
        <b>مسیر ثبت تصاویر</b>
        <div className="phone-steps">
          <span>
            <Icon name="check" size={15} /> آموزش مطب
          </span>
          <span>
            <Icon name="camera" size={15} /> ثبت تصویر
          </span>
          <span>
            <Icon name="eye" size={15} /> بررسی پزشک
          </span>
        </div>
        <div className="phone-button">پیگیری طبق برنامه پزشک</div>
      </div>
      <div className="patient-note">
        <Icon name="message" />
        <span>
          راهنمایی در زمان نیاز<small>با نظر ارتودنتیست</small>
        </span>
      </div>
    </div>
  );
}
function WorkflowArt({ research = false }: { research?: boolean }) {
  return (
    <div className="workflow-art">
      <div className="paper-art">
        <div className="paper-logo" dir="ltr">
          PM<span>{research ? "RESEARCH" : "CONNECTED CARE"}</span>
        </div>
        <Icon name={research ? "research" : "camera"} size={55} />
        <div className="paper-line" />
        <div className="paper-line short" />
        <div className="paper-grid">
          <Icon name="camera" />
          <Icon name="eye" />
          <Icon name="check" />
        </div>
        <p>{research ? "منبع · روش · محدودیت" : "تصویر · بررسی · تصمیم"}</p>
      </div>
      <div className="workflow-stamp">
        <Icon name={research ? "book" : "eye"} size={26} />
        <span>{research ? "نگاه مبتنی بر شواهد" : "با محوریت ارتودنتیست"}</span>
      </div>
    </div>
  );
}

export function Visual({
  assetId,
  className = "",
  compact = false,
}: {
  assetId: string;
  className?: string;
  compact?: boolean;
}) {
  const asset = assets.find((a) => a.id === assetId);
  const src = asset?.src;
  if (src)
    return (
      <figure className={`visual supplied ${className}`}>
        <img
          src={src}
          alt={asset.alt}
          loading={compact ? "lazy" : "eager"}
          decoding="async"
          width="1200"
          height="960"
        />
      </figure>
    );
  const scan = assetId.includes("SCANBOX") || assetId.includes("HOME-HERO");
  const clinical = assetId.includes("CLINICAL");
  const patient = assetId.includes("PATIENT");
  const teeth =
    assetId.includes("ALIGNER") ||
    assetId.includes("BRACES") ||
    assetId.includes("TREATMENT");
  return (
    <figure
      className={`visual ${compact ? "compact" : ""} ${scan ? "device-visual" : ""} ${className}`}
      role="img"
      aria-label={asset?.alt || "تصویر مفهومی پایش ارتودنسی"}
    >
      <div className="visual-orbit orbit-one" />
      <div className="visual-orbit orbit-two" />
      {scan ? (
        <ScanboxArt />
      ) : clinical ? (
        <ClinicalArt />
      ) : patient ? (
        <PatientArt />
      ) : teeth ? (
        <div className="teeth-art">
          <Teeth braces={assetId.includes("BRACES")} />
          <span dir="ltr">
            {assetId.includes("BRACES") ? "BRACES" : "ALIGNERS"}
          </span>
        </div>
      ) : (
        <WorkflowArt research={assetId.includes("RESEARCH")} />
      )}
      {!compact && (
        <figcaption>
          {clinical || patient
            ? "نمای مفهومی تجربه محصول"
            : scan
              ? "نمای شماتیک؛ تصویر واقعی محصول نیست"
              : "تصویر مفهومی"}
        </figcaption>
      )}
    </figure>
  );
}
export function AssetPlaceholder({ assetId }: { assetId: string }) {
  const asset = assets.find((a) => a.id === assetId);
  return (
    <figure className="asset-placeholder" data-asset-id={assetId}>
      {asset?.src ? (
        <img src={asset.src} alt={asset.alt} loading="lazy" />
      ) : (
        <>
          <Icon name="camera" size={36} />
          <p>
            {asset?.alt
              .replace("جایگاه تصویر ", "")
              .replace("جایگاه تصاویر ", "")}
          </p>
          <small>تصویر تأییدشده محصول به‌زودی جایگزین می‌شود</small>
        </>
      )}
    </figure>
  );
}

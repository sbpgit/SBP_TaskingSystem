import { useState } from 'react';
import { APP_NAME, COMPANY_NAME, LOGO_FALLBACK_TEXT, LOGO_SRC } from '../branding.js';

export function Logo({ size = 32 }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="logo-fallback" style={{ height: size, minWidth: size, fontSize: size * 0.38 }} aria-label={COMPANY_NAME}>
        {LOGO_FALLBACK_TEXT}
      </span>
    );
  }
  return <img src={LOGO_SRC} alt={COMPANY_NAME} className="logo-img" style={{ height: size }} onError={() => setFailed(true)} />;
}

// Logo + app name. `stacked` is the large version used on the login/sign-up pages.
export default function Brand({ stacked }) {
  if (stacked) {
    return (
      <div className="brand brand-stacked">
        <Logo size={76} />
        <div className="brand-name">{APP_NAME}</div>
        <div className="brand-company muted small">{COMPANY_NAME}</div>
      </div>
    );
  }
  return (
    <span className="brand">
      <Logo size={38} />
      <span className="brand-name">{APP_NAME}</span>
    </span>
  );
}

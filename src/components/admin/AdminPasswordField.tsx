"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

export function AdminPasswordField({ label, value, onChange, autoComplete }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return <div className="admin-password-field">
    <label htmlFor={id} className="block text-sm font-medium text-[var(--admin-text)]">{label}</label>
    <div className="admin-password-input-wrap">
      <input id={id} className="admin-field" type={visible ? "text" : "password"} minLength={8} autoComplete={autoComplete} required value={value} onChange={(event) => onChange(event.target.value)} />
      <button type="button" className="admin-password-toggle" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible((current) => !current)}>
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  </div>;
}

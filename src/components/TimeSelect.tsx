"use client";

import React from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  step?: number; // minutes
  className?: string;
  hour12?: boolean; // show 12-hour or 24-hour format (default 24h)
  locale?: string;
};

export default function TimeSelect({ value, onChange, step = 30, className = "", hour12 = false, locale }: Props) {
  const times: { val: string; label: string }[] = [];
  for (let m = 0; m < 24 * 60; m += step) {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    const val = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    const date = new Date();
    date.setHours(hh, mm, 0, 0);
    const label = date.toLocaleTimeString(locale ? [locale] : undefined, { hour: "2-digit", minute: "2-digit", hour12 });
    times.push({ val, label });
  }

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {times.map((t) => (
        <option key={t.val} value={t.val}>{t.label}</option>
      ))}
    </select>
  );
}

"use client";

import { clsx } from "@/lib/clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("rounded border bg-white p-4 shadow-sm", className)}>{children}</div>;
}

export function Badge({ tone="gray", children }: { tone?: "green"|"orange"|"gray"|"blue"; children: React.ReactNode }) {
  const map = {
    green: "bg-green-100 text-green-800 border-green-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
  } as const;
  return <span className={clsx("inline-flex items-center rounded border px-2 py-0.5 text-xs", map[tone])}>{children}</span>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx("w-full rounded border px-3 py-2 outline-none focus:ring", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx("w-full rounded border px-3 py-2 outline-none focus:ring", props.className)} />;
}

export function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={clsx("rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 disabled:opacity-50", className)} />;
}

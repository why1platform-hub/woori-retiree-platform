"use client";

import { clsx } from "@/lib/clsx";
import { useEffect, useState, useCallback } from "react";

// Toast notification system
interface ToastMessage {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let toastId = 0;
let toastListeners: ((toasts: ToastMessage[]) => void)[] = [];
let currentToasts: ToastMessage[] = [];

export function showToast(message: string, type: "success" | "error" | "info" = "success") {
  const id = ++toastId;
  const newToast: ToastMessage = { id, message, type };
  currentToasts = [...currentToasts, newToast];
  toastListeners.forEach(listener => listener(currentToasts));

  // Auto-remove after 4 seconds
  setTimeout(() => {
    currentToasts = currentToasts.filter(t => t.id !== id);
    toastListeners.forEach(listener => listener(currentToasts));
  }, 4000);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter(l => l !== setToasts);
    };
  }, []);

  const removeToast = useCallback((id: number) => {
    currentToasts = currentToasts.filter(t => t.id !== id);
    toastListeners.forEach(listener => listener(currentToasts));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={clsx(
            "flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg min-w-[300px] max-w-md animate-slide-in",
            toast.type === "success" && "bg-green-600 text-white",
            toast.type === "error" && "bg-red-600 text-white",
            toast.type === "info" && "bg-blue-600 text-white"
          )}
        >
          {toast.type === "success" && (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast.type === "error" && (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.type === "info" && (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="text-white/80 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

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

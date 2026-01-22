"use client";

import { useState, useEffect, useRef } from "react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  startLabel?: string;
  endLabel?: string;
  locale?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = "Start Date",
  endLabel = "Finish Date",
  locale = "en",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const [viewMonth, setViewMonth] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDateStr = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isInRange = (dateStr: string) => {
    if (!startDate || !endDate) return false;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const isHoverRange = (dateStr: string) => {
    if (!startDate || !hoverDate || selecting !== "end") return false;
    const min = startDate < hoverDate ? startDate : hoverDate;
    const max = startDate > hoverDate ? startDate : hoverDate;
    return dateStr >= min && dateStr <= max;
  };

  const handleDateClick = (dateStr: string) => {
    if (selecting === "start") {
      onStartDateChange(dateStr);
      if (endDate && dateStr > endDate) {
        onEndDateChange("");
      }
      setSelecting("end");
    } else {
      if (dateStr < startDate) {
        onStartDateChange(dateStr);
        onEndDateChange(startDate);
      } else {
        onEndDateChange(dateStr);
      }
      setIsOpen(false);
      setSelecting("start");
    }
  };

  const renderMonth = (monthOffset: number) => {
    const d = new Date(viewMonth);
    d.setMonth(d.getMonth() + monthOffset);
    const year = d.getFullYear();
    const month = d.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = formatDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    const dayNames = locale === "ko"
      ? ["일", "월", "화", "수", "목", "금", "토"]
      : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    const monthName = d.toLocaleDateString(locale, { year: "numeric", month: "long" });

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div className="flex-1 min-w-[280px]">
        <div className="text-center font-semibold mb-2 text-gray-800">{monthName}</div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map((name, i) => (
            <div key={i} className="text-center text-xs text-gray-500 font-medium py-1">
              {name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (day === null) {
              return <div key={i} className="h-9" />;
            }
            const dateStr = formatDateStr(year, month, day);
            const isStart = dateStr === startDate;
            const isEnd = dateStr === endDate;
            const inRange = isInRange(dateStr);
            const inHoverRange = isHoverRange(dateStr);
            const isPast = dateStr < today;

            return (
              <button
                key={i}
                type="button"
                disabled={isPast}
                onClick={() => handleDateClick(dateStr)}
                onMouseEnter={() => setHoverDate(dateStr)}
                onMouseLeave={() => setHoverDate(null)}
                className={`
                  h-9 w-full rounded-md text-sm font-medium transition-all
                  ${isPast ? "text-gray-300 cursor-not-allowed" : "hover:bg-blue-100 cursor-pointer"}
                  ${isStart || isEnd ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                  ${inRange && !isStart && !isEnd ? "bg-blue-100 text-blue-800" : ""}
                  ${inHoverRange && !inRange && !isStart ? "bg-blue-50" : ""}
                  ${dateStr === today && !isStart && !isEnd ? "border-2 border-blue-400" : ""}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Display Fields */}
      <div className="flex gap-2">
        <div
          onClick={() => { setIsOpen(true); setSelecting("start"); }}
          className={`flex-1 border rounded-lg p-3 cursor-pointer transition-all ${
            isOpen && selecting === "start" ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <div className="text-xs text-gray-500 mb-1">{startLabel}</div>
          <div className="font-medium text-gray-800">{formatDisplayDate(startDate)}</div>
        </div>

        <div className="flex items-center text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>

        <div
          onClick={() => { setIsOpen(true); setSelecting("end"); }}
          className={`flex-1 border rounded-lg p-3 cursor-pointer transition-all ${
            isOpen && selecting === "end" ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <div className="text-xs text-gray-500 mb-1">{endLabel}</div>
          <div className="font-medium text-gray-800">{formatDisplayDate(endDate)}</div>
        </div>
      </div>

      {/* Calendar Popup */}
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white border rounded-xl shadow-xl p-4 left-0 right-0 min-w-[600px]">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(viewMonth.setMonth(viewMonth.getMonth() - 1)))}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-sm text-gray-600">
              {selecting === "start"
                ? (locale === "ko" ? "시작 날짜를 선택하세요" : "Select start date")
                : (locale === "ko" ? "종료 날짜를 선택하세요" : "Select end date")
              }
            </div>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(viewMonth.setMonth(viewMonth.getMonth() + 1)))}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Two Month Calendar */}
          <div className="flex gap-6">
            {renderMonth(0)}
            {renderMonth(1)}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                onStartDateChange(formatDateStr(today.getFullYear(), today.getMonth(), today.getDate()));
                onEndDateChange(formatDateStr(today.getFullYear(), today.getMonth(), today.getDate()));
                setIsOpen(false);
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {locale === "ko" ? "오늘" : "Today"}
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const nextWeek = new Date(today);
                nextWeek.setDate(nextWeek.getDate() + 7);
                onStartDateChange(formatDateStr(today.getFullYear(), today.getMonth(), today.getDate()));
                onEndDateChange(formatDateStr(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate()));
                setIsOpen(false);
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {locale === "ko" ? "이번 주" : "This Week"}
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const nextMonth = new Date(today);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                onStartDateChange(formatDateStr(today.getFullYear(), today.getMonth(), today.getDate()));
                onEndDateChange(formatDateStr(nextMonth.getFullYear(), nextMonth.getMonth(), nextMonth.getDate()));
                setIsOpen(false);
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {locale === "ko" ? "1개월" : "1 Month"}
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => { onStartDateChange(""); onEndDateChange(""); }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              {locale === "ko" ? "초기화" : "Clear"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

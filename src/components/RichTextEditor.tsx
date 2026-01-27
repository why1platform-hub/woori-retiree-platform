"use client";

import { useRef, useState, useCallback } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  locale?: string;
}

export function RichTextEditor({ value, onChange, placeholder, rows = 4, locale = "en" }: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    bold: locale === "ko" ? "굵게" : "Bold",
    italic: locale === "ko" ? "기울임" : "Italic",
    underline: locale === "ko" ? "밑줄" : "Underline",
    alignLeft: locale === "ko" ? "왼쪽" : "Left",
    alignCenter: locale === "ko" ? "가운데" : "Center",
    alignRight: locale === "ko" ? "오른쪽" : "Right",
    insertImage: locale === "ko" ? "이미지" : "Image",
    insertLink: locale === "ko" ? "링크" : "Link",
    html: "HTML",
    visual: locale === "ko" ? "편집" : "Visual",
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    syncContent();
  };

  const syncContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await insertImage(file);
        }
        return;
      }
    }
  }, []);

  const insertImage = async (file: File) => {
    // Convert to base64 for inline embedding
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64 && editorRef.current) {
        const img = `<img src="${base64}" style="max-width: 100%; height: auto; margin: 8px 0;" />`;
        document.execCommand("insertHTML", false, img);
        syncContent();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await insertImage(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const insertLink = () => {
    const url = prompt(locale === "ko" ? "URL을 입력하세요:" : "Enter URL:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const toggleHtmlMode = () => {
    if (isHtmlMode && editorRef.current) {
      // Switching from HTML to Visual - update editor content
      editorRef.current.innerHTML = value;
    }
    setIsHtmlMode(!isHtmlMode);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b">
        {/* Text formatting */}
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="px-2 py-1 text-sm font-bold hover:bg-gray-200 rounded"
          title={t.bold}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="px-2 py-1 text-sm italic hover:bg-gray-200 rounded"
          title={t.italic}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="px-2 py-1 text-sm underline hover:bg-gray-200 rounded"
          title={t.underline}
        >
          U
        </button>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => execCommand("justifyLeft")}
          className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
          title={t.alignLeft}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 4.5A.5.5 0 012.5 4h15a.5.5 0 010 1h-15A.5.5 0 012 4.5zm0 4A.5.5 0 012.5 8h10a.5.5 0 010 1h-10A.5.5 0 012 8.5zm0 4a.5.5 0 01.5-.5h15a.5.5 0 010 1h-15a.5.5 0 01-.5-.5zm0 4a.5.5 0 01.5-.5h8a.5.5 0 010 1h-8a.5.5 0 01-.5-.5z"/>
          </svg>
        </button>
        <button
          type="button"
          onClick={() => execCommand("justifyCenter")}
          className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
          title={t.alignCenter}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4.5A.5.5 0 014.5 4h11a.5.5 0 010 1h-11A.5.5 0 014 4.5zm-2 4A.5.5 0 012.5 8h15a.5.5 0 010 1h-15A.5.5 0 012 8.5zm2 4a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5zm-2 4a.5.5 0 01.5-.5h15a.5.5 0 010 1h-15a.5.5 0 01-.5-.5z"/>
          </svg>
        </button>
        <button
          type="button"
          onClick={() => execCommand("justifyRight")}
          className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
          title={t.alignRight}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 4.5A.5.5 0 012.5 4h15a.5.5 0 010 1h-15A.5.5 0 012 4.5zm5 4A.5.5 0 017.5 8h10a.5.5 0 010 1h-10A.5.5 0 017 8.5zm-5 4a.5.5 0 01.5-.5h15a.5.5 0 010 1h-15a.5.5 0 01-.5-.5zm7 4a.5.5 0 01.5-.5h8a.5.5 0 010 1h-8a.5.5 0 01-.5-.5z"/>
          </svg>
        </button>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        {/* Insert options */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1 text-sm hover:bg-gray-200 rounded flex items-center gap-1"
          title={t.insertImage}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={insertLink}
          className="px-2 py-1 text-sm hover:bg-gray-200 rounded flex items-center gap-1"
          title={t.insertLink}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* HTML Toggle */}
        <button
          type="button"
          onClick={toggleHtmlMode}
          className={`px-3 py-1 text-sm rounded ${isHtmlMode ? "bg-blue-600 text-white" : "hover:bg-gray-200"}`}
        >
          {isHtmlMode ? t.visual : t.html}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Editor area */}
      {isHtmlMode ? (
        <textarea
          value={value}
          onChange={handleHtmlChange}
          placeholder={placeholder}
          rows={rows}
          className="w-full p-3 font-mono text-sm focus:outline-none resize-none"
          style={{ minHeight: `${rows * 1.5}rem` }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={syncContent}
          onPaste={handlePaste}
          onBlur={syncContent}
          dangerouslySetInnerHTML={{ __html: value }}
          className="w-full p-3 focus:outline-none min-h-[100px] prose prose-sm max-w-none"
          style={{ minHeight: `${rows * 1.5}rem` }}
          data-placeholder={placeholder}
        />
      )}

      {/* Hint */}
      <div className="px-3 py-1 text-xs text-gray-400 bg-gray-50 border-t">
        {locale === "ko" ? "Ctrl+V로 이미지 붙여넣기 가능" : "Paste images with Ctrl+V"}
      </div>
    </div>
  );
}

export default RichTextEditor;

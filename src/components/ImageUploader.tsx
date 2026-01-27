"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface ImageUploaderProps {
  value: string;
  onChange: (value: string) => void;
  locale?: string;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function ImageUploader({
  value,
  onChange,
  locale = "en",
  className = "",
  maxWidth = 800,
  maxHeight = 600,
  quality = 0.85,
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const t = {
    dropHere: locale === "ko" ? "이미지를 드롭하세요" : "Drop image here",
    orPaste: locale === "ko" ? "또는 Ctrl+V로 붙여넣기" : "or Ctrl+V to paste",
    orClick: locale === "ko" ? "또는 클릭하여 선택" : "or click to browse",
    upload: locale === "ko" ? "이미지 업로드" : "Upload Image",
    change: locale === "ko" ? "변경" : "Change",
    remove: locale === "ko" ? "삭제" : "Remove",
    browse: locale === "ko" ? "파일 찾기" : "Browse Files",
    dragDrop: locale === "ko" ? "드래그/드롭 또는 붙여넣기" : "Drag/drop or paste",
    maxSize: locale === "ko" ? "최대 5MB" : "Max 5MB",
    noImage: locale === "ko" ? "이미지 없음" : "No image",
  };

  // Optimize image: resize and convert to WebP/JPEG
  const optimizeImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Scale down if necessary
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
              } else {
                resolve(file);
              }
            },
            "image/webp",
            quality
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(locale === "ko" ? "이미지 크기는 5MB 이하여야 합니다" : "Image size must be less than 5MB");
      return;
    }

    const optimized = await optimizeImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onChange(base64);
      setShowModal(false);
    };
    reader.readAsDataURL(optimized);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  // Paste handler for modal
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (!showModal) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await handleImageFile(file);
            return;
          }
        }
      }
    },
    [showModal]
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  return (
    <div className={className}>
      {/* Preview / Placeholder */}
      <div className="flex items-start gap-4">
        <div
          ref={dropZoneRef}
          onClick={() => setShowModal(true)}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`w-32 h-24 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
            dragActive ? "border-blue-500 bg-blue-50" : value ? "border-gray-300" : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }`}
        >
          {value ? (
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-gray-400 text-xs p-2">
              <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t.noImage}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            {value ? t.change : t.upload}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-4 py-2 bg-red-100 text-red-600 text-sm rounded hover:bg-red-200"
            >
              {t.remove}
            </button>
          )}
          <p className="text-xs text-gray-500">Ctrl+V {locale === "ko" ? "가능" : "supported"}</p>
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">{t.upload}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>

            {/* Drop Zone */}
            <div className="p-6">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative w-full h-48 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
                  dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-blue-400"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                {dragActive && (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(59,130,246,0.1) 10px, rgba(59,130,246,0.1) 20px)",
                    }}
                  />
                )}
                <div className="text-center relative z-10">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-700 font-medium mb-1">{t.dropHere}</p>
                  <p className="text-sm text-gray-500 mb-3">{t.dragDrop} (Ctrl+V)</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    {t.browse}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">PNG, JPG, WebP • {t.maxSize}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageUploader;

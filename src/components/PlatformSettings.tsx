"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

interface Settings {
  platformName: {
    en: string;
    ko: string;
  };
  platformLogo: {
    url: string;
    fileName: string;
  };
}

export function PlatformSettingsComponent() {
  const t = useTranslations();
  const locale = useLocale();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [message, setMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Preview state for logo before saving
  const [pendingLogo, setPendingLogo] = useState<{ file: File; previewUrl: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (pendingLogo?.previewUrl) {
        URL.revokeObjectURL(pendingLogo.previewUrl);
      }
    };
  }, [pendingLogo]);

  // Add paste listener for Ctrl+V (only when modal is open)
  useEffect(() => {
    if (!showUploadModal) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleImageFile(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [showUploadModal]);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      setMessage("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (lang: "en" | "ko", value: string) => {
    if (settings) {
      setSettings({
        ...settings,
        platformName: {
          ...settings.platformName,
          [lang]: value,
        },
      });
    }
  };

  const handleSaveName = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformName: settings.platformName,
        }),
      });

      if (res.ok) {
        setMessage(locale === 'ko' ? "플랫폼 이름이 저장되었습니다!" : "Platform name saved!");
        setTimeout(() => {
          setMessage("");
          window.location.reload();
        }, 1000);
      } else {
        setMessage(locale === 'ko' ? "저장 실패" : "Failed to save");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage(locale === 'ko' ? "저장 오류" : "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleImageFile(file);
  };

  const optimizeImage = (file: File, maxDim = 200, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          resolve(new File([blob!], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
        }, 'image/webp', quality);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // This now sets preview instead of uploading immediately
  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage(locale === 'ko' ? "유효한 이미지 파일을 선택하세요" : "Please select a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage(locale === 'ko' ? "이미지 크기는 5MB 이하여야 합니다" : "Image size must be less than 5MB");
      return;
    }

    // Clean up previous preview
    if (pendingLogo?.previewUrl) {
      URL.revokeObjectURL(pendingLogo.previewUrl);
    }

    // Optimize image
    const optimized = await optimizeImage(file);
    const previewUrl = URL.createObjectURL(optimized);

    setPendingLogo({ file: optimized, previewUrl });
    setShowUploadModal(false);
    setMessage(locale === 'ko' ? "로고가 선택되었습니다. 저장 버튼을 눌러 적용하세요." : "Logo selected. Click Save to apply.");

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Save the pending logo
  const handleSaveLogo = async () => {
    if (!pendingLogo) return;

    setSavingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", pendingLogo.file);

      const res = await fetch("/api/admin/settings/logo", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setMessage(locale === 'ko' ? "로고가 저장되었습니다! 페이지를 새로고침합니다..." : "Logo saved! Refreshing page...");
        // Clean up preview
        URL.revokeObjectURL(pendingLogo.previewUrl);
        setPendingLogo(null);
        // Refresh page after short delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage(locale === 'ko' ? "로고 저장 실패" : "Failed to save logo");
      }
    } catch (error) {
      console.error("Error saving logo:", error);
      setMessage(locale === 'ko' ? "로고 저장 오류" : "Error saving logo");
    } finally {
      setSavingLogo(false);
    }
  };

  // Cancel pending logo change
  const handleCancelLogo = () => {
    if (pendingLogo?.previewUrl) {
      URL.revokeObjectURL(pendingLogo.previewUrl);
    }
    setPendingLogo(null);
    setMessage("");
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleImageFile(file);
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm(locale === 'ko' ? "로고를 삭제하시겠습니까?" : "Are you sure you want to delete the logo?")) {
      return;
    }

    setSavingLogo(true);
    try {
      const res = await fetch("/api/admin/settings/logo", {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage(locale === 'ko' ? "로고가 삭제되었습니다! 페이지를 새로고침합니다..." : "Logo deleted! Refreshing page...");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage(locale === 'ko' ? "로고 삭제 실패" : "Failed to delete logo");
      }
    } catch (error) {
      console.error("Error deleting logo:", error);
      setMessage(locale === 'ko' ? "로고 삭제 오류" : "Error deleting logo");
    } finally {
      setSavingLogo(false);
    }
  };

  if (loading) {
    return <div className="p-4">{locale === 'ko' ? '설정 로딩 중...' : 'Loading settings...'}</div>;
  }

  if (!settings) {
    return <div className="p-4">{locale === 'ko' ? '설정을 불러오지 못했습니다' : 'Failed to load settings'}</div>;
  }

  // Determine which logo URL to show (pending preview or current)
  const displayLogoUrl = pendingLogo?.previewUrl || settings.platformLogo?.url;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">{locale === 'ko' ? '플랫폼 설정' : 'Platform Settings'}</h1>

      {message && (
        <div className={`mb-4 p-4 rounded ${message.includes('실패') || message.includes('Failed') || message.includes('오류') || message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
          {message}
        </div>
      )}

      {/* Platform Logo Section */}
      <section className="mb-8 pb-8 border-b">
        <h2 className="text-2xl font-semibold mb-4">{locale === 'ko' ? '플랫폼 로고' : 'Platform Logo'}</h2>
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Logo Preview */}
          <div className="flex-shrink-0">
            <div
              ref={dropZoneRef}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`w-48 h-48 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
                pendingLogo ? "border-green-500 bg-green-50" :
                dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-100 hover:border-gray-400"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {displayLogoUrl ? (
                <img src={displayLogoUrl} alt="Platform Logo" className="w-full h-full object-contain p-4" />
              ) : (
                <div className="text-center text-gray-400 p-4">
                  <p className="font-medium">{locale === 'ko' ? '이미지를 드롭하세요' : 'Drop image here'}</p>
                  <p className="text-sm">{locale === 'ko' ? '또는 클릭하여 선택' : 'or click to browse'}</p>
                </div>
              )}
            </div>
            {pendingLogo && (
              <p className="text-sm text-green-600 mt-2 text-center">{locale === 'ko' ? '새 로고 미리보기' : 'New logo preview'}</p>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1">
            <p className="text-gray-600 mb-4">
              {locale === 'ko' ? '로고 이미지 업로드 (PNG, JPG, SVG 권장, 최대 5MB)' : 'Upload a logo image (PNG, JPG, SVG recommended, max 5MB)'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              disabled={savingLogo}
              className="hidden"
            />
            <div className="space-y-3">
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={savingLogo}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 block"
              >
                {locale === 'ko' ? '로고 선택' : 'Choose Logo'}
              </button>

              {/* Save Logo Button - Only shows when there's a pending logo */}
              {pendingLogo && (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveLogo}
                    disabled={savingLogo}
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {savingLogo ? (locale === 'ko' ? '저장 중...' : 'Saving...') : (locale === 'ko' ? '로고 저장' : 'Save Logo')}
                  </button>
                  <button
                    onClick={handleCancelLogo}
                    disabled={savingLogo}
                    className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400"
                  >
                    {locale === 'ko' ? '취소' : 'Cancel'}
                  </button>
                </div>
              )}

              {settings.platformLogo?.url && !pendingLogo && (
                <button
                  onClick={handleDeleteLogo}
                  disabled={savingLogo}
                  className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 block"
                >
                  {savingLogo ? (locale === 'ko' ? '삭제 중...' : 'Deleting...') : (locale === 'ko' ? '로고 삭제' : 'Delete Logo')}
                </button>
              )}
            </div>
            {settings.platformLogo?.fileName && !pendingLogo && (
              <p className="text-sm text-gray-500 mt-4">
                {locale === 'ko' ? '현재:' : 'Current:'} {settings.platformLogo.fileName}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Platform Name Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">{locale === 'ko' ? '플랫폼 이름' : 'Platform Name'}</h2>
        <div className="space-y-4">
          {/* English Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {locale === 'ko' ? '영어 이름' : 'English Name'}
            </label>
            <input
              type="text"
              value={settings.platformName.en}
              onChange={(e) => handleNameChange("en", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Woori Retiree Platform"
            />
          </div>

          {/* Korean Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {locale === 'ko' ? '한국어 이름' : 'Korean Name (한국어)'}
            </label>
            <input
              type="text"
              value={settings.platformName.ko}
              onChange={(e) => handleNameChange("ko", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="예: 우리 은퇴자 플랫폼"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveName}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {saving ? (locale === 'ko' ? '저장 중...' : 'Saving...') : (locale === 'ko' ? '이름 저장' : 'Save Name')}
          </button>
        </div>
      </section>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">{locale === 'ko' ? '로고 업로드' : 'Upload Logo'}</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative w-full h-64 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
                  dragActive ? "border-blue-500 bg-gray-800" : "border-gray-300 bg-gray-50 hover:border-blue-400"
                }`}
              >
                {dragActive && (
                  <div className="absolute inset-0" style={{
                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)",
                  }} />
                )}

                <div className="text-center relative z-10">
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {locale === 'ko' ? '로고 이미지 업로드' : 'Upload a logo image'}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    {locale === 'ko' ? '드래그/드롭 또는 붙여넣기 (Ctrl+V)' : 'Drag/drop or paste (Ctrl+V)'}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    {locale === 'ko' ? '파일 찾기' : 'Browse Files'}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">
                PNG, JPG, SVG • {locale === 'ko' ? '최대' : 'Max'} 5MB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

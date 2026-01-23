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
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

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
        setMessage("Platform name updated successfully!");
        setTimeout(() => setMessage(""), 3000);
        // Dispatch custom event to notify other components (like Navbar)
        window.dispatchEvent(new CustomEvent('platformSettingsUpdated'));
      } else {
        setMessage("Failed to save platform name");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage("Please select a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      // Optimize: resize to max 200px and convert to WebP
      const optimized = await optimizeImage(file);
      const formData = new FormData();
      formData.append("logo", optimized);

      const res = await fetch("/api/admin/settings/logo", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setSettings({ ...settings!, platformLogo: data.logo });
        setMessage("Logo uploaded successfully!");
        setTimeout(() => setMessage(""), 3000);
        window.dispatchEvent(new CustomEvent('platformSettingsUpdated'));
      } else {
        setMessage("Failed to upload logo");
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      setMessage("Error uploading logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
    if (!confirm("Are you sure you want to delete the platform logo?")) {
      return;
    }

    setUploading(true);
    try {
      const res = await fetch("/api/admin/settings/logo", {
        method: "DELETE",
      });

      if (res.ok) {
        setSettings({
          ...settings!,
          platformLogo: {
            url: "",
            fileName: "",
          },
        });
        setMessage("Logo deleted successfully!");
        setTimeout(() => setMessage(""), 3000);
        // Dispatch custom event to notify other components (like Navbar)
        window.dispatchEvent(new CustomEvent('platformSettingsUpdated'));
      } else {
        setMessage("Failed to delete logo");
      }
    } catch (error) {
      console.error("Error deleting logo:", error);
      setMessage("Error deleting logo");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading settings...</div>;
  }

  if (!settings) {
    return <div className="p-4">Failed to load settings</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">Platform Settings</h1>

      {message && (
        <div className="mb-4 p-4 bg-blue-100 text-blue-700 rounded">
          {message}
        </div>
      )}

      {/* Platform Logo Section */}
      <section className="mb-8 pb-8 border-b">
        <h2 className="text-2xl font-semibold mb-4">Platform Logo</h2>
        <div className="flex items-start gap-8">
          {/* Logo Preview */}
          <div className="flex-shrink-0">
            <div
              ref={dropZoneRef}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`w-48 h-48 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 bg-gray-100 hover:border-gray-400"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {settings.platformLogo?.url ? (
                <img
                  src={settings.platformLogo.url}
                  alt="Platform Logo"
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="text-center text-gray-400 p-4">
                  <p className="font-medium">Drop image here</p>
                  <p className="text-sm">or Ctrl+V to paste</p>
                  <p className="text-sm">or click to browse</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Controls */}
          <div className="flex-1">
            <p className="text-gray-600 mb-4">
              Upload a logo image (PNG, JPG, SVG recommended, max 5MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading}
              className="hidden"
            />
            <div className="space-y-3">
              <button
                onClick={() => setShowUploadModal(true)}
                disabled={uploading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 block"
              >
                {uploading ? "Uploading..." : "Choose Logo"}
              </button>
              {settings.platformLogo?.url && (
                <button
                  onClick={handleDeleteLogo}
                  disabled={uploading}
                  className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 block"
                >
                  {uploading ? "Deleting..." : "Delete Logo"}
                </button>
              )}
              <p className="text-sm text-gray-500">
                💡 Tip: Click the button to open upload dialog
              </p>
            </div>
            {settings.platformLogo?.fileName && (
              <p className="text-sm text-gray-500 mt-4">
                Current: {settings.platformLogo.fileName}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Platform Name Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Platform Name</h2>
        <div className="space-y-4">
          {/* English Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              English Name
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
              Korean Name (한국어)
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
            {saving ? "Saving..." : "Save Platform Name"}
          </button>
        </div>
      </section>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">Upload Platform Logo</h2>
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
                  dragActive
                    ? "border-blue-500 bg-gray-800"
                    : "border-gray-300 bg-gray-50 hover:border-blue-400"
                }`}
              >
                {/* Diagonal lines pattern (45 degrees) */}
                {dragActive && (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)",
                    }}
                  />
                )}

                {/* Content */}
                <div className="text-center relative z-10">
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Upload a logo image...
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    And also drag/drop or paste image here
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 text-sm"
                  >
                    {uploading ? "Uploading..." : "Browse Files"}
                  </button>
                </div>
              </div>

              {/* File Info */}
              <p className="text-xs text-gray-500 mt-4 text-center">
                PNG, JPG, SVG recommended • Max 5MB
              </p>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploading}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
}

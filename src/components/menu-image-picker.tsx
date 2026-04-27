"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function MenuImagePicker({
  inputName,
  label,
  helperText,
  currentImageUrl,
}: {
  inputName: string;
  label: string;
  helperText: string;
  currentImageUrl?: string | null;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl ?? null);
  const [fileName, setFileName] = useState<string>(currentImageUrl ? "Foto saat ini" : "");

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];

    if (!nextFile) {
      setPreviewUrl(currentImageUrl ?? null);
      setFileName(currentImageUrl ? "Foto saat ini" : "");
      return;
    }

    setFileName(nextFile.name);
    const objectUrl = URL.createObjectURL(nextFile);
    setPreviewUrl((previous) => {
      if (previous?.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return objectUrl;
    });
  }

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <label className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
      <span className="mb-3 block font-medium text-stone-800">{label}</span>
      <div className="grid gap-4 md:grid-cols-[132px_minmax(0,1fr)] md:items-center">
        <div
          className={cn(
            "h-32 w-full rounded-[20px] border border-stone-200 bg-gradient-to-br from-orange-100 via-stone-100 to-stone-200 bg-cover bg-center",
            !previewUrl && "flex items-center justify-center text-center text-xs font-medium text-stone-400",
          )}
          style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}
        >
          {!previewUrl ? "Preview foto menu" : null}
        </div>
        <div className="space-y-3">
          <input
            name={inputName}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleChange}
            className="block w-full text-sm text-stone-500"
          />
          <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-stone-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
              File terpilih
            </p>
            <p className="mt-1 text-sm text-stone-700">{fileName || "Belum ada file dipilih"}</p>
            <p className="mt-2 text-xs text-stone-500">{helperText}</p>
          </div>
        </div>
      </div>
    </label>
  );
}

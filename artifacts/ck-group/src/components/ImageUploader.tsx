import React, { useCallback, useRef, useState } from "react";
import { UploadCloud, X, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

interface UploadingItem {
  id: string;
  name: string;
  preview: string;
  status: "uploading" | "done" | "error";
  error?: string;
}

export function ImageUploader({ value, onChange, maxImages = 5 }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<UploadingItem[]>([]);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      return data.url as string;
    } catch {
      return null;
    }
  }, []);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const remaining = maxImages - value.length;
    if (remaining <= 0) return;
    const toUpload = fileArr.slice(0, remaining);

    const newItems: UploadingItem[] = toUpload.map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: f.name,
      preview: URL.createObjectURL(f),
      status: "uploading" as const,
    }));

    setUploading((prev) => [...prev, ...newItems]);

    const results = await Promise.all(
      toUpload.map(async (file, idx) => {
        const url = await uploadFile(file);
        setUploading((prev) =>
          prev.map((item) =>
            item.id === newItems[idx].id
              ? { ...item, status: url ? "done" : "error", error: url ? undefined : "Upload failed" }
              : item
          )
        );
        return url;
      })
    );

    const succeeded = results.filter((u): u is string => u !== null);
    if (succeeded.length > 0) {
      onChange([...value, ...succeeded]);
    }

    setTimeout(() => {
      setUploading((prev) => prev.filter((item) => item.status !== "done"));
      newItems.forEach((item) => URL.revokeObjectURL(item.preview));
    }, 1200);
  }, [value, onChange, maxImages, uploadFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = "";
      }
    },
    [processFiles]
  );

  const removeUrl = useCallback(
    async (url: string) => {
      onChange(value.filter((u) => u !== url));
      const filename = url.split("/").pop();
      if (filename) {
        fetch(`/api/uploads/${filename}`, { method: "DELETE" }).catch(() => {});
      }
    },
    [value, onChange]
  );

  const removeUploading = useCallback((id: string) => {
    setUploading((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const isFull = value.length >= maxImages;
  const hasItems = value.length > 0 || uploading.length > 0;

  return (
    <div className="space-y-3">
      {!isFull && (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg transition-colors cursor-pointer select-none",
            dragging
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/60 hover:bg-muted/40",
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center pointer-events-none">
            <UploadCloud className={cn("h-9 w-9 transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
            <div>
              <p className="text-sm font-medium text-foreground">
                Drop images here, or <span className="text-primary underline underline-offset-2">click to upload</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPEG, PNG, GIF, WEBP — up to 10 MB each · {value.length}/{maxImages} uploaded
              </p>
            </div>
          </div>
        </div>
      )}

      {hasItems && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((url) => (
            <div
              key={url}
              className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
            >
              <img
                src={url}
                alt="Part image"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
              <div className="hidden absolute inset-0 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {uploading.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
            >
              <img
                src={item.preview}
                alt={item.name}
                className="h-full w-full object-cover opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                {item.status === "uploading" && (
                  <Loader2 className="h-7 w-7 text-white animate-spin" />
                )}
                {item.status === "error" && (
                  <div className="text-center px-2">
                    <X className="h-6 w-6 text-red-400 mx-auto" />
                    <p className="text-xs text-red-300 mt-1">Failed</p>
                  </div>
                )}
              </div>
              {item.status === "error" && (
                <button
                  type="button"
                  onClick={() => removeUploading(item.id)}
                  className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isFull && (
        <p className="text-xs text-muted-foreground">
          Maximum of {maxImages} images reached. Remove one to upload another.
        </p>
      )}
    </div>
  );
}

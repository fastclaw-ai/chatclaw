"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Dices, Smile, Upload, X } from "lucide-react";

const MAX_AVATAR_SIZE = 128 * 1024; // 128KB

const DICEBEAR_STYLES = [
  "bottts", "bottts-neutral", "avataaars", "fun-emoji",
  "lorelei", "notionists", "pixel-art", "thumbs",
];

const EMOJI_GROUPS = [
  ["\u{1F600}", "\u{1F602}", "\u{1F923}", "\u{1F60A}", "\u{1F60E}", "\u{1F929}", "\u{1F607}", "\u{1F973}"],
  ["\u{1F680}", "\u{26A1}", "\u{1F525}", "\u{1F4A1}", "\u{2B50}", "\u{1F31F}", "\u{2728}", "\u{1F4AB}"],
  ["\u{1F916}", "\u{1F47E}", "\u{1F3AE}", "\u{1F9E0}", "\u{1F4BB}", "\u{1F6E0}\u{FE0F}", "\u{1F527}", "\u{2699}\u{FE0F}"],
  ["\u{1F431}", "\u{1F436}", "\u{1F98A}", "\u{1F43C}", "\u{1F981}", "\u{1F42F}", "\u{1F43B}", "\u{1F438}"],
  ["\u{1F3E2}", "\u{1F3E0}", "\u{1F3D7}\u{FE0F}", "\u{1F30D}", "\u{1F3AF}", "\u{1F3A8}", "\u{1F4E6}", "\u{1F48E}"],
];

function isImageData(value: string): boolean {
  return value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://");
}

function handleImageUpload(
  file: File,
  onSuccess: (base64: string) => void,
  onError: (msg: string) => void,
) {
  if (!file.type.startsWith("image/")) {
    onError("Please select an image file");
    return;
  }
  if (file.size > MAX_AVATAR_SIZE) {
    onError(`Image must be under ${MAX_AVATAR_SIZE / 1024}KB`);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, size, size);
      const base64 = canvas.toDataURL("image/png");
      onSuccess(base64);
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
}

interface AvatarPickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Shape of the preview and emoji grid items */
  shape?: "circle" | "rounded";
  /** Fallback content when no avatar is set */
  fallback?: React.ReactNode;
  /** Seed for generating random DiceBear avatars */
  seed?: string;
}

export function AvatarPicker({
  label = "Avatar",
  value,
  onChange,
  shape = "circle",
  fallback,
  seed,
}: AvatarPickerProps) {
  const [activePicker, setActivePicker] = useState<"emoji" | "random" | null>(null);
  const [randomSuffix, setRandomSuffix] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function togglePicker(picker: "emoji" | "random") {
    if (activePicker === picker) {
      setActivePicker(null);
    } else {
      setActivePicker(picker);
      if (picker === "random") {
        setRandomSuffix((s) => s + 1);
      }
    }
  }

  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-lg";

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-3 mt-2">
        {/* Preview */}
        <div className="relative group shrink-0">
          <div className={cn(
            "flex h-14 w-14 items-center justify-center text-2xl font-semibold overflow-hidden border bg-muted",
            shapeClass,
          )}>
            {value && isImageData(value) ? (
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : value ? (
              <span className="text-2xl">{value}</span>
            ) : (
              fallback ?? <span className="text-muted-foreground text-sm">?</span>
            )}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setError(""); }}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Buttons + hint */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex gap-2">
            {seed && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => togglePicker("random")}
              >
                <Dices className="h-4 w-4 mr-1.5" />
                Random
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => togglePicker("emoji")}
            >
              <Smile className="h-4 w-4 mr-1.5" />
              Emoji
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(
                    file,
                    (base64) => { onChange(base64); setError(""); setActivePicker(null); },
                    (msg) => setError(msg),
                  );
                }
                e.target.value = "";
              }}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Pick an emoji or upload an image (max 128KB)
          </p>
        </div>
      </div>

      {/* Random avatar grid */}
      {activePicker === "random" && seed && (
        <div className="mt-3 rounded-lg border bg-muted/40 p-3">
          <div className="flex flex-wrap gap-2">
            {DICEBEAR_STYLES.map((style) => {
              const url = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}-${randomSuffix}`;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => { onChange(url); setActivePicker(null); setError(""); }}
                  className={cn(
                    "h-10 w-10 rounded-md overflow-hidden border-2 hover:scale-110 transition-all",
                    value === url ? "border-primary ring-1 ring-primary" : "border-transparent"
                  )}
                >
                  <img src={url} alt={style} className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Emoji grid */}
      {activePicker === "emoji" && (
        <div className="mt-3 rounded-lg border bg-muted/40 p-3">
          <div className="space-y-2">
            {EMOJI_GROUPS.map((row, i) => (
              <div key={i} className="flex gap-1">
                {row.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => { onChange(emoji); setActivePicker(null); setError(""); }}
                    className={cn(
                      "h-9 w-9 rounded-md text-lg flex items-center justify-center hover:bg-background transition-colors",
                      value === emoji && "bg-background ring-2 ring-primary"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarPicker } from "@/components/avatar-picker";
import { cn } from "@/lib/utils";
import { User, Palette, ChevronRight, Monitor, Sun, Moon, X } from "lucide-react";

export interface UserProfile {
  name: string;
  avatar: string;
}

export type ThemeMode = "light" | "dark" | "system";

const PROFILE_KEY = "chatclaw-user-profile";
const THEME_KEY = "chatclaw-theme";

export function loadUserProfile(): UserProfile {
  if (typeof window === "undefined") return { name: "", avatar: "" };
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { name: "", avatar: "" };
}

function saveUserProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem(THEME_KEY) as ThemeMode) || "dark";
}

export function applyTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode);
  if (mode === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", prefersDark);
  } else {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }
}

type Section = "profile" | "appearance";

const sections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
];

const themeOptions: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function isImageData(value: string): boolean {
  return value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://");
}

export function UserProfileDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (profile: UserProfile, theme: ThemeMode) => void;
}) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [activeSection, setActiveSection] = useState<Section>("profile");

  useEffect(() => {
    if (open) {
      const p = loadUserProfile();
      setName(p.name);
      setAvatar(p.avatar);
      setThemeMode(loadThemeMode());
      setActiveSection("profile");
    }
  }, [open]);

  function saveProfile(updates: Partial<{ name: string; avatar: string }>) {
    const profile = { name: (updates.name ?? name).trim(), avatar: updates.avatar ?? avatar };
    saveUserProfile(profile);
    onSave?.(profile, themeMode);
  }

  function handleAvatarChange(newAvatar: string) {
    setAvatar(newAvatar);
    saveProfile({ avatar: newAvatar });
  }

  function handleNameBlur() {
    saveProfile({});
  }

  function handleThemeSelect(mode: ThemeMode) {
    setThemeMode(mode);
    applyTheme(mode);
    const profile = { name: name.trim(), avatar };
    onSave?.(profile, mode);
  }

  const sectionLabel = sections.find((s) => s.id === activeSection)?.label ?? "Profile";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">User Settings</DialogTitle>
        <div className="flex h-[480px]">
          {/* LEFT - Sidebar */}
          <div className="w-[200px] border-r bg-muted/40 flex flex-col">
            {/* User avatar + name */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <div className="shrink-0">
                {avatar && isImageData(avatar) ? (
                  <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover bg-muted" />
                ) : avatar ? (
                  <span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-lg">{avatar}</span>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {(name || "U")[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{name || "User"}</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 p-2 flex-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-background text-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:bg-background/60"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* RIGHT - Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Breadcrumb header */}
            <div className="flex items-center gap-1.5 px-6 py-3 text-sm text-muted-foreground border-b">
              <span>Settings</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{sectionLabel}</span>
              <button
                onClick={() => onOpenChange(false)}
                className="ml-auto rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeSection === "profile" && (
                <div className="space-y-5">
                  <AvatarPicker
                    value={avatar}
                    onChange={handleAvatarChange}
                    shape="circle"
                    seed="user"
                    fallback={
                      <span className="text-sm font-semibold text-muted-foreground">
                        {(name || "U")[0]?.toUpperCase()}
                      </span>
                    }
                  />
                  <div>
                    <Label>Nickname</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={handleNameBlur}
                      placeholder="Your display name"
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              {activeSection === "appearance" && (
                <div className="space-y-5">
                  <div>
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                      Choose the appearance of the application.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {themeOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = themeMode === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleThemeSelect(opt.value)}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                              isSelected
                                ? "border-foreground/30 bg-muted"
                                : "border-border hover:border-foreground/20"
                            )}
                          >
                            <Icon className={cn("h-6 w-6", isSelected ? "text-foreground" : "text-muted-foreground")} />
                            <span className={cn("text-sm font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

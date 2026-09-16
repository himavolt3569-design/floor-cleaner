"use client";
import { createContext, useContext, useMemo } from "react";
import { TRANSLATIONS } from "@/config/translations";
import { applyCopy } from "@/lib/content/copy";
import { useLanguage } from "@/lib/store/language";
const CopyContext = createContext<typeof TRANSLATIONS>(TRANSLATIONS);
export function StoreCopyProvider({ overrides, children }: { overrides?: Record<string,string>; children: React.ReactNode }) {
  const copy = useMemo(() => applyCopy(overrides), [overrides]);
  return <CopyContext.Provider value={copy}>{children}</CopyContext.Provider>;
}
export function useTranslations() { const {lang} = useLanguage(); return useContext(CopyContext)[lang]; }

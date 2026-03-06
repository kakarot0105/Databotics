"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ProfileResponse, ValidateResponse } from "@/lib/api";

interface AppStore {
  hydrated: boolean;
  sessionId: string | null;
  uploadedFile: File | null;
  profile: ProfileResponse | null;
  validation: ValidateResponse | null;
  setSessionId: (id: string | null) => void;
  setUploadedFile: (file: File | null) => void;
  setProfile: (profile: ProfileResponse | null) => void;
  setValidation: (validation: ValidateResponse | null) => void;
}

const AppStoreContext = createContext<AppStore | undefined>(undefined);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [sessionId, setSessionIdRaw] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [validation, setValidation] = useState<ValidateResponse | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("databotics_session_id");
    if (stored) setSessionIdRaw(stored);
    const storedProfile = sessionStorage.getItem("databotics_profile");
    if (storedProfile) {
      try {
        setProfile(JSON.parse(storedProfile));
      } catch {}
    }
    setHydrated(true);
  }, []);

  const setSessionId = (id: string | null) => {
    setSessionIdRaw(id);
    if (id) sessionStorage.setItem("databotics_session_id", id);
    else sessionStorage.removeItem("databotics_session_id");
  };

  const setProfileWrapped = (p: ProfileResponse | null) => {
    setProfile(p);
    if (p) sessionStorage.setItem("databotics_profile", JSON.stringify(p));
    else sessionStorage.removeItem("databotics_profile");
  };

  const value = useMemo(
    () => ({
      hydrated,
      sessionId,
      uploadedFile,
      profile,
      validation,
      setSessionId,
      setUploadedFile,
      setProfile: setProfileWrapped,
      setValidation,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hydrated, sessionId, uploadedFile, profile, validation],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error("useAppStore must be used within AppStoreProvider");
  }
  return context;
}

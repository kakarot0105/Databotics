"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ProfileResponse, ValidateResponse } from "./api";

interface AppStore {
  uploadedFile: File | null;
  profile: ProfileResponse | null;
  validation: ValidateResponse | null;
  setUploadedFile: (file: File | null) => void;
  setProfile: (profile: ProfileResponse | null) => void;
  setValidation: (validation: ValidateResponse | null) => void;
}

const AppStoreContext = createContext<AppStore | undefined>(undefined);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [validation, setValidation] = useState<ValidateResponse | null>(null);

  const value = useMemo(
    () => ({
      uploadedFile,
      profile,
      validation,
      setUploadedFile,
      setProfile,
      setValidation,
    }),
    [uploadedFile, profile, validation],
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

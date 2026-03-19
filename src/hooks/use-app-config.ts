"use client";

import { useState, useEffect, createContext, useContext } from "react";

export interface AppConfig {
  authEnabled: boolean;
  multiCompany: boolean;
}

const defaultConfig: AppConfig = {
  authEnabled: false,
  multiCompany: true,
};

export const AppConfigContext = createContext<AppConfig>(defaultConfig);

export function useAppConfig() {
  return useContext(AppConfigContext);
}

export function useAppConfigLoader(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(() => {});
  }, []);

  return config;
}

import { createContext } from "react";

export type Theme = "dark" | "light" | "system";

export interface RelayMetadata {
  relays: { url: string; read: boolean; write: boolean }[];
  updatedAt: number;
}

export interface AppConfig {
  /** Current theme */
  theme: Theme;
  /** Relay list with read/write permissions per NIP-65 */
  relayMetadata: RelayMetadata;
}

export interface AppContextType {
  /** Current application configuration */
  config: AppConfig;
  /** Update configuration using a callback that receives current config and returns new config */
  updateConfig: (updater: (currentConfig: Partial<AppConfig>) => Partial<AppConfig>) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

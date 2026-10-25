import { createContext, useContext } from 'react';
import type { WorkspaceData } from '../domain/types';

export interface AppContextValue {
  data: WorkspaceData;
  month: string;
  setMonth: (value: string) => void;
  refresh: () => Promise<void>;
  setBusy: (value: boolean) => void;
  busy: boolean;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used within the app context.');
  return value;
}

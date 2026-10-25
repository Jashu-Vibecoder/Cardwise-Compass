import { createContext } from 'react';

export type ToastKind = 'success' | 'error';
export interface ToastMessage { id: number; kind: ToastKind; text: string }
export interface ToastContextValue { notify: (text: string, kind?: ToastKind) => void }

export const ToastContext = createContext<ToastContextValue | null>(null);

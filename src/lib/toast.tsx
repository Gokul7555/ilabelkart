import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

type Kind = 'success' | 'error' | 'info' | 'warning';
interface Toast { id: number; kind: Kind; title: string; msg?: string }

const Ctx = createContext<(kind: Kind, title: string, msg?: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Kind, title: string, msg?: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, kind, title, msg }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4200);
  }, []);
  const Icon = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => {
          const I = Icon[t.kind];
          return (
            <div key={t.id} className={`toast ${t.kind}`}>
              <I size={18} />
              <div>
                <div className="t-title">{t.title}</div>
                {t.msg && <div className="t-msg">{t.msg}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

import { ERROR_REASONS } from '../types';
import type { ErrorReason } from '../types';

interface ErrorReasonSelectorProps {
  value: ErrorReason | undefined;
  onChange: (v: ErrorReason | undefined) => void;
  primaryColor: string;
  accentColor: string;
  /** Layout mais compacto (usado durante a revisão). */
  compact?: boolean;
}

export default function ErrorReasonSelector({ value, onChange, primaryColor, accentColor, compact }: ErrorReasonSelectorProps) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${compact ? '' : 'sm:grid-cols-4'}`}>
      {ERROR_REASONS.map(r => {
        const active = value === r.value;
        return (
          <button
            key={r.value}
            type="button"
            onClick={() => onChange(active ? undefined : r.value)}
            className={`py-2 px-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${active ? 'text-white shadow-md scale-[1.02]' : 'bg-white/60 hover:bg-pink-50'}`}
            style={{ backgroundColor: active ? primaryColor : undefined, color: active ? undefined : accentColor }}
          >
            <span>{r.emoji}</span>
            <span className="truncate">{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}

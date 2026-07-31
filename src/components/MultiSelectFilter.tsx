import { useState, useMemo, KeyboardEvent } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { normalizeTag } from '../types';

interface MultiSelectFilterProps {
  selected: string[];
  setSelected: (v: string[]) => void;
  options: string[];
  primaryColor: string;
  accentColor: string;
  placeholder?: string;
  /** Texto exibido quando não há opções disponíveis. */
  emptyText?: string;
}

/**
 * Campo de filtro com múltipla seleção: text-complete + dropdown.
 * Diferente do TagAutocomplete, aqui só é possível escolher entre opções existentes.
 */
export default function MultiSelectFilter({ selected, setSelected, options, primaryColor, accentColor, placeholder, emptyText }: MultiSelectFilterProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const selectedNorm = useMemo(() => new Set(selected.map(normalizeTag)), [selected]);

  const filtered = useMemo(() => {
    const query = normalizeTag(input);
    return options.filter(o => {
      const n = normalizeTag(o);
      if (selectedNorm.has(n)) return false;
      return !query || n.includes(query);
    });
  }, [options, input, selectedNorm]);

  const add = (value: string) => {
    if (selectedNorm.has(normalizeTag(value))) return;
    setSelected([...selected, value]);
    setInput('');
    setHighlight(0);
  };

  const remove = (value: string) => setSelected(selected.filter(s => s !== value));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) add(filtered[highlight]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Backspace' && input === '' && selected.length > 0) {
      remove(selected[selected.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map(s => (
            <span key={s} className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 text-white" style={{ backgroundColor: primaryColor }}>
              {s}
              <button type="button" onClick={() => remove(s)} className="ml-1 hover:text-rose-200 transition-colors"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setHighlight(0); setOpen(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={selected.length > 0 ? 'Adicionar mais...' : (placeholder || 'Selecione...')}
          className="w-full p-3 pr-10 bg-white/50 border rounded-xl focus:ring-2 outline-none"
          style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
        />
        <button type="button" tabIndex={-1} onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }} className="absolute right-3 top-1/2 -translate-y-1/2">
          <ChevronDown className="w-4 h-4 transition-transform" style={{ color: primaryColor, transform: open ? 'rotate(180deg)' : undefined }} />
        </button>
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-xl border overflow-hidden max-h-56 overflow-y-auto" style={{ borderColor: `${primaryColor}20` }}>
          {filtered.length > 0 ? (
            filtered.map((o, idx) => (
              <button
                key={o}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(o); }}
                onMouseEnter={() => setHighlight(idx)}
                className="w-full text-left px-4 py-2 text-sm transition-colors"
                style={{ backgroundColor: highlight === idx ? `${primaryColor}12` : undefined, color: accentColor }}
              >
                {o}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-400">{emptyText || 'Nenhuma opção disponível'}</div>
          )}
        </div>
      )}
    </div>
  );
}

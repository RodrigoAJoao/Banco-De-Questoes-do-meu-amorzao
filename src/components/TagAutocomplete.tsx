import { useState, useMemo, useRef, KeyboardEvent } from 'react';
import { Tag, X } from 'lucide-react';
import { normalizeTag } from '../types';

interface TagAutocompleteProps {
  /** Tags atualmente selecionadas. */
  tags: string[];
  setTags: (tags: string[]) => void;
  /** Todas as tags já existentes no app (para sugestão). */
  allTags: string[];
  primaryColor: string;
  accentColor: string;
  placeholder?: string;
}

export default function TagAutocomplete({ tags, setTags, allTags, primaryColor, accentColor, placeholder }: TagAutocompleteProps) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedNorm = useMemo(() => new Set(tags.map(normalizeTag)), [tags]);

  // Sugestões: tags existentes que combinam com o texto digitado e ainda não foram selecionadas.
  const suggestions = useMemo(() => {
    const query = normalizeTag(input);
    const seen = new Set<string>();
    const result: string[] = [];
    for (const t of allTags) {
      const n = normalizeTag(t);
      if (!n || selectedNorm.has(n) || seen.has(n)) continue;
      if (query && !n.includes(query)) continue;
      seen.add(n);
      result.push(t);
    }
    return result.slice(0, 8);
  }, [allTags, input, selectedNorm]);

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    if (selectedNorm.has(normalizeTag(value))) {
      setInput('');
      return;
    }
    // Reaproveita a grafia de uma tag existente para evitar duplicatas por caixa.
    const existing = allTags.find(t => normalizeTag(t) === normalizeTag(value));
    setTags([...tags, existing || value]);
    setInput('');
    setHighlight(0);
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Se há sugestões e o usuário navegou até uma, usa-a; senão cria a partir do texto.
      if (input.trim() !== '') {
        addTag(input);
      } else if (suggestions[highlight]) {
        addTag(suggestions[highlight]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const exactExists = allTags.some(t => normalizeTag(t) === normalizeTag(input)) || selectedNorm.has(normalizeTag(input));
  const canCreate = focused && input.trim() !== '' && !exactExists;
  const showDropdown = focused && (suggestions.length > 0 || canCreate);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(t => (
          <span key={t} className="px-3 py-1 bg-white/80 rounded-full text-sm font-medium flex items-center gap-1" style={{ color: primaryColor }}>
            <Tag className="w-3 h-3" /> {t}
            <button type="button" onClick={() => removeTag(t)} className="ml-1 hover:text-rose-500 transition-colors"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => { setInput(e.target.value); setHighlight(0); }}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder || 'Digite para buscar ou criar tag...'}
        className="w-full p-3 bg-white/50 border rounded-xl focus:ring-2 outline-none"
        style={{ borderColor: `${primaryColor}20`, '--tw-ring-color': primaryColor } as any}
      />
      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-xl border overflow-hidden max-h-56 overflow-y-auto" style={{ borderColor: `${primaryColor}20` }}>
          {suggestions.map((s, idx) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
              onMouseEnter={() => setHighlight(idx)}
              className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors"
              style={{ backgroundColor: highlight === idx ? `${primaryColor}12` : undefined, color: accentColor }}
            >
              <Tag className="w-3 h-3" style={{ color: primaryColor }} /> {s}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(input); }}
              className="w-full text-left px-4 py-2 text-sm font-medium flex items-center gap-2 border-t"
              style={{ color: primaryColor, borderColor: `${primaryColor}15` }}
            >
              + Criar nova tag "{input.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

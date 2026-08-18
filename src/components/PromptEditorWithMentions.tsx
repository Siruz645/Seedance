'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MediaReference } from '@/types/studio';
import { AtSign } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  references: MediaReference[];
  placeholder?: string;
  className?: string;
  rows?: number;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onInsertTag?: (tag: string) => void;
}

// Utility to get exact caret coordinates (x, y) inside a textarea
function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  const div = document.createElement('div');
  const style = window.getComputedStyle(element);

  const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize',
  ] as const;

  properties.forEach((prop) => {
    div.style[prop as any] = style[prop as any];
  });

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.top = '0px';
  div.style.left = '-9999px';

  div.textContent = element.value.substring(0, position);
  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  document.body.appendChild(div);

  const coordinates = {
    top: span.offsetTop + parseInt(style.borderTopWidth || '0', 10),
    left: span.offsetLeft + parseInt(style.borderLeftWidth || '0', 10),
    lineHeight: parseInt(style.lineHeight || '16', 10),
  };

  document.body.removeChild(div);
  return coordinates;
}

export const PromptEditorWithMentions: React.FC<Props> = ({
  value,
  onChange,
  references,
  placeholder,
  className,
  rows = 3,
  textareaRef: externalRef,
}) => {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef || localRef;

  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionPos, setMentionPos] = useState({ start: 0, end: 0 });
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null);

  const imageReferences = references.filter((r) => r.type === 'image');

  const filteredItems = imageReferences
    .map((ref, idx) => ({
      tag: `[Image ${idx + 1}]`,
      name: ref.name,
      url: ref.url,
      ref,
    }))
    .filter(
      (item) =>
        item.tag.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(mentionQuery.toLowerCase())
    );

  const insertTag = (tag: string, replaceAtPos?: { start: number; end: number }) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value + (value ? ' ' : '') + tag);
      return;
    }

    const currentScrollTop = el.scrollTop;
    const currentText = value;
    const start = replaceAtPos ? replaceAtPos.start : el.selectionStart;
    const end = replaceAtPos ? replaceAtPos.end : el.selectionEnd;

    const prefix = currentText.substring(0, start);
    const suffix = currentText.substring(end);

    const spaceBefore = prefix.length > 0 && !prefix.endsWith(' ') && !prefix.endsWith('\n') ? ' ' : '';
    const spaceAfter = !suffix.startsWith(' ') && !suffix.startsWith('\n') ? ' ' : '';

    const newText = prefix + spaceBefore + tag + spaceAfter + suffix;
    onChange(newText);

    setIsMentionOpen(false);
    setMentionQuery('');
    setPopoverCoords(null);

    // Keep cursor and prevent scroll jump
    requestAnimationFrame(() => {
      if (el) {
        el.focus({ preventScroll: true });
        const nextPos = prefix.length + spaceBefore.length + tag.length + spaceAfter.length;
        el.setSelectionRange(nextPos, nextPos);
        el.scrollTop = currentScrollTop;
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMentionOpen && filteredItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          insertTag(selected.tag, mentionPos);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsMentionOpen(false);
        setPopoverCoords(null);
        return;
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(newVal);

    // Look back from cursor to see if user typed @
    const textBeforeCursor = newVal.substring(0, cursor);
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\-\.]*)$/);

    if (atMatch && textareaRef.current) {
      const matchStart = cursor - atMatch[0].length;
      setMentionPos({ start: matchStart, end: cursor });
      setMentionQuery(atMatch[1]);
      setIsMentionOpen(true);
      setSelectedIndex(0);

      // Compute exact popup coordinates at caret location
      try {
        const el = textareaRef.current;
        const rect = el.getBoundingClientRect();
        const caret = getCaretCoordinates(el, cursor);

        let top = rect.top + caret.top - el.scrollTop + caret.lineHeight + 6;
        let left = rect.left + caret.left - el.scrollLeft;

        // Viewport boundaries check
        const popoverWidth = 280;
        const popoverHeight = 220;

        if (left + popoverWidth > window.innerWidth - 12) {
          left = window.innerWidth - popoverWidth - 12;
        }
        if (left < 12) left = 12;

        if (top + popoverHeight > window.innerHeight - 12) {
          top = rect.top + caret.top - el.scrollTop - popoverHeight - 6;
        }

        setPopoverCoords({ top, left });
      } catch (err) {
        console.warn('Caret coordinates calculation fallback', err);
      }
    } else {
      setIsMentionOpen(false);
      setPopoverCoords(null);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        textareaRef.current &&
        !textareaRef.current.contains(target) &&
        !target.closest('.mention-popover-portal')
      ) {
        setIsMentionOpen(false);
        setPopoverCoords(null);
      }
    };
    if (isMentionOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMentionOpen, textareaRef]);

  return (
    <div className="relative w-full h-full flex-1 flex flex-col min-h-0">
      <textarea
        ref={textareaRef as any}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Опишите действие, соматику персонажа или введите @ для выбора референса...'}
        rows={rows}
        className={
          className ||
          'w-full h-full flex-1 rounded-xl p-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none bg-studio-850 border border-studio-750 focus:border-studio-accent transition-colors leading-relaxed'
        }
      />

      {/* Floating @ Mention Autocomplete Popover (Fixed position at cursor, ALWAYS ON TOP) */}
      {isMentionOpen && popoverCoords && (
        <div
          style={{
            position: 'fixed',
            top: `${popoverCoords.top}px`,
            left: `${popoverCoords.left}px`,
            width: '280px',
            zIndex: 99999,
          }}
          className="mention-popover-portal max-h-56 overflow-y-auto custom-scrollbar rounded-2xl bg-studio-950/98 backdrop-blur-2xl border border-studio-600 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/20"
        >
          <div className="px-2 py-1 border-b border-studio-800 flex items-center justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <AtSign className="w-3 h-3 text-studio-cyan" />
              <span>Референсы ({filteredItems.length})</span>
            </span>
            <span className="text-[9px] font-mono text-gray-500">Enter для вставки</span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-3 text-center text-xs text-gray-400">
              {imageReferences.length === 0
                ? 'Нет добавленных изображений'
                : 'Совпадений не найдено'}
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => insertTag(item.tag, mentionPos)}
                  className={`w-full flex items-center gap-2 p-1.5 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-studio-accent/30 text-white border border-studio-accent shadow-sm'
                      : 'hover:bg-studio-850 text-gray-300 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-studio-900 border border-studio-750 overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-mono font-bold text-studio-cyan block">
                      {item.tag}
                    </span>
                    <span className="text-[10px] text-gray-300 truncate block">
                      {item.name}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

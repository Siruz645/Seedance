'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/lib/projectStore';
import {
  Terminal,
  X,
  Trash2,
  Copy,
  Check,
  Filter,
  ArrowDownCircle,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
} from 'lucide-react';

export const ExecutionConsoleModal: React.FC = () => {
  const { isLogsModalOpen, setLogsModalOpen, logs, clearLogs } = useStudioStore();
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  if (!isLogsModalOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'all') return true;
    return log.level === filterLevel;
  });

  const handleCopyLogs = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category}] ${l.message} ${
            l.details ? JSON.stringify(l.details) : ''
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[85vh] bg-studio-950 border border-studio-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-studio-800 flex items-center justify-between bg-studio-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-studio-800 border border-studio-700 flex items-center justify-center text-studio-cyan">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Журнал событий и API-запросов (Live Console)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-studio-800 border border-studio-700 text-gray-400 font-mono">
                  {logs.length} записей
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Детальный мониторинг отправки payloads, задач OpenRouter Video API и захвата кадров
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              className="px-2.5 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-750 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-studio-700"
              title="Скопировать весь журнал"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
            </button>
            <button
              onClick={clearLogs}
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-studio-800 transition-colors"
              title="Очистить журнал"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLogsModalOpen(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-4 py-2 bg-studio-900 border-b border-studio-800 flex items-center gap-2 text-xs">
          <span className="text-gray-500 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Фильтр:
          </span>
          {['all', 'info', 'success', 'warn', 'error'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                filterLevel === lvl
                  ? 'bg-studio-accent text-white font-bold'
                  : 'bg-studio-850 text-gray-400 hover:text-white'
              }`}
            >
              {lvl.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Console Log Stream */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2 font-mono text-xs custom-scrollbar bg-black/60">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              Логи отсутствуют. Запустите генерацию сцены для мониторинга событий.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isErr = log.level === 'error';
              const isSucc = log.level === 'success';
              const isWarn = log.level === 'warn';

              return (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-colors ${
                    isErr
                      ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                      : isSucc
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : isWarn
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                      : 'bg-studio-900/80 border-studio-800 text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-400">[{log.timestamp}]</span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                          isErr
                            ? 'bg-rose-500/20 text-rose-400'
                            : isSucc
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isWarn
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-studio-700 text-cyan-300'
                        }`}
                      >
                        {log.category}
                      </span>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider">{log.level}</span>
                  </div>

                  <p className="text-xs break-words leading-relaxed whitespace-pre-wrap">{log.message}</p>

                  {log.details && (
                    <pre className="mt-1 p-2 rounded bg-black/70 border border-studio-800 text-[10px] text-gray-400 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-studio-800 bg-studio-900/80 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Прямой стрим событий активен</span>
          </div>
          <button
            onClick={() => setLogsModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-studio-800 hover:bg-studio-700 text-white font-semibold transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

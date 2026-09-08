import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Zap,
  Scissors,
  Layers,
  AlertTriangle,
  Plus,
  ArrowRight,
  Loader2,
  ChevronDown
} from "lucide-react";
import { ApiClient } from "../services/ApiClient.ts";
import {
  GEMINI_MODELS,
  GEMINI_PRIMARY_MODEL,
  resolveGeminiModel
} from "../../modules/ai-copilot/domain/geminiModels.ts";

interface AiCopilotPanelProps {
  currentText: string;
  onApplyText: (newText: string) => void;
  onApplyHook?: (hook: string) => void;
  onAddAsVariant: (hookText: string) => void;
}

const DEFAULT_ALT_HOOK =
  "9 из 10 экспертов задают промпты неправильно. 3 формулы, меняющие результат:";

type FeedKind = "idle" | "hooks" | "critique" | "thread" | "polish";

export const AiCopilotPanel: React.FC<AiCopilotPanelProps> = ({
  currentText,
  onApplyText,
  onApplyHook,
  onAddAsVariant
}) => {
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [model, setModel] = useState(() =>
    resolveGeminiModel(localStorage.getItem("xm_gemini_model") || GEMINI_PRIMARY_MODEL)
  );
  const [modelOpen, setModelOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  const [critiqueResult, setCritiqueResult] = useState<any | null>(null);
  const [threadTweets, setThreadTweets] = useState<string[]>([]);
  const [polishResult, setPolishResult] = useState("");
  const [activeTool, setActiveTool] = useState<FeedKind>("idle");
  const [error, setError] = useState("");

  const applyHook = (hook: string) => {
    if (onApplyHook) onApplyHook(hook);
    else onApplyText(hook);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!modelMenuRef.current?.contains(e.target as Node)) setModelOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selectModel = (id: string) => {
    const next = resolveGeminiModel(id);
    setModel(next);
    localStorage.setItem("xm_gemini_model", next);
    setModelOpen(false);
  };

  const selectedLabel = GEMINI_MODELS.find((m) => m.id === model)?.label || model;

  const run = async (fn: () => Promise<void>) => {
    if (!currentText.trim()) return;
    setLoading(true);
    setError("");
    try {
      await fn();
    } catch (err: any) {
      setError(err.message || "Ошибка AI");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateHooks = () =>
    run(async () => {
      setActiveTool("hooks");
      setCritiqueResult(null);
      setThreadTweets([]);
      setPolishResult("");
      setGeneratedHooks(await ApiClient.generateHooks(currentText, 3));
    });

  const handlePunch = () =>
    run(async () => {
      setActiveTool("polish");
      setGeneratedHooks([]);
      setCritiqueResult(null);
      setThreadTweets([]);
      const result = await ApiClient.polish(
        currentText,
        "Сделай Punch: усили концовку и CTA, убери воду, сделай ритм жёстче"
      );
      setPolishResult(result);
    });

  const handleCritique = () =>
    run(async () => {
      setActiveTool("critique");
      setGeneratedHooks([]);
      setThreadTweets([]);
      setPolishResult("");
      setCritiqueResult(await ApiClient.critique(currentText));
    });

  const handleExpandToThread = () =>
    run(async () => {
      setActiveTool("thread");
      setGeneratedHooks([]);
      setCritiqueResult(null);
      setPolishResult("");
      setThreadTweets(await ApiClient.expandToThread(currentText));
    });

  const handleCustom = () => {
    if (!customPrompt.trim()) return;
    run(async () => {
      setActiveTool("polish");
      setGeneratedHooks([]);
      setCritiqueResult(null);
      setThreadTweets([]);
      const result = await ApiClient.polish(currentText, customPrompt.trim());
      setPolishResult(result);
    });
  };

  const cardClass =
    "p-2.5 rounded-lg bg-[#111827] hover:bg-[#162032] border border-[#1e293b] text-left transition-all disabled:opacity-40 group";

  return (
    <aside className="h-full min-h-0 flex flex-col">
      <div className="p-3.5 border-b border-[#162032] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 flex items-center justify-center text-[#a78bfa]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">AI Copilot</span>
        </div>
        <div className="relative" ref={modelMenuRef}>
          <button
            type="button"
            onClick={() => setModelOpen((open) => !open)}
            className="appearance-none bg-[#080c14] border border-[#162032] text-slate-300 text-[11px] font-medium rounded-md pl-2 pr-6 py-1 focus:outline-none cursor-pointer min-w-[148px] text-left"
          >
            {selectedLabel}
          </button>
          <div className="absolute inset-y-0 right-0 flex items-center px-1.5 pointer-events-none text-slate-500">
            <ChevronDown className="w-3 h-3" />
          </div>
          {modelOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 min-w-full overflow-hidden rounded-md border border-[#162032] bg-[#080c14] py-0.5 shadow-xl">
              {GEMINI_MODELS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => selectModel(item.id)}
                  className={`block w-full text-left px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap ${
                    item.id === model
                      ? "bg-[#1d9bf0] text-white"
                      : "text-slate-200 hover:bg-[#162032]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-b border-[#162032]/80 shrink-0">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
          Быстрые генераторы
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleGenerateHooks} disabled={loading || !currentText.trim()} className={`${cardClass} hover:border-[#8b5cf6]/40`}>
            <div className="flex items-center gap-1.5 text-[#a78bfa] mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold text-slate-200 group-hover:text-[#a78bfa]">3 новых хука</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">Варианты первого предложения</p>
          </button>

          <button onClick={handlePunch} disabled={loading || !currentText.trim()} className={`${cardClass} hover:border-[#1d9bf0]/40`}>
            <div className="flex items-center gap-1.5 text-[#38bdf8] mb-1">
              <Scissors className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold text-slate-200 group-hover:text-[#38bdf8]">Сделай Punch</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">Усилить концовку и CTA</p>
          </button>

          <button onClick={handleCritique} disabled={loading || !currentText.trim()} className={`${cardClass} hover:border-amber-500/40`}>
            <div className="flex items-center gap-1.5 text-amber-400 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-400">Критика твита</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">Слабые места и клише</p>
          </button>

          <button onClick={handleExpandToThread} disabled={loading || !currentText.trim()} className={`${cardClass} hover:border-emerald-500/40`}>
            <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
              <Layers className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400">В тред (4 твита)</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">Развернуть идею подробно</p>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {loading && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#a78bfa] font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Генерация...
          </div>
        )}
        {error && <div className="text-[11px] text-rose-400">{error}</div>}

        {activeTool === "idle" && !loading && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
              <span className="font-medium text-[#a78bfa]">Анализ текущего хука:</span>
            </div>
            <div className="p-3 rounded-xl bg-[#080c14] border border-[#162032] text-xs text-slate-300 leading-relaxed space-y-2">
              <p>Текущий хук использует сильный триггер упущенной выгоды (FOMO 90%).</p>
              <div className="p-2 rounded bg-[#0c111c] border border-[#162032] text-[11px] text-sky-300 font-mono">
                💡 Альтернатива: «{DEFAULT_ALT_HOOK}»
              </div>
              <button
                type="button"
                onClick={() => applyHook(DEFAULT_ALT_HOOK)}
                className="w-full py-1 text-center text-[11px] font-semibold text-[#a78bfa] hover:text-[#c4b5fd] bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 rounded transition-colors"
              >
                Заменить в редакторе
              </button>
            </div>
          </div>
        )}

        {activeTool === "hooks" &&
          generatedHooks.map((hook, index) => (
            <div key={index} className="space-y-1.5">
              {index === 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                  <span className="font-medium text-[#a78bfa]">Сгенерированные хуки:</span>
                </div>
              )}
              <div className="p-3 rounded-xl bg-[#080c14] border border-[#162032] text-xs text-slate-300 leading-relaxed space-y-2">
                <p>{hook}</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyHook(hook)}
                    className="flex-1 py-1 text-center text-[11px] font-semibold text-[#a78bfa] hover:text-[#c4b5fd] bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 rounded transition-colors"
                  >
                    Заменить в редакторе
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddAsVariant(hook)}
                    className="flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-semibold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 rounded"
                  >
                    <Plus className="w-3 h-3" />
                    Вариант
                  </button>
                </div>
              </div>
            </div>
          ))}

        {activeTool === "polish" && polishResult && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
              <span className="font-medium text-[#a78bfa]">Punch / правка:</span>
            </div>
            <div className="p-3 rounded-xl bg-[#080c14] border border-[#162032] text-xs text-slate-300 leading-relaxed space-y-2">
              <p className="whitespace-pre-wrap">{polishResult}</p>
              <button
                type="button"
                onClick={() => onApplyText(polishResult)}
                className="w-full py-1 text-center text-[11px] font-semibold text-[#a78bfa] hover:text-[#c4b5fd] bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 rounded transition-colors"
              >
                Заменить в редакторе
              </button>
            </div>
          </div>
        )}

        {activeTool === "critique" && critiqueResult && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
              <span className="font-medium text-[#a78bfa]">Анализ текущего хука:</span>
            </div>
            <div className="p-3 rounded-xl bg-[#080c14] border border-[#162032] text-xs text-slate-300 leading-relaxed space-y-2">
              <p>
                {critiqueResult.verdict}
                {critiqueResult.score != null ? ` Оценка ${critiqueResult.score}/10.` : ""}
              </p>
              {critiqueResult.weaknesses?.length > 0 && (
                <p className="text-slate-400">
                  Слабые места: {critiqueResult.weaknesses.join("; ")}
                </p>
              )}
              {critiqueResult.suggestedRewrite && (
                <div className="p-2 rounded bg-[#0c111c] border border-[#162032] text-[11px] text-sky-300 font-mono whitespace-pre-wrap">
                  💡 Альтернатива: «{critiqueResult.suggestedRewrite}»
                </div>
              )}
              {critiqueResult.suggestedRewrite && (
                <button
                  type="button"
                  onClick={() => onApplyText(critiqueResult.suggestedRewrite)}
                  className="w-full py-1 text-center text-[11px] font-semibold text-[#a78bfa] hover:text-[#c4b5fd] bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 rounded transition-colors"
                >
                  Заменить в редакторе
                </button>
              )}
            </div>
          </div>
        )}

        {activeTool === "thread" && threadTweets.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
              <span className="font-medium text-[#a78bfa]">Тред ({threadTweets.length} твита):</span>
            </div>
            {threadTweets.map((tw, index) => (
              <div key={index} className="p-3 rounded-xl bg-[#080c14] border border-[#162032] text-xs text-slate-300 leading-relaxed">
                <p>{tw}</p>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onApplyText(threadTweets.join("\n\n"))}
              className="w-full py-1 text-center text-[11px] font-semibold text-[#a78bfa] hover:text-[#c4b5fd] bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 rounded transition-colors"
            >
              Заменить в редакторе
            </button>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#162032] bg-[#080c14]/80 shrink-0">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            handleCustom();
          }}
        >
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCustom();
              }
            }}
            rows={2}
            disabled={loading || !currentText.trim()}
            placeholder="Своя инструкция AI (напр. «сделай тоньше сарказм»)..."
            className="w-full pl-3 pr-9 py-2 text-xs bg-[#0c111c] border border-[#1e293b] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] resize-none transition-colors disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={loading || !customPrompt.trim() || !currentText.trim()}
            title="Отправить промпт"
            className="absolute right-2 bottom-3 p-1.5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-sm transition-colors disabled:opacity-40"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};

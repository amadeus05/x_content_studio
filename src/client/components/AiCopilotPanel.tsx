import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  Scissors,
  Layers,
  CheckCircle,
  AlertTriangle,
  Plus,
  RotateCcw,
  Send,
  Loader2
} from "lucide-react";
import { ApiClient } from "../services/ApiClient.ts";

interface AiCopilotPanelProps {
  currentText: string;
  onApplyText: (newText: string) => void;
  onAddAsVariant: (hookText: string) => void;
}

export const AiCopilotPanel: React.FC<AiCopilotPanelProps> = ({
  currentText,
  onApplyText,
  onAddAsVariant
}) => {
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  const [critiqueResult, setCritiqueResult] = useState<any | null>(null);
  const [threadTweets, setThreadTweets] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<"none" | "hooks" | "critique" | "thread">("none");

  const handleGenerateHooks = async () => {
    if (!currentText.trim()) return;
    setLoading(true);
    setActiveTool("hooks");
    setCritiqueResult(null);
    setThreadTweets([]);
    try {
      const hooks = await ApiClient.generateHooks(currentText, 3);
      setGeneratedHooks(hooks);
    } catch (err: any) {
      alert(`Ошибка AI: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePolish = async (instruction: string) => {
    if (!currentText.trim()) return;
    setLoading(true);
    try {
      const result = await ApiClient.polish(currentText, instruction);
      onApplyText(result);
    } catch (err: any) {
      alert(`Ошибка AI: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCritique = async () => {
    if (!currentText.trim()) return;
    setLoading(true);
    setActiveTool("critique");
    setGeneratedHooks([]);
    setThreadTweets([]);
    try {
      const critique = await ApiClient.critique(currentText);
      setCritiqueResult(critique);
    } catch (err: any) {
      alert(`Ошибка AI: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandToThread = async () => {
    if (!currentText.trim()) return;
    setLoading(true);
    setActiveTool("thread");
    setGeneratedHooks([]);
    setCritiqueResult(null);
    try {
      const tweets = await ApiClient.expandToThread(currentText);
      setThreadTweets(tweets);
    } catch (err: any) {
      alert(`Ошибка AI: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0f141c] border border-[#222b3d] rounded-2xl p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1c2433] mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-white">AI Copilot</span>
        </div>
        {loading && (
          <div className="flex items-center gap-1 text-[11px] text-purple-400 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Генерация...</span>
          </div>
        )}
      </div>

      {/* Быстрые действия в 1 клик */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={handleGenerateHooks}
          disabled={loading || !currentText.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#171f2e] hover:bg-[#202b40] text-sky-400 hover:text-sky-300 text-xs font-medium rounded-xl border border-sky-500/20 transition disabled:opacity-40"
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">3 новых хука</span>
        </button>

        <button
          onClick={() => handlePolish("Сделай punchier, сократи воду и усиль ритм")}
          disabled={loading || !currentText.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#171f2e] hover:bg-[#202b40] text-emerald-400 hover:text-emerald-300 text-xs font-medium rounded-xl border border-emerald-500/20 transition disabled:opacity-40"
        >
          <Scissors className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Сделай Punchier</span>
        </button>

        <button
          onClick={handleCritique}
          disabled={loading || !currentText.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#171f2e] hover:bg-[#202b40] text-purple-400 hover:text-purple-300 text-xs font-medium rounded-xl border border-purple-500/20 transition disabled:opacity-40"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Критика твита</span>
        </button>

        <button
          onClick={handleExpandToThread}
          disabled={loading || !currentText.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#171f2e] hover:bg-[#202b40] text-amber-400 hover:text-amber-300 text-xs font-medium rounded-xl border border-amber-500/20 transition disabled:opacity-40"
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">В тред (4 твита)</span>
        </button>
      </div>

      {/* Пользовательская инструкция */}
      <div className="relative mb-4">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && customPrompt.trim() && handlePolish(customPrompt)}
          placeholder="Своя инструкция AI (напр. «добавь интригу»)..."
          disabled={loading || !currentText.trim()}
          className="w-full bg-[#0b0e14] border border-[#222c3e] rounded-xl pl-3 pr-9 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 disabled:opacity-40"
        />
        <button
          onClick={() => customPrompt.trim() && handlePolish(customPrompt)}
          disabled={loading || !customPrompt.trim() || !currentText.trim()}
          className="absolute right-2 top-2 text-zinc-400 hover:text-purple-400 disabled:opacity-30"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Результаты генерации хуков */}
      {activeTool === "hooks" && generatedHooks.length > 0 && (
        <div className="space-y-2 mt-3 pt-3 border-t border-[#1c2433]">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Сгенерированные хуки:
          </span>
          {generatedHooks.map((hook, index) => (
            <div
              key={index}
              className="bg-[#121824] border border-[#212d42] rounded-xl p-3 text-xs text-zinc-100 flex flex-col justify-between gap-2 hover:border-sky-500/50 transition"
            >
              <p className="leading-relaxed">{hook}</p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => onAddAsVariant(hook)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 px-2 py-1 rounded-md"
                >
                  <Plus className="w-3 h-3" />
                  <span>Добавить как вариант</span>
                </button>
                <button
                  onClick={() => onApplyText(hook)}
                  className="text-[11px] font-semibold text-zinc-300 hover:text-white bg-[#192233] px-2 py-1 rounded-md"
                >
                  Заменить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Результат Критики */}
      {activeTool === "critique" && critiqueResult && (
        <div className="space-y-3 mt-3 pt-3 border-t border-[#1c2433]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Оценка поста:
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
              {critiqueResult.score} / 10
            </span>
          </div>

          <p className="text-xs font-semibold text-white">{critiqueResult.verdict}</p>

          {critiqueResult.strengths?.length > 0 && (
            <div className="bg-[#0f1a18] border border-emerald-500/25 rounded-lg p-2 text-xs text-emerald-300 space-y-1">
              <span className="font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle className="w-3 h-3 text-emerald-400" /> Сильные стороны:
              </span>
              {critiqueResult.strengths.map((s: string, i: number) => (
                <div key={i} className="pl-4 text-[11px] text-zinc-300">• {s}</div>
              ))}
            </div>
          )}

          {critiqueResult.weaknesses?.length > 0 && (
            <div className="bg-[#1f1317] border border-rose-500/25 rounded-lg p-2 text-xs text-rose-300 space-y-1">
              <span className="font-bold flex items-center gap-1 text-[11px]">
                <AlertTriangle className="w-3 h-3 text-rose-400" /> Слабые места (почему пролистнут):
              </span>
              {critiqueResult.weaknesses.map((w: string, i: number) => (
                <div key={i} className="pl-4 text-[11px] text-zinc-300">• {w}</div>
              ))}
            </div>
          )}

          {critiqueResult.suggestedRewrite && (
            <div className="bg-[#121824] border border-[#212c40] rounded-lg p-2.5 text-xs text-zinc-200">
              <span className="font-bold text-sky-400 block mb-1">Предложение по улучшению:</span>
              <p className="text-[11px] italic leading-relaxed whitespace-pre-wrap">
                {critiqueResult.suggestedRewrite}
              </p>
              <button
                onClick={() => onApplyText(critiqueResult.suggestedRewrite)}
                className="mt-2 text-[11px] font-semibold text-sky-400 hover:text-sky-300"
              >
                Применить этот вариант
              </button>
            </div>
          )}
        </div>
      )}

      {/* Результат Треда */}
      {activeTool === "thread" && threadTweets.length > 0 && (
        <div className="space-y-2 mt-3 pt-3 border-t border-[#1c2433]">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Цепочка твитов ({threadTweets.length}):
          </span>
          {threadTweets.map((tw, index) => (
            <div key={index} className="bg-[#121824] border border-[#212d42] rounded-lg p-2.5 text-xs text-zinc-200">
              <p className="leading-relaxed">{tw}</p>
            </div>
          ))}
          <button
            onClick={() => onApplyText(threadTweets.join("\n\n---\n\n"))}
            className="w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/40"
          >
            Вставить весь тред в редактор
          </button>
        </div>
      )}
    </div>
  );
};

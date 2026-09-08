import React, { useState } from "react";
import {
  BookOpen,
  X,
  Plus,
  Copy,
  Check,
  Sparkles,
  Sliders,
  FileText,
  Tag,
  Trash2
} from "lucide-react";
import { MethodologyDto, ToneProfileDto } from "../../modules/playbook/application/use-cases/GetPlaybookUseCase.ts";

interface PlaybookModalProps {
  isOpen: boolean;
  onClose: () => void;
  methodologies: MethodologyDto[];
  toneProfile: ToneProfileDto;
  onInsertTemplate: (template: string) => void;
  onSaveMethodology: (data: any) => Promise<void>;
  onDeleteMethodology: (id: string) => Promise<void>;
  onSaveToneProfile: (data: any) => Promise<void>;
}

export const PlaybookModal: React.FC<PlaybookModalProps> = ({
  isOpen,
  onClose,
  methodologies,
  toneProfile,
  onInsertTemplate,
  onSaveMethodology,
  onDeleteMethodology,
  onSaveToneProfile
}) => {
  const [activeTab, setActiveTab] = useState<"formulas" | "tone">("formulas");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Форма новой методики
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Хуки");
  const [description, setDescription] = useState("");
  const [formula, setFormula] = useState("");
  const [templateExample, setTemplateExample] = useState("");

  // Редактор Tone of Voice
  const [rulesText, setRulesText] = useState(toneProfile.rules.join("\n"));
  const [avoidWordsText, setAvoidWordsText] = useState(toneProfile.avoidWords.join(", "));
  const [targetAudience, setTargetAudience] = useState(toneProfile.targetAudience);
  const [isToneSaving, setIsToneSaving] = useState(false);

  if (!isOpen) return null;

  const categories = ["ALL", ...Array.from(new Set(methodologies.map((m) => m.category)))];

  const filteredMethodologies =
    selectedCategory === "ALL"
      ? methodologies
      : methodologies.filter((m) => m.category === selectedCategory);

  const handleCopyFormula = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateMethodology = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !templateExample.trim()) return;

    await onSaveMethodology({
      name,
      category,
      description,
      formula,
      templateExample
    });

    setName("");
    setDescription("");
    setFormula("");
    setTemplateExample("");
    setShowAddForm(false);
  };

  const handleSaveTone = async () => {
    setIsToneSaving(true);
    try {
      const rules = rulesText
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);
      const avoidWords = avoidWordsText
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);

      await onSaveToneProfile({
        rules,
        avoidWords,
        targetAudience
      });
    } finally {
      setIsToneSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f141c] border border-[#232d3f] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2433]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Записник методик & Tone of Voice</h2>
              <p className="text-xs text-zinc-400">
                Библиотека виральных формул, шаблонов хуков и ваш персональный стиль для AI
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 px-6 border-b border-[#1c2433] bg-[#0c1017]">
          <button
            onClick={() => setActiveTab("formulas")}
            className={`flex items-center gap-2 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === "formulas"
                ? "text-sky-400 border-sky-500"
                : "text-zinc-400 border-transparent hover:text-zinc-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Формулы и Хуки ({methodologies.length})
          </button>

          <button
            onClick={() => setActiveTab("tone")}
            className={`flex items-center gap-2 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === "tone"
                ? "text-purple-400 border-purple-500"
                : "text-zinc-400 border-transparent hover:text-zinc-200"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Tone of Voice (Стиль автора)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "formulas" ? (
            <div>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        selectedCategory === cat
                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                          : "bg-[#141a26] text-zinc-400 hover:bg-[#1b2333] hover:text-zinc-200"
                      }`}
                    >
                      {cat === "ALL" ? "Все категории" : cat}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#182130] hover:bg-[#202c40] text-sky-400 text-xs font-semibold rounded-lg border border-sky-500/30 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddForm ? "Скрыть форму" : "Добавить методику"}</span>
                </button>
              </div>

              {/* Форма добавления */}
              {showAddForm && (
                <form
                  onSubmit={handleCreateMethodology}
                  className="bg-[#131924] border border-[#232f44] rounded-xl p-4 mb-6 space-y-3"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Новая методика / Формула
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Название (например, Contrarian Hook)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-[#0b0e14] border border-[#222b3b] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                    />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="bg-[#0b0e14] border border-[#222b3b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="Хуки">Хуки</option>
                      <option value="Структуры">Структуры</option>
                      <option value="Виральность">Виральность</option>
                      <option value="Сторителлинг">Сторителлинг</option>
                      <option value="Списки">Списки / Подборки</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Краткое описание (зачем и когда использовать)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-[#222b3b] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                  />
                  <textarea
                    placeholder="Шаги формулы (1. Проблема, 2. Усиление, 3. Решение)"
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    rows={2}
                    className="w-full bg-[#0b0e14] border border-[#222b3b] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                  />
                  <textarea
                    placeholder="Шаблон для вставки с [заполнителями]..."
                    value={templateExample}
                    onChange={(e) => setTemplateExample(e.target.value)}
                    required
                    rows={3}
                    className="w-full bg-[#0b0e14] border border-[#222b3b] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded-lg"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      Сохранить методику
                    </button>
                  </div>
                </form>
              )}

              {/* Карточки методик */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMethodologies.map((m) => (
                  <div
                    key={m.id}
                    className="bg-[#121824] border border-[#212c3f] hover:border-[#2d3b55] rounded-xl p-4 flex flex-col justify-between transition group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-white group-hover:text-sky-400 transition">
                          {m.name}
                        </span>
                        <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium shrink-0">
                          {m.category}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{m.description}</p>

                      {m.formula && (
                        <div className="bg-[#0b0e14] p-2.5 rounded-lg border border-[#1b2332] text-[11px] text-zinc-300 font-mono mb-3 whitespace-pre-wrap">
                          {m.formula}
                        </div>
                      )}

                      <div className="bg-[#0e131d] p-2.5 rounded-lg border border-[#1d2738] text-xs text-zinc-200 italic mb-4 whitespace-pre-wrap">
                        {m.templateExample}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#1a2230]">
                      <button
                        onClick={() => onDeleteMethodology(m.id)}
                        className="text-zinc-500 hover:text-rose-400 p-1 rounded transition"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyFormula(m.id, m.templateExample)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#182130] hover:bg-[#202c40] text-zinc-300 text-xs rounded-md border border-[#26344d]"
                        >
                          {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === m.id ? "Скопировано" : "Копировать"}</span>
                        </button>
                        <button
                          onClick={() => {
                            onInsertTemplate(m.templateExample);
                            onClose();
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-md shadow-sm"
                        >
                          Вставить в черновик
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Tone of Voice Editor */
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Персональный Tone of Voice автора
                </h3>
                <p className="text-xs text-zinc-400">
                  Эти правила стиля автоматически подмешиваются в промпт AI при генерации вариантов
                  и доработке постов.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Целевая аудитория (для кого пишем):
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Например: Основатели стартапов, инди-разработчики, IT-специалисты"
                  className="w-full bg-[#121824] border border-[#242f44] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Правила стиля (по одному правилу на строку):
                </label>
                <textarea
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  rows={6}
                  placeholder="Пиши энергично и без вводных слов&#10;Первая строчка — цепляющий хук&#10;Максимум 1 эмодзи на твит"
                  className="w-full bg-[#121824] border border-[#242f44] rounded-lg p-3 text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Стоп-слова и клише (через запятую):
                </label>
                <input
                  type="text"
                  value={avoidWordsText}
                  onChange={(e) => setAvoidWordsText(e.target.value)}
                  placeholder="В современном мире, Давайте разберемся, Не секрет, Итак"
                  className="w-full bg-[#121824] border border-[#242f44] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveTone}
                  disabled={isToneSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{isToneSaving ? "Сохранение..." : "Сохранить Tone of Voice"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { Settings, X, Key, Shield, User, Check, Sparkles } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: { name: string; handle: string; avatarUrl: string };
  onSaveProfile: (profile: { name: string; handle: string; avatarUrl: string }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSaveProfile
}) => {
  const [name, setName] = useState(userProfile.name);
  const [handle, setHandle] = useState(userProfile.handle);
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatarUrl);
  const [pin, setPin] = useState(localStorage.getItem("xm_auth_pin") || "1234");
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem("xm_gemini_key") || "");
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({ name, handle, avatarUrl });
    if (pin) localStorage.setItem("xm_auth_pin", pin);
    else localStorage.removeItem("xm_auth_pin");

    if (geminiKey) localStorage.setItem("xm_gemini_key", geminiKey);
    else localStorage.removeItem("xm_gemini_key");

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f141c] border border-[#232d3f] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2433]">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold text-white">Настройки X Content Studio</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Профиль X */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              Профиль X (для точного превью)
            </span>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Имя в X:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#121824] border border-[#222c3e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">@handle (ник):</label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
                  className="w-full bg-[#121824] border border-[#222c3e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Ссылка на аватарку (URL):</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://pbs.twimg.com/profile_images/..."
                className="w-full bg-[#121824] border border-[#222c3e] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Безопасность / PIN */}
          <div className="pt-3 border-t border-[#1c2433]">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Защита Cloudflare (PIN-код)
            </span>
            <p className="text-[11px] text-zinc-500 mb-2">
              Используется для защиты вашего воркера в открытом интернете (передается в заголовке x-auth-pin).
            </p>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Секретный PIN (по умолчанию 1234)"
              className="w-full bg-[#121824] border border-[#222c3e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* AI Ключ */}
          <div className="pt-3 border-t border-[#1c2433]">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Google Gemini API Key (Опционально)
            </span>
            <p className="text-[11px] text-zinc-500 mb-2">
              Если ключ не указан, работает встроенный локальный генератор формул X или Cloudflare Workers AI.
            </p>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-[#121824] border border-[#222c3e] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1c2433]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#171e2c] hover:bg-[#20293d] text-xs font-medium text-zinc-300 rounded-lg"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : null}
              <span>{savedSuccess ? "Сохранено!" : "Сохранить настройки"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

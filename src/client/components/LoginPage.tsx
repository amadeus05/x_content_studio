import React from "react";

interface LoginPageProps {
  onContinue?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onContinue }) => {
  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-surface-950 text-slate-200 flex flex-col">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(29,155,240,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139,92,246,0.08), transparent 50%)"
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
        }}
      />

      <header className="relative z-10 h-14 px-5 flex items-center shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white tracking-tight text-sm">X Content Studio</span>
            <span className="inline-flex items-center justify-center h-5 px-1.5 rounded text-[10px] font-bold uppercase tracking-wider leading-none bg-brand-500/10 text-brand-400 border border-brand-500/30">
              <span className="translate-y-[1px]">PRO</span>
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Вход в студию
            </h1>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Черновики, хуки и AI-копилот — только для тебя.
            </p>
          </div>

          <div className="bg-surface-900/90 border border-surface-800 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-black/40 backdrop-blur-sm">
            <button
              type="button"
              onClick={onContinue}
              className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl text-sm font-semibold text-white bg-[#229ED9] hover:bg-[#1b8bc0] shadow-md shadow-[#229ED9]/20 transition-colors"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden>
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Войти через Telegram
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-surface-800" />
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">или</span>
              <div className="h-px flex-1 bg-surface-800" />
            </div>

            <label className="block text-[11px] font-medium text-slate-400 mb-1.5">PIN-код доступа</label>
            <div className="flex gap-2">
              <input
                type="password"
                inputMode="numeric"
                placeholder="••••"
                className="flex-1 h-11 bg-surface-950 border border-surface-750 rounded-xl px-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                readOnly
                tabIndex={-1}
              />
              <button
                type="button"
                onClick={onContinue}
                className="h-11 px-4 rounded-xl text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/25 transition-colors shrink-0"
              >
                Войти
              </button>
            </div>

            <p className="mt-4 text-[11px] text-slate-500 leading-relaxed text-center">
              Пока макет: кнопки просто открывают студию, авторизации ещё нет.
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-600">
            X Content Studio · личное рабочее место автора
          </p>
        </div>
      </main>
    </div>
  );
};

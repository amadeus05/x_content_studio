import React from "react";
import { BookOpen, FileText, LogOut, Plus, Settings } from "lucide-react";
import { ApiClient } from "../services/ApiClient.ts";

export type AppView = "posts" | "editor" | "playbook";

interface NavRailProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
  onCreateDraft: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  userProfile: { name: string; handle: string; avatarUrl: string };
  profileInitials: string;
}

export const NavRail: React.FC<NavRailProps> = ({
  view,
  onNavigate,
  onCreateDraft,
  onOpenSettings,
  onLogout,
  userProfile,
  profileInitials
}) => {
  const itemClass = (active: boolean) =>
    `flex flex-col items-center gap-1 w-full px-1 py-2.5 rounded-xl text-[10px] font-medium transition-colors ${
      active
        ? "bg-brand-500/15 text-brand-400 border border-brand-500/30"
        : "text-slate-400 hover:text-slate-200 hover:bg-surface-850 border border-transparent"
    }`;

  return (
    <aside className="w-[72px] border-r border-surface-800 bg-surface-900/80 flex flex-col items-stretch py-3 shrink-0 z-20">
      <nav className="flex flex-col items-stretch gap-1 w-full px-2 flex-1">
        <button type="button" className={itemClass(view === "posts")} onClick={() => onNavigate("posts")}>
          <FileText className="w-4 h-4" />
          <span>Посты</span>
        </button>

        <button
          type="button"
          className={itemClass(view === "playbook")}
          onClick={() => onNavigate("playbook")}
        >
          <BookOpen className="w-4 h-4" />
          <span>Методики</span>
        </button>

        <button
          type="button"
          className={`${itemClass(false)} text-brand-400 hover:text-brand-300 hover:bg-brand-500/10`}
          onClick={onCreateDraft}
          title="Новый черновик"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          <span>Новый</span>
        </button>

        <button type="button" className={itemClass(false)} onClick={onOpenSettings}>
          <Settings className="w-4 h-4" />
          <span>Настройки</span>
        </button>
      </nav>

      <div className="mt-auto w-full px-2 pt-3 border-t border-surface-800/80">
        <button
          type="button"
          onClick={onOpenSettings}
          title={userProfile.name}
          className="mx-auto mb-2 flex w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-ai-500 p-[1px] cursor-pointer"
        >
          <span className="flex w-full h-full items-center justify-center rounded-full bg-surface-900 font-bold text-[11px] text-white overflow-hidden">
            {userProfile.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              profileInitials
            )}
          </span>
        </button>

        <button
          type="button"
          title="Выйти"
          onClick={async () => {
            await ApiClient.logout();
            onLogout();
          }}
          className="flex w-full flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Выйти</span>
        </button>
      </div>
    </aside>
  );
};

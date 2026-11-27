import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-bold text-gray-600 dark:text-gray-300">{title}</p>
      {description && <p className="text-[11px] text-gray-400">{description}</p>}
    </div>
  );
}

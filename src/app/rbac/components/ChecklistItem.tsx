import { NavIcon } from "./NavIcon";

type ChecklistItemProps = {
  done: boolean;
  title: string;
  description: string;
};

export function ChecklistItem({ done, title, description }: ChecklistItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <span className="mt-0.5 text-primary">
        <NavIcon name={done ? "check" : "spark"} />
      </span>
      <div className="grid gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}


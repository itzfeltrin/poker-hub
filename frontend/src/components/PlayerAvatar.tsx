import { AVATARS } from "@/constants";
import { cn } from "@/lib/utils";

interface PlayerAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-lg",
  lg: "h-14 w-14 text-2xl",
};

export function PlayerAvatar({
  name,
  size = "md",
  className,
}: PlayerAvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full bg-secondary flex items-center justify-center border border-border font-display shrink-0",
        sizes[size],
        className,
      )}
      title={name}
    >
      {AVATARS[name.charCodeAt(0) % AVATARS.length]}
    </div>
  );
}

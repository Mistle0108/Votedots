import { BrandLogo } from "@/shared/ui/brand-logo";

export default function GameEndedScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div className="flex flex-col items-center gap-5 text-center">
        <BrandLogo variant="full" className="w-56 max-w-full" />
        <p className="text-xl font-bold text-[color:var(--page-theme-primary-action)]">
          게임이 종료되었어요. 곧 새 게임이 생성됩니다.
        </p>
      </div>
    </div>
  );
}

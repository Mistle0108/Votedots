interface IntroPanelButtonProps {
  onClick: () => void;
}

export default function IntroPanelButton({
  onClick,
}: IntroPanelButtonProps) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
      onClick={onClick}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
          Intro
        </p>
        <p className="mt-1 text-base font-bold text-gray-900">게임 안내</p>
        <p className="mt-1 text-sm text-gray-500">
          언제든지 인트로 모달을 다시 열 수 있어요.
        </p>
      </div>

      <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
        열기
      </span>
    </button>
  );
}

interface RoundPanelListProps {
  children: React.ReactNode;
}

export default function RoundPanelList({ children }: RoundPanelListProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
          Round
        </p>
        <p className="mt-1 text-base font-bold text-gray-900">최근 라운드</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-3">{children}</div>
      </div>
    </section>
  );
}

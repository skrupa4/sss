export function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted">
      <div className="spinner" role="status" aria-label="Загрузка" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-8 text-center">
      <p className="text-sm text-muted">{error?.message || 'Что-то пошло не так'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-bg hover:bg-white">
          Повторить
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}

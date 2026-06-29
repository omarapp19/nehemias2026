import { CURRENCY_LABEL, type CurrencyBalance } from "@nehemias/core";
import { Card, Money, ProgressBar } from "@nehemias/ui";

function BalanceCard({ b }: { b: CurrencyBalance }) {
  const pct = b.recaudado > 0 ? Math.round((b.invertido / b.recaudado) * 100) : 0;
  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-lg font-semibold text-ink">
          Fondo en {CURRENCY_LABEL[b.currency]}
        </h3>
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-strong">
          {b.currency}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium uppercase tracking-wide text-ink-subtle">
        Disponible
      </p>
      <p className="mt-1 font-serif text-4xl font-semibold tabular-nums text-brand sm:text-5xl">
        <Money amount={b.disponible} currency={b.currency} />
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Recaudado
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
            <Money amount={b.recaudado} currency={b.currency} />
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
            Invertido en ayuda
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
            <Money amount={b.invertido} currency={b.currency} />
          </p>
        </div>
      </div>

      <div className="mt-5">
        <ProgressBar
          value={b.invertido}
          max={Math.max(b.recaudado, b.invertido, 1)}
          tone="brand"
          label={`${pct}% ya invertido en las comunidades`}
        />
      </div>
    </Card>
  );
}

/** Panel de doble balance USD / VES (nunca se mezclan). */
export function BalancePanel({ balances }: { balances: CurrencyBalance[] }) {
  const activos = balances.filter((b) => b.recaudado > 0 || b.invertido > 0);
  const list = activos.length > 0 ? activos : balances;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {list.map((b) => (
        <BalanceCard key={b.currency} b={b} />
      ))}
    </div>
  );
}

export interface DateFilter {
  month: string;   // "01"–"12" ou ""
  year: string;    // "2026" ou ""
  dateFrom: string; // "YYYY-MM-DD" ou ""
  dateTo: string;   // "YYYY-MM-DD" ou ""
}

export function getDefaultDateFilter(): DateFilter {
  const now = new Date();
  return {
    month: String(now.getMonth() + 1).padStart(2, "0"),
    year: String(now.getFullYear()),
    dateFrom: "",
    dateTo: "",
  };
}

export function isInDateRange(dateStr: string | null | undefined, filter: DateFilter): boolean {
  if (!dateStr) return false;

  // Normaliza para YYYY-MM-DD (pega só os 10 primeiros chars)
  const d = dateStr.slice(0, 10);

  // Período personalizado tem prioridade
  if (filter.dateFrom || filter.dateTo) {
    if (filter.dateFrom && d < filter.dateFrom) return false;
    if (filter.dateTo && d > filter.dateTo) return false;
    return true;
  }

  // Filtro por mês+ano
  if (filter.month && filter.year) {
    const [y, m] = d.split("-");
    return y === filter.year && m === filter.month;
  }

  // Só ano
  if (filter.year && !filter.month) {
    return d.startsWith(filter.year);
  }

  // Sem filtro → mostra tudo
  return true;
}

export function formatPeriodLabel(filter: DateFilter): string {
  if (filter.dateFrom || filter.dateTo) {
    const from = filter.dateFrom ? filter.dateFrom.split("-").reverse().join("/") : "...";
    const to = filter.dateTo ? filter.dateTo.split("-").reverse().join("/") : "...";
    return `${from} – ${to}`;
  }
  if (filter.month && filter.year) {
    const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${months[parseInt(filter.month) - 1]}/${filter.year}`;
  }
  if (filter.year) return filter.year;
  return "Todo o histórico";
}

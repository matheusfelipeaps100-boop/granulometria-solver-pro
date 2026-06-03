import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DateFilter } from "@/lib/dateFilter";

const MONTHS = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

interface DateRangeFilterProps {
  value: DateFilter;
  onChange: (v: DateFilter) => void;
  placeholderFrom?: string;
  placeholderTo?: string;
}

export function DateRangeFilter({ value, onChange, placeholderFrom, placeholderTo }: DateRangeFilterProps) {
  const isHistorico = !value.month && !value.year && !value.dateFrom && !value.dateTo;

  const handleVerHistorico = () =>
    onChange({ month: "", year: "", dateFrom: "", dateTo: "" });

  const hasPeriodo = value.dateFrom || value.dateTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Mês */}
      <Select
        value={value.month || "all"}
        onValueChange={(v) =>
          onChange({ ...value, month: v === "all" ? "" : v, dateFrom: "", dateTo: "" })
        }
        disabled={!!hasPeriodo}
      >
        <SelectTrigger className="h-9 w-[130px] text-xs">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os meses</SelectItem>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Ano */}
      <Select
        value={value.year || "all"}
        onValueChange={(v) =>
          onChange({ ...value, year: v === "all" ? "" : v, dateFrom: "", dateTo: "" })
        }
        disabled={!!hasPeriodo}
      >
        <SelectTrigger className="h-9 w-[90px] text-xs">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {YEARS.map((y) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-xs text-muted-foreground">ou</span>

      {/* Data Inicial */}
      <Input
        type="date"
        className="h-9 w-[160px] text-xs"
        value={value.dateFrom}
        placeholder={placeholderFrom}
        onChange={(e) =>
          onChange({ ...value, dateFrom: e.target.value, month: "", year: "" })
        }
      />

      {/* Data Final */}
      <Input
        type="date"
        className="h-9 w-[160px] text-xs"
        value={value.dateTo}
        placeholder={placeholderTo}
        onChange={(e) =>
          onChange({ ...value, dateTo: e.target.value, month: "", year: "" })
        }
      />

      {/* Ver Histórico — sempre visível */}
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 text-xs"
        onClick={handleVerHistorico}
        disabled={isHistorico}
      >
        <History className="h-3.5 w-3.5" />
        Ver Histórico
      </Button>
    </div>
  );
}

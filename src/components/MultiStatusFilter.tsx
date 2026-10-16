import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface MultiStatusFilterProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

/** Filtro de status com seleção múltipla. Lista vazia = todos os status. */
export function MultiStatusFilter({ options, value, onChange, className }: MultiStatusFilterProps) {
  const label =
    value.length === 0
      ? "Todos status"
      : value.length === 1
        ? options.find((o) => o.value === value[0])?.label ?? "1 status"
        : `${value.length} status`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full sm:w-[190px] justify-between font-normal", className)}>
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-1" align="start">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
          >
            <Checkbox
              checked={value.includes(o.value)}
              onCheckedChange={(checked) =>
                onChange(checked ? [...value, o.value] : value.filter((v) => v !== o.value))
              }
            />
            {o.label}
          </label>
        ))}
        {value.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => onChange([])}>
            Limpar seleção
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

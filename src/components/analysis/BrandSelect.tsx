import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMaterialBrands, MaterialBrandTipo } from "@/hooks/api/useMaterialBrands";

interface BrandSelectProps {
  tipo: MaterialBrandTipo;
  value?: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}

export function BrandSelect({ tipo, value, onChange, placeholder }: BrandSelectProps) {
  const [open, setOpen] = useState(false);
  const { brands, isLoading } = useMaterialBrands(tipo);

  // Marca inativa selecionada em análise antiga continua aparecendo na lista,
  // para não "sumir" a informação histórica ao reabrir o registro.
  const selected = brands.find((b) => b.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={isLoading}
        >
          <span className="truncate">
            {selected ? selected.nome : placeholder ?? "Selecionar marca..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar marca..." />
          <CommandList>
            <CommandEmpty>Nenhuma marca cadastrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                Não informado
              </CommandItem>
              {brands.map((brand) => (
                <CommandItem
                  key={brand.id}
                  value={brand.nome}
                  onSelect={() => {
                    onChange(brand.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === brand.id ? "opacity-100" : "opacity-0")} />
                  {brand.nome}
                  {!brand.ativo && <span className="ml-2 text-xs text-muted-foreground">(inativa)</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface DB_Sieve {
  id: number;
  abertura_mm: number;
  nome: string;
  ordem: number;
  usa_no_mf: boolean;
}

export function useSieves() {
  const { data: sieves = [], isLoading, error } = useQuery({
    queryKey: ["sieves"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sieves")
        .select("*")
        .order("ordem", { ascending: true });
      
      if (error) throw error;
      return data as DB_Sieve[];
    },
    // Peneiras são estáticas, cache longo
    staleTime: 1000 * 60 * 60,
  });

  return { sieves, isLoading, error };
}

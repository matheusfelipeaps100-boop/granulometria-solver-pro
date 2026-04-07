import { useAuth } from "./useAuth";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QualityReport } from "@/types/database.types";

export function useQualityReports() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch quality reports for organization
  const { data: reports, isLoading, error } = useQuery({
    queryKey: ["quality_reports", profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_reports")
        .select("*")
        .eq("organization_id", profile!.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as QualityReport[]) || [];
    },
  });

  // Create or update quality report
  const createReportMutation = useMutation({
    mutationFn: async (draft: Partial<QualityReport>) => {
      const { data, error } = await supabase
        .from("quality_reports")
        .upsert({
          ...draft,
          organization_id: profile!.organization_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality_reports", profile?.organization_id] });
    },
  });

  // Update PDF URL in report
  const updatePdfUrlMutation = useMutation({
    mutationFn: async ({ reportId, pdfUrl }: { reportId: string; pdfUrl: string }) => {
      const { data, error } = await supabase
        .from("quality_reports")
        .update({ pdf_url: pdfUrl, status: "finalizado" })
        .eq("id", reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality_reports", profile?.organization_id] });
    },
  });

  // Delete report
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("quality_reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality_reports", profile?.organization_id] });
    },
  });

  // Get single report with PDF
  const getReportQuery = (reportId?: string) => {
    return useQuery({
      queryKey: ["quality_report", reportId],
      enabled: !!reportId,
      queryFn: async () => {
        const { data, error } = await supabase
          .from("quality_reports")
          .select("*")
          .eq("id", reportId!)
          .single();

        if (error) throw error;
        return data as QualityReport;
      },
    });
  };

  return {
    reports,
    isLoading,
    error,
    createReport: createReportMutation.mutate,
    updatePdfUrl: updatePdfUrlMutation.mutate,
    deleteReport: deleteReportMutation.mutate,
    getReport: getReportQuery,
    isCreating: createReportMutation.isPending,
    isUpdating: updatePdfUrlMutation.isPending,
    isDeleting: deleteReportMutation.isPending,
  };
}

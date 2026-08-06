import { useState } from "react";
import { supabase } from "@/lib/supabase";

export interface UploadProgress {
  isLoading: boolean;
  progress: number;
  error: string | null;
}

export function useQualityReportStorage() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isLoading: false,
    progress: 0,
    error: null,
  });

  const uploadReportPDF = async (
    batchId: string,
    organizationId: string,
    pdfBlob: Blob,
    filename: string
  ): Promise<string | null> => {
    try {
      setUploadProgress({ isLoading: true, progress: 0, error: null });

      // Caminho: {organizationId}/batches/{batchId}/reports/{filename}
      // O primeiro segmento precisa ser o organization_id para bater com a
      // policy de RLS do bucket (storage.foldername(name))[1] = organization_id.
      const filePath = `${organizationId}/batches/${batchId}/reports/${filename}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("quality-reports")
        .upload(filePath, pdfBlob, {
          cacheControl: "60",
          upsert: true,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("quality-reports")
        .getPublicUrl(filePath);

      // Cache-buster: o caminho é sempre o mesmo (upsert por lote), então sem
      // isso o CDN pode continuar servindo uma versão antiga do PDF por um
      // tempo mesmo após reenviar um laudo atualizado.
      const pdfUrl = publicUrlData?.publicUrl
        ? `${publicUrlData.publicUrl}?v=${Date.now()}`
        : undefined;

      setUploadProgress({ isLoading: false, progress: 100, error: null });

      return pdfUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setUploadProgress({
        isLoading: false,
        progress: 0,
        error: errorMessage,
      });
      return null;
    }
  };

  const deleteReportPDF = async (filePath: string): Promise<boolean> => {
    try {
      setUploadProgress({ isLoading: true, progress: 0, error: null });

      const { error } = await supabase.storage
        .from("quality-reports")
        .remove([filePath]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }

      setUploadProgress({ isLoading: false, progress: 100, error: null });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setUploadProgress({
        isLoading: false,
        progress: 0,
        error: errorMessage,
      });
      return false;
    }
  };

  return {
    uploadProgress,
    uploadReportPDF,
    deleteReportPDF,
  };
}

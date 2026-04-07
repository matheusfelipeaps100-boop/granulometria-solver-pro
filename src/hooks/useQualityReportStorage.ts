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

      // Crear ruta: org/{organizationId}/batches/{batchId}/reports/{filename}
      const filePath = `org/${organizationId}/batches/${batchId}/reports/${filename}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("quality-reports")
        .upload(filePath, pdfBlob, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("quality-reports")
        .getPublicUrl(filePath);

      const pdfUrl = publicUrlData?.publicUrl;

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

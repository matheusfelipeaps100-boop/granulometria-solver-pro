import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function StorageTestComponent() {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fileSize, setFileSize] = useState(0);

  if (!profile?.organization_id) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>Você precisa estar autenticado com organização</AlertDescription>
      </Alert>
    );
  }

  // Gerar PDF de teste simples
  const generateTestPdf = async (): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 800, 600);

      ctx.fillStyle = "#333333";
      ctx.font = "bold 32px Arial";
      ctx.fillText("Relatório de Qualidade - TESTE", 50, 100);

      ctx.font = "16px Arial";
      ctx.fillText(`Data: ${new Date().toLocaleString("pt-BR")}`, 50, 150);
      ctx.fillText(`Organização: ${profile.organization_id}`, 50, 180);
      ctx.fillText(`Usuário: ${profile.full_name || "Anônimo"}`, 50, 210);

      ctx.fillStyle = "#00aa00";
      ctx.font = "bold 20px Arial";
      ctx.fillText("✓ PDF gerado com sucesso via canvas", 50, 300);

      ctx.fillStyle = "#0066ff";
      ctx.fillRect(50, 400, 300, 100);
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px Arial";
      ctx.fillText("Teste de Upload para", 70, 440);
      ctx.fillText("Supabase Storage", 70, 470);
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      });
    });
  };

  const handleUpload = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      // Gerar PDF de teste
      const pdfBlob = await generateTestPdf();
      setFileSize(pdfBlob.size);

      // Nome do arquivo: org/{orgId}/batches/test/report-{timestamp}.pdf
      const timestamp = new Date().getTime();
      const filePath = `${profile.organization_id}/batches/test/report-${timestamp}.pdf`;

      // Upload para Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from("quality-reports")
        .upload(filePath, pdfBlob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "application/pdf",
        });

      if (uploadError) {
        throw new Error(`Upload falhou: ${uploadError.message}`);
      }

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from("quality-reports")
        .getPublicUrl(filePath);

      const pdfUrl = publicUrlData?.publicUrl;

      if (pdfUrl) {
        setUploadedUrl(pdfUrl);
        setSuccess(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!uploadedUrl) return;

    try {
      setIsLoading(true);

      // Extract path from URL
      const urlParts = uploadedUrl.split("/storage/v1/object/public/quality-reports/")[1];
      if (!urlParts) throw new Error("URL inválida");

      const { error } = await supabase.storage
        .from("quality-reports")
        .remove([urlParts]);

      if (error) {
        throw error;
      }

      setUploadedUrl(null);
      setSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao deletar";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧪 Teste Storage - Quality Reports</CardTitle>
        <CardDescription>
          Teste upload/download de PDFs no Supabase Storage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Sucesso!</AlertTitle>
            <AlertDescription>Operação concluída com sucesso</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Organização: {profile.organization_id}</p>
          <p className="text-sm font-medium">Usuário: {profile.full_name || "Anônimo"}</p>
        </div>

        {uploadedUrl ? (
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-xs font-mono break-all">{uploadedUrl}</p>
            </div>

            <div className="flex gap-2">
              <a
                href={uploadedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button className="w-full">📥 Baixar PDF</Button>
              </a>
              <Button
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Tamanho: {(fileSize / 1024).toFixed(2)} KB
            </div>
          </div>
        ) : (
          <Button
            onClick={handleUpload}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Teste Upload de PDF
              </>
            )}
          </Button>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>📝 Este teste:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Gera um PDF via Canvas (sem dependências)</li>
            <li>Faz upload para Supabase Storage</li>
            <li>Obtém URL pública e permite download</li>
            <li>Permite deletar o arquivo</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

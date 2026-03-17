import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useToast } from "@/hooks/use-toast";

interface DownloadableFile {
  id: string;
  nome: string;
  file_url: string;
}

export function useZipDownload() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const downloadAsZip = async (files: DownloadableFile[], zipName = "arquivos.zip") => {
    if (!files.length) return;
    setDownloading(true);

    try {
      const zip = new JSZip();
      const nameCount: Record<string, number> = {};

      await Promise.all(
        files.map(async (file) => {
          try {
            const res = await fetch(file.file_url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();

            // Handle duplicate names
            let name = file.nome;
            if (nameCount[name]) {
              const dotIdx = name.lastIndexOf(".");
              const base = dotIdx > 0 ? name.slice(0, dotIdx) : name;
              const ext = dotIdx > 0 ? name.slice(dotIdx) : "";
              name = `${base} (${nameCount[name]})${ext}`;
            }
            nameCount[file.nome] = (nameCount[file.nome] || 0) + 1;

            zip.file(name, blob);
          } catch {
            console.warn(`Failed to fetch ${file.nome}`);
          }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, zipName);
      toast({ title: "Download concluído" });
    } catch {
      toast({ title: "Erro ao gerar ZIP", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return { downloading, downloadAsZip };
}

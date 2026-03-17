import { useState, useEffect, useRef, useMemo } from "react";
import FilePreviewDialog from "./FilePreviewDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  ArrowUpDown,
  Download,
  Trash2,
  FileText,
  FileImage,
  FileArchive,
  File,
  PackageOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useZipDownload } from "./useZipDownload";

interface ArquivoRow {
  id: string;
  nome: string;
  file_url: string;
  storage_path: string | null;
  created_at: string;
}

interface GenericFileTabProps {
  projetoId: string;
  workspaceId: string;
  tabName: string;
}

const ACCEPTED_FORMATS =
  ".pdf,.dwg,.skp,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.zip";

type SortMode = "date" | "alpha" | "extension";

function getFileExtension(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function getFileIcon(ext: string) {
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return <FileImage className="size-4 text-emerald-500" />;
  if (["pdf", "doc", "docx"].includes(ext))
    return <FileText className="size-4 text-red-500" />;
  if (["zip", "rar", "7z"].includes(ext))
    return <FileArchive className="size-4 text-amber-500" />;
  return <File className="size-4 text-muted-foreground" />;
}

const GenericFileTab = ({ projetoId, workspaceId, tabName }: GenericFileTabProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ArquivoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [deleteTarget, setDeleteTarget] = useState<ArquivoRow | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const { downloading, downloadAsZip } = useZipDownload();

  const IMAGE_EXTS_G = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
  const PDF_EXTS_G = ["pdf"];

  const abaKey = tabName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

  const loadFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("arquivos")
      .select("id, nome, file_url, storage_path, created_at")
      .eq("projeto_id", projetoId)
      .eq("aba", abaKey)
      .is("revisao_id", null)
      .order("created_at", { ascending: false });

    if (!error) setFiles((data as ArquivoRow[]) ?? []);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => {
    loadFiles();
  }, [projetoId, abaKey]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = e.target.files;
    if (!sel?.length) return;

    setUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    for (const file of Array.from(sel)) {
      const storagePath = `${projetoId}/${abaKey}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("project-files")
        .upload(storagePath, file);

      if (uploadErr) {
        toast({ title: `Erro ao enviar ${file.name}`, variant: "destructive" });
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("project-files").getPublicUrl(storagePath);

      await supabase.from("arquivos").insert({
        projeto_id: projetoId,
        workspace_id: workspaceId,
        nome: file.name,
        file_url: publicUrl,
        storage_path: storagePath,
        aba: abaKey,
        uploaded_by: userId ?? null,
      });
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    loadFiles();
    toast({ title: "Arquivos enviados com sucesso" });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.storage_path) {
      await supabase.storage.from("project-files").remove([deleteTarget.storage_path]);
    }
    await supabase.from("arquivos").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    loadFiles();
    toast({ title: "Arquivo excluído" });
  };

  const filtered = useMemo(() => {
    let result = files;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.nome.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      if (sortMode === "alpha") return a.nome.localeCompare(b.nome);
      if (sortMode === "extension")
        return getFileExtension(a.nome).localeCompare(getFileExtension(b.nome));
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [files, search, sortMode]);

  const previewableFiles = useMemo(
    () => filtered.filter((f) => {
      const e = getFileExtension(f.nome);
      return IMAGE_EXTS_G.includes(e) || PDF_EXTS_G.includes(e);
    }),
    [filtered]
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((f) => f.id)));
    }
  };

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar arquivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="size-8">
              <ArrowUpDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortMode("date")} className={sortMode === "date" ? "font-semibold" : ""}>
              Data de upload
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortMode("alpha")} className={sortMode === "alpha" ? "font-semibold" : ""}>
              Alfabética
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortMode("extension")} className={sortMode === "extension" ? "font-semibold" : ""}>
              Extensão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input ref={fileInputRef} type="file" accept={ACCEPTED_FORMATS} multiple className="hidden" onChange={handleUpload} />
        <Button size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Plus className="size-3.5" />
          {uploading ? "Enviando..." : "Adicionar"}
        </Button>
      </div>

      {/* Select all + bulk actions */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              className="size-3.5"
            />
            Selecionar todos
          </label>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              disabled={!someSelected || downloading}
              onClick={() => {
                const toDownload = filtered.filter((f) => selected.has(f.id));
                downloadAsZip(toDownload, `${tabName}.zip`);
              }}
            >
              <PackageOpen className="size-3" />
              Baixar selecionados (.zip)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              disabled={downloading}
              onClick={() => downloadAsZip(filtered, `${tabName}_todos.zip`)}
            >
              <Download className="size-3" />
              Baixar todos (.zip)
            </Button>
          </div>
        </div>
      )}

      {/* File list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {search ? "Nenhum arquivo encontrado." : "Nenhum arquivo nesta aba."}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((file) => {
            const ext = getFileExtension(file.nome);
            const isPreviewable = IMAGE_EXTS_G.includes(ext) || PDF_EXTS_G.includes(ext);
            const pIdx = previewableFiles.findIndex((f) => f.id === file.id);
            return (
              <div
                key={file.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group ${isPreviewable ? "cursor-pointer" : ""}`}
              >
                <Checkbox
                  checked={selected.has(file.id)}
                  onCheckedChange={() => toggleSelect(file.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="size-3.5 shrink-0"
                />
                <div
                  className="flex items-center gap-3 flex-1 min-w-0"
                  onClick={() => isPreviewable && pIdx !== -1 && setPreviewIndex(pIdx)}
                >
                  {getFileIcon(ext)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{file.nome}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ext.toUpperCase()} · {new Date(file.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="size-7" onClick={(e) => { e.stopPropagation(); window.open(file.file_url, "_blank"); }}>
                    <Download className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(file); }}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File preview */}
      {previewIndex !== null && previewableFiles[previewIndex] && (
        <FilePreviewDialog
          open
          onClose={() => setPreviewIndex(null)}
          fileUrl={previewableFiles[previewIndex].file_url}
          fileName={previewableFiles[previewIndex].nome}
          files={previewableFiles}
          currentIndex={previewIndex}
          onNavigate={setPreviewIndex}
        />
      )}
    </div>
  );
};

export default GenericFileTab;

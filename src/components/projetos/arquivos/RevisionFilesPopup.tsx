import { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Eye,
  LayoutList,
  Grid2x2,
  Grid3x3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Revisao } from "@/services/subetapas";
import FilePreviewDialog, { canPreviewFile, isPdfFile } from "./FilePreviewDialog";
import PdfThumbnail from "./PdfThumbnail";
import { useZipDownload } from "./useZipDownload";

interface ArquivoRow {
  id: string;
  nome: string;
  file_url: string;
  storage_path: string | null;
  created_at: string;
}

interface RevisionFilesPopupProps {
  open: boolean;
  onClose: () => void;
  projetoId: string;
  workspaceId: string;
  revision: Revisao;
  revisionLabel: string;
  parentName: string;
}

const ACCEPTED_FORMATS =
  ".pdf,.dwg,.skp,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.zip";

type SortMode = "date" | "alpha" | "extension";
type ViewMode = "list" | "small" | "medium" | "large";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];

function getFileExtension(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function getFileIcon(ext: string, size = "size-4") {
  if (IMAGE_EXTS.includes(ext))
    return <FileImage className={`${size} text-emerald-500`} />;
  if (["pdf", "doc", "docx"].includes(ext))
    return <FileText className={`${size} text-red-500`} />;
  if (["zip", "rar", "7z"].includes(ext))
    return <FileArchive className={`${size} text-amber-500`} />;
  return <File className={`${size} text-muted-foreground`} />;
}

const VIEW_OPTIONS: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
  { mode: "list", label: "Lista", icon: <LayoutList className="size-4" /> },
  { mode: "small", label: "Ícones pequenos", icon: <Grid3x3 className="size-4" /> },
  { mode: "medium", label: "Ícones médios", icon: <Grid2x2 className="size-4" /> },
  { mode: "large", label: "Ícones grandes", icon: <Grid2x2 className="size-5" /> },
];

const RevisionFilesPopup = ({
  open,
  onClose,
  projetoId,
  workspaceId,
  revision,
  revisionLabel,
  parentName,
}: RevisionFilesPopupProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ArquivoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [deleteTarget, setDeleteTarget] = useState<ArquivoRow | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const { downloading, downloadAsZip } = useZipDownload();

  const loadFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("arquivos")
      .select("id, nome, file_url, storage_path, created_at")
      .eq("projeto_id", projetoId)
      .eq("revisao_id", revision.id)
      .order("created_at", { ascending: false });

    if (!error) setFiles((data as ArquivoRow[]) ?? []);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => {
    if (open) loadFiles();
  }, [open, revision.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = e.target.files;
    if (!sel?.length) return;

    setUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    for (const file of Array.from(sel)) {
      const storagePath = `${projetoId}/${revision.id}/${Date.now()}_${file.name}`;
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
        revisao_id: revision.id,
        aba: "projeto",
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
    () => filtered.filter((f) => canPreviewFile(f.nome)),
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

  const needsWideDialog = viewMode !== "list";
  const dialogMaxW = needsWideDialog ? "max-w-4xl" : "max-w-lg";

  const renderGrid = () => {
    const gridClass =
      viewMode === "small"
        ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8"
        : viewMode === "medium"
        ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"
        : "grid-cols-2 sm:grid-cols-3";

    const iconSize = viewMode === "small" ? "size-6" : viewMode === "medium" ? "size-10" : "size-16";
    const thumbSize = viewMode === "small" ? "h-16" : viewMode === "medium" ? "h-28" : "h-44";

    return (
      <div className={`grid ${gridClass} gap-2`}>
        {filtered.map((file) => {
          const ext = getFileExtension(file.nome);
          const isImage = IMAGE_EXTS.includes(ext);
          const isPdf = isPdfFile(file.nome);
          const isPreviewable = canPreviewFile(file.nome);
          const pIdx = previewableFiles.findIndex((f) => f.id === file.id);

          return (
            <div
              key={file.id}
              className={`group relative flex flex-col items-center border border-border rounded-lg p-2 hover:bg-muted/30 transition-colors ${isPreviewable ? "cursor-pointer" : ""}`}
              onClick={() => isPreviewable && pIdx !== -1 && setPreviewIndex(pIdx)}
            >
              {selectMode && (
                <div className="absolute top-1 left-1 z-10">
                  <Checkbox
                    checked={selected.has(file.id)}
                    onCheckedChange={() => toggleSelect(file.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="size-3.5"
                  />
                </div>
              )}
              {isImage ? (
                <img
                  src={file.file_url}
                  alt={file.nome}
                  className={`${thumbSize} w-full object-cover rounded`}
                  loading="lazy"
                />
              ) : isPdf ? (
                <PdfThumbnail
                  fileUrl={file.file_url}
                  className={`${thumbSize} w-full overflow-hidden`}
                />
              ) : (
                <div className={`${thumbSize} w-full flex items-center justify-center bg-muted/30 rounded`}>
                  {getFileIcon(ext, iconSize)}
                </div>
              )}
              <p className="text-[11px] text-foreground truncate w-full text-center mt-1 font-medium">
                {file.nome}
              </p>
              {/* Hover actions */}
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-6"
                  onClick={(e) => { e.stopPropagation(); window.open(file.file_url, "_blank"); }}
                >
                  <Download className="size-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-6 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(file); }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className={`${dialogMaxW} max-h-[80vh] flex flex-col`}>
          <DialogHeader className="bg-primary rounded-lg px-4 py-3 -mx-2 -mt-1">
            <DialogTitle className="text-base text-primary-foreground font-semibold uppercase tracking-wide">
              {revisionLabel}  {parentName.toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
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

            {/* View mode */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-8">
                  <Eye className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {VIEW_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.mode}
                    onClick={() => setViewMode(opt.mode)}
                    className={viewMode === opt.mode ? "font-semibold" : ""}
                  >
                    <span className="mr-2">{opt.icon}</span>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Select toggle + bulk actions */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between gap-2 px-1">
              <Button
                variant={selectMode ? "secondary" : "outline"}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => {
                  setSelectMode((prev) => {
                    if (prev) setSelected(new Set());
                    return !prev;
                  });
                }}
              >
                <Checkbox
                  checked={selectMode && allSelected}
                  onCheckedChange={() => {
                    if (!selectMode) {
                      setSelectMode(true);
                      setSelected(new Set(filtered.map((f) => f.id)));
                    } else {
                      toggleSelectAll();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="size-3.5"
                />
                Selecionar
              </Button>
              {selectMode && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    disabled={!someSelected || downloading}
                    onClick={() => {
                      const toDownload = filtered.filter((f) => selected.has(f.id));
                      downloadAsZip(toDownload, `${revisionLabel}_${parentName}.zip`);
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
                    onClick={() => downloadAsZip(filtered, `${revisionLabel}_${parentName}_todos.zip`)}
                  >
                    <Download className="size-3" />
                    Baixar todos (.zip)
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* File list / grid */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {search ? "Nenhum arquivo encontrado." : "Nenhum arquivo nesta revisão."}
              </div>
            ) : viewMode === "list" ? (
              <div className="space-y-1">
                {filtered.map((file) => {
                  const ext = getFileExtension(file.nome);
                  const isPreviewable = canPreviewFile(file.nome);
                  const pIdx = previewableFiles.findIndex((f) => f.id === file.id);
                  return (
                    <div
                      key={file.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group ${isPreviewable ? "cursor-pointer" : ""}`}
                    >
                      {selectMode && (
                        <Checkbox
                          checked={selected.has(file.id)}
                          onCheckedChange={() => toggleSelect(file.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="size-3.5 shrink-0"
                        />
                      )}
                      <div
                        className="flex items-center gap-3 flex-1 min-w-0"
                        onClick={() => isPreviewable && pIdx !== -1 && setPreviewIndex(pIdx)}
                      >
                        {getFileIcon(ext)}
                        <span className="text-sm font-medium truncate text-foreground flex-1 min-w-0">
                          {file.nome}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {new Date(file.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={(e) => { e.stopPropagation(); window.open(file.file_url, "_blank"); }}
                        >
                          <Download className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(file); }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              renderGrid()
            )}
          </div>

          {/* Upload button */}
          <div className="pt-2 border-t border-border">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FORMATS}
              multiple
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Plus className="size-4" />
              {uploading ? "Enviando..." : "Adicionar arquivos"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
};

export default RevisionFilesPopup;

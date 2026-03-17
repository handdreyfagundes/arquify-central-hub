import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import FilePreviewDialog, { canPreviewFile, isPdfFile } from "./FilePreviewDialog";
import PdfThumbnail from "./PdfThumbnail";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  ChevronDown,
  Pencil,
  X,
  Save,
  Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useZipDownload } from "./useZipDownload";
import { cn } from "@/lib/utils";

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
  tabId: string;
  tabName: string;
}

const ACCEPTED_FORMATS =
  ".pdf,.dwg,.skp,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.zip,.mp4,.mov,.webm,.avi";

type SortMode = "newest" | "oldest" | "alpha" | "extension";
type ViewMode = "list" | "small" | "medium" | "large";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
const VIDEO_EXTS = ["mp4", "webm", "mov", "avi", "mkv"];

function getFileExtension(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function isVideoFile(name: string) {
  return VIDEO_EXTS.includes(getFileExtension(name));
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

/* ------------------------------------------------------------------ */
/*  Template types                                                      */
/* ------------------------------------------------------------------ */

export interface TabTemplate {
  id: string;
  name: string;
  sections: string[];
  viewMode: ViewMode;
}

const TEMPLATES_STORAGE_KEY = "arquify-tab-templates";

export function loadTabTemplates(): TabTemplate[] {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveTabTemplates(templates: TabTemplate[]) {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

/* ------------------------------------------------------------------ */
/*  Section storage helpers                                             */
/* ------------------------------------------------------------------ */

const SECTIONS_KEY = (pid: string, tabId: string) => `arquify-custom-tab-sections-${pid}-${tabId}`;
const FILE_SECTION_KEY = (pid: string, tabId: string) => `arquify-custom-tab-file-sections-${pid}-${tabId}`;

/* ------------------------------------------------------------------ */
/*  GenericFileTab                                                      */
/* ------------------------------------------------------------------ */

const GenericFileTab = ({ projetoId, workspaceId, tabId, tabName }: GenericFileTabProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Files --
  const [files, setFiles] = useState<ArquivoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSection, setUploadSection] = useState("");

  // -- Sections --
  const [sections, setSections] = useState<string[]>(["Geral"]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["Geral"]));
  const [fileSectionMap, setFileSectionMap] = useState<Record<string, string>>({});
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [renamingIdx, setRenamingIdx] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  // -- UI --
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("small");
  const [deleteTarget, setDeleteTarget] = useState<ArquivoRow | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const { downloading, downloadAsZip } = useZipDownload();

  // -- Save as template --
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  /* ---------------------------------------------------------------- */
  /*  Load persisted sections & file-section map                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    try {
      const storedSections = localStorage.getItem(SECTIONS_KEY(projetoId, tabId));
      const storedFileSections = localStorage.getItem(FILE_SECTION_KEY(projetoId, tabId));

      if (storedSections) {
        const parsed = JSON.parse(storedSections) as string[];
        setSections(parsed);
        setExpandedSections(new Set(parsed));
      } else {
        setSections(["Geral"]);
        setExpandedSections(new Set(["Geral"]));
      }

      if (storedFileSections) {
        setFileSectionMap(JSON.parse(storedFileSections));
      } else {
        setFileSectionMap({});
      }
    } catch {
      setSections(["Geral"]);
      setExpandedSections(new Set(["Geral"]));
      setFileSectionMap({});
    }
  }, [projetoId, tabId]);

  const saveSections = (nextSections: string[]) => {
    setSections(nextSections);
    localStorage.setItem(SECTIONS_KEY(projetoId, tabId), JSON.stringify(nextSections));
  };

  const saveFileSectionMap = (nextMap: Record<string, string>) => {
    setFileSectionMap(nextMap);
    localStorage.setItem(FILE_SECTION_KEY(projetoId, tabId), JSON.stringify(nextMap));
  };

  /* ---------------------------------------------------------------- */
  /*  Load files                                                       */
  /* ---------------------------------------------------------------- */

  const loadFiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("arquivos")
      .select("id, nome, file_url, storage_path, created_at")
      .eq("projeto_id", projetoId)
      .eq("aba", tabId)
      .is("revisao_id", null)
      .order("created_at", { ascending: false });

    if (!error) setFiles((data as ArquivoRow[]) ?? []);
    setSelected(new Set());
    setLoading(false);
  }, [projetoId, tabId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  /* ---------------------------------------------------------------- */
  /*  Section management                                               */
  /* ---------------------------------------------------------------- */

  const handleAddSection = () => {
    const name = newSectionName.trim();
    if (!name || sections.includes(name)) return;
    const updated = [...sections, name];
    saveSections(updated);
    setExpandedSections((prev) => new Set([...prev, name]));
    setNewSectionName("");
    setShowAddSection(false);
  };

  const handleRemoveSection = (name: string) => {
    if (sections.length <= 1) return;
    saveSections(sections.filter((s) => s !== name));
    const remaining = sections.filter((s) => s !== name);
    const newMap = { ...fileSectionMap };
    Object.keys(newMap).forEach((key) => {
      if (newMap[key] === name) newMap[key] = remaining[0];
    });
    saveFileSectionMap(newMap);
  };

  const startRename = (idx: number) => {
    setRenamingIdx(idx);
    setRenameValue(sections[idx]);
    setTimeout(() => renameRef.current?.focus(), 50);
  };

  const commitRename = () => {
    if (renamingIdx === null) return;
    const trimmed = renameValue.trim();
    const oldName = sections[renamingIdx];
    if (!trimmed || (trimmed !== oldName && sections.includes(trimmed))) {
      setRenamingIdx(null);
      return;
    }
    const updated = [...sections];
    updated[renamingIdx] = trimmed;
    saveSections(updated);

    const newMap = { ...fileSectionMap };
    Object.keys(newMap).forEach((key) => {
      if (newMap[key] === oldName) newMap[key] = trimmed;
    });
    saveFileSectionMap(newMap);

    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.delete(oldName);
      next.add(trimmed);
      return next;
    });
    setRenamingIdx(null);
  };

  const toggleSection = (name: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  /* ---------------------------------------------------------------- */
  /*  Upload                                                           */
  /* ---------------------------------------------------------------- */

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = e.target.files;
    if (!sel?.length || !uploadSection) return;

    setUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const newFileIds: string[] = [];

    for (const file of Array.from(sel)) {
      const storagePath = `${projetoId}/${tabId}/${Date.now()}_${file.name}`;
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

      const { data: inserted } = await supabase
        .from("arquivos")
        .insert({
          projeto_id: projetoId,
          workspace_id: workspaceId,
          nome: file.name,
          file_url: publicUrl,
          storage_path: storagePath,
          aba: tabId,
          uploaded_by: userId ?? null,
        })
        .select("id")
        .single();

      if (inserted) newFileIds.push(inserted.id);
    }

    const newMap = { ...fileSectionMap };
    newFileIds.forEach((id) => {
      newMap[id] = uploadSection;
    });
    saveFileSectionMap(newMap);

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    loadFiles();
    toast({ title: "Arquivos enviados com sucesso" });
  };

  const triggerUpload = (section: string) => {
    setUploadSection(section);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  /* ---------------------------------------------------------------- */
  /*  Delete                                                           */
  /* ---------------------------------------------------------------- */

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.storage_path) {
      await supabase.storage.from("project-files").remove([deleteTarget.storage_path]);
    }
    await supabase.from("arquivos").delete().eq("id", deleteTarget.id);

    const newMap = { ...fileSectionMap };
    delete newMap[deleteTarget.id];
    saveFileSectionMap(newMap);

    setDeleteTarget(null);
    loadFiles();
    toast({ title: "Arquivo excluído" });
  };

  /* ---------------------------------------------------------------- */
  /*  Filtering & sorting                                              */
  /* ---------------------------------------------------------------- */

  const getFilteredSorted = useCallback(
    (sectionFiles: ArquivoRow[]) => {
      let result = sectionFiles;
      if (search.trim()) {
        const q = search.toLowerCase();
        result = result.filter((f) => f.nome.toLowerCase().includes(q));
      }
      return [...result].sort((a, b) => {
        if (sortMode === "alpha") return a.nome.localeCompare(b.nome);
        if (sortMode === "extension")
          return getFileExtension(a.nome).localeCompare(getFileExtension(b.nome));
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return sortMode === "oldest" ? da - db : db - da;
      });
    },
    [search, sortMode]
  );

  const getFilesForSection = useCallback(
    (section: string) => {
      return files.filter((f) => (fileSectionMap[f.id] || sections[0]) === section);
    },
    [files, fileSectionMap, sections]
  );

  const allPreviewable = useMemo(
    () => files.filter((f) => canPreviewFile(f.nome)),
    [files]
  );

  /* ---------------------------------------------------------------- */
  /*  Select                                                           */
  /* ---------------------------------------------------------------- */

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ---------------------------------------------------------------- */
  /*  Save as template                                                 */
  /* ---------------------------------------------------------------- */

  const handleSaveTemplate = () => {
    const name = templateName.trim();
    if (!name) return;
    const templates = loadTabTemplates();
    const newTemplate: TabTemplate = {
      id: Date.now().toString(),
      name,
      sections: [...sections],
      viewMode,
    };
    templates.push(newTemplate);
    saveTabTemplates(templates);
    setShowSaveTemplate(false);
    setTemplateName("");
    toast({ title: "Modelo salvo com sucesso" });
  };

  /* ---------------------------------------------------------------- */
  /*  Render file grid/list per section                                */
  /* ---------------------------------------------------------------- */

  const renderFiles = (sectionFiles: ArquivoRow[]) => {
    const sorted = getFilteredSorted(sectionFiles);
    if (sorted.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic py-3 text-center">
          Nenhum arquivo nesta seção.
        </p>
      );
    }

    if (viewMode === "list") {
      return (
        <div className="space-y-1">
          {sorted.map((file) => {
            const ext = getFileExtension(file.nome);
            const isPreviewable = canPreviewFile(file.nome);
            const pIdx = allPreviewable.findIndex((f) => f.id === file.id);
            return (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group",
                  isPreviewable && "cursor-pointer"
                )}
                onClick={() => isPreviewable && pIdx !== -1 && setPreviewIndex(pIdx)}
              >
                {selectMode && (
                  <Checkbox
                    checked={selected.has(file.id)}
                    onCheckedChange={() => toggleSelect(file.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="size-3.5 shrink-0"
                  />
                )}
                {getFileIcon(ext)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{file.nome}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ext.toUpperCase()} · {new Date(file.created_at).toLocaleDateString("pt-BR")}
                  </p>
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
      );
    }

    // Grid modes
    const gridClass =
      viewMode === "small"
        ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8"
        : viewMode === "medium"
        ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"
        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";

    const thumbSize = viewMode === "small" ? "h-16" : viewMode === "medium" ? "h-28" : "h-44";
    const iconSize = viewMode === "small" ? "size-6" : viewMode === "medium" ? "size-10" : "size-16";

    return (
      <div className={`grid ${gridClass} gap-2`}>
        {sorted.map((file) => {
          const ext = getFileExtension(file.nome);
          const isImage = IMAGE_EXTS.includes(ext);
          const isPdf = isPdfFile(file.nome);
          const isVideo = isVideoFile(file.nome);
          const isPreviewable = canPreviewFile(file.nome);
          const pIdx = allPreviewable.findIndex((f) => f.id === file.id);

          return (
            <div
              key={file.id}
              className={cn(
                "group relative flex flex-col items-center border border-border rounded-lg p-2 hover:bg-muted/30 transition-colors",
                isPreviewable && "cursor-pointer"
              )}
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
                <img src={file.file_url} alt="" className={`${thumbSize} w-full object-cover rounded`} loading="lazy" />
              ) : isPdf ? (
                <PdfThumbnail fileUrl={file.file_url} className={`${thumbSize} w-full overflow-hidden`} />
              ) : isVideo ? (
                <div className={`${thumbSize} w-full flex items-center justify-center bg-muted/30 rounded relative`}>
                  <video src={file.file_url} className="w-full h-full object-cover rounded" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="size-8 rounded-full bg-background/80 flex items-center justify-center">
                      <Play className="size-4 text-foreground ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`${thumbSize} w-full flex items-center justify-center bg-muted/30 rounded`}>
                  {getFileIcon(ext, iconSize)}
                </div>
              )}
              {/* Hover actions */}
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" size="icon" className="size-6" onClick={(e) => { e.stopPropagation(); window.open(file.file_url, "_blank"); }}>
                  <Download className="size-3" />
                </Button>
                <Button variant="secondary" size="icon" className="size-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(file); }}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar arquivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="size-8">
              <ArrowUpDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortMode("newest")} className={sortMode === "newest" ? "font-semibold" : ""}>
              Mais recente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortMode("oldest")} className={sortMode === "oldest" ? "font-semibold" : ""}>
              Mais antigo
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

        {/* Select mode */}
        <Button
          variant={selectMode ? "secondary" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => {
            setSelectMode((prev) => {
              if (prev) setSelected(new Set());
              return !prev;
            });
          }}
        >
          Selecionar
        </Button>

        {selectMode && selected.size > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={downloading}
            onClick={() => {
              const toDownload = files.filter((f) => selected.has(f.id));
              downloadAsZip(toDownload, `${tabName}.zip`);
            }}
          >
            <PackageOpen className="size-3" />
            Baixar selecionados (.zip)
          </Button>
        )}

        {/* Save as template */}
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          title="Salvar como modelo"
          onClick={() => {
            setTemplateName(tabName);
            setShowSaveTemplate(true);
          }}
        >
          <Save className="size-3.5" />
        </Button>
      </div>

      <input ref={fileInputRef} type="file" accept={ACCEPTED_FORMATS} multiple className="hidden" onChange={handleUpload} />

      {/* Sections */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, idx) => {
            const sectionFiles = getFilesForSection(section);
            const isExpanded = expandedSections.has(section);
            const isRenaming = renamingIdx === idx;

            return (
              <div key={section} className="border border-border rounded-lg overflow-hidden">
                {/* Section header */}
                <div
                  className="flex items-center gap-2 px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => !isRenaming && toggleSection(section)}
                >
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform shrink-0",
                      !isExpanded && "-rotate-90"
                    )}
                  />
                  {isRenaming ? (
                    <input
                      ref={renameRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setRenamingIdx(null);
                      }}
                      className="flex-1 bg-transparent border-b border-primary outline-none text-sm font-medium text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm font-medium text-foreground flex-1">{section}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{sectionFiles.length}</span>

                  {/* Section actions */}
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => triggerUpload(section)}
                      disabled={uploading}
                    >
                      <Plus className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => startRename(idx)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    {sections.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveSection(section)}
                      >
                        <X className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Section content */}
                {isExpanded && (
                  <div className="px-3 py-2">
                    {renderFiles(sectionFiles)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add section button */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowAddSection(true)}
          >
            <Plus className="size-3" />
            Nova seção
          </Button>
        </div>
      )}

      {/* Add section dialog */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Nova seção</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome da seção"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddSection(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAddSection} disabled={!newSectionName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as template dialog */}
      <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Salvar como modelo</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            O modelo salva apenas a estrutura (nome das seções e modo de visualização), sem arquivos.
          </p>
          <Input
            placeholder="Nome do modelo"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSaveTemplate(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveTemplate} disabled={!templateName.trim()}>Salvar</Button>
          </DialogFooter>
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
      {previewIndex !== null && allPreviewable[previewIndex] && (
        <FilePreviewDialog
          open
          onClose={() => setPreviewIndex(null)}
          fileUrl={allPreviewable[previewIndex].file_url}
          fileName={allPreviewable[previewIndex].nome}
          files={allPreviewable}
          currentIndex={previewIndex}
          onNavigate={setPreviewIndex}
        />
      )}
    </div>
  );
};

export default GenericFileTab;

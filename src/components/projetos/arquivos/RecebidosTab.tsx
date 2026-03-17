import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Plus,
  Search,
  Download,
  Trash2,
  FileText,
  FileImage,
  FileArchive,
  File,
  Eye,
  ChevronDown,
  ChevronRight,
  X,
  LayoutList,
  Grid2x2,
  Grid3x3,
  Pencil,
  ArrowUpDown,
  
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FilePreviewDialog, { canPreviewFile } from "./FilePreviewDialog";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ArquivoRow {
  id: string;
  nome: string;
  file_url: string;
  storage_path: string | null;
  created_at: string;
  etapa_id: string | null;
}

type ViewMode = "list" | "small" | "medium" | "large";
type SortDir = "newest" | "oldest" | "extension";

const ACCEPTED_FORMATS = ".pdf,.dwg,.skp,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.zip";
const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
const PDF_EXTS = ["pdf"];

const DEFAULT_SECTIONS = ["Cliente", "Outros"];
const DEFAULT_TYPES = ["Projeto estrutural", "Projeto elétrico", "Projeto hidráulico"];

const STORAGE_KEY_SECTIONS = (pid: string) => `arquify-recebidos-sections-${pid}`;
const STORAGE_KEY_TYPES = (pid: string) => `arquify-recebidos-types-${pid}`;
const STORAGE_KEY_FILE_TYPES = (pid: string) => `arquify-recebidos-file-types-${pid}`;

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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface RecebidosTabProps {
  projetoId: string;
  workspaceId: string;
}

const RecebidosTab = ({ projetoId, workspaceId }: RecebidosTabProps) => {
  const { toast } = useToast();

  // --- Sections state ---
  const [customSections, setCustomSections] = useState<string[]>([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([...DEFAULT_SECTIONS]));
  const [renamingSectionIdx, setRenamingSectionIdx] = useState<number | null>(null);
  const [renameSectionValue, setRenameSectionValue] = useState("");
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<string | null>(null);

  // --- Type categories state ---
  const [typeCategories, setTypeCategories] = useState<string[]>([...DEFAULT_TYPES]);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  // --- File-to-type mapping ---
  const [fileTypeMap, setFileTypeMap] = useState<Record<string, string>>({});

  // --- Files state ---
  const [files, setFiles] = useState<ArquivoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadSection, setUploadSection] = useState<string>("");

  // --- UI state ---
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortDir, setSortDir] = useState<SortDir>("newest");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterExt, setFilterExt] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<ArquivoRow | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const allSections = [...DEFAULT_SECTIONS, ...customSections];

  /* ---------------------------------------------------------------- */
  /*  Persistence helpers                                              */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY_SECTIONS(projetoId));
      if (s) setCustomSections(JSON.parse(s));
      const t = localStorage.getItem(STORAGE_KEY_TYPES(projetoId));
      if (t) setTypeCategories(JSON.parse(t));
      const ft = localStorage.getItem(STORAGE_KEY_FILE_TYPES(projetoId));
      if (ft) setFileTypeMap(JSON.parse(ft));
    } catch {}
  }, [projetoId]);

  const saveSections = (s: string[]) => {
    setCustomSections(s);
    localStorage.setItem(STORAGE_KEY_SECTIONS(projetoId), JSON.stringify(s));
  };

  const saveTypes = (t: string[]) => {
    setTypeCategories(t);
    localStorage.setItem(STORAGE_KEY_TYPES(projetoId), JSON.stringify(t));
  };

  const saveFileTypeMap = (m: Record<string, string>) => {
    setFileTypeMap(m);
    localStorage.setItem(STORAGE_KEY_FILE_TYPES(projetoId), JSON.stringify(m));
  };

  useEffect(() => {
    setExpandedSections(new Set([...DEFAULT_SECTIONS, ...customSections]));
  }, [customSections]);

  /* ---------------------------------------------------------------- */
  /*  Load files                                                       */
  /* ---------------------------------------------------------------- */

  const loadFiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("arquivos")
      .select("id, nome, file_url, storage_path, created_at, etapa_id")
      .eq("projeto_id", projetoId)
      .eq("aba", "recebidos")
      .is("revisao_id", null)
      .order("created_at", { ascending: false });

    if (!error) setFiles((data as ArquivoRow[]) ?? []);
    setLoading(false);
  }, [projetoId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  /* ---------------------------------------------------------------- */
  /*  We store the section in etapa_id field as a workaround text key  */
  /*  Actually we'll use a convention: storage_path prefix or a        */
  /*  separate approach. Let's use a simple localStorage map for       */
  /*  file→section mapping to avoid DB schema changes.                 */
  /* ---------------------------------------------------------------- */

  const [fileSectionMap, setFileSectionMap] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`arquify-recebidos-file-sections-${projetoId}`);
      if (stored) setFileSectionMap(JSON.parse(stored));
    } catch {}
  }, [projetoId]);

  const saveFileSectionMap = (m: Record<string, string>) => {
    setFileSectionMap(m);
    localStorage.setItem(`arquify-recebidos-file-sections-${projetoId}`, JSON.stringify(m));
  };

  /* ---------------------------------------------------------------- */
  /*  Section management                                               */
  /* ---------------------------------------------------------------- */

  const handleAddSection = () => {
    const name = newSectionName.trim();
    if (!name || allSections.includes(name)) return;
    saveSections([...customSections, name]);
    setNewSectionName("");
    setShowAddSection(false);
  };

  const handleRemoveSection = () => {
    if (!deleteSectionTarget || DEFAULT_SECTIONS.includes(deleteSectionTarget)) return;
    saveSections(customSections.filter((s) => s !== deleteSectionTarget));
    setDeleteSectionTarget(null);
  };

  const commitRenameSection = () => {
    if (renamingSectionIdx === null) return;
    const trimmed = renameSectionValue.trim();
    const oldName = customSections[renamingSectionIdx];
    if (!trimmed || (trimmed !== oldName && allSections.includes(trimmed))) {
      setRenamingSectionIdx(null);
      return;
    }
    const updated = [...customSections];
    updated[renamingSectionIdx] = trimmed;
    saveSections(updated);

    // Update file-section references
    const newMap = { ...fileSectionMap };
    Object.keys(newMap).forEach((k) => {
      if (newMap[k] === oldName) newMap[k] = trimmed;
    });
    saveFileSectionMap(newMap);
    setRenamingSectionIdx(null);
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
  /*  Type category management                                         */
  /* ---------------------------------------------------------------- */

  const handleAddType = () => {
    const name = newTypeName.trim();
    if (!name || typeCategories.includes(name)) return;
    saveTypes([...typeCategories, name]);
    setNewTypeName("");
    setShowAddType(false);
  };

  const handleRemoveType = (typeName: string) => {
    saveTypes(typeCategories.filter((t) => t !== typeName));
    // Clear from file mapping
    const newMap = { ...fileTypeMap };
    Object.keys(newMap).forEach((k) => {
      if (newMap[k] === typeName) delete newMap[k];
    });
    saveFileTypeMap(newMap);
  };

  const handleFileTypeChange = (fileId: string, typeName: string) => {
    const newMap = { ...fileTypeMap };
    if (typeName === "__none") {
      delete newMap[fileId];
    } else {
      newMap[fileId] = typeName;
    }
    saveFileTypeMap(newMap);
  };

  /* ---------------------------------------------------------------- */
  /*  Upload                                                           */
  /* ---------------------------------------------------------------- */

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = e.target.files;
    if (!sel?.length || !uploadSection) return;

    setUploading(uploadSection);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const newFileIds: string[] = [];

    for (const file of Array.from(sel)) {
      const storagePath = `${projetoId}/recebidos/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("project-files")
        .upload(storagePath, file);

      if (uploadErr) {
        toast({ title: `Erro ao enviar ${file.name}`, variant: "destructive" });
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from("project-files").getPublicUrl(storagePath);

      const { data: inserted } = await supabase
        .from("arquivos")
        .insert({
          projeto_id: projetoId,
          workspace_id: workspaceId,
          nome: file.name,
          file_url: publicUrl,
          storage_path: storagePath,
          aba: "recebidos",
          uploaded_by: userId ?? null,
        })
        .select("id")
        .single();

      if (inserted) newFileIds.push(inserted.id);
    }

    // Map new files to section
    const newSectionMap = { ...fileSectionMap };
    newFileIds.forEach((id) => {
      newSectionMap[id] = uploadSection;
    });
    saveFileSectionMap(newSectionMap);

    setUploading(null);
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

    // Clean up local maps
    const newSectionMap = { ...fileSectionMap };
    delete newSectionMap[deleteTarget.id];
    saveFileSectionMap(newSectionMap);
    const newTypeMap = { ...fileTypeMap };
    delete newTypeMap[deleteTarget.id];
    saveFileTypeMap(newTypeMap);

    setDeleteTarget(null);
    loadFiles();
    toast({ title: "Arquivo excluído" });
  };

  /* ---------------------------------------------------------------- */
  /*  Filtering & sorting                                              */
  /* ---------------------------------------------------------------- */

  const allExtensions = useMemo(() => {
    const exts = new Set(files.map((f) => getFileExtension(f.nome)).filter(Boolean));
    return Array.from(exts).sort();
  }, [files]);

  const getFilteredSorted = useCallback(
    (sectionFiles: ArquivoRow[]) => {
      let result = sectionFiles;

      if (search.trim()) {
        const q = search.toLowerCase();
        result = result.filter((f) => f.nome.toLowerCase().includes(q));
      }

      if (filterType) {
        result = result.filter((f) => fileTypeMap[f.id] === filterType);
      }

      if (filterExt) {
        result = result.filter((f) => getFileExtension(f.nome) === filterExt);
      }

      return [...result].sort((a, b) => {
        if (sortDir === "extension") {
          const extA = a.nome.split(".").pop()?.toLowerCase() || "";
          const extB = b.nome.split(".").pop()?.toLowerCase() || "";
          return extA.localeCompare(extB);
        }
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return sortDir === "newest" ? db - da : da - db;
      });
    },
    [search, filterType, filterExt, sortDir, fileTypeMap]
  );

  const getFilesForSection = useCallback(
    (section: string) => {
      return files.filter((f) => (fileSectionMap[f.id] || "Outros") === section);
    },
    [files, fileSectionMap]
  );

  // Previewable files across all sections
  const allPreviewable = useMemo(
    () => files.filter((f) => canPreviewFile(f.nome)),
    [files]
  );

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                    */
  /* ---------------------------------------------------------------- */

  const renderFileList = (sectionFiles: ArquivoRow[]) => {
    if (viewMode === "list") {
      return (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs">
                <th className="text-left py-2 px-3 font-medium">Arquivo</th>
                <th className="text-left py-2 px-3 font-medium w-28">Data</th>
                <th className="text-left py-2 px-3 font-medium w-44">Tipo</th>
                <th className="text-right py-2 px-3 font-medium w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sectionFiles.map((file) => {
                const ext = getFileExtension(file.nome);
                const isPreviewable = canPreviewFile(file.nome);
                const pIdx = allPreviewable.findIndex((f) => f.id === file.id);

                return (
                  <tr
                    key={file.id}
                    className={`border-t border-border hover:bg-muted/30 transition-colors ${isPreviewable ? "cursor-pointer" : ""}`}
                    onClick={() => isPreviewable && pIdx !== -1 && setPreviewIndex(pIdx)}
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(ext)}
                        <span className="truncate text-foreground font-medium">{file.nome}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">
                      {new Date(file.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={fileTypeMap[file.id] || "__none"}
                        onValueChange={(val) => handleFileTypeChange(file.id, val)}
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none" className="text-xs">—</SelectItem>
                          {typeCategories.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(file.file_url, "_blank");
                          }}
                        >
                          <Download className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(file);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Grid views
    const gridClass =
      viewMode === "small"
        ? "grid-cols-6 sm:grid-cols-8 md:grid-cols-10"
        : viewMode === "medium"
        ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"
        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";

    const iconSize = viewMode === "small" ? "size-6" : viewMode === "medium" ? "size-10" : "size-16";
    const thumbSize = viewMode === "small" ? "h-16" : viewMode === "medium" ? "h-28" : "h-44";

    return (
      <div className={`grid ${gridClass} gap-2`}>
        {sectionFiles.map((file) => {
          const ext = getFileExtension(file.nome);
          const isImage = IMAGE_EXTS.includes(ext);
          const isPreviewable = isImage || PDF_EXTS.includes(ext);
          const pIdx = allPreviewable.findIndex((f) => f.id === file.id);

          return (
            <div
              key={file.id}
              className={`group relative flex flex-col items-center border border-border rounded-lg p-2 hover:bg-muted/30 transition-colors ${isPreviewable ? "cursor-pointer" : ""}`}
              onClick={() => isPreviewable && pIdx !== -1 && setPreviewIndex(pIdx)}
            >
              {isImage ? (
                <img
                  src={file.file_url}
                  alt={file.nome}
                  className={`${thumbSize} w-full object-cover rounded`}
                  loading="lazy"
                />
              ) : (
                <div className={`${thumbSize} w-full flex items-center justify-center bg-muted/30 rounded`}>
                  {getFileIcon(ext, iconSize)}
                </div>
              )}
              <p className="text-[11px] text-foreground truncate w-full text-center mt-1 font-medium">
                {file.nome}
              </p>
              {fileTypeMap[file.id] && (
                <span className="text-[9px] bg-muted text-muted-foreground rounded px-1.5 py-0.5 mt-0.5 truncate max-w-full">
                  {fileTypeMap[file.id]}
                </span>
              )}
              {/* Hover actions */}
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(file.file_url, "_blank");
                  }}
                >
                  <Download className="size-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-6 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(file);
                  }}
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

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      {/* Top toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
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
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowUpDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortDir("newest")} className={sortDir === "newest" ? "font-semibold" : ""}>
              Mais recente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortDir("oldest")} className={sortDir === "oldest" ? "font-semibold" : ""}>
              Mais antigo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortDir("extension")} className={sortDir === "extension" ? "font-semibold" : ""}>
              Por extensão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={filterType || filterExt ? "secondary" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
            >
              <Filter className="size-3.5" />
              Filtros
              {(filterType || filterExt) && (
                <Badge variant="default" className="ml-1 text-[9px] px-1 py-0">
                  {[filterType, filterExt].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">Tipo</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setFilterType("")} className={!filterType ? "font-semibold" : ""}>
              Todos
            </DropdownMenuItem>
            {typeCategories.map((t) => (
              <DropdownMenuItem
                key={t}
                onClick={() => setFilterType(t)}
                className={filterType === t ? "font-semibold" : ""}
              >
                {t}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Extensão</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setFilterExt("")} className={!filterExt ? "font-semibold" : ""}>
              Todas
            </DropdownMenuItem>
            {allExtensions.map((ext) => (
              <DropdownMenuItem
                key={ext}
                onClick={() => setFilterExt(ext)}
                className={filterExt === ext ? "font-semibold" : ""}
              >
                .{ext.toUpperCase()}
              </DropdownMenuItem>
            ))}
            {(filterType || filterExt) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setFilterType("");
                    setFilterExt("");
                  }}
                  className="text-destructive"
                >
                  Limpar filtros
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Type categories manager */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              Categorias
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">Categorias de tipo</DropdownMenuLabel>
            {typeCategories.map((t) => (
              <DropdownMenuItem key={t} className="flex items-center justify-between">
                <span className="text-xs">{t}</span>
                <X
                  className="size-3 text-muted-foreground hover:text-destructive cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveType(t);
                  }}
                />
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowAddType(true)}>
              <Plus className="size-3.5 mr-2" />
              <span className="text-xs">Adicionar categoria</span>
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
                className={`gap-2 ${viewMode === opt.mode ? "font-semibold" : ""}`}
              >
                {opt.icon}
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Sections */}
          <div className="space-y-3">
            {allSections.map((section, idx) => {
              const isCustom = !DEFAULT_SECTIONS.includes(section);
              const customIdx = customSections.indexOf(section);
              const expanded = expandedSections.has(section);
              const sectionFiles = getFilteredSorted(getFilesForSection(section));
              const isRenaming = isCustom && renamingSectionIdx === customIdx;

              return (
                <div key={section} className="border border-border rounded-lg overflow-hidden">
                  {/* Section header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => !isRenaming && toggleSection(section)}
                  >
                    {expanded ? (
                      <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                    )}

                    {isRenaming ? (
                      <input
                        value={renameSectionValue}
                        onChange={(e) => setRenameSectionValue(e.target.value)}
                        onBlur={commitRenameSection}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRenameSection();
                          if (e.key === "Escape") setRenamingSectionIdx(null);
                        }}
                        className="bg-transparent border-b border-primary outline-none text-sm font-semibold text-foreground w-40"
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-semibold text-foreground flex-1">{section}</span>
                    )}

                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {sectionFiles.length}
                    </Badge>

                    {isCustom && !isRenaming && (
                      <div className="flex items-center gap-1 ml-1">
                        <Pencil
                          className="size-3 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingSectionIdx(customIdx);
                            setRenameSectionValue(section);
                          }}
                        />
                        <X
                          className="size-3 text-muted-foreground hover:text-destructive cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteSectionTarget(section);
                          }}
                        />
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] gap-1 ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerUpload(section);
                      }}
                      disabled={!!uploading}
                    >
                      <Plus className="size-3" />
                      {uploading === section ? "Enviando..." : "Adicionar"}
                    </Button>
                  </div>

                  {/* Section content */}
                  {expanded && (
                    <div className="p-3">
                      {sectionFiles.length === 0 ? (
                        <p className="text-center text-muted-foreground text-xs py-4">
                          Nenhum arquivo nesta seção.
                        </p>
                      ) : (
                        renderFileList(sectionFiles)
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add section button */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowAddSection(true)}
          >
            <Plus className="size-3.5" />
            Nova seção
          </Button>
        </>
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
            <Button variant="outline" size="sm" onClick={() => setShowAddSection(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleAddSection} disabled={!newSectionName.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add type category dialog */}
      <Dialog open={showAddType} onOpenChange={setShowAddType}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Nova categoria de tipo</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome da categoria"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddType()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddType(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleAddType} disabled={!newTypeName.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete section confirmation */}
      <AlertDialog open={!!deleteSectionTarget} onOpenChange={(v) => !v && setDeleteSectionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir seção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a seção "{deleteSectionTarget}"? Os arquivos serão movidos para "Outros".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveSection}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete file confirmation */}
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

export default RecebidosTab;

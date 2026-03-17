import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Plus,
  Trash2,
  CalendarDays,
  ImagePlus,
  CheckSquare,
  Send,
  ArrowUpDown,
  X,
  Calendar,
  Play,
  ChevronDown,
  Eye,
  LayoutList,
  Grid2x2,
  Grid3x3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { listEtapasByProjeto } from "@/services/etapas";
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
}

interface VisitaRow {
  id: string;
  numero_visita: number;
  data_visita: string;
}

interface ObraTabProps {
  projetoId: string;
  workspaceId: string;
}

const MEDIA_ACCEPT = "image/*,video/*";
const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
const VIDEO_EXTS = ["mp4", "webm", "mov", "avi", "mkv"];

function getFileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function isMediaFile(name: string) {
  const ext = getFileExt(name);
  return IMAGE_EXTS.includes(ext) || VIDEO_EXTS.includes(ext);
}

function isVideoFile(name: string) {
  return VIDEO_EXTS.includes(getFileExt(name));
}

type ViewMode = "list" | "small" | "medium" | "large";

const VIEW_OPTIONS: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
  { mode: "list", label: "Lista", icon: <LayoutList className="size-4" /> },
  { mode: "small", label: "Ícones pequenos", icon: <Grid3x3 className="size-4" /> },
  { mode: "medium", label: "Ícones médios", icon: <Grid2x2 className="size-4" /> },
  { mode: "large", label: "Ícones grandes", icon: <Grid2x2 className="size-5" /> },
];

type SortMode = "newest" | "oldest" | "date_specific" | "date_range";

function normalizeStageLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isLevantamentoLabel(value: string) {
  const normalized = normalizeStageLabel(value);
  return normalized.includes("levantamento") || normalized.includes("leavantamento");
}

/* ------------------------------------------------------------------ */
/*  MediaGrid — reusable thumbnail grid                                */
/* ------------------------------------------------------------------ */

interface MediaGridProps {
  files: ArquivoRow[];
  editMode: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onPreview: (idx: number) => void;
  onDelete: (file: ArquivoRow) => void;
  previewableFiles: ArquivoRow[];
  viewMode: ViewMode;
}

const MediaGrid = ({
  files,
  editMode,
  selected,
  onToggleSelect,
  onPreview,
  onDelete,
  previewableFiles,
  viewMode,
}: MediaGridProps) => {
  if (files.length === 0)
    return (
      <p className="text-sm text-muted-foreground italic py-4 text-center">
        Nenhuma mídia ainda. Clique em + para adicionar.
      </p>
    );

  if (viewMode === "list") {
    return (
      <div className="space-y-1">
        {files.map((file) => {
          const isPreviewable = canPreviewFile(file.nome);
          const pIdx = previewableFiles.findIndex((f) => f.id === file.id);
          const ext = getFileExt(file.nome).toUpperCase();
          const dateStr = new Date(file.created_at).toLocaleDateString("pt-BR");

          return (
            <div
              key={file.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group",
                isPreviewable && !editMode && "cursor-pointer"
              )}
              onClick={() => {
                if (editMode) onToggleSelect(file.id);
                else if (isPreviewable && pIdx !== -1) onPreview(pIdx);
              }}
            >
              {editMode && (
                <Checkbox
                  checked={selected.has(file.id)}
                  onCheckedChange={() => onToggleSelect(file.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="size-3.5 shrink-0"
                />
              )}
              <div className="size-10 rounded overflow-hidden shrink-0 bg-muted/30">
                {isVideoFile(file.nome) ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="size-4 text-muted-foreground" />
                  </div>
                ) : (
                  <img src={file.file_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  {ext} · {dateStr}
                </p>
              </div>
              {!editMode && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(file); }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
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

  return (
    <div className={`grid ${gridClass} gap-2`}>
      {files.map((file) => {
        const isVideo = isVideoFile(file.nome);
        const isPreviewable = canPreviewFile(file.nome);
        const pIdx = previewableFiles.findIndex((f) => f.id === file.id);

        return (
          <div
            key={file.id}
            className={cn(
              "group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/20 transition-all",
              editMode && selected.has(file.id) && "ring-2 ring-primary border-primary",
              isPreviewable && !editMode && "cursor-pointer hover:ring-1 hover:ring-primary/50"
            )}
            onClick={() => {
              if (editMode) {
                onToggleSelect(file.id);
              } else if (isPreviewable && pIdx !== -1) {
                onPreview(pIdx);
              }
            }}
          >
            {/* Thumbnail */}
            {isVideo ? (
              <div className="w-full h-full flex items-center justify-center bg-muted/40">
                <video
                  src={file.file_url}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-10 rounded-full bg-background/80 flex items-center justify-center">
                    <Play className="size-5 text-foreground ml-0.5" />
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={file.file_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}

            {/* Edit mode checkbox */}
            {editMode && (
              <div className="absolute top-1.5 left-1.5 z-10">
                <Checkbox
                  checked={selected.has(file.id)}
                  onCheckedChange={() => onToggleSelect(file.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="size-4 bg-background/80 border-background/80"
                />
              </div>
            )}

            {/* Delete on hover (non-edit) */}
            {!editMode && (
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-6 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(file);
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  ObraTab main component                                             */
/* ------------------------------------------------------------------ */

const ObraTab = ({ projetoId, workspaceId }: ObraTabProps) => {
  const { toast } = useToast();

  // -- Data --
  const [levantamentoDate, setLevantamentoDate] = useState<string | null>(null);
  const [levantamentoFiles, setLevantamentoFiles] = useState<ArquivoRow[]>([]);
  const [visitas, setVisitas] = useState<VisitaRow[]>([]);
  const [visitaFilesMap, setVisitaFilesMap] = useState<Record<string, ArquivoRow[]>>({});
  const [loading, setLoading] = useState(true);

  // -- Edit mode --
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // -- Upload --
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string>(""); // "levantamento" or visita_id
  const [uploading, setUploading] = useState(false);

  // -- New visit dialog --
  const [showNewVisit, setShowNewVisit] = useState(false);
  const [newVisitDate, setNewVisitDate] = useState<Date | undefined>(new Date());

  // -- Delete --
  const [deleteTarget, setDeleteTarget] = useState<ArquivoRow | null>(null);
  const [deleteVisitTarget, setDeleteVisitTarget] = useState<VisitaRow | null>(null);

  // -- Preview --
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // -- Sort/filter --
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [filterRangeFrom, setFilterRangeFrom] = useState<Date | undefined>();
  const [filterRangeTo, setFilterRangeTo] = useState<Date | undefined>();

  // -- View mode --
  const [viewMode, setViewMode] = useState<ViewMode>("medium");

  // -- Collapsible --
  const [levantamentoOpen, setLevantamentoOpen] = useState(true);
  const [visitasOpen, setVisitasOpen] = useState(true);
  const [visitaOpenMap, setVisitaOpenMap] = useState<Record<string, boolean>>({});

  const toggleVisitaOpen = (id: string) => {
    setVisitaOpenMap((prev) => ({ ...prev, [id]: prev[id] === false ? true : !(prev[id] ?? true) }));
  };

  // -- Drag & drop --
  const [dragOver, setDragOver] = useState<string | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Load levantamento date from Cronograma (live sync)               */
  /*  Searches both etapas and subetapas for "levantamento"            */
  /* ---------------------------------------------------------------- */

  const loadLevantamentoDate = useCallback(async () => {
    try {
      const stages = await listEtapasByProjeto(projetoId);

      // 1) Check if there's a main stage named "levantamento"
      const levStage = stages.find((s) => isLevantamentoLabel(s.nome));
      if (levStage) {
        setLevantamentoDate(levStage.data_inicio || levStage.data_fim || null);
        return;
      }

      // 2) Otherwise search subetapas across all stages
      for (const stage of stages) {
        const { data: subs } = await supabase
          .from("subetapas")
          .select("nome, data_entrega")
          .eq("etapa_id", stage.id)
          .order("ordem");

        if (subs) {
          const levSub = subs.find((s) => isLevantamentoLabel(s.nome));
          if (levSub?.data_entrega) {
            setLevantamentoDate(levSub.data_entrega);
            return;
          }
        }
      }

      setLevantamentoDate(null);
    } catch {}
  }, [projetoId]);

  useEffect(() => {
    loadLevantamentoDate();
  }, [loadLevantamentoDate]);

  // Realtime subscription for live sync with Cronograma (etapas + subetapas)
  useEffect(() => {
    const channel = supabase
      .channel(`obra-levantamento-sync-${projetoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "etapas",
          filter: `projeto_id=eq.${projetoId}`,
        },
        () => loadLevantamentoDate()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subetapas",
        },
        () => loadLevantamentoDate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projetoId, loadLevantamentoDate]);

  /* ---------------------------------------------------------------- */
  /*  Load files & visits                                              */
  /* ---------------------------------------------------------------- */

  const loadData = useCallback(async () => {
    setLoading(true);

    // Load levantamento files (aba=obra, etapa_id is null, revisao_id=null, and we use a convention: storage_path starts with projectId/obra/levantamento)
    const { data: allObraFiles } = await supabase
      .from("arquivos")
      .select("id, nome, file_url, storage_path, created_at")
      .eq("projeto_id", projetoId)
      .eq("aba", "obra")
      .is("revisao_id", null)
      .order("created_at", { ascending: false });

    const obraFiles = (allObraFiles as ArquivoRow[]) ?? [];

    // Separate levantamento files (etapa_id is null and no visita reference)
    // We'll use a convention: files with storage_path containing /obra/levantamento/ are levantamento
    // files with /obra/visita_{id}/ belong to that visita
    const levFiles: ArquivoRow[] = [];
    const visitFiles: Record<string, ArquivoRow[]> = {};

    obraFiles.forEach((f) => {
      const path = f.storage_path || "";
      if (path.includes("/obra/levantamento/")) {
        levFiles.push(f);
      } else {
        // Extract visita id from path: /obra/visita_{visitaId}/
        const match = path.match(/\/obra\/visita_([^/]+)\//);
        if (match) {
          const vid = match[1];
          if (!visitFiles[vid]) visitFiles[vid] = [];
          visitFiles[vid].push(f);
        } else {
          // Default to levantamento for unmatched
          levFiles.push(f);
        }
      }
    });

    setLevantamentoFiles(levFiles);

    // Load visitas
    const { data: visitasData } = await supabase
      .from("visitas_obra")
      .select("id, numero_visita, data_visita")
      .eq("projeto_id", projetoId)
      .order("numero_visita", { ascending: true });

    const vlist = (visitasData as VisitaRow[]) ?? [];
    setVisitas(vlist);
    setVisitaFilesMap(visitFiles);
    setLoading(false);
  }, [projetoId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---------------------------------------------------------------- */
  /*  All previewable files for gallery navigation                     */
  /* ---------------------------------------------------------------- */

  const allFiles = useMemo(() => {
    const vFiles = Object.values(visitaFilesMap).flat();
    return [...levantamentoFiles, ...vFiles];
  }, [levantamentoFiles, visitaFilesMap]);

  const previewableFiles = useMemo(
    () => allFiles.filter((f) => canPreviewFile(f.nome)),
    [allFiles]
  );

  /* ---------------------------------------------------------------- */
  /*  Upload                                                           */
  /* ---------------------------------------------------------------- */

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = e.target.files;
    if (!sel?.length || !uploadTarget) return;

    setUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const subPath =
      uploadTarget === "levantamento"
        ? `${projetoId}/obra/levantamento`
        : `${projetoId}/obra/visita_${uploadTarget}`;

    for (const file of Array.from(sel)) {
      if (!isMediaFile(file.name)) {
        toast({ title: `${file.name} não é foto ou vídeo`, variant: "destructive" });
        continue;
      }

      const storagePath = `${subPath}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("project-files")
        .upload(storagePath, file);

      if (uploadErr) {
        toast({ title: `Erro ao enviar ${file.name}`, variant: "destructive" });
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from("project-files").getPublicUrl(storagePath);

      await supabase.from("arquivos").insert({
        projeto_id: projetoId,
        workspace_id: workspaceId,
        nome: file.name,
        file_url: publicUrl,
        storage_path: storagePath,
        aba: "obra",
        uploaded_by: userId ?? null,
      });
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    loadData();
    toast({ title: "Mídia enviada com sucesso" });
  };

  const triggerUpload = (target: string) => {
    setUploadTarget(target);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  /* ---------------------------------------------------------------- */
  /*  Drag & Drop                                                      */
  /* ---------------------------------------------------------------- */

  const handleDrop = async (e: React.DragEvent, target: string) => {
    e.preventDefault();
    setDragOver(null);
    const files = e.dataTransfer.files;
    if (!files.length) return;

    setUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const subPath =
      target === "levantamento"
        ? `${projetoId}/obra/levantamento`
        : `${projetoId}/obra/visita_${target}`;

    for (const file of Array.from(files)) {
      if (!isMediaFile(file.name)) continue;

      const storagePath = `${subPath}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("project-files")
        .upload(storagePath, file);

      if (uploadErr) continue;

      const { data: { publicUrl } } = supabase.storage.from("project-files").getPublicUrl(storagePath);

      await supabase.from("arquivos").insert({
        projeto_id: projetoId,
        workspace_id: workspaceId,
        nome: file.name,
        file_url: publicUrl,
        storage_path: storagePath,
        aba: "obra",
        uploaded_by: userId ?? null,
      });
    }

    setUploading(false);
    loadData();
    toast({ title: "Mídia enviada com sucesso" });
  };

  /* ---------------------------------------------------------------- */
  /*  Selection                                                        */
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
  /*  Delete file                                                      */
  /* ---------------------------------------------------------------- */

  const handleDeleteFile = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.storage_path) {
      await supabase.storage.from("project-files").remove([deleteTarget.storage_path]);
    }
    await supabase.from("arquivos").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(deleteTarget.id);
      return next;
    });
    loadData();
    toast({ title: "Arquivo excluído" });
  };

  /* ---------------------------------------------------------------- */
  /*  Bulk delete selected                                             */
  /* ---------------------------------------------------------------- */

  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const handleBulkDelete = async () => {
    const toDelete = allFiles.filter((f) => selected.has(f.id));
    const storagePaths = toDelete.map((f) => f.storage_path).filter(Boolean) as string[];

    if (storagePaths.length > 0) {
      await supabase.storage.from("project-files").remove(storagePaths);
    }

    const ids = toDelete.map((f) => f.id);
    await supabase.from("arquivos").delete().in("id", ids);

    setSelected(new Set());
    setShowBulkDelete(false);
    loadData();
    toast({ title: `${toDelete.length} arquivo(s) excluído(s)` });
  };

  /* ---------------------------------------------------------------- */
  /*  Create visit                                                     */
  /* ---------------------------------------------------------------- */

  const handleCreateVisit = async () => {
    if (!newVisitDate) return;
    const nextNum = visitas.length + 1;
    const dateStr = format(newVisitDate, "yyyy-MM-dd");

    await supabase.from("visitas_obra").insert({
      projeto_id: projetoId,
      workspace_id: workspaceId,
      numero_visita: nextNum,
      data_visita: dateStr,
    });

    setShowNewVisit(false);
    setNewVisitDate(new Date());
    loadData();
    toast({ title: `Visita ${String(nextNum).padStart(2, "0")} criada` });
  };

  /* ---------------------------------------------------------------- */
  /*  Delete visit                                                     */
  /* ---------------------------------------------------------------- */

  const handleDeleteVisit = async () => {
    if (!deleteVisitTarget) return;

    // Delete visit files from storage
    const vFiles = visitaFilesMap[deleteVisitTarget.id] || [];
    const paths = vFiles.map((f) => f.storage_path).filter(Boolean) as string[];
    if (paths.length > 0) {
      await supabase.storage.from("project-files").remove(paths);
    }
    const ids = vFiles.map((f) => f.id);
    if (ids.length > 0) {
      await supabase.from("arquivos").delete().in("id", ids);
    }

    await supabase.from("visitas_obra").delete().eq("id", deleteVisitTarget.id);
    setDeleteVisitTarget(null);
    loadData();
    toast({ title: "Visita excluída" });
  };

  /* ---------------------------------------------------------------- */
  /*  Send to Ata de Obra draft                                        */
  /* ---------------------------------------------------------------- */

  const handleSendToAta = async () => {
    if (selected.size === 0) return;

    const selectedIds = Array.from(selected);

    // Insert into obra_draft_media
    const rows = selectedIds.map((id) => ({
      projeto_id: projetoId,
      workspace_id: workspaceId,
      arquivo_id: id,
    }));

    const { error } = await supabase.from("obra_draft_media").insert(rows);

    if (error) {
      toast({ title: "Erro ao preparar ata", variant: "destructive" });
      return;
    }

    toast({
      title: `${selectedIds.length} mídia(s) preparada(s) para nova Ata de Obra`,
      description: "Disponível no módulo Atas e Relatórios.",
    });

    setSelected(new Set());
    setEditMode(false);
  };

  /* ---------------------------------------------------------------- */
  /*  Sort / filter helpers                                            */
  /* ---------------------------------------------------------------- */

  /** Check if a section date passes the active date filter */
  const sectionDateMatches = useCallback(
    (sectionDate: string | null): boolean => {
      if (sortMode === "date_specific" && filterDate) {
        if (!sectionDate) return false;
        const target = format(filterDate, "yyyy-MM-dd");
        return sectionDate.startsWith(target);
      }
      if (sortMode === "date_range" && filterRangeFrom && filterRangeTo) {
        if (!sectionDate) return false;
        const t = new Date(sectionDate + "T00:00:00").getTime();
        const from = filterRangeFrom.getTime();
        const to = filterRangeTo.getTime() + 86400000;
        return t >= from && t < to;
      }
      return true; // no filter active
    },
    [sortMode, filterDate, filterRangeFrom, filterRangeTo]
  );

  /** Sort visitas by their visit date according to sortMode */
  const sortedVisitas = useMemo(() => {
    let filtered = visitas.filter((v) => sectionDateMatches(v.data_visita));
    return [...filtered].sort((a, b) => {
      const da = new Date(a.data_visita + "T00:00:00").getTime();
      const db = new Date(b.data_visita + "T00:00:00").getTime();
      return sortMode === "oldest" ? da - db : db - da;
    });
  }, [visitas, sortMode, sectionDateMatches]);

  /** Whether levantamento section passes the date filter */
  const showLevantamento = useMemo(
    () => sectionDateMatches(levantamentoDate),
    [sectionDateMatches, levantamentoDate]
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const formattedLevDate = levantamentoDate
    ? new Date(levantamentoDate + "T00:00:00").toLocaleDateString("pt-BR")
    : "Data não definida";

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={MEDIA_ACCEPT}
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <ArrowUpDown className="size-3.5" />
                Ordenar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => { setSortMode("newest"); setFilterDate(undefined); setFilterRangeFrom(undefined); setFilterRangeTo(undefined); }}
                className={sortMode === "newest" ? "font-semibold" : ""}
              >
                Mais recente
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setSortMode("oldest"); setFilterDate(undefined); setFilterRangeFrom(undefined); setFilterRangeTo(undefined); }}
                className={sortMode === "oldest" ? "font-semibold" : ""}
              >
                Mais antigo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSortMode("date_specific")}
                className={sortMode === "date_specific" ? "font-semibold" : ""}
              >
                Data específica
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortMode("date_range")}
                className={sortMode === "date_range" ? "font-semibold" : ""}
              >
                Intervalo de datas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date pickers for filter modes */}
          {sortMode === "date_specific" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Calendar className="size-3.5" />
                  {filterDate ? format(filterDate, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarWidget
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          )}

          {sortMode === "date_range" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <Calendar className="size-3.5" />
                    {filterRangeFrom ? format(filterRangeFrom, "dd/MM/yyyy") : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarWidget
                    mode="single"
                    selected={filterRangeFrom}
                    onSelect={setFilterRangeFrom}
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <Calendar className="size-3.5" />
                    {filterRangeTo ? format(filterRangeTo, "dd/MM/yyyy") : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarWidget
                    mode="single"
                    selected={filterRangeTo}
                    onSelect={setFilterRangeTo}
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </>
          )}

          {(sortMode === "date_specific" || sortMode === "date_range") && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => {
                setSortMode("newest");
                setFilterDate(undefined);
                setFilterRangeFrom(undefined);
                setFilterRangeTo(undefined);
              }}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        {/* View mode */}
        <div className="flex items-center gap-2">
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

          {/* Edit mode toggle */}
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              setEditMode((prev) => {
                if (prev) setSelected(new Set());
                return !prev;
              });
            }}
          >
            <CheckSquare className="size-3.5" />
            {editMode ? "Sair da seleção" : "Selecionar"}
          </Button>
        </div>
      </div>

      {/* Edit mode actions */}
      {editMode && selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
          <span className="text-xs text-muted-foreground font-medium">
            {selected.size} selecionado(s)
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setShowBulkDelete(true)}
          >
            <Trash2 className="size-3" />
            Excluir seleção
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleSendToAta}
          >
            <Send className="size-3" />
            Encaminhar para nova Ata de Obra
          </Button>
        </div>
      )}

      {/* ============================================================ */}
      {/*  LEVANTAMENTO SECTION                                         */}
      {/* ============================================================ */}

      <section>
        <button
          className="flex items-center gap-2 mb-3 w-full text-left group"
          onClick={() => setLevantamentoOpen((v) => !v)}
        >
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", !levantamentoOpen && "-rotate-90")} />
          <h3 className="text-base font-semibold text-foreground">Levantamento</h3>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {formattedLevDate}
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={(e) => { e.stopPropagation(); triggerUpload("levantamento"); }}
            disabled={uploading}
          >
            <ImagePlus className="size-3.5" />
            {uploading && uploadTarget === "levantamento" ? "Enviando..." : "Adicionar"}
          </Button>
        </button>

        {levantamentoOpen && (
          <div
            className={cn(
              "rounded-lg border-2 border-dashed p-4 transition-colors min-h-[120px]",
              dragOver === "levantamento" ? "border-primary bg-primary/5" : "border-border"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver("levantamento"); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, "levantamento")}
          >
            <MediaGrid
              files={levantamentoFiles}
              editMode={editMode}
              selected={selected}
              onToggleSelect={toggleSelect}
              onPreview={setPreviewIndex}
              onDelete={setDeleteTarget}
              previewableFiles={previewableFiles}
              viewMode={viewMode}
            />
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/*  VISITAS SECTION                                              */}
      {/* ============================================================ */}

      <section>
        <button
          className="flex items-center gap-2 mb-3 w-full text-left"
          onClick={() => setVisitasOpen((v) => !v)}
        >
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", !visitasOpen && "-rotate-90")} />
          <h3 className="text-base font-semibold text-foreground">Visitas</h3>
          <div className="flex-1" />
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={(e) => { e.stopPropagation(); setShowNewVisit(true); }}
          >
            <Plus className="size-3.5" />
            Nova Visita
          </Button>
        </button>

        {visitasOpen && (
          <>
            {visitas.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center">
                Nenhuma visita registrada. Clique em "Nova Visita" para começar.
              </p>
            ) : (
              <div className="space-y-5">
                {sortedVisitas.map((visita) => {
                  const vFiles = visitaFilesMap[visita.id] || [];
                  const visitLabel = `Visita ${String(visita.numero_visita).padStart(2, "0")}`;
                  const visitDateLabel = new Date(visita.data_visita + "T00:00:00").toLocaleDateString("pt-BR");
                  const isVisitaOpen = visitaOpenMap[visita.id] !== false;

                  return (
                    <div key={visita.id}>
                      <button
                        className="flex items-center gap-2 mb-2 w-full text-left"
                        onClick={() => toggleVisitaOpen(visita.id)}
                      >
                        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", !isVisitaOpen && "-rotate-90")} />
                        <h4 className="text-sm font-semibold text-foreground">{visitLabel}</h4>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {visitDateLabel}
                        </span>
                        <div className="flex-1" />
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => triggerUpload(visita.id)}
                            disabled={uploading}
                          >
                            <ImagePlus className="size-3.5" />
                            {uploading && uploadTarget === visita.id ? "Enviando..." : "Adicionar"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteVisitTarget(visita)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </button>

                      {isVisitaOpen && (
                        <div
                          className={cn(
                            "rounded-lg border-2 border-dashed p-3 transition-colors min-h-[80px]",
                            dragOver === visita.id ? "border-primary bg-primary/5" : "border-border"
                          )}
                          onDragOver={(e) => { e.preventDefault(); setDragOver(visita.id); }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={(e) => handleDrop(e, visita.id)}
                        >
                          <MediaGrid
                            files={vFiles}
                            editMode={editMode}
                            selected={selected}
                            onToggleSelect={toggleSelect}
                            onPreview={setPreviewIndex}
                            onDelete={setDeleteTarget}
                            previewableFiles={previewableFiles}
                            viewMode={viewMode}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* ============================================================ */}
      {/*  DIALOGS                                                      */}
      {/* ============================================================ */}

      {/* New Visit Dialog */}
      <Dialog open={showNewVisit} onOpenChange={setShowNewVisit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Nova Visita</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <CalendarWidget
              mode="single"
              selected={newVisitDate}
              onSelect={setNewVisitDate}
              className={cn("p-3 pointer-events-auto")}
              locale={ptBR}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowNewVisit(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateVisit} disabled={!newVisitDate}>
              Criar Visita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete file confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete visit confirmation */}
      <AlertDialog open={!!deleteVisitTarget} onOpenChange={(v) => !v && setDeleteVisitTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir visita</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir Visita {String(deleteVisitTarget?.numero_visita).padStart(2, "0")} e todos os seus arquivos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVisit}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir seleção</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir {selected.size} arquivo(s) selecionado(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File preview */}
      {previewIndex !== null && previewableFiles[previewIndex] && (
        <FilePreviewDialog
          open={true}
          onClose={() => setPreviewIndex(null)}
          fileUrl={previewableFiles[previewIndex].file_url}
          fileName={previewableFiles[previewIndex].nome}
          files={previewableFiles.map((f) => ({
            nome: f.nome,
            file_url: f.file_url,
          }))}
          currentIndex={previewIndex}
          onNavigate={setPreviewIndex}
        />
      )}
    </div>
  );
};

export default ObraTab;

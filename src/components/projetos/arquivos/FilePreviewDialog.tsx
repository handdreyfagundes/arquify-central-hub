import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";

interface FilePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  /** All previewable files for navigation */
  files?: { file_url: string; nome: string }[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
const PDF_EXTS = ["pdf"];
const OFFICE_EXTS = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];
const IFRAME_EXTS = [...PDF_EXTS, ...OFFICE_EXTS, "dwg"];

function getExt(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

export function canPreviewFile(fileName: string) {
  const ext = getExt(fileName);
  return IMAGE_EXTS.includes(ext) || IFRAME_EXTS.includes(ext);
}

/** Returns a thumbnail-friendly URL for grid views. Images get their own URL, PDFs/Office get null. */
export function getThumbnailUrl(fileName: string, fileUrl: string): string | null {
  const ext = getExt(fileName);
  if (IMAGE_EXTS.includes(ext)) return fileUrl;
  if (PDF_EXTS.includes(ext)) return fileUrl; // will be rendered as mini embed
  return null;
}

export function isPdfFile(fileName: string) {
  return PDF_EXTS.includes(getExt(fileName));
}

const FilePreviewDialog = ({
  open,
  onClose,
  fileUrl,
  fileName,
  files,
  currentIndex,
  onNavigate,
}: FilePreviewDialogProps) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const ext = getExt(fileName);
  const isImage = IMAGE_EXTS.includes(ext);
  const isPdf = PDF_EXTS.includes(ext);
  const isOffice = OFFICE_EXTS.includes(ext) || ext === "dwg";

  const hasPrev = files && currentIndex !== undefined && currentIndex > 0;
  const hasNext = files && currentIndex !== undefined && currentIndex < files.length - 1;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setZoom(1);
      setIsFullscreen(false);
      onClose();
    }
  };

  if (!isImage && !isPdf && !isOffice) return null;

  // Google Docs Viewer for Office/DWG files
  const viewerUrl = isOffice
    ? `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`
    : fileUrl;

  const sizeClasses = isFullscreen
    ? "max-w-[100vw] max-h-[100vh] w-[100vw] h-[100vh] rounded-none"
    : "max-w-[90vw] max-h-[90vh] w-auto";

  const contentHeight = isFullscreen ? "h-[calc(100vh-44px)]" : "min-h-[60vh] max-h-[80vh]";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`${sizeClasses} p-0 border-none bg-black/95 overflow-hidden [&>button]:hidden`}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-black/80 border-b border-white/10">
          <p className="text-sm text-white/80 truncate max-w-[50vw]">{fileName}</p>
          <div className="flex items-center gap-1">
            {isImage && (
              <>
                <Button variant="ghost" size="icon" className="size-8 text-white/70 hover:text-white hover:bg-white/10" onClick={handleZoomOut}>
                  <ZoomOut className="size-4" />
                </Button>
                <span className="text-xs text-white/50 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" className="size-8 text-white/70 hover:text-white hover:bg-white/10" onClick={handleZoomIn}>
                  <ZoomIn className="size-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setIsFullscreen((f) => !f)}
              title={isFullscreen ? "Sair do fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="size-8 text-white/70 hover:text-white hover:bg-white/10" onClick={() => window.open(fileUrl, "_blank")}>
              <Download className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8 text-white/70 hover:text-white hover:bg-white/10" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex items-center justify-center ${contentHeight} overflow-auto relative`}>
          {hasPrev && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 z-10 size-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
              onClick={() => { setZoom(1); onNavigate?.(currentIndex! - 1); }}
            >
              <ChevronLeft className="size-5" />
            </Button>
          )}
          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 z-10 size-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
              onClick={() => { setZoom(1); onNavigate?.(currentIndex! + 1); }}
            >
              <ChevronRight className="size-5" />
            </Button>
          )}

          {isImage && (
            <img
              src={fileUrl}
              alt={fileName}
              className={`max-w-full object-contain transition-transform duration-200 ${isFullscreen ? "max-h-[calc(100vh-52px)]" : "max-h-[78vh]"}`}
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
            />
          )}
          {(isPdf || isOffice) && (
            <iframe
              src={viewerUrl}
              title={fileName}
              className={`border-none bg-white ${isFullscreen ? "w-full h-full" : "w-[85vw] h-[78vh]"}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewDialog;

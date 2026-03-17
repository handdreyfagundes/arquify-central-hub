import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfThumbnailProps {
  fileUrl: string;
  className?: string;
}

const PdfThumbnail = ({ fileUrl, className = "" }: PdfThumbnailProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const pdf = await pdfjsLib.getDocument(fileUrl).promise;
        if (cancelled) return;
        const page = await pdf.getPage(1);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Render at a size that fits the container
        const containerWidth = canvas.parentElement?.clientWidth || 200;
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    render();
    return () => { cancelled = true; };
  }, [fileUrl]);

  if (error) return null; // fallback handled by parent

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded">
          <div className="size-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain rounded"
        style={{ display: loading ? "none" : "block" }}
      />
    </div>
  );
};

export default PdfThumbnail;

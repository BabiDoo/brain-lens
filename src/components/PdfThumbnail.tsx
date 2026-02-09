
import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLibModule from 'pdfjs-dist';
// @ts-ignore
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Handle ESM import structure where default export might contain the library
// @ts-ignore
const pdfjsLib = pdfjsLibModule.default || pdfjsLibModule;

// Ensure the worker is configured with a locally bundled file to avoid CDN fetch issues.
if (pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
}


// Global cache for PDF document promises to prevent reloading the same PDF 
// multiple times for different thumbnails, which causes "Transport destroyed" errors.
const pdfDocCache = new Map<string, Promise<any>>();

interface Props {
  pdfBase64: string | null;
  pageNumber: number;
  scale?: number;
  className?: string;
  contain?: boolean;
}

const PdfThumbnail: React.FC<Props> = ({ pdfBase64, pageNumber, scale = 1.5, className, contain = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfBase64 || !canvasRef.current) return;

    let mounted = true;
    let renderTask: any = null;

    const render = async () => {
      try {
        setLoading(true);
        setPageError(null);

        // Use a cached promise for the document to ensure we don't spam the worker
        // with multiple transport connections for the same file.
        let docPromise = pdfDocCache.get(pdfBase64);

        if (!docPromise) {
          const binaryString = window.atob(pdfBase64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const loadingTask = pdfjsLib.getDocument({
            data: bytes,
            // These help reduce memory/transport overhead
            disableAutoFetch: true,
            disableStream: true,
            // Setting verbosity to 0 suppresses noise in console during transport errors
            verbosity: 0
          });
          docPromise = loadingTask.promise;

          // Clean up cache if the document fails to load to allow retries
          docPromise.catch(() => {
            if (pdfDocCache.get(pdfBase64) === docPromise) {
              pdfDocCache.delete(pdfBase64);
            }
          });

          pdfDocCache.set(pdfBase64, docPromise);
        }

        const pdfDoc = await docPromise;

        if (!mounted) return;

        // Range and Type validation
        const totalPages = pdfDoc.numPages;
        if (totalPages <= 0) {
          throw new Error("Document has no pages");
        }

        // Ensure pageNumber is a valid integer. Coerce NaNs or nulls to 1.
        const safeInputPage = Number.isFinite(pageNumber) ? pageNumber : 1;
        const requestedPage = Math.floor(Math.max(1, Math.min(safeInputPage, totalPages)));

        const page = await pdfDoc.getPage(requestedPage);

        if (!mounted || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        const viewport = page.getViewport({ scale: scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;

        if (mounted) setLoading(false);
      } catch (e: any) {
        // Silent catch for expected cancellations
        if (e?.name === 'RenderingCancelledException' || e?.message?.includes('destroyed')) {
          return;
        }

        console.error("Error rendering PDF thumbnail:", e);
        if (mounted) {
          setLoading(false);
          setPageError(e.message || "Failed to render page");
        }
      }
    };

    render();

    return () => {
      mounted = false;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) { }
      }
    };
  }, [pdfBase64, pageNumber, scale]);

  const defaultClasses = contain ? 'w-full h-full' : '';
  const finalClassName = className ?? defaultClasses;

  if (!pdfBase64) {
    return <div className={`flex items-center justify-center bg-slate-100 text-slate-400 text-[10px] font-black uppercase ${finalClassName}`}>Unloaded</div>;
  }

  return (
    <div className={`flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200 relative group ${contain ? 'overflow-hidden' : ''} ${finalClassName}`}>
      {pageError ? (
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-2">{pageError}</div>
      ) : (
        <canvas
          ref={canvasRef}
          className={`block transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'} ${contain ? 'max-w-full max-h-full w-auto h-auto object-contain' : 'max-w-full h-auto'}`}
          style={contain ? { width: 'auto', height: 'auto' } : undefined}
        />
      )}
      {loading && !pageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default PdfThumbnail;
"use client";

import { ExternalLink, ImageIcon } from "lucide-react";

type DocumentPreviewProps = {
  fileUrl: string;
  alt: string;
  emptyLabel?: string;
};

function looksLikePdf(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes(".pdf") || lower.includes("/pdf") || lower.endsWith("pdf");
}

export function DocumentPreview({
  fileUrl,
  alt,
  emptyLabel = "Sin documento",
}: DocumentPreviewProps) {
  if (!fileUrl) {
    return (
      <div className="mt-2 flex h-48 items-center justify-center rounded-md bg-slate-200">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="h-10 w-10" />
          <span className="text-sm">{emptyLabel}</span>
        </div>
      </div>
    );
  }

  if (looksLikePdf(fileUrl)) {
    return (
      <div className="mt-2 space-y-2">
        <iframe
          title={alt}
          src={fileUrl}
          className="h-[min(75vh,720px)] w-full rounded-md border bg-white"
        />
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Abrir PDF en nueva pestaña
        </a>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex max-h-[min(75vh,720px)] w-full items-center justify-center overflow-auto rounded-md border bg-white p-2">
        {/* img nativo: respeta orientación EXIF y relación de aspecto variable */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={alt}
          className="max-h-[min(75vh,720px)] max-w-full w-auto h-auto object-contain [image-orientation:from-image]"
        />
      </div>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        Ver en tamaño completo
      </a>
    </div>
  );
}

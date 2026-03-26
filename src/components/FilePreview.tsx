import { getFileDownloadUrl } from "@/lib/storage";
import type { DroppedFile } from "@/lib/storage";
import { getFileTypeIcon } from "@/lib/storage";

interface FilePreviewProps {
  drop: DroppedFile;
}

export default function FilePreview({ drop }: FilePreviewProps) {
  const url = getFileDownloadUrl(drop.storagePath);

  if (drop.type.startsWith('image/')) {
    return (
      <div className="mt-4 rounded-xl overflow-hidden border border-border shadow-card">
        <img
          src={url}
          alt={drop.name}
          className="w-full max-h-64 object-contain bg-muted"
          loading="lazy"
        />
      </div>
    );
  }

  if (drop.type.startsWith('video/')) {
    return (
      <div className="mt-4 rounded-xl overflow-hidden border border-border shadow-card">
        <video
          src={url}
          className="w-full max-h-64 bg-muted"
          controls
          preload="metadata"
        />
      </div>
    );
  }

  if (drop.type.startsWith('audio/')) {
    return (
      <div className="mt-4 rounded-xl border border-border p-4 shadow-card bg-card">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🎵</span>
          <p className="font-medium text-sm truncate">{drop.name}</p>
        </div>
        <audio src={url} controls className="w-full" preload="metadata" />
      </div>
    );
  }

  // Fallback: large icon with filename
  return (
    <div className="mt-4 rounded-xl border border-border p-8 shadow-card bg-card flex flex-col items-center gap-2">
      <span className="text-5xl">{getFileTypeIcon(drop.type)}</span>
      <p className="font-medium text-sm text-center truncate max-w-full">{drop.name}</p>
    </div>
  );
}

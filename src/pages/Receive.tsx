import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Download, AlertTriangle, Check, Loader2, Send, Trash2, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import CountdownTimer from "@/components/CountdownTimer";
import FilePreview from "@/components/FilePreview";
import { playArrivalChime, playDownloadConfirmation } from "@/lib/sounds";
import {
  getDropByCode, getFileDownloadUrl, isExpired, formatFileSize,
  getFileTypeIcon, formatDropTime, incrementViewCount, markDownloaded,
  deleteDropAfterDownload, type DroppedFile,
} from "@/lib/storage";

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export default function Receive() {
  const { code } = useParams<{ code: string }>();
  const [drop, setDrop] = useState<DroppedFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [selfDestructed, setSelfDestructed] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [dlSpeed, setDlSpeed] = useState<number | null>(null);
  const arrivedRef = useRef(false);

  useEffect(() => {
    if (!code) return;
    getDropByCode(code).then(d => {
      setDrop(d);
      if (d) {
        setExpired(isExpired(d));
        incrementViewCount(d.id, d.viewCount);
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          playArrivalChime();
        }
      }
      setLoading(false);
    });
  }, [code]);

  const handleDownload = useCallback(async () => {
    if (!drop) return;
    setDownloading(true);
    setDownloadError(false);
    setDlProgress(0);
    setDlSpeed(null);

    const startTime = Date.now();

    try {
      const url = getFileDownloadUrl(drop.storagePath);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");

      const reader = response.body?.getReader();
      const contentLength = Number(response.headers.get('content-length')) || drop.size;

      if (reader) {
        const chunks: BlobPart[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          const pct = (received / contentLength) * 100;
          setDlProgress(pct);
          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed > 0.3) {
            setDlSpeed(received / elapsed);
          }
        }

        const blob = new Blob(chunks);
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = drop.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } else {
        // Fallback if ReadableStream not available
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = drop.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }

      setDownloaded(true);
      playDownloadConfirmation();
      await markDownloaded(drop.id);

      if (drop.deleteAfterDownload) {
        await deleteDropAfterDownload(drop);
        setSelfDestructed(true);
      }
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
      setDlSpeed(null);
    }
  }, [drop]);

  if (loading) {
    return (
      <div className="container max-w-lg py-20 text-center">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Loading drop...</p>
      </div>
    );
  }

  if (!drop) {
    return (
      <div className="container max-w-lg py-20 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h1 className="text-xl font-bold">This Drop Has Expired</h1>
        <p className="text-muted-foreground mt-2">This link may be invalid or the file has expired.</p>
        <Button asChild className="mt-6">
          <Link to="/send">Send Your Own Files</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-lg py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {selfDestructed ? (
          <>
            <Trash2 className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-bold">File Self-Destructed</h1>
            <p className="text-muted-foreground mt-2">
              This file was set to delete after download. Your download should have started.
            </p>
          </>
        ) : expired ? (
          <>
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-bold">This Drop Has Expired</h1>
            <p className="text-muted-foreground mt-2">Files are only available for a limited time.</p>
          </>
        ) : (
          <>
            <div className="rounded-xl gradient-card border border-border p-6 shadow-card text-left space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getFileTypeIcon(drop.type)}</span>
                <div>
                  <p className="font-semibold text-lg">{drop.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(drop.size)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Dropped on {formatDropTime(drop.droppedAt)}
              </p>
              {drop.deleteAfterDownload && (
                <p className="text-xs text-destructive font-medium">
                  ⚠️ This file will delete itself after you download it
                </p>
              )}
            </div>

            {/* File Preview */}
            <FilePreview drop={drop} />

            <div className="mt-6">
              <p className="text-xs text-muted-foreground mb-1">Expires in</p>
              <CountdownTimer expiresAt={drop.expiresAt} onExpired={() => setExpired(true)} />
            </div>

            {downloaded ? (
              <div className="mt-6 flex items-center justify-center gap-2 text-success font-semibold">
                <Check className="h-5 w-5" />
                File downloaded successfully!
              </div>
            ) : downloadError ? (
              <div className="mt-6">
                <p className="text-sm text-destructive mb-2">Download failed. Please try again.</p>
                <Button onClick={handleDownload}>Retry Download</Button>
              </div>
            ) : downloading ? (
              <div className="mt-6 space-y-3">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full gradient-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(dlProgress, 100)}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    Downloading... {Math.round(dlProgress)}%
                  </p>
                  {dlSpeed !== null && (
                    <span className="flex items-center gap-1 text-xs text-primary font-medium">
                      <Gauge className="h-3 w-3" />
                      {formatSpeed(dlSpeed)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <Button
                size="xl"
                variant="hero"
                className="mt-6"
                onClick={handleDownload}
              >
                <Download className="h-5 w-5" />
                Download File
              </Button>
            )}
          </>
        )}

        <div className="mt-10">
          <Button asChild variant="outline">
            <Link to="/send">
              <Send className="h-4 w-4 mr-1" />
              Send Your Own Files
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

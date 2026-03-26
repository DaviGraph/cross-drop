import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, AlertTriangle, Check, Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CountdownTimer from "@/components/CountdownTimer";
import {
  getDropByCode, getFileDownloadUrl, isExpired, formatFileSize,
  getFileTypeIcon, formatDropTime, incrementViewCount, markDownloaded,
  deleteDropAfterDownload, type DroppedFile,
} from "@/lib/storage";

export default function Receive() {
  const { code } = useParams<{ code: string }>();
  const [drop, setDrop] = useState<DroppedFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [selfDestructed, setSelfDestructed] = useState(false);

  useEffect(() => {
    if (!code) return;
    getDropByCode(code).then(d => {
      setDrop(d);
      if (d) {
        setExpired(isExpired(d));
        // Increment view count
        incrementViewCount(d.id, d.viewCount);
      }
      setLoading(false);
    });
  }, [code]);

  const handleDownload = useCallback(async () => {
    if (!drop) return;
    setDownloading(true);
    setDownloadError(false);

    try {
      const url = getFileDownloadUrl(drop.storagePath);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = drop.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      setDownloaded(true);
      await markDownloaded(drop.id);

      // Self-destruct if enabled
      if (drop.deleteAfterDownload) {
        await deleteDropAfterDownload(drop);
        setSelfDestructed(true);
      }
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
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
            ) : (
              <Button
                size="xl"
                variant="hero"
                className="mt-6"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download File
                  </>
                )}
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

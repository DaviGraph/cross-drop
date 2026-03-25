import { useParams, Link } from "react-router-dom";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, AlertTriangle, Check, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import CountdownTimer from "@/components/CountdownTimer";
import { getDropByCode, getFileBlob, isExpired, formatFileSize, getFileTypeIcon, formatDropTime } from "@/lib/storage";

export default function Receive() {
  const { code } = useParams<{ code: string }>();
  const [expired, setExpired] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  const drop = code ? getDropByCode(code) : undefined;
  const alreadyExpired = drop ? isExpired(drop) : false;

  const handleDownload = useCallback(async () => {
    if (!drop || !code) return;
    setDownloading(true);
    setDownloadError(false);

    try {
      const blob = getFileBlob(code);
      if (!blob) throw new Error("File not found");

      await new Promise((r) => setTimeout(r, 1000));

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = drop.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  }, [drop, code]);

  if (!drop) {
    return (
      <div className="container max-w-lg py-20 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold">Drop Not Found</h1>
        <p className="text-muted-foreground mt-2">This link may be invalid or has expired.</p>
        <Button asChild className="mt-6">
          <Link to="/send">Send Your Own Files</Link>
        </Button>
      </div>
    );
  }

  const isExp = expired || alreadyExpired;

  return (
    <div className="container max-w-lg py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {isExp ? (
          <>
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-bold">This Drop Has Expired</h1>
            <p className="text-muted-foreground mt-2">Files are only available for 5 minutes.</p>
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

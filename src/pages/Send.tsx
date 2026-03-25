import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Check, Copy, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  generateCode, saveDroppedFile, formatFileSize, getFileTypeIcon, formatDropTime,
  type DroppedFile,
} from "@/lib/storage";
import TooltipHint from "@/components/TooltipHint";

const MAX_SIZE = 200 * 1024 * 1024;

export default function Send() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DroppedFile | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    let totalSize = 0;
    for (let i = 0; i < files.length; i++) totalSize += files[i].size;

    if (totalSize > MAX_SIZE) {
      setError(`Total size exceeds 200MB limit (${formatFileSize(totalSize)})`);
      return;
    }

    setError("");
    setUploading(true);
    setProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) { clearInterval(interval); return 95; }
        return p + Math.random() * 15;
      });
    }, 200);

    // Create blob from files
    const blob = files.length === 1
      ? files[0]
      : new Blob(Array.from(files));

    const fileName = files.length === 1
      ? files[0].name
      : `${files.length} files`;

    const fileType = files.length === 1
      ? files[0].type
      : "application/zip";

    await new Promise((r) => setTimeout(r, 1500));
    clearInterval(interval);
    setProgress(100);

    const code = generateCode();
    const now = new Date();
    const dropped: DroppedFile = {
      id: crypto.randomUUID(),
      name: fileName,
      size: totalSize,
      type: fileType,
      code,
      droppedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    };

    saveDroppedFile(dropped, blob);
    setResult(dropped);
    setUploading(false);
  }, []);

  const shareUrl = result
    ? `${window.location.origin}/receive/${result.code}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setResult(null);
    setProgress(0);
    setError("");
  };

  return (
    <div className="container max-w-lg py-12">
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <h1 className="text-2xl font-bold mb-6 text-center">Send a File</h1>

            <TooltipHint id="send-upload" text="Tap here to choose a file to send">
              <label
                className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-colors ${
                  uploading ? "border-primary bg-accent" : "border-border hover:border-primary hover:bg-accent/50"
                }`}
              >
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                  disabled={uploading}
                />
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">
                    {uploading ? "Uploading..." : "Tap to select files"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Photos, videos, documents — up to 200MB
                  </p>
                </div>
              </label>
            </TooltipHint>

            {uploading && (
              <div className="mt-6">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full gradient-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  {Math.round(progress)}%
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <Check className="h-7 w-7 text-success" />
            </div>
            <h2 className="text-xl font-bold mb-1">File Dropped!</h2>

            <div className="mt-6 rounded-xl gradient-card border border-border p-6 shadow-card text-left space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getFileTypeIcon(result.type)}</span>
                <div>
                  <p className="font-medium">{result.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(result.size)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Dropped on {formatDropTime(result.droppedAt)}
              </p>
            </div>

            <TooltipHint id="qr-share" text="Show this to your friend to scan">
              <div className="mt-6 flex justify-center">
                <div className="rounded-xl bg-card p-4 border border-border shadow-card">
                  <QRCodeSVG value={shareUrl} size={180} level="M" />
                </div>
              </div>
            </TooltipHint>

            <div className="mt-4 flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 h-10 rounded-lg border border-input bg-muted px-3 text-sm font-mono truncate"
              />
              <Button size="sm" variant="outline" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-warning font-medium">
              <AlertTriangle className="h-4 w-4" />
              This link expires in 5 minutes
            </div>

            <Button onClick={reset} variant="outline" className="mt-6">
              Send Another File
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

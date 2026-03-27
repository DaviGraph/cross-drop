import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Check, Copy, AlertTriangle, Gauge, Trash2, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  uploadAndSaveDrop, formatFileSize, getFileTypeIcon, formatDropTime,
  deleteDropAfterDownload, type DroppedFile,
} from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { generateCode } from "@/lib/storage";
import { getOrCreateUserId } from "@/lib/storage";
import TooltipHint from "@/components/TooltipHint";

const MAX_SIZE = 200 * 1024 * 1024;

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export default function Send() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState<number | null>(null);
  const [result, setResult] = useState<DroppedFile | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleteAfterDownload, setDeleteAfterDownload] = useState(false);
  const [expiresMinutes, setExpiresMinutes] = useState(5);
  const [deleting, setDeleting] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > MAX_SIZE) {
      setError(`File exceeds 200MB limit (${formatFileSize(file.size)})`);
      return;
    }

    setError("");
    setUploading(true);
    setProgress(0);
    setSpeed(null);

    const startTime = Date.now();
    const code = generateCode();
    const storagePath = `${code}/${file.name}`;
    const userId = getOrCreateUserId();

    // Use XMLHttpRequest for real progress tracking
    try {
      const uploadedBytes = await new Promise<number>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const { data: { publicUrl } } = supabase.storage.from('drops').getPublicUrl('');
        // Build the upload URL manually
        const supabaseUrl = publicUrl.replace('/storage/v1/object/public/drops/', '');
        const uploadUrl = `${supabaseUrl}/storage/v1/object/drops/${storagePath}`;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = (e.loaded / e.total) * 100;
            setProgress(pct);
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 0.3) {
              setSpeed(e.loaded / elapsed);
            }
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(file.size);
          } else {
            // Fallback to supabase SDK
            reject(new Error('XHR failed'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('XHR failed')));

        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${(supabase as any).supabaseKey || ''}`);
        xhr.setRequestHeader('apikey', (supabase as any).supabaseKey || '');
        xhr.send(file);
      });

      // Save metadata
      const { data, error: dbError } = await supabase
        .from('drops')
        .insert({
          code,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          storage_path: storagePath,
          user_id: userId,
          delete_after_download: deleteAfterDownload,
          expires_minutes: expiresMinutes,
        })
        .select()
        .single();

      if (dbError) throw new Error(`Save failed: ${dbError.message}`);

      setProgress(100);
      setResult({
        id: data.id,
        name: data.file_name,
        size: Number(data.file_size),
        type: data.file_type,
        code: data.code,
        droppedAt: data.dropped_at,
        expiresAt: data.expires_at,
        storagePath: data.storage_path,
        deleteAfterDownload: data.delete_after_download,
        downloaded: data.downloaded,
        viewCount: data.view_count,
      });
    } catch {
      // Fallback: use the original SDK method (no real progress)
      try {
        const interval = setInterval(() => {
          setProgress((p) => {
            if (p >= 90) { clearInterval(interval); return 90; }
            return p + Math.random() * 12;
          });
        }, 300);

        const dropped = await uploadAndSaveDrop(file, {
          deleteAfterDownload,
          expiresMinutes,
        });
        clearInterval(interval);
        setProgress(100);
        setResult(dropped);
      } catch (err: any) {
        setError(err.message || "Upload failed. Please try again.");
      }
    } finally {
      setUploading(false);
      setSpeed(null);
    }
  }, [deleteAfterDownload, expiresMinutes]);

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
    setDeleting(false);
  };

  const handleDeleteDrop = async () => {
    if (!result) return;
    setDeleting(true);
    try {
      await deleteDropAfterDownload(result);
      reset();
    } catch {
      setDeleting(false);
    }
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
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                  disabled={uploading}
                />
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">
                    {uploading ? "Uploading..." : "Tap to select a file"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Photos, videos, documents — up to 200MB
                  </p>
                </div>
              </label>
            </TooltipHint>

            {/* Options */}
            <div className="mt-6 space-y-4 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="expiry" className="text-sm font-medium">Expires in</Label>
                <select
                  id="expiry"
                  value={expiresMinutes}
                  onChange={(e) => setExpiresMinutes(Number(e.target.value))}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="delete-toggle" className="text-sm font-medium">Delete after download</Label>
                  <p className="text-xs text-muted-foreground">File self-destructs after first download</p>
                </div>
                <Switch
                  id="delete-toggle"
                  checked={deleteAfterDownload}
                  onCheckedChange={setDeleteAfterDownload}
                />
              </div>
            </div>

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
                <div className="flex items-center justify-center gap-2 mt-2">
                  <p className="text-sm text-muted-foreground">
                    {Math.round(progress)}%
                  </p>
                  {speed !== null && (
                    <span className="flex items-center gap-1 text-xs text-primary font-medium">
                      <Gauge className="h-3 w-3" />
                      {formatSpeed(speed)}
                    </span>
                  )}
                </div>
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
              {result.deleteAfterDownload && (
                <p className="text-xs text-destructive font-medium">
                  ⚠️ This file will self-destruct after download
                </p>
              )}
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
              This link expires in {expiresMinutes} minutes
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

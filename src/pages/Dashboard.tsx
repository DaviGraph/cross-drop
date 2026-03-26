import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Droplet, Copy, Check, ExternalLink, Loader2, Eye, Download, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRecentDrops, isExpired, formatFileSize, getFileTypeIcon, formatDropTime, type DroppedFile } from "@/lib/storage";
import { useState, useEffect } from "react";
import TooltipHint from "@/components/TooltipHint";

export default function Dashboard() {
  const [drops, setDrops] = useState<DroppedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    getRecentDrops().then(d => {
      setDrops(d);
      setLoading(false);
    });
  }, []);

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/receive/${code}`);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDownloadStatus = (drop: DroppedFile) => {
    const exp = isExpired(drop);
    if (drop.downloaded) {
      return { icon: <Check className="h-3.5 w-3.5" />, text: "Downloaded ✅", className: "text-success" };
    }
    if (exp) {
      return { icon: <XCircle className="h-3.5 w-3.5" />, text: "Expired — not downloaded", className: "text-destructive" };
    }
    return { icon: <Clock className="h-3.5 w-3.5" />, text: "Waiting for download", className: "text-warning" };
  };

  if (loading) {
    return (
      <div className="container max-w-lg py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  if (drops.length === 0) {
    return (
      <div className="container max-w-lg py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent">
            <Droplet className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">No drops yet!</h1>
          <p className="text-muted-foreground">Files you send will appear here</p>
          <Button asChild size="lg" variant="hero" className="mt-4">
            <Link to="/send">Send Your First File</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-12">
      <TooltipHint id="dashboard-hint" text="Your sent files appear here">
        <h1 className="text-2xl font-bold mb-6">Your Drops</h1>
      </TooltipHint>

      <div className="space-y-3">
        {drops.map((drop, i) => {
          const exp = isExpired(drop);
          const dlStatus = getDownloadStatus(drop);
          return (
            <motion.div
              key={drop.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-xl border border-border p-4 shadow-card ${
                exp ? "opacity-60" : "gradient-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getFileTypeIcon(drop.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{drop.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(drop.size)} · {formatDropTime(drop.droppedAt)}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    exp
                      ? "bg-muted text-muted-foreground"
                      : "bg-success/10 text-success"
                  }`}
                >
                  {exp ? "Expired" : "Active"}
                </span>
              </div>

              {/* Stats row */}
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  {drop.viewCount > 0 ? `${drop.viewCount} view${drop.viewCount > 1 ? 's' : ''}` : 'Not opened yet'}
                </span>
                <span className={`flex items-center gap-1 ${dlStatus.className}`}>
                  {dlStatus.icon}
                  {dlStatus.text}
                </span>
                {drop.deleteAfterDownload && (
                  <span className="text-destructive">🗑️ Self-destruct</span>
                )}
              </div>

              {!exp && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    readOnly
                    value={`${window.location.origin}/receive/${drop.code}`}
                    className="flex-1 h-8 rounded-md border border-input bg-muted px-2 text-xs font-mono truncate"
                  />
                  <button
                    onClick={() => copyLink(drop.code)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedId === drop.code ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <Link
                    to={`/receive/${drop.code}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

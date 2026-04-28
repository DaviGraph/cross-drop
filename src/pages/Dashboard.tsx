import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Droplet, Copy, Check, ExternalLink, Loader2, Eye, Clock, XCircle, Trash2, RefreshCw, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRecentDrops, isExpired, formatFileSize, getFileTypeIcon, formatDropTime, deleteDropAfterDownload, type DroppedFile } from "@/lib/storage";
import { useState, useEffect } from "react";
import TooltipHint from "@/components/TooltipHint";

export default function Dashboard() {
  const [drops, setDrops] = useState<DroppedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const handleDelete = async (drop: DroppedFile) => {
    setDeletingId(drop.id);
    try {
      await deleteDropAfterDownload(drop);
      setDrops(prev => prev.filter(d => d.id !== drop.id));
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  };

  const handleResend = (drop: DroppedFile) => {
    // Navigate to send page with the file name as a hint
    navigate("/send", { state: { resendFileName: drop.name } });
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
          <Button asChild variant="outline" size="sm">
            <Link to="/qa">
              <ClipboardList className="h-4 w-4" />
              Run QA Checklist
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-12">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <TooltipHint id="dashboard-hint" text="Your sent files appear here">
          <h1 className="text-2xl font-bold">Your Drops</h1>
        </TooltipHint>
        <Button asChild variant="hero" size="sm">
          <Link to="/qa">
            <ClipboardList className="h-4 w-4" />
            Run QA Checklist
          </Link>
        </Button>
      </div>

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

              {/* Active drop: link + copy + actions */}
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
                    title="Copy link"
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
                    title="Open receive page"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(drop)}
                    disabled={deletingId === drop.id}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete this drop"
                  >
                    {deletingId === drop.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}

              {/* Expired drop: resend + delete */}
              {exp && (
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResend(drop)}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Resend
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(drop)}
                    disabled={deletingId === drop.id}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    {deletingId === drop.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                    )}
                    Delete
                  </Button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

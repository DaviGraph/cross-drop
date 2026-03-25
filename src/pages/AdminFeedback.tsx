import { useState, useEffect } from "react";
import { getAllFeedback, type FeedbackEntry } from "@/lib/storage";
import { Star, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllFeedback().then(f => {
      setFeedback(f);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="container max-w-lg py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-12">
      <h1 className="text-2xl font-bold mb-6">All Feedback</h1>
      {feedback.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No feedback yet.</p>
      ) : (
        <div className="space-y-3">
          {feedback.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border p-4 gradient-card shadow-card"
            >
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-4 w-4 ${
                      n <= f.rating ? "fill-warning text-warning" : "text-muted-foreground/20"
                    }`}
                  />
                ))}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(f.createdAt).toLocaleDateString()}
                </span>
              </div>
              {f.message && <p className="text-sm">{f.message}</p>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveFeedback } from "@/lib/storage";

export default function Feedback() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitting(true);
    setError("");
    try {
      await saveFeedback(rating, message);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="container max-w-lg py-20 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <Check className="h-7 w-7 text-success" />
          </div>
          <h1 className="text-2xl font-bold">Thank you for your feedback!</h1>
          <p className="text-muted-foreground">Your input helps us make CrossDrop better.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container max-w-lg py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-2 text-center">Rate CrossDrop</h1>
        <p className="text-center text-muted-foreground mb-8">
          How's your experience? We'd love to hear from you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 transition-colors ${
                    n <= (hover || rating)
                      ? "fill-warning text-warning"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              You selected {rating} star{rating > 1 ? "s" : ""}
            </p>
          )}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what you think... (optional)"
            rows={4}
            className="w-full rounded-xl border border-input bg-card p-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={rating === 0 || submitting}>
            {submitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

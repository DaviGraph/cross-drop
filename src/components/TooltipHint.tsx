import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { hasSeenTooltip, markTooltipSeen } from "@/lib/storage";

interface Props {
  id: string;
  text: string;
  children: React.ReactNode;
}

export default function TooltipHint({ id, text, children }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasSeenTooltip(id)) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [id]);

  const dismiss = () => {
    setVisible(false);
    markTooltipSeen(id);
  };

  return (
    <div className="relative" onClick={dismiss}>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-max max-w-[240px] rounded-lg bg-foreground px-3 py-2 text-xs text-background shadow-lg"
          >
            {text}
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 h-2 w-2 rotate-45 bg-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

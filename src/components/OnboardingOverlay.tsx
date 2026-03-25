import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplet, QrCode, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasCompletedOnboarding, setOnboardingComplete } from "@/lib/storage";

const slides = [
  {
    icon: Droplet,
    title: "Send Anything",
    desc: "Share photos, videos, documents and more in seconds",
  },
  {
    icon: QrCode,
    title: "Scan to Receive",
    desc: "Just scan the QR code to instantly get the file",
  },
  {
    icon: Clock,
    title: "Files expire in 5 minutes",
    desc: "Fast, secure and automatic",
  },
];

export default function OnboardingOverlay() {
  const [show, setShow] = useState(!hasCompletedOnboarding());
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);

  const finish = () => {
    setOnboardingComplete();
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md"
      >
        {!started ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-6 px-8 text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl gradient-primary shadow-glow">
              <Droplet className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">CrossDrop</h1>
            <p className="text-lg text-muted-foreground">AirDrop for Everyone</p>
            <Button size="xl" variant="hero" onClick={() => setStarted(true)} className="mt-4">
              Get Started
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="flex flex-col items-center gap-6 px-8 text-center max-w-sm"
          >
            <button
              onClick={finish}
              className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Skip</span>
            </button>

            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent text-primary">
              {(() => {
                const Icon = slides[step].icon;
                return <Icon className="h-8 w-8" />;
              })()}
            </div>
            <h2 className="text-2xl font-bold">{slides[step].title}</h2>
            <p className="text-muted-foreground">{slides[step].desc}</p>

            <div className="flex gap-2 mt-4">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <Button
              size="lg"
              onClick={() => (step < slides.length - 1 ? setStep(step + 1) : finish())}
              className="mt-2"
            >
              {step < slides.length - 1 ? "Next" : "Let's Go!"}
            </Button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Droplet, Upload, Link2, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const steps = [
  { icon: Upload, title: "Upload", desc: "Choose any file from your device" },
  { icon: Link2, title: "Share Link", desc: "Get a QR code and link instantly" },
  { icon: Download, title: "Download", desc: "Open on any device to download" },
];

export default function Index() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") {
        setInstalled(true);
        setInstallPrompt(null);
      }
    }
  };

  return (
    <div className="gradient-hero min-h-screen">
      {/* Hero */}
      <section className="container flex flex-col items-center pt-20 pb-16 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl gradient-primary shadow-glow"
        >
          <Droplet className="h-10 w-10 text-primary-foreground" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl"
        >
          AirDrop for Everyone
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-4 text-lg text-muted-foreground max-w-md"
        >
          Share anything instantly between iPhone and Android — no app store needed.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8"
        >
          <Button asChild size="xl" variant="hero">
            <Link to="/send">Send a File</Link>
          </Button>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="container pb-16">
        <h2 className="text-center text-2xl font-bold mb-10">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="gradient-card rounded-xl p-6 text-center shadow-card border border-border"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
                <s.icon className="h-6 w-6" />
              </div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">Step {i + 1}</div>
              <h3 className="font-bold text-lg">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Install Section */}
      <section className="container pb-16">
        <div className="gradient-card rounded-2xl border border-border p-8 text-center shadow-card max-w-lg mx-auto">
          <Smartphone className="h-8 w-8 mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-bold mb-2">Install CrossDrop</h2>
          <p className="text-sm text-muted-foreground mb-6">
            No App Store needed. Install directly to your home screen.
          </p>

          {installed ? (
            <p className="text-success font-semibold">✓ App Installed Successfully!</p>
          ) : installPrompt ? (
            <Button onClick={handleInstall} size="lg">Install App</Button>
          ) : (
            <Button size="lg" disabled className="opacity-60">Install App</Button>
          )}

          {isIOS && (
            <div className="mt-4 rounded-lg bg-accent p-4 text-sm text-accent-foreground">
              <p className="font-medium">📱 iPhone Install Instructions</p>
              <p className="mt-1 text-muted-foreground">
                Tap the <strong>Share</strong> button in Safari, then tap <strong>Add to Home Screen</strong>.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Waitlist */}
      <section className="container pb-20">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl font-bold mb-2">Join the Waitlist</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Get notified about updates and new features.
          </p>
          {submitted ? (
            <p className="text-success font-semibold">✓ You're on the list!</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setSubmitted(true);
              }}
              className="flex gap-2"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 h-11 rounded-lg border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="submit">Subscribe</Button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

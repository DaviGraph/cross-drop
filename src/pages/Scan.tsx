import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ScanLine, Camera, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Scan() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    setError("");
    setScanning(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          try {
            const url = new URL(decodedText);
            const match = url.pathname.match(/\/receive\/(.+)/);
            if (match) {
              scanner.stop().catch(() => {});
              navigate(`/receive/${match[1]}`);
            }
          } catch {
            // Not a valid URL, ignore
          }
        },
        () => {} // ignore errors during scanning
      );
    } catch (err: any) {
      setError(err.message || "Camera access denied. Please allow camera permissions.");
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      scannerRef.current?.stop?.().catch(() => {});
    };
  }, []);

  return (
    <div className="container max-w-lg py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-accent text-primary">
          <ScanLine className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Scan to Receive</h1>
        <p className="text-muted-foreground mb-8">
          Point your camera at a CrossDrop QR code
        </p>

        {!scanning ? (
          <Button size="xl" variant="hero" onClick={startScanner}>
            <Camera className="h-5 w-5" />
            Open Camera
          </Button>
        ) : (
          <div className="rounded-xl overflow-hidden border border-border shadow-card">
            <div id="qr-reader" ref={containerRef} className="w-full" />
          </div>
        )}

        {scanning && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              scannerRef.current?.stop?.().catch(() => {});
              setScanning(false);
            }}
          >
            <XCircle className="h-4 w-4" />
            Stop Scanning
          </Button>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </motion.div>
    </div>
  );
}

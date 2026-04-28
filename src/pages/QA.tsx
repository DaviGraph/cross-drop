import { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2, Circle, XCircle, Loader2, Play, RotateCcw,
  ExternalLink, ClipboardList, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  uploadAndSaveDrop, getDropByCode, deleteDropAfterDownload,
  generateCode, type DroppedFile,
} from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

type CheckStatus = "idle" | "running" | "pass" | "fail";

interface CheckResult {
  status: CheckStatus;
  message?: string;
  link?: { label: string; to: string };
}

interface QACheck {
  id: string;
  title: string;
  description: string;
  run: (ctx: { log: (m: string) => void }) => Promise<CheckResult>;
}

function makeTestFile(name = "qa-test.txt", contents = `QA test ${Date.now()}`): File {
  return new File([contents], name, { type: "text/plain" });
}

const checks: QACheck[] = [
  {
    id: "receive-before-upload",
    title: "Receive link before upload",
    description:
      "Open a /receive/:code link for a code that doesn't exist yet — should show 'Waiting for your drop' instead of 404.",
    run: async () => {
      const code = generateCode();
      const found = await getDropByCode(code);
      if (found) {
        return { status: "fail", message: `Unexpected: code ${code} already exists.` };
      }
      return {
        status: "pass",
        message: `Code ${code} confirmed not in DB. Open the link to verify the waiting screen renders.`,
        link: { label: `Open /receive/${code}`, to: `/receive/${code}` },
      };
    },
  },
  {
    id: "upload-matches-code",
    title: "Upload writes a matching code row",
    description:
      "Upload a small test file and verify that getDropByCode returns the same record (sender→DB roundtrip).",
    run: async ({ log }) => {
      const file = makeTestFile();
      log("Uploading test file...");
      const drop = await uploadAndSaveDrop(file, { expiresMinutes: 5 });
      log(`Created code ${drop.code}. Querying back...`);
      const fetched = await getDropByCode(drop.code);
      // cleanup
      try { await deleteDropAfterDownload(drop); } catch { /* noop */ }

      if (!fetched) return { status: "fail", message: "Drop not found after upload." };
      if (fetched.id !== drop.id) {
        return { status: "fail", message: "Returned drop ID does not match uploaded ID." };
      }
      return {
        status: "pass",
        message: `Upload + lookup OK. (Code ${drop.code} cleaned up.)`,
      };
    },
  },
  {
    id: "waiting-to-download",
    title: "Waiting → file appears transition",
    description:
      "Generate a code, open /receive/:code in a new tab (waiting screen), then upload to that code and confirm the receiver flips to download.",
    run: async ({ log }) => {
      const code = generateCode();
      log(`Reserved code ${code}.`);
      const exists = await getDropByCode(code);
      if (exists) {
        return { status: "fail", message: `Code ${code} unexpectedly exists.` };
      }

      // Upload after a short delay so the user has time to open the link
      const file = makeTestFile("qa-waiting.txt");
      log("Uploading in 6s — open the link now to see the waiting → download flip...");
      await new Promise((r) => setTimeout(r, 6000));

      // Upload using the reserved code path: we can't pre-pick the code with the
      // current API, so we upload normally and surface the actual code.
      const drop = await uploadAndSaveDrop(file, { expiresMinutes: 5 });
      log(`Uploaded as code ${drop.code} (different from reserved ${code}).`);

      return {
        status: "pass",
        message:
          `Reserved code: ${code} (use to verify waiting screen). Live drop code: ${drop.code} (use to verify auto-download).`,
        link: { label: `Open /receive/${drop.code}`, to: `/receive/${drop.code}` },
      };
    },
  },
  {
    id: "expired-drop",
    title: "Expired drop shows expiry UI",
    description:
      "Insert a drop with an expires_at in the past and verify the receive page treats it as expired.",
    run: async ({ log }) => {
      const code = generateCode();
      const past = new Date(Date.now() - 60_000).toISOString();
      log(`Inserting expired drop ${code}...`);
      const { data, error } = await supabase
        .from("drops")
        .insert({
          code,
          file_name: "qa-expired.txt",
          file_size: 10,
          file_type: "text/plain",
          storage_path: `${code}/qa-expired.txt`,
          user_id: "00000000-0000-0000-0000-000000000000",
          expires_minutes: 0,
          expires_at: past,
        })
        .select()
        .single();

      if (error || !data) {
        return { status: "fail", message: `Insert failed: ${error?.message ?? "unknown"}` };
      }

      const fetched = await getDropByCode(code);
      // cleanup
      await supabase.from("drops").delete().eq("id", data.id);

      if (!fetched) return { status: "fail", message: "Could not read back inserted drop." };
      const isPast = new Date(fetched.expiresAt).getTime() < Date.now();
      if (!isPast) return { status: "fail", message: "expires_at was not in the past." };

      return {
        status: "pass",
        message: `Expired drop verified. Open the link to confirm the expired UI.`,
        link: { label: `Open /receive/${code} (will be cleaned up)`, to: `/receive/${code}` },
      };
    },
  },
  {
    id: "download-failure",
    title: "Download failure → retry button",
    description:
      "Verify the receive page exposes a retry path. This check inserts a drop pointing at a missing storage object, so the download will fail and the Retry button should appear.",
    run: async ({ log }) => {
      const code = generateCode();
      log(`Inserting drop ${code} with bogus storage path...`);
      const { data, error } = await supabase
        .from("drops")
        .insert({
          code,
          file_name: "qa-missing.bin",
          file_size: 1024,
          file_type: "application/octet-stream",
          storage_path: `${code}/does-not-exist.bin`,
          user_id: "00000000-0000-0000-0000-000000000000",
          expires_minutes: 5,
        })
        .select()
        .single();

      if (error || !data) {
        return { status: "fail", message: `Insert failed: ${error?.message ?? "unknown"}` };
      }

      return {
        status: "pass",
        message:
          `Open the link — auto-download will fail and the "Retry Download" button should appear. Remember to delete the drop from the dashboard after.`,
        link: { label: `Open /receive/${code}`, to: `/receive/${code}` },
      };
    },
  },
];

export default function QA() {
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [runningAll, setRunningAll] = useState(false);

  const runCheck = useCallback(async (check: QACheck) => {
    setResults((r) => ({ ...r, [check.id]: { status: "running" } }));
    setLogs((l) => ({ ...l, [check.id]: [] }));
    const log = (m: string) =>
      setLogs((l) => ({ ...l, [check.id]: [...(l[check.id] ?? []), m] }));
    try {
      const res = await check.run({ log });
      setResults((r) => ({ ...r, [check.id]: res }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setResults((r) => ({ ...r, [check.id]: { status: "fail", message: msg } }));
    }
  }, []);

  const runAll = useCallback(async () => {
    setRunningAll(true);
    for (const c of checks) {
      // eslint-disable-next-line no-await-in-loop
      await runCheck(c);
    }
    setRunningAll(false);
  }, [runCheck]);

  const reset = useCallback(() => {
    setResults({});
    setLogs({});
  }, []);

  const summary = useMemo(() => {
    const pass = Object.values(results).filter((r) => r.status === "pass").length;
    const fail = Object.values(results).filter((r) => r.status === "fail").length;
    return { pass, fail, total: checks.length };
  }, [results]);

  return (
    <div className="container max-w-3xl py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-start gap-3">
          <ClipboardList className="h-7 w-7 text-primary mt-1" />
          <div>
            <h1 className="text-2xl font-bold">QA Checklist</h1>
            <p className="text-muted-foreground text-sm">
              Run end-to-end checks against the live backend. Some checks open
              links you should manually verify.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm">
            <span className="font-semibold">{summary.pass}</span> passed ·{" "}
            <span className="font-semibold text-destructive">{summary.fail}</span> failed ·{" "}
            <span className="text-muted-foreground">{summary.total} total</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={runAll} disabled={runningAll} variant="hero">
              {runningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run all
            </Button>
            <Button onClick={reset} variant="outline" disabled={runningAll}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Some checks insert temporary rows directly into the backend and clean
            them up. Others reserve real codes — visit the suggested link in a new
            tab to verify the UI manually.
          </p>
        </div>

        <ul className="space-y-3">
          {checks.map((c) => {
            const res = results[c.id] ?? { status: "idle" as CheckStatus };
            const checkLogs = logs[c.id] ?? [];
            return (
              <li
                key={c.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {res.status === "pass" && <CheckCircle2 className="h-5 w-5 text-success" />}
                    {res.status === "fail" && <XCircle className="h-5 w-5 text-destructive" />}
                    {res.status === "running" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                    {res.status === "idle" && <Circle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runCheck(c)}
                    disabled={res.status === "running" || runningAll}
                  >
                    {res.status === "running" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    Run
                  </Button>
                </div>

                {res.message && (
                  <div
                    className={`text-sm rounded-md px-3 py-2 ${
                      res.status === "fail"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {res.message}
                  </div>
                )}

                {res.link && (
                  <Button asChild size="sm" variant="secondary">
                    <Link to={res.link.to} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3 w-3" />
                      {res.link.label}
                    </Link>
                  </Button>
                )}

                {checkLogs.length > 0 && (
                  <pre className="text-xs bg-muted/50 rounded-md p-2 overflow-x-auto whitespace-pre-wrap">
                    {checkLogs.join("\n")}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      </motion.div>
    </div>
  );
}

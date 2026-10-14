"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Barcode,
  Camera,
  Check,
  Info,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  ActionLink,
  Button,
  Notice,
  PageHeading,
  SignInPrompt,
} from "@/components/ui/primitives";
import { post } from "@/shared/api-client";
import type { FoodResult } from "@/shared/contracts";
import { ScoreCard } from "@/features/nutrition/score-card";
import { FoodAlternatives } from "@/features/discovery/alternatives";
import { useBarcodeCamera } from "./use-barcode-camera";
export function Scanner({ signedIn }: { signedIn: boolean }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<FoodResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inFlight = useRef(false);
  const resultRef = useRef<HTMLElement>(null);
  async function scan(value: string) {
    if (inFlight.current) return;
    setError("");
    if (!/^\d{8,14}$/.test(value.trim())) {
      setError("Enter the 8–14 digit number printed below the barcode.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setResult(null);
    setCode(value.trim());
    try {
      const data = await post<FoodResult>("/scan", { code: value.trim() });
      setResult(data);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "We couldn’t read that product. Please try again.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const camera = useBarcodeCamera(videoRef, scan);
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="A LITTLE CLARITY, IN YOUR HAND"
        title="Meet what you eat."
        description="Scan a barcode to see the nutrition score. No account. No guesswork."
        action={
          <span className="soft-badge">
            <ShieldCheck size={15} />{" "}
            {signedIn ? "Personal checks enabled" : "Free for everyone"}
          </span>
        }
      />
      <div className="scanner-grid">
        <section className="panel scanner-panel">
          <div className="section-title">
            <h2>
              <span>01</span>Scan your food
            </h2>
            <span className="small-tag">BARCODE SCANNER</span>
          </div>
          <div
            className={`camera-stage ${camera.active ? "camera-active" : ""}`}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Camera barcode preview"
              className={camera.active ? "" : "video-hidden"}
            />
            <div className="camera-corners">
              <i />
              <i />
              <i />
              <i />
              {camera.active ? (
                <span className="camera-laser" />
              ) : (
                <div className="barcode-art" aria-hidden="true">
                  <Barcode size={102} strokeWidth={1} />
                  <span>0 1 2 3 4 5 6 7 8 9</span>
                </div>
              )}
            </div>
            <div className="camera-status">
              <span className={camera.active ? "status-live" : ""} />
              {camera.starting
                ? "Opening camera…"
                : camera.active
                  ? "Hold the barcode steady"
                  : "Your next insight starts here"}
            </div>
            {camera.active && (
              <button
                className="camera-close"
                onClick={camera.stop}
                aria-label="Stop camera"
              >
                <X size={20} />
              </button>
            )}
          </div>
          <div className="camera-action">
            {camera.active ? (
              <Button variant="secondary" onClick={camera.stop}>
                Stop camera <X size={17} />
              </Button>
            ) : (
              <Button
                onClick={camera.start}
                disabled={busy}
                loading={camera.starting}
              >
                <Camera size={18} />
                Enable camera
              </Button>
            )}
            <p>
              <ShieldCheck size={13} />
              Images stay on your device.
            </p>
          </div>
          {camera.error && <Notice tone="error">{camera.error}</Notice>}
          <div className="divider-label">
            <span />
            OR ENTER THE NUMBER
            <span />
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              camera.stop();
              void scan(code);
            }}
            className="barcode-form"
          >
            <label htmlFor="barcode">Barcode number</label>
            <div className="input-with-action">
              <span>
                <Barcode size={20} />
              </span>
              <input
                id="barcode"
                name="barcode"
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 3017620422003"
                value={code}
                maxLength={14}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
                aria-describedby={error ? "scan-error" : "barcode-hint"}
                aria-invalid={!!error}
                disabled={busy}
              />
              <Button type="submit" loading={busy} disabled={code.length < 8}>
                Get score <ArrowRight size={17} />
              </Button>
            </div>
            <p id="barcode-hint" className="field-hint">
              Find the 8–14 digit number under the product’s barcode.
            </p>
          </form>
          {error && (
            <div id="scan-error">
              <Notice tone="error">{error}</Notice>
            </div>
          )}
          <div className="sample-barcode">
            <span>Just exploring?</span>
            <button
              disabled={busy}
              onClick={() => {
                camera.stop();
                void scan("3017620422003");
              }}
            >
              Try a real product <ArrowUpRight size={14} />
            </button>
          </div>
        </section>
        <section
          className="scanner-result"
          ref={resultRef}
          tabIndex={-1}
          aria-label="Scan result"
          aria-live="polite"
          aria-busy={busy}
        >
          {busy ? (
            <div className="panel scan-waiting">
              <div className="loading-orbit">
                <ScanLine size={38} />
              </div>
              <span className="eyebrow">READING BETWEEN THE LINES</span>
              <h2>Finding your food…</h2>
              <p>
                Checking real product data and its available nutrition grade.
              </p>
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" />
            </div>
          ) : result ? (
            <div className="scan-result-enter">
              <div className="product-result-title">
                <span className="eyebrow">HERE’S WHAT WE FOUND</span>
                <h2>{result.food.name}</h2>
                <span>Per {result.food.serving}</span>
              </div>
              <ScoreCard {...result} />
              {signedIn && (
                <FoodAlternatives items={result.alternatives || []} />
              )}
              <ActionLink
                href={`/why/${encodeURIComponent(result.food.id)}`}
                variant="secondary"
                className="full-width"
              >
                Why this score? <ArrowUpRight size={18} />
              </ActionLink>
              {signedIn ? (
                <p className="saved-scan-note">
                  <Check size={14} />
                  Saved to your food journal.
                </p>
              ) : (
                <p className="saved-scan-note">
                  <Info size={14} />
                  Guest results aren’t saved to an account.
                </p>
              )}
            </div>
          ) : (
            <div className="panel scan-empty">
              <div className="empty-score">
                <span>?</span>
                <div className="score-orbit-dot" />
              </div>
              <span className="eyebrow">YOUR INSIGHT GOES HERE</span>
              <h2>
                A label.
                <br />A little less mystery.
              </h2>
              <p>
                Your food’s nutrition grade and a one-line verdict will appear
                here after you scan.
              </p>
              <div className="scan-expectations">
                <span>
                  <Check size={16} />
                  Clear A–E nutrition score
                </span>
                <span>
                  <Check size={16} />
                  Ingredients & available nutrients
                </span>
                <span>
                  <Check size={16} />A separate explanation when you want it
                </span>
              </div>
              <span className="small-tag">NO SIGN-IN NEEDED</span>
            </div>
          )}
        </section>
      </div>
      {!signedIn && <SignInPrompt />}
      <div className="scanner-note">
        <Info size={17} />
        <p>
          Scores describe nutritional quality, not medical safety. Unknown data
          stays unknown. Always check the physical label for ingredients and
          allergens.
        </p>
        <Link href="/model">
          How we score <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}

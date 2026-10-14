"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { IScannerControls } from "@zxing/browser";
export function useBarcodeCamera(
  video: RefObject<HTMLVideoElement | null>,
  onDetected: (code: string) => void,
) {
  const controls = useRef<IScannerControls | null>(null);
  const generation = useRef(0);
  const callback = useRef(onDetected);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    callback.current = onDetected;
  }, [onDetected]);
  const stop = useCallback(() => {
    generation.current++;
    controls.current?.stop();
    controls.current = null;
    setActive(false);
    setStarting(false);
  }, []);
  useEffect(() => {
    const counter = generation;
    return () => {
      counter.current++;
      controls.current?.stop();
    };
  }, []);
  async function start() {
    stop();
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera access needs HTTPS and a supported browser. You can still enter the barcode below.",
      );
      return;
    }
    const current = ++generation.current;
    setActive(true);
    setStarting(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (current !== generation.current || !video.current) return;
      const reader = new BrowserMultiFormatReader();
      const scanner = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        video.current,
        (result, _error, controller) => {
          if (result && current === generation.current) {
            const code = result.getText();
            if (/^\d{8,14}$/.test(code)) {
              controller.stop();
              stop();
              callback.current(code);
            }
          }
        },
      );
      if (current !== generation.current) {
        scanner.stop();
        return;
      }
      controls.current = scanner;
      setStarting(false);
    } catch (error) {
      if (current !== generation.current) return;
      stop();
      const denied =
        error instanceof DOMException && error.name === "NotAllowedError";
      setError(
        denied
          ? "Camera permission was denied. Allow access in your browser settings, or enter the barcode below."
          : "We couldn’t open your camera. Try another camera or enter the barcode below.",
      );
    }
  }
  return { video, active, starting, error, start, stop };
}

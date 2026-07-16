"use client";

/**
 * Step 3 — Live Selfie Capture
 *
 * Uses react-webcam (dynamically imported, SSR disabled) to avoid the
 * "ref timing race" that existed in the previous raw getUserMedia
 * implementation: the old code set videoRef.current = null because the
 * <video> element only rendered after camState transitioned to "live",
 * so the stream was attached before the element existed in the DOM.
 *
 * react-webcam owns the video element internally, so the race is gone.
 *
 * Features:
 * - Front camera by default (facingMode: "user")
 * - Mirrored live preview, non-mirrored capture (mirrored={true} in
 *   react-webcam mirrors display but getScreenshot() returns un-mirrored)
 * - All permission / error states: denied, unavailable, in-use, unsupported, HTTPS
 * - Retake support
 * - Stream cleanup on unmount / retake
 * - JPEG @ 0.88 quality to match original behaviour
 * - No SSR / hydration issues (ssr: false dynamic import)
 */

import dynamic from "next/dynamic";
import {
  useCallback, useRef, useState, useEffect,
} from "react";
// Type-only import: used solely for typing the ref so we can call
// .getScreenshot() and access .stream without runtime issues.
import type WebcamType from "react-webcam";
import {
  AlertCircle, Camera, CheckCircle2, FlipHorizontal,
  Loader2, RefreshCw, ShieldAlert, Smartphone,
} from "lucide-react";

import {
  SectionHeading, NavRow,
  BTN_PRIMARY, BTN_OUTLINE,
} from "./kyc-shared";

// ─── Dynamic import — SSR disabled ───────────────────────────────────────────
// Prevents "window is not defined" and hydration mismatches because
// react-webcam accesses navigator/window at module-evaluation time.
//
// We use `as any` to side-step the TypeScript mismatch between react-webcam's
// class defaultProps typing (screenshotFormat: string) and its prop union
// ("image/jpeg" | "image/png" | "image/webp"). The runtime behaviour is
// identical — react-webcam v7 is a class component that renders a <video>.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WebcamComponent = dynamic(() => import("react-webcam") as any, { ssr: false }) as any;

// ─── Types ────────────────────────────────────────────────────────────────────

type CameraState =
  | "idle"
  | "initialising"   // webcam component mounted, waiting for stream
  | "live"           // stream active, preview visible
  | "denied"
  | "unavailable"
  | "in_use"
  | "unsupported"
  | "https_required"
  | "error"
  | "captured";

interface Step3Props {
  selfie:    File | null;
  setSelfie: (f: File | null) => void;
  onNext:    () => void;
  onBack:    () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasCameraApi(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

function isInsecureContext(): boolean {
  if (typeof window === "undefined") return false;
  const { protocol, hostname } = window.location;
  return (
    protocol !== "https:" &&
    hostname !== "localhost" &&
    hostname !== "127.0.0.1" &&
    hostname !== "[::1]"
  );
}

function classifyMediaError(err: string | DOMException): CameraState {
  const name = typeof err === "string" ? err : err.name;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError"   || name === "DevicesNotFoundError")  return "unavailable";
  if (name === "NotReadableError"|| name === "TrackStartError")       return "in_use";
  return "error";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Step3Selfie({ selfie, setSelfie, onNext, onBack }: Step3Props) {
  const [camState,  setCamState]  = useState<CameraState>(selfie ? "captured" : "idle");
  const [errMsg,    setErrMsg]    = useState<string | null>(null);
  const [preview,   setPreview]   = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  // Track which facing mode is active so we can toggle front ↔ back
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // ref to the react-webcam instance (class component).
  // Typed as WebcamType so we can call .getScreenshot() and access .stream.
  const webcamRef = useRef<WebcamType>(null);

  // ── Restore preview when user comes back from a later step ────────────────
  useEffect(() => {
    if (selfie && camState === "captured") {
      const url = URL.createObjectURL(selfie);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cleanup preview URL on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pre-flight checks before we try to open the camera ───────────────────
  const startCamera = useCallback(() => {
    setErrMsg(null);

    if (!hasCameraApi()) {
      setCamState("unsupported");
      return;
    }
    if (isInsecureContext()) {
      setCamState("https_required");
      return;
    }

    // Mount the WebcamComponent — it will call onUserMedia / onUserMediaError
    setCamState("initialising");
  }, []);

  // ── react-webcam callbacks ────────────────────────────────────────────────

  const handleUserMedia = useCallback((_stream: MediaStream) => {
    setCamState("live");
    setErrMsg(null);
  }, []);

  const handleUserMediaError = useCallback((err: string | DOMException) => {
    const state = classifyMediaError(err);
    setCamState(state);
    if (state === "error") {
      const msg = typeof err === "string" ? err : err.message;
      setErrMsg(msg || "Could not access the camera. Please check permissions and try again.");
    }
  }, []);

  // ── Capture a frame from react-webcam ────────────────────────────────────
  const capture = useCallback(() => {
    if (!webcamRef.current || capturing) return;

    setCapturing(true);

    // getScreenshot() returns a data-URL (JPEG @ screenshotQuality) or null
    const dataUrl = webcamRef.current.getScreenshot();

    if (!dataUrl) {
      setCapturing(false);
      setErrMsg("Failed to capture image. Please try again.");
      return;
    }

    // Stop the stream immediately so the camera indicator light turns off
    if (webcamRef.current.stream) {
      webcamRef.current.stream.getTracks().forEach((t) => {
        try { t.stop(); } catch { /* ignore */ }
      });
    }

    // Convert the data-URL to a File so it matches the rest of the KYC upload logic
    fetch(dataUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: "image/jpeg" });
        const url  = URL.createObjectURL(file);
        setSelfie(file);
        setPreview(url);
        setCamState("captured");
      })
      .catch(() => {
        setErrMsg("Failed to process the captured image. Please try again.");
        setCamState("live");
      })
      .finally(() => {
        setCapturing(false);
      });
  }, [capturing, setSelfie]);

  // ── Retake: discard current selfie, go back to idle ──────────────────────
  const retake = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setSelfie(null);
    setPreview(null);
    setCapturing(false);
    setCamState("idle");
    setErrMsg(null);
  }, [preview, setSelfie]);

  // ── Switch front ↔ back camera ────────────────────────────────────────────
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, []);

  // ── Video constraints passed to react-webcam ──────────────────────────────
  const videoConstraints: MediaTrackConstraints = {
    facingMode: { ideal: facingMode },
    width:  { ideal: 1280 },
    height: { ideal: 720  },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <SectionHeading
        title="Live Selfie"
        sub="Take a clear selfie using your device camera. Make sure your face is fully visible, centered, and well-lit."
        icon={Camera}
      />

      {/* ── IDLE ─────────────────────────────────────────────────────────── */}
      {camState === "idle" && (
        <div className="flex flex-col items-center gap-5 rounded-3xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-10 mb-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 shadow-sm">
            <Camera size={36} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-800 mb-1.5">Ready to Take Your Selfie</p>
            <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
              Click below to allow camera access. We'll use the front-facing camera automatically.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 w-full max-w-xs">
            <button type="button" onClick={startCamera} className={`${BTN_PRIMARY} w-full`}>
              <Camera size={16} /> Open Camera
            </button>
            <p className="text-[11px] text-slate-400">
              Camera access is required to complete KYC
            </p>
          </div>
        </div>
      )}

      {/* ── INITIALISING — webcam component is mounted, waiting for stream ── */}
      {(camState === "initialising" || camState === "live") && (
        <div className="mb-6">
          {/* Camera viewport */}
          <div className="relative rounded-3xl overflow-hidden bg-black shadow-xl aspect-[4/3] sm:aspect-video">

            {/*
              WebcamComponent is always mounted here once we leave "idle".
              react-webcam owns its own <video> element, so there is no
              ref-timing race. The component requests the stream on mount
              and calls onUserMedia / onUserMediaError when done.
            */}
            <WebcamComponent
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.88}
              videoConstraints={videoConstraints}
              mirrored={facingMode === "user"}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full h-full object-cover"
              // iOS Safari requirements
              playsInline
              muted
            />

            {/* Spinner overlay while initialising */}
            {camState === "initialising" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3">
                <Loader2 size={32} className="animate-spin text-white" />
                <p className="text-xs font-semibold text-white">
                  Requesting Camera Access…
                </p>
                <p className="text-[11px] text-white/70">
                  Please allow camera access in the browser prompt
                </p>
              </div>
            )}

            {/* Face guide oval (visible once live) */}
            {camState === "live" && (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-48 h-56 sm:w-52 sm:h-60 rounded-full border-4 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>

                {/* Instruction overlay */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-4 left-0 right-0 flex justify-center"
                >
                  <span className="rounded-full bg-black/50 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                    Centre your face in the oval
                  </span>
                </div>

                {/* Switch camera button */}
                <button
                  type="button"
                  onClick={switchCamera}
                  aria-label="Switch camera"
                  className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
                >
                  <FlipHorizontal size={18} />
                </button>
              </>
            )}
          </div>

          {/* Controls — shown once live */}
          {camState === "live" && (
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setCamState("idle")}
                className={`${BTN_OUTLINE} flex-1`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capture}
                disabled={capturing}
                className={`${BTN_PRIMARY} flex-1`}
                aria-label="Capture selfie"
              >
                {capturing
                  ? <><Loader2 size={15} className="animate-spin" /> Capturing…</>
                  : <><Camera size={15} /> Capture Selfie</>
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PERMISSION DENIED ────────────────────────────────────────────── */}
      {camState === "denied" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center mb-6">
          <ShieldAlert size={32} className="mx-auto text-red-400 mb-3" />
          <p className="text-sm font-bold text-slate-800 mb-2">Camera Permission Denied</p>
          <p className="text-xs text-slate-500 mb-1 max-w-xs mx-auto">
            You blocked camera access. To allow it:
          </p>
          <ul className="text-xs text-slate-500 mb-4 space-y-0.5 text-left max-w-xs mx-auto">
            <li>• <strong>Chrome / Edge:</strong> Click the camera icon in the address bar</li>
            <li>• <strong>Safari:</strong> Settings → Websites → Camera</li>
            <li>• <strong>Firefox:</strong> Click the shield icon → allow camera</li>
          </ul>
          <button type="button" onClick={startCamera} className={`${BTN_PRIMARY} mx-auto`}>
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      )}

      {/* ── CAMERA UNAVAILABLE ───────────────────────────────────────────── */}
      {camState === "unavailable" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center mb-6">
          <Camera size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-sm font-bold text-slate-800 mb-2">No Camera Found</p>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
            No camera was detected on this device. Please use a device with a camera to complete the selfie step.
          </p>
          <button type="button" onClick={startCamera} className={`${BTN_OUTLINE} mx-auto`}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* ── CAMERA IN USE ────────────────────────────────────────────────── */}
      {camState === "in_use" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center mb-6">
          <AlertCircle size={32} className="mx-auto text-amber-500 mb-3" />
          <p className="text-sm font-bold text-slate-800 mb-2">Camera Is Busy</p>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
            The camera is already in use by another app. Please close other apps or browser tabs using the camera, then try again.
          </p>
          <button type="button" onClick={startCamera} className={`${BTN_PRIMARY} mx-auto`}>
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      )}

      {/* ── UNSUPPORTED BROWSER ──────────────────────────────────────────── */}
      {camState === "unsupported" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center mb-6">
          <Smartphone size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-sm font-bold text-slate-800 mb-2">Camera Not Supported</p>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
            Your browser does not support camera access. Please use Chrome, Safari, Firefox, or Edge on a modern device.
          </p>
        </div>
      )}

      {/* ── HTTPS REQUIRED ───────────────────────────────────────────────── */}
      {camState === "https_required" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center mb-6">
          <ShieldAlert size={32} className="mx-auto text-amber-500 mb-3" />
          <p className="text-sm font-bold text-slate-800 mb-2">Secure Connection Required</p>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
            Camera access requires HTTPS. Please access this page over a secure connection.
          </p>
        </div>
      )}

      {/* ── GENERIC ERROR ─────────────────────────────────────────────────── */}
      {camState === "error" && (
        <div className="mb-6">
          {errMsg && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 mb-4">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{errMsg}</span>
            </div>
          )}
          <button type="button" onClick={startCamera} className={BTN_PRIMARY}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* ── CAPTURED PREVIEW ─────────────────────────────────────────────── */}
      {camState === "captured" && preview && (
        <div className="mb-6">
          <div className="relative rounded-3xl overflow-hidden border-4 border-emerald-400 shadow-xl">
            <img
              src={preview}
              alt="Your captured selfie"
              className="w-full aspect-[4/3] sm:aspect-video object-cover"
            />
            <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
              <CheckCircle2 size={13} /> Selfie Captured
            </div>
          </div>

          <button
            type="button"
            onClick={retake}
            className="mt-3 flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <RefreshCw size={14} /> Retake Selfie
          </button>
        </div>
      )}

      {/* ── Tips ─────────────────────────────────────────────────────────── */}
      {(camState === "idle" || camState === "live") && (
        <div className="mb-6 grid grid-cols-3 gap-2 text-center">
          {[
            { icon: "💡", label: "Good lighting" },
            { icon: "👤", label: "Face centred" },
            { icon: "😐", label: "Neutral expression" },
          ].map(({ icon, label }) => (
            <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 py-2.5 px-2">
              <p className="text-lg mb-0.5">{icon}</p>
              <p className="text-[11px] text-slate-500 font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      <NavRow>
        <button type="button" onClick={onBack} className={`${BTN_OUTLINE} flex-1`}>
          Back
        </button>
        <button
          type="button"
          disabled={camState !== "captured"}
          onClick={onNext}
          className={`${BTN_PRIMARY} flex-1`}
        >
          Continue to Review
        </button>
      </NavRow>
    </div>
  );
}

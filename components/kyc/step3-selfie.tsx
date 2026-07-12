"use client";

/**
 * Step 3 — Live Selfie Capture
 *
 * Completely rebuilt camera module with:
 * - Cross-browser support: Chrome, Firefox, Safari (iOS/macOS), Edge, Samsung Internet
 * - Cross-device support: Desktop, Android, iPhone, iPad, Tablet
 * - Front-facing camera preference with graceful fallback
 * - Multiple camera switching (if device has both front/back)
 * - Correct stream lifecycle management (no leaks)
 * - iOS Safari workarounds (autoplay, playsInline, muted required)
 * - Orientation change handling
 * - All error states: denied, unavailable, in-use, unsupported, HTTPS
 * - Image compression before storing (JPEG @ 0.88)
 * - Mirror-flip canvas draw for natural selfie preview
 */

import {
  useCallback, useEffect, useRef, useState,
} from "react";
import {
  AlertCircle, Camera, CheckCircle2, FlipHorizontal,
  Loader2, RefreshCw, ShieldAlert, Smartphone,
} from "lucide-react";

import {
  SectionHeading, NavRow,
  BTN_PRIMARY, BTN_OUTLINE, BTN_DANGER,
} from "./kyc-shared";

// ─── Types ────────────────────────────────────────────────────────────────────

type CameraState =
  | "idle"
  | "requesting"
  | "live"
  | "denied"
  | "unavailable"
  | "in_use"
  | "unsupported"
  | "https_required"
  | "overconstrained"
  | "captured"
  | "error";

interface Step3Props {
  selfie:    File | null;
  setSelfie: (f: File | null) => void;
  onNext:    () => void;
  onBack:    () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true if getUserMedia is available */
function hasCameraApi(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

/** Returns true when running in a non-secure context that would block camera */
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

/** Enumerate available video input devices */
async function listVideoDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput");
  } catch {
    return [];
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Step3Selfie({ selfie, setSelfie, onNext, onBack }: Step3Props) {
  const [camState,    setCamState]    = useState<CameraState>(selfie ? "captured" : "idle");
  const [errMsg,      setErrMsg]      = useState<string | null>(null);
  const [preview,     setPreview]     = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIndex,  setDeviceIndex]  = useState(0);   // which camera is active
  const [facingMode,   setFacingMode]   = useState<"user" | "environment">("user");
  const [capturing,    setCapturing]    = useState(false);

  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  // ── Restore preview from pre-existing selfie (e.g. after Back navigation) ──
  useEffect(() => {
    if (selfie && camState === "captured") {
      const url = URL.createObjectURL(selfie);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Always stop stream on unmount ──────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle device orientation change — restart stream ─────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOrientation = () => {
      if (camState === "live") {
        // Small delay to let the browser finish reorienting
        setTimeout(() => {
          if (mountedRef.current && camState === "live") {
            restartStream();
          }
        }, 300);
      }
    };

    window.addEventListener("orientationchange", handleOrientation);
    return () => window.removeEventListener("orientationchange", handleOrientation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camState]);

  // ── Stop stream utility ────────────────────────────────────────────────────
  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch { /* ignore */ }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch { /* ignore */ }
    }
  }

  // ── Restart stream (orientation change) ───────────────────────────────────
  async function restartStream() {
    stopStream();
    await openStream(deviceIndex, facingMode);
  }

  // ── Core stream opener ─────────────────────────────────────────────────────
  const openStream = useCallback(
    async (devIdx: number, facing: "user" | "environment") => {
      if (!mountedRef.current) return;

      setCamState("requesting");
      setErrMsg(null);

      // 1 — API availability
      if (!hasCameraApi()) {
        setCamState("unsupported");
        return;
      }

      // 2 — HTTPS check
      if (isInsecureContext()) {
        setCamState("https_required");
        return;
      }

      // 3 — Enumerate devices (best effort — requires prior permission grant on some browsers)
      let devices: MediaDeviceInfo[] = [];
      try { devices = await listVideoDevices(); } catch { /* ignore */ }
      if (mountedRef.current && devices.length > 0) {
        setVideoDevices(devices);
      }

      // 4 — Build constraint cascade
      //     We try progressively-relaxed constraints to maximise device compatibility.
      const specificDevice = devices[devIdx]?.deviceId;
      const constraints: MediaStreamConstraints[] = [];

      if (specificDevice) {
        // Exact device requested (multi-camera switch)
        constraints.push({
          video: {
            deviceId: { exact: specificDevice },
            width:  { ideal: 1280 },
            height: { ideal: 720  },
          },
          audio: false,
        });
      }

      // Facing mode with ideal resolution
      constraints.push({
        video: {
          facingMode: { ideal: facing },
          width:  { ideal: 1280 },
          height: { ideal: 720  },
        },
        audio: false,
      });

      // Facing mode, any resolution
      constraints.push({ video: { facingMode: facing }, audio: false });

      // Any camera fallback
      constraints.push({ video: true, audio: false });

      let stream: MediaStream | null = null;
      let lastError: Error | null    = null;

      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          break; // success
        } catch (e) {
          lastError = e as Error;
          // If permission denied, no point trying softer constraints
          const name = (e as Error).name;
          if (name === "NotAllowedError" || name === "PermissionDeniedError") break;
        }
      }

      if (!mountedRef.current) {
        // Component unmounted while awaiting
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (!stream) {
        const name = lastError?.name ?? "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setCamState("denied");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setCamState("unavailable");
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          setCamState("in_use");
        } else if (name === "OverconstrainedError") {
          setCamState("overconstrained");
          setErrMsg("The camera does not support the requested resolution. Trying basic settings…");
        } else {
          setErrMsg("Could not access the camera. Please check permissions and try again.");
          setCamState("error");
        }
        return;
      }

      streamRef.current = stream;

      // Attach to video element — iOS Safari requires autoPlay + playsInline + muted
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      video.srcObject = stream;

      // iOS Safari does not support await play() reliably — use event handler
      const onReady = () => {
        if (!mountedRef.current) return;
        const playResult = video.play();
        if (playResult instanceof Promise) {
          playResult
            .then(() => { if (mountedRef.current) setCamState("live"); })
            .catch(() => { if (mountedRef.current) setCamState("live"); }); // still works
        } else {
          setCamState("live");
        }
      };

      video.addEventListener("loadedmetadata", onReady, { once: true });
      // Fallback: if loadedmetadata never fires (very old WebKit)
      video.load();
    },
    [] // openStream has no external dependencies
  );

  // ── Start camera ───────────────────────────────────────────────────────────
  const startCamera = useCallback(() => {
    openStream(deviceIndex, facingMode);
  }, [openStream, deviceIndex, facingMode]);

  // ── Switch between front / back cameras ───────────────────────────────────
  const switchCamera = useCallback(async () => {
    stopStream();
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);

    // If we have enumerated devices, cycle through them
    if (videoDevices.length > 1) {
      const next = (deviceIndex + 1) % videoDevices.length;
      setDeviceIndex(next);
      await openStream(next, newFacing);
    } else {
      await openStream(deviceIndex, newFacing);
    }
  }, [facingMode, deviceIndex, videoDevices, openStream]);

  // ── Capture frame from live video ─────────────────────────────────────────
  const capture = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || capturing) return;

    setCapturing(true);

    // Use actual video dimensions, capped at 1280px on the longest side
    const maxDim = 1280;
    const vw     = video.videoWidth  || 640;
    const vh     = video.videoHeight || 480;
    const scale  = Math.min(1, maxDim / Math.max(vw, vh));

    canvas.width  = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) { setCapturing(false); return; }

    // Mirror horizontally for front-facing camera (natural selfie look)
    if (facingMode === "user") {
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    stopStream();

    // Use toBlob for async, memory-efficient encoding (works on all browsers)
    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob || !mountedRef.current) {
          setErrMsg("Failed to capture image. Please try again.");
          setCamState("idle");
          return;
        }
        const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: "image/jpeg" });
        const url  = URL.createObjectURL(file);
        setSelfie(file);
        setPreview(url);
        setCamState("captured");
      },
      "image/jpeg",
      0.88
    );
  }, [capturing, facingMode, setSelfie]);

  // ── Retake ─────────────────────────────────────────────────────────────────
  const retake = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setSelfie(null);
    setPreview(null);
    setCapturing(false);
    setCamState("idle");
    setErrMsg(null);
  }, [preview, setSelfie]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

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

      {/* ── REQUESTING ───────────────────────────────────────────────────── */}
      {camState === "requesting" && (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-slate-50 px-6 py-12 mb-6 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <Loader2 size={36} className="animate-spin text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Requesting Camera Access…</p>
            <p className="text-xs text-slate-500 mt-1">
              Please allow camera access in the browser prompt
            </p>
          </div>
        </div>
      )}

      {/* ── UNSUPPORTED ──────────────────────────────────────────────────── */}
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
            Camera access requires HTTPS. Please access this page over a secure (HTTPS) connection.
          </p>
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

      {/* ── OVERCONSTRAINED / GENERIC ERROR ──────────────────────────────── */}
      {(camState === "overconstrained" || camState === "error") && (
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

      {/* ── LIVE FEED ────────────────────────────────────────────────────── */}
      {camState === "live" && (
        <div className="mb-6">
          {/* Camera viewport */}
          <div className="relative rounded-3xl overflow-hidden bg-black shadow-xl aspect-[4/3] sm:aspect-video">
            {/* Video element — iOS Safari requires autoPlay, playsInline, muted */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={[
                "w-full h-full object-cover",
                facingMode === "user" ? "scale-x-[-1]" : "",
              ].join(" ")}
            />

            {/* Face guide oval */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="w-48 h-56 sm:w-52 sm:h-60 rounded-full border-4 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>

            {/* Instruction overlay at top */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-4 left-0 right-0 flex justify-center"
            >
              <span className="rounded-full bg-black/50 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                Centre your face in the oval
              </span>
            </div>

            {/* Switch camera button (top-right) — only if multiple cameras */}
            {videoDevices.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                aria-label="Switch camera"
                className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
              >
                <FlipHorizontal size={18} />
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => { stopStream(); setCamState("idle"); }}
              className={`${BTN_OUTLINE} flex-1`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={capture}
              disabled={capturing}
              className={`${BTN_PRIMARY} flex-1`}
            >
              {capturing
                ? <><Loader2 size={15} className="animate-spin" /> Capturing…</>
                : <><Camera size={15} /> Capture Selfie</>
              }
            </button>
          </div>
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
            {/* Approved badge */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
              <CheckCircle2 size={13} /> Selfie Captured
            </div>
          </div>

          {/* Retake option */}
          <button
            type="button"
            onClick={retake}
            className="mt-3 flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <RefreshCw size={14} /> Retake Selfie
          </button>
        </div>
      )}

      {/* Hidden canvas used for frame extraction — never visible */}
      <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />

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

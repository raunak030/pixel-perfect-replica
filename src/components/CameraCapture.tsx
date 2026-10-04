import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * In-app camera: live preview via getUserMedia, capture to a File.
 * Works on desktop + mobile browsers (needs HTTPS or localhost).
 * The old `capture`-attribute file-input trick is kept only as fallback —
 * programmatic clicks on `display:none` inputs silently fail on iOS Safari.
 */
export function CameraCapture({ onCapture }: { onCapture: (file: File) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [live, setLive] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setShot(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "This browser can't access the camera here. It needs HTTPS or localhost — use Upload instead.",
      );
      return;
    }
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setLive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings, or use Upload instead."
          : "No camera found. Use Upload instead.",
      );
    } finally {
      setStarting(false);
    }
  }, []);

  useEffect(() => {
    if (open) void start();
    else {
      stop();
      setShot(null);
      setError(null);
    }
  }, [open, start, stop]);

  useEffect(() => stop, [stop]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setShot(canvas.toDataURL("image/jpeg", 0.92));
  }

  function usePhoto() {
    if (!shot) return;
    fetch(shot)
      .then((r) => r.blob())
      .then((blob) => {
        onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
        setOpen(false);
      });
  }

  return (
    <>
      <Button variant="outline" className="flex-1" onClick={() => setOpen(true)}>
        <Camera /> Camera
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Take a photo of the card</DialogTitle>
          </DialogHeader>
          {error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : shot ? (
            <div className="space-y-3">
              <img src={shot} alt="Captured card" className="w-full rounded-md border" />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShot(null)}>
                  <RotateCcw /> Retake
                </Button>
                <Button className="flex-1" onClick={usePhoto}>
                  Use photo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative grid min-h-64 place-items-center overflow-hidden rounded-md border bg-black">
                <video ref={videoRef} playsInline muted className="max-h-80 w-full object-cover" />
                {starting && <Loader2 className="absolute animate-spin text-white" />}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
                  <X /> Cancel
                </Button>
                <Button className="flex-1" disabled={starting || !live} onClick={takePhoto}>
                  <Camera /> Capture
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useEffect, useRef } from "react";

export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let active = true;
    let localStream: MediaStream | null = null;

    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStream = mediaStream;
        setStream(mediaStream);
      } catch (err: any) {
        if (active) setError(err.message || "Failed to access camera");
      }
    }

    setupCamera();

    return () => {
      active = false;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Attach the stream to the video element whenever both are available.
  // The video element may mount after the stream is acquired (e.g. the
  // camera feed lives in a later stage of the page), so we can't rely on
  // assigning srcObject inside the getUserMedia callback.
  useEffect(() => {
    const el = videoRef.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
    }
  });

  return { stream, error, videoRef };
}

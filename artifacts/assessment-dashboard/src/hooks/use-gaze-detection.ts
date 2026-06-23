import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

type GazeStatus = "FORWARD" | "LOOKING_AWAY";

interface UseGazeDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
  onGazeChange?: (status: GazeStatus) => void;
}

export function useGazeDetection({ videoRef, enabled, onGazeChange }: UseGazeDetectionOptions) {
  const [gazeStatus, setGazeStatus] = useState<GazeStatus>("FORWARD");
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const noFaceCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      return;
    }

    let mounted = true;

    const loadModel = async () => {
      try {
        setLoadError(null);
        const vision = await FilesetResolver.forVisionTasks(
          "/mediapipe/wasm/"
        );
        
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/mediapipe/models/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });

        if (!mounted) return;
        
        faceLandmarkerRef.current = faceLandmarker;
        setIsModelLoaded(true);
      } catch (error) {
        console.error("Failed to load FaceLandmarker model:", error);
        setLoadError(error instanceof Error ? error.message : "Failed to load gaze detection model");
      }
    };

    loadModel();

    return () => {
      mounted = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isModelLoaded || !videoRef.current || !faceLandmarkerRef.current) {
      return;
    }

    const video = videoRef.current;
    const faceLandmarker = faceLandmarkerRef.current;
    let lastTimestamp = performance.now();

    const detectGaze = () => {
      if (!video || video.readyState < 2) {
        console.log("[Gaze Detection] Video not ready:", video ? `readyState=${video.readyState}` : "no video");
        detectionIntervalRef.current = requestAnimationFrame(detectGaze);
        return;
      }

      const now = performance.now();
      const elapsed = now - lastTimestamp;

      // Run detection every 250ms to keep it light
      if (elapsed < 250) {
        detectionIntervalRef.current = requestAnimationFrame(detectGaze);
        return;
      }

      lastTimestamp = now;

      try {
        const results = faceLandmarker.detectForVideo(video, now);
        
        console.log("[Gaze Detection] Detection cycle - video dimensions:", video.videoWidth, "x", video.videoHeight);
        
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          
          // Reset no-face counter when face is detected
          noFaceCountRef.current = 0;
          
          // Calculate head pose using nose tip and other facial landmarks
          // Nose tip is landmark 1, left eye is 33, right eye is 262
          const noseTip = landmarks[1];
          const leftEye = landmarks[33];
          const rightEye = landmarks[262];

          if (noseTip && leftEye && rightEye) {
            // Calculate yaw (horizontal rotation) based on nose position relative to eyes
            const eyeCenter = {
              x: (leftEye.x + rightEye.x) / 2,
              y: (leftEye.y + rightEye.y) / 2,
            };

            const yaw = noseTip.x - eyeCenter.x;
            const pitch = noseTip.y - eyeCenter.y;

            // Thresholds for determining if looking away
            // These values may need tuning based on testing
            const YAW_THRESHOLD = 0.15;
            const PITCH_THRESHOLD = 0.2;

            const isLookingAway = Math.abs(yaw) > YAW_THRESHOLD || Math.abs(pitch) > PITCH_THRESHOLD;
            const newStatus: GazeStatus = isLookingAway ? "LOOKING_AWAY" : "FORWARD";

            console.log("[Gaze Detection] Raw values - yaw:", yaw.toFixed(4), "pitch:", pitch.toFixed(4), "| Thresholds - YAW:", YAW_THRESHOLD, "PITCH:", PITCH_THRESHOLD, "| Result:", newStatus);

            setGazeStatus(newStatus);
            onGazeChange?.(newStatus);
          } else {
            console.log("[Gaze Detection] Landmarks missing:", { noseTip: !!noseTip, leftEye: !!leftEye, rightEye: !!rightEye });
          }
        } else {
          // No face detected - increment counter and check if it persists
          noFaceCountRef.current += 1;
          const NO_FACE_THRESHOLD = 3; // Require 3 consecutive frames of no face
          
          console.log("[Gaze Detection] No face landmarks detected - consecutive count:", noFaceCountRef.current);
          
          if (noFaceCountRef.current >= NO_FACE_THRESHOLD) {
            console.log("[Gaze Detection] No face for", NO_FACE_THRESHOLD, "consecutive frames - treating as LOOKING_AWAY");
            setGazeStatus("LOOKING_AWAY");
            onGazeChange?.("LOOKING_AWAY");
          }
        }
      } catch (error) {
        console.error("Gaze detection error:", error);
      }

      detectionIntervalRef.current = requestAnimationFrame(detectGaze);
    };

    detectionIntervalRef.current = requestAnimationFrame(detectGaze);

    return () => {
      if (detectionIntervalRef.current) {
        cancelAnimationFrame(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [enabled, isModelLoaded, videoRef, onGazeChange]);

  return { gazeStatus, isModelLoaded, loadError };
}

import { useState, useEffect } from "react";

export function useCandidate() {
  const [candidateId, setCandidateId] = useState<number | null>(() => {
    const stored = localStorage.getItem("candidateId");
    return stored ? parseInt(stored, 10) : null;
  });

  useEffect(() => {
    if (candidateId) {
      localStorage.setItem("candidateId", candidateId.toString());
    } else {
      localStorage.removeItem("candidateId");
    }
  }, [candidateId]);

  return { candidateId, setCandidateId };
}

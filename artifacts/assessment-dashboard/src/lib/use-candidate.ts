import { useAuth } from "@clerk/react";
import { useGetCurrentCandidate, getGetCurrentCandidateQueryKey } from "@workspace/api-client-react";

export function useCurrentCandidate() {
  const { isSignedIn, isLoaded } = useAuth();
  const query = useGetCurrentCandidate({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetCurrentCandidateQueryKey(),
    },
  });

  return {
    ...query,
    candidate: query.data,
    isSignedIn: !!isSignedIn,
    authLoaded: isLoaded,
  };
}

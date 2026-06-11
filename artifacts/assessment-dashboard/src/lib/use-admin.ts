import { useAuth } from "@clerk/react";
import { useGetAdminAccess, getGetAdminAccessQueryKey } from "@workspace/api-client-react";

export function useIsAdmin() {
  const { isSignedIn, isLoaded } = useAuth();
  const query = useGetAdminAccess({
    query: {
      enabled: isLoaded && !!isSignedIn,
      queryKey: getGetAdminAccessQueryKey(),
    },
  });

  return {
    ...query,
    isAdmin: !!query.data?.isAdmin,
    authLoaded: isLoaded,
  };
}

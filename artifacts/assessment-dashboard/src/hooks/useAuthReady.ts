import { createContext, useContext } from "react";

// Auth readiness context to prevent race-condition 401s
const AuthReadyContext = createContext<{ isReady: boolean; setReady: (ready: boolean) => void }>({
  isReady: false,
  setReady: () => {},
});

export function useAuthReady(): boolean {
  const { isReady } = useContext(AuthReadyContext);
  return isReady;
}

export { AuthReadyContext };

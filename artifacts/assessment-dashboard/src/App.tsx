import { useEffect, useRef, useState, useContext } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useAuth } from "@clerk/react";
// import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Brain } from "lucide-react";
import { AuthReadyContext } from "./hooks/useAuthReady";

import Landing from "./pages/landing";
import Profile from "./pages/profile";
import Dashboard from "./pages/dashboard";
import Interview from "./pages/interview";
import Results from "./pages/results";
import Admin from "./pages/admin";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2319D3E6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z'/%3E%3Cpath d='M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z'/%3E%3C/svg%3E",
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
    allowedStrategies: ["oauth_google"],
    branding: false,
  },
  variables: {
    colorPrimary: "hsl(190 90% 50%)",
    colorForeground: "hsl(220 10% 98%)",
    colorMutedForeground: "hsl(220 10% 65%)",
    colorDanger: "hsl(0 80% 60%)",
    colorBackground: "hsl(220 20% 6%)",
    colorInput: "hsl(220 15% 12%)",
    colorInputForeground: "hsl(220 10% 98%)",
    colorNeutral: "hsl(220 10% 98%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-[hsl(220_20%_6%)] border border-[hsl(220_15%_18%)] rounded-xl w-[420px] max-w-full overflow-hidden shadow-[0_0_60px_-12px_rgba(25,211,230,0.15)] p-8",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none !p-0",
    headerTitle: "text-[hsl(220_10%_98%)] font-bold tracking-tight text-2xl",
    headerSubtitle: "text-[hsl(220_10%_65%)] text-sm",
    header: "!flex !flex-col !items-center !text-center !space-y-2 !mb-6",
    socialButtonsBlockButton:
      "border border-[hsl(220_15%_18%)] bg-[hsl(220_15%_10%)] hover:bg-[hsl(220_15%_14%)] w-full",
    socialButtonsBlockButtonText: "text-[hsl(220_10%_98%)] font-medium",
    dividerLine: "bg-[hsl(220_15%_18%)]",
    dividerText: "text-[hsl(220_10%_65%)] font-mono text-xs uppercase tracking-wider",
    divider: "!my-6",
    formFieldLabel: "text-[hsl(220_10%_98%)] font-mono text-xs tracking-wide uppercase",
    formFieldInput:
      "bg-[hsl(220_15%_12%)] border border-[hsl(220_15%_18%)] text-[hsl(220_10%_98%)] focus:border-[hsl(190_90%_50%)] focus:ring-1 focus:ring-[hsl(190_90%_50%)]",
    formButtonPrimary:
      "bg-[hsl(190_90%_50%)] hover:bg-[hsl(190_90%_45%)] text-[hsl(220_20%_4%)] font-mono text-xs tracking-wider w-full rounded-lg",
    footerActionText: "text-[hsl(220_10%_65%)] text-sm",
    footerActionLink: "text-[hsl(190_90%_50%)] hover:text-[hsl(190_90%_60%)] font-medium",
    footer: "!mt-6",
    identityPreviewEditButton: "text-[hsl(190_90%_50%)]",
    formFieldSuccessText: "text-[hsl(190_90%_50%)]",
    formFieldErrorText: "text-[hsl(0_80%_65%)]",
    otpCodeFieldInput: "bg-[hsl(220_15%_12%)] border border-[hsl(220_15%_18%)] text-[hsl(220_10%_98%)]",
    logoImage: "h-12 w-12",
    socialButtons: "!flex !flex-col !space-y-3",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function EmailVerificationPage() {
  const { isLoaded, isSignedIn } = useAuth();
  
  if (!isLoaded) return <div>Loading...</div>;
  
  if (isSignedIn) {
    return <Redirect to="/dashboard" />;
  }
  
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
        <p className="text-muted-foreground mb-6">
          We've sent a verification link to your email. Please click it to complete your sign-up.
        </p>
        <button 
          onClick={() => window.location.href = `${basePath}/sign-in`}
          className="text-primary hover:underline"
        >
          Return to Sign In
        </button>
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-4xl space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <p className="text-primary font-mono text-xs uppercase tracking-widest">
            ARVENCOR ASSESSMENT
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Welcome to your AI-driven evaluation
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Sign up to begin, then pick the specialization you want to be evaluated on — engineering, data & AI, infrastructure, security, and more.
          </p>
        </div>

        {/* Sign Up Card */}
        <div className="flex justify-center">
          <SignUp 
            routing="path" 
            path={`${basePath}/sign-up`} 
            signInUrl={`${basePath}/sign-in`}
            forceRedirectUrl={`${basePath}/verify-email`}
            appearance={{
              ...clerkAppearance,
              elements: {
                ...clerkAppearance.elements,
                footerPages: "!hidden",
                badge: "!hidden",
                developmentModeWarning: "!hidden",
                poweredByClerk: "!hidden",
                clerkPoweredBy: "!hidden",
                footer: "!flex !flex-col !items-center !text-center !space-y-2 !mt-6",
                socialButtonsGithubButton: "!hidden",
                socialButtonsGithub: "!hidden",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <div>Loading...</div>;

  if (isSignedIn) {
    return <Redirect to="/dashboard" />;
  }

  return <Landing />;
}

function AuthedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <div>Loading...</div>;

  if (isSignedIn) {
    return <>{children}</>;
  }

  return <Redirect to="/" />;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AuthTokenInitializer() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { setReady } = useContext(AuthReadyContext);

  useEffect(() => {
    // Only configure auth when Clerk is fully loaded
    if (!isLoaded) {
      console.log("[Auth] Clerk not loaded yet, waiting...");
      return;
    }

    // Configure the API client to use Clerk's getToken for authentication
    setAuthTokenGetter(async () => {
      try {
        const token = await getToken();
        console.log("[Auth] Token retrieved:", token ? "exists" : "null");
        return token;
      } catch (error) {
        console.error("[Auth] Failed to get Clerk token:", error);
        return null;
      }
    });

    // Mark auth as ready when loaded
    setReady(true);
    console.log("[Auth] Auth initialized, isSignedIn:", isSignedIn);
  }, [isLoaded, isSignedIn, getToken, setReady]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const [isAuthReady, setIsAuthReady] = useState(false);

  return (
    <AuthReadyContext.Provider value={{ isReady: isAuthReady, setReady: setIsAuthReady }}>
      <ClerkProvider
        publishableKey={clerkPubKey}
        appearance={clerkAppearance}
        signInUrl={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        localization={{
          signIn: {
            start: {
              title: "Access EVAL_CORE",
              subtitle: "Sign in to run your technical assessment",
            },
          },
          signUp: {
            start: {
              title: "Initialize profile",
              subtitle: "Create your account to begin",
            },
          },
        }}
        routerPush={(to) => setLocation(stripBase(to))}
        routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
      >
        <QueryClientProvider client={queryClient}>
          <ClerkQueryClientCacheInvalidator />
          <AuthTokenInitializer />
          <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/verify-email" component={EmailVerificationPage} />
            <Route path="/profile">
              <AuthedRoute>
                <Profile />
              </AuthedRoute>
            </Route>
            <Route path="/dashboard">
              <AuthedRoute>
                <Dashboard />
              </AuthedRoute>
            </Route>
            <Route path="/interview/:sessionId">
              <AuthedRoute>
                <Interview />
              </AuthedRoute>
            </Route>
            <Route path="/results/:sessionId">
              <AuthedRoute>
                <Results />
              </AuthedRoute>
            </Route>
            <Route path="/admin">
              <AuthedRoute>
                <Admin />
              </AuthedRoute>
            </Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
    </AuthReadyContext.Provider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;

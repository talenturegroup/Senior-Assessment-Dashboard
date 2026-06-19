import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useAuth } from "@clerk/react";
// import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Landing from "./pages/landing";
import Profile from "./pages/profile";
import Dashboard from "./pages/dashboard";
import Interview from "./pages/interview";
import Results from "./pages/results";
import Admin from "./pages/admin";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

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
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
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
    borderRadius: "0.25rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-[hsl(220_20%_6%)] border border-[hsl(220_15%_12%)] rounded-lg w-[440px] max-w-full overflow-hidden shadow-[0_0_60px_-12px_rgba(25,211,230,0.15)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[hsl(220_10%_98%)] font-bold tracking-tight",
    headerSubtitle: "text-[hsl(220_10%_65%)]",
    socialButtonsBlockButton:
      "border border-[hsl(220_15%_18%)] bg-[hsl(220_15%_10%)] hover:bg-[hsl(220_15%_14%)]",
    socialButtonsBlockButtonText: "text-[hsl(220_10%_98%)] font-medium",
    dividerLine: "bg-[hsl(220_15%_18%)]",
    dividerText: "text-[hsl(220_10%_65%)] font-mono text-xs uppercase tracking-wider",
    formFieldLabel: "text-[hsl(220_10%_98%)] font-mono text-xs tracking-wide",
    formFieldInput:
      "bg-[hsl(220_15%_12%)] border border-[hsl(220_15%_18%)] text-[hsl(220_10%_98%)]",
    formButtonPrimary:
      "bg-[hsl(190_90%_50%)] hover:bg-[hsl(190_90%_45%)] text-[hsl(220_20%_4%)] font-mono text-xs tracking-wider",
    footerActionText: "text-[hsl(220_10%_65%)]",
    footerActionLink: "text-[hsl(190_90%_50%)] hover:text-[hsl(190_90%_60%)] font-medium",
    identityPreviewEditButton: "text-[hsl(190_90%_50%)]",
    formFieldSuccessText: "text-[hsl(190_90%_50%)]",
    formFieldErrorText: "text-[hsl(0_80%_65%)]",
    otpCodeFieldInput: "bg-[hsl(220_15%_12%)] border border-[hsl(220_15%_18%)] text-[hsl(220_10%_98%)]",
    logoImage: "h-10 w-10",
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
      <SignUp 
        routing="path" 
        path={`${basePath}/sign-up`} 
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${basePath}/verify-email`}
      />
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

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={import.meta.env.MODE === 'production' ? clerkProxyUrl : undefined}
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

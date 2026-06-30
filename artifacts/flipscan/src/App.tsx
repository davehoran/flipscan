import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/home";
import ScanFlow from "@/pages/scan";
import SavedList from "@/pages/saved";
import SavedItemView from "@/pages/saved-item";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

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
    logoImageUrl: `${window.location.origin}${basePath}/logo.png`,
  },
  variables: {
    colorPrimary: "#007AFF",
    colorForeground: "#1C1C1E",
    colorMutedForeground: "#8E8E93",
    colorDanger: "#FF3B30",
    colorBackground: "#0d0d1a", // dark bg for sign in to match brand
    colorInput: "#1c1c2e",
    colorInputForeground: "#FFFFFF",
    colorNeutral: "#3a3a4c",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    borderRadius: "16px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#080810] rounded-[24px] w-[440px] max-w-full overflow-hidden border border-[#2a2a3c]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-bold text-2xl tracking-tight text-ring",
    headerSubtitle: "text-[#8E8E93]",
    socialButtonsBlockButtonText: "font-medium text-primary-foreground",
    formFieldLabel: "text-primary-foreground",
    footerActionLink: "text-[#007AFF] hover:text-[#3395FF]",
    footerActionText: "text-[#8E8E93]",
    dividerText: "text-[#8E8E93]",
    identityPreviewEditButton: "text-[#007AFF]",
    formFieldSuccessText: "text-[#34C759]",
    alertText: "text-[#FF3B30]",
    logoBox: "mx-auto mb-4",
    socialButtonsBlockButton: "border-[#3a3a4c] bg-[#12121d] hover:bg-[#1c1c2e]",
    formButtonPrimary: "bg-[#007AFF] hover:bg-[#0051CC] text-white font-semibold shadow-lg",
    formFieldInput: "bg-[#1c1c2e] border-[#3a3a4c] text-white",
    dividerLine: "bg-[#3a3a4c]",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0d0d1a] px-4" style={{ background: "radial-gradient(ellipse at 30% 0%,#1a1040 0%,#0d0d1a 55%)" }}>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0d0d1a] px-4" style={{ background: "radial-gradient(ellipse at 30% 0%,#1a1040 0%,#0d0d1a 55%)" }}>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/scan" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </Route>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access your account",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Get started today",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <ProtectedRoute path="/scan" component={ScanFlow} />
          <ProtectedRoute path="/saved" component={SavedList} />
          <ProtectedRoute path="/saved/:id" component={SavedItemView} />
          {/* Fallback to home */}
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
        <Toaster />
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

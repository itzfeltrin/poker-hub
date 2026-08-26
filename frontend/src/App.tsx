import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/router";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/pages/LoginPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message === "Unauthorized") {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-felt flex items-center justify-center">
        <img src="/logo_transparent.png" alt="Poker Hub" className="h-16" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <LoginPage />;
  }

  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthGate>
          <RouterProvider router={router} />
        </AuthGate>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

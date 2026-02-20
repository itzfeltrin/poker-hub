import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { PokerProvider } from "@/context/PokerContext";
import { router } from "@/router";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PokerProvider>
        <RouterProvider router={router} />
      </PokerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

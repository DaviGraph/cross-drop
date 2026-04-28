import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import Index from "./pages/Index";
import Send from "./pages/Send";
import Receive from "./pages/Receive";
import Dashboard from "./pages/Dashboard";
import Scan from "./pages/Scan";
import Feedback from "./pages/Feedback";
import AdminFeedback from "./pages/AdminFeedback";
import QA from "./pages/QA";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <OnboardingOverlay />
        <Navbar />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/send" element={<Send />} />
          <Route path="/receive/:code" element={<Receive />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/admin/feedback" element={<AdminFeedback />} />
          <Route path="/qa" element={<QA />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

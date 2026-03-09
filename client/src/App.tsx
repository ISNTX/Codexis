import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { Header } from "@/components/header";
import { ChatPage } from "@/pages/chat-page";
import { ComparePage } from "@/pages/compare-page";
import { OrchestratePage } from "@/pages/orchestrate-page";
import { AgenicPage } from "@/pages/agenic-page";
import { MarketerPage } from "@/pages/marketer-page";
import { AdminPage } from "@/pages/admin-page";
import { PricingPage } from "@/pages/pricing-page";
import { CheckoutSuccessPage } from "./pages/checkout-success";
import { DashboardPage } from "./pages/dashboard-page";
import type { ConversationMode } from "@shared/schema";

function MainContent() {
  const [location] = useLocation();
  const [currentMode, setCurrentMode] = useState<ConversationMode>(() => {
    const savedMode = localStorage.getItem("current-mode");
    const validModes: ConversationMode[] = ["chat", "compare", "orchestrate", "agenic", "marketer"];
    if (savedMode && validModes.includes(savedMode as ConversationMode)) {
      return savedMode as ConversationMode;
    }
    return "chat";
  });

  useEffect(() => {
    if (currentMode) {
      localStorage.setItem("current-mode", currentMode);
    }
  }, [currentMode]);

  const renderPage = () => {
    switch (currentMode) {
      case "chat":
        return <ChatPage />;
      case "compare":
        return <ComparePage />;
      case "orchestrate":
        return <OrchestratePage />;
      case "agenic":
        return <AgenicPage />;
      case "marketer":
        return <MarketerPage />;
      default:
        return <ChatPage />;
    }
  };

  if (location === "/pricing") {
    return (
      <div className="flex flex-col h-screen">
        <Header currentMode={currentMode} onModeChange={setCurrentMode} />
        <main className="flex-1 overflow-hidden">
          <PricingPage />
        </main>
      </div>
    );
  }

  if (location === "/dashboard") {
    return (
      <div className="flex flex-col h-screen">
        <Header currentMode={currentMode} onModeChange={setCurrentMode} />
        <main className="flex-1 overflow-hidden">
          <DashboardPage />
        </main>
      </div>
    );
  }

  if (location === "/admin") {
    return (
      <div className="flex flex-col h-screen">
        <Header currentMode={currentMode} onModeChange={setCurrentMode} />
        <main className="flex-1 overflow-hidden">
          <AdminPage />
        </main>
      </div>
    );
  }

  if (location.startsWith("/checkout/success")) {
    return (
      <div className="flex flex-col h-screen">
        <Header currentMode={currentMode} onModeChange={setCurrentMode} />
        <main className="flex-1 overflow-hidden">
          <CheckoutSuccessPage />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header currentMode={currentMode} onModeChange={setCurrentMode} />
      <main className="flex-1 overflow-hidden">
        {renderPage()}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <MainContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

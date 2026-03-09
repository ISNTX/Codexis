import { MessageSquare, ArrowLeftRight, Box, Zap, Cpu } from "lucide-react";
import type { ConversationMode } from "@shared/schema";

interface EmptyStateProps {
  mode: ConversationMode;
}

export function EmptyState({ mode }: EmptyStateProps) {
  const content = {
    chat: {
      icon: MessageSquare,
      title: "Start a conversation",
      description: "Choose an AI model and send a message to begin chatting",
    },
    compare: {
      icon: ArrowLeftRight,
      title: "Compare AI responses",
      description: "Send a prompt and see how different models respond side-by-side",
    },
    orchestrate: {
      icon: Box,
      title: "Choose a workflow",
      description: "Select a pre-built template to chain multiple AI models together",
    },
  agenic: { icon: Cpu, title: "Start collaborating", description: "Set your AI agents to work." },
  marketer: { icon: Zap, title: "Create marketing content", description: "Generate video scripts and ad copy." },
  synthetic: { icon: Zap, title: "NEXUS Synthesis", description: "All models in unison." },
  };

  const { icon: Icon, title, description } = (content as any)[mode] ?? content.chat;

  return (
    <div className="flex flex-col items-center justify-center h-full p-8" data-testid="empty-state">
      <div className="flex flex-col items-center max-w-md text-center gap-6">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

import type { AIModel } from "@shared/schema";
import { ModelBadge } from "./model-badge";

interface LoadingIndicatorProps {
  model?: AIModel;
}

export function LoadingIndicator({ model }: LoadingIndicatorProps) {
  return (
    <div className="flex gap-4 justify-start" data-testid="loading-indicator">
      <div className="flex flex-col gap-2 max-w-4xl items-start">
        {model && (
          <div className="flex items-center gap-2">
            <ModelBadge model={model} />
          </div>
        )}
        <div className="rounded-2xl px-6 py-4 bg-card border border-card-border">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: "0ms" }} />
              <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: "150ms" }} />
              <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-sm text-muted-foreground">Thinking...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { AIModel } from "@shared/schema";
import { modelInfo } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface ModelBadgeProps {
  model: AIModel;
  className?: string;
}

export function ModelBadge({ model, className }: ModelBadgeProps) {
  const info = modelInfo[model];

  return (
    <Badge
      variant="secondary"
      className={className}
      data-testid={`badge-model-${model}`}
      style={{
        borderColor: info.color,
        borderWidth: "1px",
      }}
    >
      <Sparkles className="h-3 w-3 mr-1" style={{ color: info.color }} />
      <span className="text-xs font-semibold uppercase tracking-wide">{info.name}</span>
    </Badge>
  );
}

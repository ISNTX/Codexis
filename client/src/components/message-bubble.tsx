import type { ChatMessage } from "@shared/schema";
import { ModelBadge } from "./model-badge";
import { format } from "date-fns";
import { User } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`message-${message.id}`}
    >
      <div
        className={`flex flex-col gap-2 ${
          isUser ? "max-w-3xl items-end" : "max-w-4xl items-start"
        }`}
      >
        <div className="flex items-center gap-2">
          {!isUser && message.model && <ModelBadge model={message.model} />}
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.timestamp), "h:mm a")}
          </span>
        </div>

        <div
          className={`rounded-2xl px-6 py-4 ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-card-border"
          }`}
        >
          {isUser ? (
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-base whitespace-pre-wrap break-words">{message.content}</p>
              </div>
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-foreground/20 flex-shrink-0">
                <User className="h-3.5 w-3.5" />
              </div>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  code: ({ node, inline, className, children, ...props }: any) => {
                    return inline ? (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-muted p-4 rounded-lg overflow-x-auto font-mono text-sm" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

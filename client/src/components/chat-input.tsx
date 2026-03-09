import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import type { AIModel } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { modelInfo } from "@shared/schema";

interface ChatInputProps {
  onSend: (message: string, model: AIModel) => void;
  isLoading?: boolean;
  selectedModel?: AIModel;
  onModelChange?: (model: AIModel) => void;
  showModelSelector?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isLoading = false,
  selectedModel = "gpt-4o",
  onModelChange,
  showModelSelector = true,
  placeholder = "Type your message...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message.trim(), selectedModel);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [message]);

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-5xl mx-auto p-4">
        {showModelSelector && onModelChange && (
          <div className="mb-3">
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger className="w-64" data-testid="select-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(modelInfo).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: info.color }}
                      />
                      <span>{info.name}</span>
                      <span className="text-xs text-muted-foreground">
                        - {info.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="resize-none pr-12 min-h-[60px] max-h-40"
            disabled={isLoading}
            data-testid="input-message"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || isLoading}
            className="absolute right-2 bottom-2 h-9 w-9"
            data-testid="button-send"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

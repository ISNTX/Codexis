import { useState, useRef, useEffect } from "react";
import type { ChatMessage, AIModel, ComparisonResponse } from "@shared/schema";
import { MessageBubble } from "@/components/message-bubble";
import { ChatInput } from "@/components/chat-input";
import { LoadingIndicator } from "@/components/loading-indicator";
import { EmptyState } from "@/components/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { modelInfo } from "@shared/schema";

export function ComparePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const models: AIModel[] = ["gpt-4o", "claude-sonnet-4-5", "grok-2-1212"];

  // Load conversation from localStorage on mount
  useEffect(() => {
    const loadConversation = async () => {
      const storedId = localStorage.getItem("compare-conversation-id");
      if (storedId) {
        try {
          const response = await fetch(`/api/conversations/${storedId}/messages`);
          if (response.ok) {
            const dbMessages = await response.json();
            const chatMessages: ChatMessage[] = dbMessages.map((msg: any) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              model: msg.model,
              timestamp: new Date(msg.createdAt),
            }));
            setMessages(chatMessages);
            setConversationId(storedId);
          } else if (response.status === 404) {
            // Conversation not found, clear stale ID
            localStorage.removeItem("compare-conversation-id");
          }
        } catch (error) {
          console.error("Failed to load conversation:", error);
          localStorage.removeItem("compare-conversation-id");
        }
      }
      setIsLoadingHistory(false);
    };
    loadConversation();
  }, []);

  const handleSend = async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, models, conversationId }),
      });

      if (!response.ok) throw new Error("Failed to get responses");

      const data: { responses: ComparisonResponse[], conversationId: string } = await response.json();
      
      // Store conversation ID for subsequent messages
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
        localStorage.setItem("compare-conversation-id", data.conversationId);
      }

      const aiMessages: ChatMessage[] = data.responses.map((resp) => ({
        id: crypto.randomUUID(),
        role: "assistant",
        content: resp.error 
          ? `Error: ${resp.error}\n\nThis model may require API key configuration.` 
          : resp.content,
        model: resp.model,
        timestamp: new Date(resp.timestamp),
      }));

      setMessages((prev) => [...prev, ...aiMessages]);
    } catch (error) {
      console.error("Compare error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMessagesForModel = (model: AIModel) => {
    const result: ChatMessage[] = [];
    messages.forEach((msg) => {
      if (msg.role === "user") {
        result.push(msg);
      } else if (msg.model === model) {
        result.push(msg);
      }
    });
    return result;
  };

  useEffect(() => {
    models.forEach((model) => {
      const ref = scrollRefs.current[model];
      if (ref) {
        ref.scrollTop = ref.scrollHeight;
      }
    });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-px bg-border">
          {models.map((model, index) => (
            <div key={model} className="bg-background flex flex-col">
              <div className="border-b px-4 py-3 bg-card">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: modelInfo[model].color }}
                  />
                  <h3 className="font-semibold text-sm">{modelInfo[model].name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {modelInfo[model].description}
                  </span>
                </div>
              </div>

              <ScrollArea
                className="flex-1 px-4 py-6"
                ref={(el) => (scrollRefs.current[model] = el)}
              >
                <div className="space-y-6">
                  {getMessagesForModel(model).length === 0 && !isLoading && (
                    <div className="flex items-center justify-center h-full text-center p-8">
                      <p className="text-sm text-muted-foreground">
                        Responses from {modelInfo[model].name} will appear here
                      </p>
                    </div>
                  )}
                  {getMessagesForModel(model).map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {isLoading && <LoadingIndicator model={model} />}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>
      </div>

      {messages.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <EmptyState mode="compare" />
        </div>
      )}

      <ChatInput
        onSend={handleSend}
        isLoading={isLoading}
        showModelSelector={false}
        placeholder="Type your message to compare responses from all three models..."
      />
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import type { ChatMessage, AIModel } from "@shared/schema";
import { MessageBubble } from "@/components/message-bubble";
import { ChatInput } from "@/components/chat-input";
import { LoadingIndicator } from "@/components/loading-indicator";
import { EmptyState } from "@/components/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel>("gpt-4o");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation from localStorage on mount
  useEffect(() => {
    const loadConversation = async () => {
      const storedId = localStorage.getItem("chat-conversation-id");
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
            localStorage.removeItem("chat-conversation-id");
          }
        } catch (error) {
          console.error("Failed to load conversation:", error);
          localStorage.removeItem("chat-conversation-id");
        }
      }
      setIsLoadingHistory(false);
    };
    loadConversation();
  }, []);

  const handleSend = async (content: string, model: AIModel) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, model, conversationId }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      
      // Store conversation ID for subsequent messages
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
        localStorage.setItem("chat-conversation-id", data.conversationId);
      }

      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        model,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-6" ref={scrollRef}>
        <div className="max-w-5xl mx-auto space-y-6">
          {messages.length === 0 && !isLoading && <EmptyState mode="chat" />}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && <LoadingIndicator model={selectedModel} />}
        </div>
      </ScrollArea>

      <ChatInput
        onSend={handleSend}
        isLoading={isLoading}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        showModelSelector={true}
      />
    </div>
  );
}

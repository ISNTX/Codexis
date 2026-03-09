import { useState, useEffect } from "react";
import type { WorkflowTemplate, OrchestrationStep } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModelBadge } from "@/components/model-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/empty-state";
import { Lightbulb, FileText, Code, CheckCircle2, Clock, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "brainstorm-structure-refine",
    name: "Brainstorm → Structure → Refine",
    description: "Generate creative ideas with Grok, organize them with GPT, and polish with Claude",
    icon: "Lightbulb",
    steps: [
      {
        model: "grok-2-1212",
        promptTemplate: "Brainstorm creative and innovative ideas for: {topic}",
      },
      {
        model: "gpt-4o",
        promptTemplate: "Organize these ideas into a structured outline: {previous}",
      },
      {
        model: "claude-sonnet-4-5",
        promptTemplate: "Refine and polish this outline with detailed explanations: {previous}",
      },
    ],
  },
  {
    id: "content-generation",
    name: "Content Generation Pipeline",
    description: "GPT creates draft, Claude adds depth, Grok adds personality",
    icon: "FileText",
    steps: [
      {
        model: "gpt-4o",
        promptTemplate: "Write a comprehensive draft about: {topic}",
      },
      {
        model: "claude-sonnet-4-5",
        promptTemplate: "Add depth, examples, and detailed analysis to: {previous}",
      },
      {
        model: "grok-2-1212",
        promptTemplate: "Add wit, personality, and engaging language to: {previous}",
      },
    ],
  },
  {
    id: "code-review",
    name: "Code Review & Optimization",
    description: "Claude analyzes code, GPT suggests improvements, Grok validates",
    icon: "Code",
    steps: [
      {
        model: "claude-sonnet-4-5",
        promptTemplate: "Analyze this code for issues and patterns: {topic}",
      },
      {
        model: "gpt-4o",
        promptTemplate: "Suggest specific improvements and optimizations for: {previous}",
      },
      {
        model: "grok-2-1212",
        promptTemplate: "Validate these suggestions and provide final recommendations: {previous}",
      },
    ],
  },
];

export function OrchestratePage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [topic, setTopic] = useState("");
  const [steps, setSteps] = useState<OrchestrationStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Load conversation ID and reconstruct workflow on mount
  useEffect(() => {
    const loadConversation = async () => {
      const storedId = localStorage.getItem("orchestrate-conversation-id");
      const storedWorkflowId = localStorage.getItem("orchestrate-workflow-id");
      
      if (storedId && storedWorkflowId) {
        try {
          const response = await fetch(`/api/conversations/${storedId}/messages`);
          if (response.ok) {
            const dbMessages = await response.json();
            setConversationId(storedId);
            
            // Find and restore the workflow template
            const workflow = workflowTemplates.find(w => w.id === storedWorkflowId);
            if (workflow) {
              setSelectedWorkflow(workflow);
            }
            
            // Reconstruct workflow from messages
            const assistantMessages = dbMessages.filter((msg: any) => msg.role === "assistant");
            if (assistantMessages.length > 0) {
              // Find the matching workflow template
              const userMessage = dbMessages.find((msg: any) => msg.role === "user");
              if (userMessage) {
                setTopic(userMessage.content);
              }
              
              // Reconstruct steps from assistant messages
              const reconstructedSteps: OrchestrationStep[] = assistantMessages.map((msg: any, index: number) => ({
                stepNumber: index + 1,
                model: msg.model,
                prompt: "",
                response: msg.content,
                status: "complete" as const,
              }));
              setSteps(reconstructedSteps);
            }
          } else if (response.status === 404) {
            // Conversation not found, clear stale IDs
            localStorage.removeItem("orchestrate-conversation-id");
            localStorage.removeItem("orchestrate-workflow-id");
          }
        } catch (error) {
          console.error("Failed to load conversation:", error);
          localStorage.removeItem("orchestrate-conversation-id");
          localStorage.removeItem("orchestrate-workflow-id");
        }
      }
    };
    loadConversation();
  }, []);

  const handleStartWorkflow = async () => {
    if (!selectedWorkflow || !topic.trim()) return;

    // Save workflow ID for persistence
    localStorage.setItem("orchestrate-workflow-id", selectedWorkflow.id);

    const initialSteps: OrchestrationStep[] = selectedWorkflow.steps.map((step, index) => ({
      stepNumber: index + 1,
      model: step.model,
      prompt: step.promptTemplate.replace("{topic}", topic),
      status: index === 0 ? "processing" : "pending",
    }));

    setSteps(initialSteps);
    setIsRunning(true);

    try {
      const response = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: selectedWorkflow.id,
          topic,
          conversationId,
        }),
      });

      if (!response.ok) throw new Error("Workflow failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            
            // Store conversation ID from first SSE message
            if (data.conversationId && !conversationId) {
              setConversationId(data.conversationId);
              localStorage.setItem("orchestrate-conversation-id", data.conversationId);
            }
            
            // Handle step results
            if (data.stepNumber) {
              setSteps((prev) =>
                prev.map((step, idx) =>
                  idx === data.stepNumber - 1
                    ? { ...step, response: data.response, status: "complete" }
                    : idx === data.stepNumber
                    ? { ...step, status: "processing", prompt: step.prompt.replace("{previous}", data.response) }
                    : step
                )
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Orchestration error:", error);
      setSteps((prev) =>
        prev.map((step) =>
          step.status === "processing" ? { ...step, status: "error" } : step
        )
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setSelectedWorkflow(null);
    setTopic("");
    setSteps([]);
    setIsRunning(false);
    setConversationId(null);
    localStorage.removeItem("orchestrate-conversation-id");
    localStorage.removeItem("orchestrate-workflow-id");
  };

  const iconMap: Record<string, any> = {
    Lightbulb,
    FileText,
    Code,
  };

  if (!selectedWorkflow) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-2">Choose a Workflow</h2>
            <p className="text-muted-foreground">
              Select a pre-built template to orchestrate multiple AI models
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflowTemplates.map((template) => {
              const Icon = iconMap[template.icon] || Lightbulb;
              return (
                <Card
                  key={template.id}
                  className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                  onClick={() => setSelectedWorkflow(template)}
                  data-testid={`workflow-${template.id}`}
                >
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <div className="flex flex-wrap gap-2">
                      {template.steps.map((step, idx) => (
                        <ModelBadge key={idx} model={step.model} />
                      ))}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-card px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-1">{selectedWorkflow.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedWorkflow.description}</p>
          </div>
          <Button variant="outline" onClick={handleReset} data-testid="button-reset-workflow">
            Choose Different Workflow
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {steps.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Enter Your Topic</CardTitle>
                <CardDescription>
                  What would you like the AI models to work on?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="e.g., 'sustainable urban farming solutions'"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  data-testid="input-topic"
                  className="text-base"
                />
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleStartWorkflow}
                  disabled={!topic.trim()}
                  className="w-full"
                  data-testid="button-start-workflow"
                >
                  Start Workflow
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="space-y-6">
              {steps.map((step) => {
                const StatusIcon =
                  step.status === "complete"
                    ? CheckCircle2
                    : step.status === "processing"
                    ? Loader2
                    : step.status === "error"
                    ? AlertCircle
                    : Clock;

                return (
                  <Card
                    key={step.stepNumber}
                    className={`border-l-4 ${
                      step.status === "complete"
                        ? "border-l-green-500"
                        : step.status === "processing"
                        ? "border-l-primary"
                        : step.status === "error"
                        ? "border-l-destructive"
                        : "border-l-muted"
                    }`}
                    data-testid={`step-${step.stepNumber}`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted">
                            <span className="text-sm font-semibold">{step.stepNumber}</span>
                          </div>
                          <ModelBadge model={step.model} />
                          <StatusIcon
                            className={`h-5 w-5 ${
                              step.status === "processing" ? "animate-spin" : ""
                            } ${
                              step.status === "complete"
                                ? "text-green-500"
                                : step.status === "error"
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <Badge variant={step.status === "complete" ? "default" : "secondary"}>
                          {step.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Prompt:</p>
                        <p className="text-sm bg-muted p-3 rounded-lg">{step.prompt}</p>
                      </div>
                      {step.response && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Response:</p>
                          <div className="prose prose-sm dark:prose-invert max-w-none bg-card border border-card-border p-4 rounded-lg">
                            {step.response}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {!isRunning && steps.every((s) => s.status === "complete") && (
                <div className="flex justify-center">
                  <Button onClick={handleReset} size="lg" data-testid="button-new-workflow">
                    Start New Workflow
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

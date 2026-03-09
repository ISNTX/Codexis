
import { useState, useRef, useEffect } from "react";
import type { AIModel } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Brain, 
  Hammer, 
  Building2, 
  GraduationCap, 
  Bug, 
  Code, 
  Heart,
  Play,
  Users,
  MessageSquare,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { ModelBadge } from "@/components/model-badge";

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: any;
  model: AIModel;
  color: string;
  prompt_prefix: string;
}

interface AgentResponse {
  agentId: string;
  content: string;
  timestamp: Date;
  status: "thinking" | "complete" | "error";
}

interface Collaboration {
  id: string;
  task: string;
  agents: Agent[];
  responses: AgentResponse[];
  currentPhase: string;
  isRunning: boolean;
}

const agents: Agent[] = [
  {
    id: "planner",
    name: "Planner",
    role: "Strategic Planning",
    description: "Creates comprehensive project plans and roadmaps",
    icon: Brain,
    model: "gpt-4o",
    color: "hsl(142 76% 36%)",
    prompt_prefix: "As a strategic planner, analyze the following task and create a detailed step-by-step plan:"
  },
  {
    id: "architect",
    name: "Architect",
    role: "System Design",
    description: "Designs system architecture and technical specifications",
    icon: Building2,
    model: "claude-sonnet-4-5",
    color: "hsl(32 95% 50%)",
    prompt_prefix: "As a system architect, design the technical architecture and structure for:"
  },
  {
    id: "scholar",
    name: "Scholar",
    role: "Research & Analysis",
    description: "Provides deep research and theoretical foundations",
    icon: GraduationCap,
    model: "grok-2-1212",
    color: "hsl(217 91% 60%)",
    prompt_prefix: "As a research scholar, provide comprehensive analysis and theoretical background for:"
  },
  {
    id: "coder",
    name: "Coder",
    role: "Implementation",
    description: "Writes clean, efficient code and implementations",
    icon: Code,
    model: "gpt-4o",
    color: "hsl(142 76% 36%)",
    prompt_prefix: "As an expert coder, implement the following requirements with clean, well-documented code:"
  },
  {
    id: "debugger",
    name: "Debugger",
    role: "Quality Assurance",
    description: "Identifies issues, bugs, and optimization opportunities",
    icon: Bug,
    model: "claude-sonnet-4-5",
    color: "hsl(32 95% 50%)",
    prompt_prefix: "As a debugging specialist, analyze the following for potential issues, bugs, and improvements:"
  },
  {
    id: "builder",
    name: "Builder",
    role: "Integration",
    description: "Assembles components and ensures everything works together",
    icon: Hammer,
    model: "grok-2-1212",
    color: "hsl(217 91% 60%)",
    prompt_prefix: "As a system builder, integrate the following components and ensure they work together seamlessly:"
  },
  {
    id: "healer",
    name: "Healer",
    role: "Optimization & Fixes",
    description: "Resolves conflicts and optimizes the final solution",
    icon: Heart,
    model: "claude-sonnet-4-5",
    color: "hsl(32 95% 50%)",
    prompt_prefix: "As a system healer, resolve any conflicts and optimize the following solution:"
  }
];

export function AgenicPage() {
  const [task, setTask] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [collaboration, setCollaboration] = useState<Collaboration | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [collaboration?.responses]);

  const toggleAgent = (agent: Agent) => {
    setSelectedAgents(prev => 
      prev.find(a => a.id === agent.id)
        ? prev.filter(a => a.id !== agent.id)
        : [...prev, agent]
    );
  };

  const handleStartCollaboration = async () => {
    if (!task.trim() || selectedAgents.length === 0) return;

    const newCollaboration: Collaboration = {
      id: crypto.randomUUID(),
      task,
      agents: selectedAgents,
      responses: [],
      currentPhase: "Initialization",
      isRunning: true
    };

    setCollaboration(newCollaboration);

    try {
      const response = await fetch("/api/agenic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          agents: selectedAgents.map(a => ({ id: a.id, model: a.model, prompt_prefix: a.prompt_prefix })),
          conversationId
        }),
      });

      if (!response.ok) throw new Error("Agenic collaboration failed");

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
            
            if (data.conversationId && !conversationId) {
              setConversationId(data.conversationId);
            }

            if (data.agentId && data.content) {
              setCollaboration(prev => prev ? {
                ...prev,
                responses: [...prev.responses, {
                  agentId: data.agentId,
                  content: data.content,
                  timestamp: new Date(),
                  status: data.status || "complete"
                }],
                currentPhase: data.phase || prev.currentPhase,
                isRunning: data.isRunning !== false
              } : prev);
            } else if (data.phase || data.isRunning !== undefined) {
              setCollaboration(prev => prev ? {
                ...prev,
                currentPhase: data.phase || prev.currentPhase,
                isRunning: data.isRunning !== false
              } : prev);
            }
          }
        }
      }
    } catch (error) {
      console.error("Agenic collaboration error:", error);
      setCollaboration(prev => prev ? { ...prev, isRunning: false } : prev);
    }
  };

  const handleReset = () => {
    setTask("");
    setSelectedAgents([]);
    setCollaboration(null);
    setConversationId(null);
  };

  if (!collaboration) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-2">Agenic Collaboration</h2>
            <p className="text-muted-foreground">
              Assemble a team of AI agents to collaborate on complex tasks
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Define Your Task</CardTitle>
                <CardDescription>
                  What complex challenge do you want the AI agents to work on together?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., 'Design and implement a sustainable smart city traffic management system'"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  className="min-h-24"
                  data-testid="input-task"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Select AI Agents</CardTitle>
                <CardDescription>
                  Choose which specialized agents should collaborate on this task
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {agents.map((agent) => {
                    const Icon = agent.icon;
                    const isSelected = selectedAgents.find(a => a.id === agent.id);
                    return (
                      <div
                        key={agent.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          isSelected ? "border-primary bg-primary/5" : "border-border"
                        }`}
                        onClick={() => toggleAgent(agent)}
                        data-testid={`agent-${agent.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${agent.color}15` }}
                          >
                            <Icon className="h-5 w-5" style={{ color: agent.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm">{agent.name}</h3>
                              <ModelBadge model={agent.model} />
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{agent.role}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {agent.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedAgents.length > 0 && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Selected Agents:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgents.map(agent => (
                        <Badge key={agent.id} variant="secondary">
                          {agent.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                onClick={handleStartCollaboration}
                disabled={!task.trim() || selectedAgents.length === 0}
                size="lg"
                className="min-w-48"
                data-testid="button-start-collaboration"
              >
                <Users className="h-4 w-4 mr-2" />
                Start Collaboration
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-card px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Agenic Collaboration</h2>
              {collaboration.isRunning && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{collaboration.currentPhase}</p>
          </div>
          <Button variant="outline" onClick={handleReset} data-testid="button-reset-collaboration">
            New Collaboration
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Task</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{collaboration.task}</p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {collaboration.responses.map((response, index) => {
              const agent = collaboration.agents.find(a => a.id === response.agentId);
              if (!agent) return null;

              const Icon = agent.icon;
              const StatusIcon = response.status === "complete" ? CheckCircle2 
                : response.status === "thinking" ? Loader2 
                : Bug;

              return (
                <Card 
                  key={`${response.agentId}-${index}`}
                  className="border-l-4"
                  style={{ borderLeftColor: agent.color }}
                  data-testid={`response-${response.agentId}-${index}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-8 w-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${agent.color}15` }}
                        >
                          <Icon className="h-4 w-4" style={{ color: agent.color }} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{agent.name}</h3>
                          <p className="text-xs text-muted-foreground">{agent.role}</p>
                        </div>
                        <ModelBadge model={agent.model} />
                        <StatusIcon 
                          className={`h-4 w-4 ${response.status === "thinking" ? "animate-spin" : ""}`}
                          style={{ color: agent.color }}
                        />
                      </div>
                      <Badge 
                        variant={response.status === "complete" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {response.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {response.content}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {!collaboration.isRunning && collaboration.responses.length > 0 && (
            <div className="flex justify-center pt-6">
              <Button onClick={handleReset} size="lg" data-testid="button-new-collaboration">
                Start New Collaboration
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

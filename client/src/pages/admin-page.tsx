import type { SubscriptionTier } from "@shared/schema";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Edit2, CheckCircle, AlertCircle } from "lucide-react";
import type { User, AuditLog } from "@shared/schema";

interface MCPServer {
  id: string;
  name: string;
  url: string;
  description?: string;
  capabilities: string[];
  enabled: number;
  createdAt: Date;
}

export function AdminPage() {
  const { toast } = useToast();
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [selectedTier, setSelectedTier] = useState<"free" | "starter" | "pro" | "enterprise">("free");

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: () => apiRequest("GET", "/api/admin/users").then(r => r.json()),
  });

  // Fetch audit logs
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["/api/admin/audit-logs"],
    queryFn: () => apiRequest("GET", "/api/admin/audit-logs").then(r => r.json()),
  });

  // Fetch MCP servers
  const { data: mcpData, isLoading: mcpLoading } = useQuery({
    queryKey: ["/api/mcp/servers"],
    queryFn: () => apiRequest("GET", "/api/mcp/servers").then(r => r.json()),
  });

  // Update subscription mutation
  const updateSubMutation = useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: string }) => {
      const res = await apiRequest("POST", "/api/admin/update-subscription", { userId, tier });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Subscription updated" });
    },
    onError: () => {
      toast({ title: "Error updating subscription", variant: "destructive" });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", "/api/admin/delete-user", { userId });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted" });
    },
    onError: () => {
      toast({ title: "Error deleting user", variant: "destructive" });
    },
  });

  const users = usersData?.users || [];
  const logs = logsData?.logs || [];
  const servers = mcpData?.servers || [];

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold" data-testid="heading-admin-dashboard">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage users, subscriptions, and MCP servers</p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-admin-navigation">
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-audit-logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="mcp" data-testid="tab-mcp-servers">MCP Servers</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Platform Users</h2>
              <Button size="sm" onClick={() => setShowNewUser(!showNewUser)} data-testid="button-new-user">
                <Plus className="w-4 h-4 mr-2" />
                New User
              </Button>
            </div>

            {usersLoading ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-loading">Loading users...</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {users.map((user: User) => (
                  <Card key={user.id} className="p-4" data-testid={`card-user-${user.id}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex-1 space-y-1">
                        <div className="font-semibold" data-testid={`text-email-${user.id}`}>{user.email}</div>
                        <div className="text-sm text-muted-foreground flex gap-2">
                          <Badge variant={user.subscriptionTier === "free" ? "secondary" : "default"} data-testid={`badge-tier-${user.id}`}>
                            {user.subscriptionTier}
                          </Badge>
                          {user.isAdmin ? <Badge data-testid={`badge-admin-${user.id}`}>Admin</Badge> : null}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Select
                          value={user.subscriptionTier ?? undefined}
                          onValueChange={(tier) => updateSubMutation.mutate({ userId: user.id, tier })}
                        >
                          <SelectTrigger className="w-28" data-testid={`select-tier-${user.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteUserMutation.mutate(user.id)}
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <h2 className="text-2xl font-semibold">Audit Logs</h2>
            {logsLoading ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-logs-loading">Loading logs...</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log: AuditLog) => (
                  <Card key={log.id} className="p-4 text-sm" data-testid={`card-log-${log.id}`}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="font-semibold flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          {log.action}
                        </div>
                        <div className="text-muted-foreground" data-testid={`text-description-${log.id}`}>
                          {log.description}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground text-right" data-testid={`text-time-${log.id}`}>
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MCP Servers Tab */}
          <TabsContent value="mcp" className="space-y-4">
            <h2 className="text-2xl font-semibold">MCP Servers</h2>
            {mcpLoading ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-mcp-loading">Loading servers...</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {servers.map((server: MCPServer) => (
                  <Card key={server.id} className="p-4" data-testid={`card-mcp-${server.id}`}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="font-semibold flex items-center gap-2">
                          {server.enabled ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                          )}
                          {server.name}
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-url-${server.id}`}>{server.url}</div>
                        {server.description && (
                          <div className="text-sm" data-testid={`text-description-mcp-${server.id}`}>{server.description}</div>
                        )}
                        {server.capabilities && server.capabilities.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {server.capabilities.map((cap: string) => (
                              <Badge key={cap} variant="secondary" data-testid={`badge-capability-${server.id}-${cap}`}>
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

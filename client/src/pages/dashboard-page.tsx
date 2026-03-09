import { SignInButton } from "@clerk/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Crown, 
  Zap, 
  Rocket, 
  Building2, 
  ExternalLink,
  MessageSquare,
  Users,
  CreditCard,
  Calendar
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { SubscriptionTier } from "@shared/schema";

const tierIcons: Record<SubscriptionTier, any> = {
  free: Zap,
  starter: Rocket,
  pro: Crown,
  enterprise: Building2,
};

const tierLabels: Record<SubscriptionTier, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: subscriptionData, isLoading: subLoading } = useQuery<{
    tier: SubscriptionTier;
    subscription: any;
    usage: {
      messages: number;
      agenic: number;
      messagesLimit: number;
      agenicLimit: number;
    };
    usageResetAt: string;
  }>({
    queryKey: ["/api/subscription"],
    enabled: isAuthenticated,
  });

  const { data: billingHistory, isLoading: historyLoading } = useQuery<{
    invoices: Array<{
      id: string;
      amount: number;
      status: string;
      created: number;
      hostedInvoiceUrl: string | null;
    }>;
  }>({
    queryKey: ["/api/billing/history"],
    enabled: isAuthenticated,
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/portal");
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    },
  });

  if (authLoading || subLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Sign in Required</CardTitle>
            <CardDescription>
              Please sign in to view your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild data-testid="button-signin-dashboard">
              <SignInButton mode="modal"><button>Sign in</button></SignInButton>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tier = subscriptionData?.tier || "free";
  const TierIcon = tierIcons[tier];
  const usage = subscriptionData?.usage;
  const subscription = subscriptionData?.subscription;

  const messagesUsed = usage?.messages || 0;
  const messagesLimit = usage?.messagesLimit || 10;
  const messagesPercent = messagesLimit === -1 ? 0 : Math.min((messagesUsed / messagesLimit) * 100, 100);

  const agenicUsed = usage?.agenic || 0;
  const agenicLimit = usage?.agenicLimit || 0;
  const agenicPercent = agenicLimit === -1 || agenicLimit === 0 ? 0 : Math.min((agenicUsed / agenicLimit) * 100, 100);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your subscription and monitor your usage
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card data-testid="card-subscription">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <CardDescription>Your subscription tier</CardDescription>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TierIcon className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold">{tierLabels[tier]}</span>
                <Badge variant={tier === "free" ? "secondary" : "default"}>
                  {tier === "free" ? "Free" : "Active"}
                </Badge>
              </div>
              {subscription && (
                <div className="text-sm text-muted-foreground">
                  <p>Next billing: {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="gap-2 flex-wrap">
              {tier === "free" ? (
                <Button onClick={() => setLocation("/pricing")} data-testid="button-upgrade">
                  Upgrade Plan
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    data-testid="button-manage-billing"
                  >
                    {portalMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Manage Billing
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/pricing")}
                    data-testid="button-change-plan"
                  >
                    Change Plan
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>

          <Card data-testid="card-usage">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Usage This Month</CardTitle>
              <CardDescription>
                {subscriptionData?.usageResetAt && (
                  <>Resets on {new Date(subscriptionData.usageResetAt).toLocaleDateString()}</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Messages</span>
                  </div>
                  <span className="text-sm font-medium">
                    {messagesUsed} {messagesLimit !== -1 ? `/ ${messagesLimit}` : "(Unlimited)"}
                  </span>
                </div>
                {messagesLimit !== -1 && (
                  <Progress value={messagesPercent} className="h-2" />
                )}
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Agenic Collaborations</span>
                  </div>
                  <span className="text-sm font-medium">
                    {agenicUsed} {agenicLimit === -1 ? "(Unlimited)" : agenicLimit === 0 ? "(Not Available)" : `/ ${agenicLimit}`}
                  </span>
                </div>
                {agenicLimit !== -1 && agenicLimit !== 0 && (
                  <Progress value={agenicPercent} className="h-2" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {billingHistory?.invoices && billingHistory.invoices.length > 0 && (
          <Card data-testid="card-billing-history">
            <CardHeader>
              <CardTitle className="text-lg">Billing History</CardTitle>
              <CardDescription>Your recent invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {billingHistory.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                    data-testid={`invoice-${invoice.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          ${(invoice.amount / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(invoice.created * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                        {invoice.status}
                      </Badge>
                      {invoice.hostedInvoiceUrl && (
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={invoice.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export function CheckoutSuccessPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  }, []);

  return (
    <div className="h-full flex items-center justify-center p-8">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for subscribing. Your account has been upgraded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You now have access to all the features included in your plan.
            Start exploring the full power of multi-AI collaboration!
          </p>
          <Button
            onClick={() => setLocation("/")}
            className="w-full"
            data-testid="button-go-to-dashboard"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

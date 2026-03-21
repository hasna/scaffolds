import { requireAuth } from "@/lib/auth-utils";
import { getTenant } from "@/lib/tenant";
import { getSubscription, getPricingPlans, getInvoices } from "@/lib/stripe";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@scaffold-landing-pages/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { BillingActions } from "./billing-actions";
import { InvoiceHistory } from "./invoice-history";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Billing",
};

export default async function BillingPage() {
  const session = await requireAuth();
  const tenantId = session.user.tenantId;

  if (!tenantId) {
    redirect("/onboarding");
  }

  if (session.user.tenantRole !== "owner") {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">You don&apos;t have permission to view billing.</p>
        </div>
      </div>
    );
  }

  const tenant = await getTenant(tenantId);

  const [subscription, plans, invoices] = await Promise.all([
    getSubscription(tenantId),
    getPricingPlans(),
    tenant?.stripeCustomerId ? getInvoices(tenant.stripeCustomerId) : Promise.resolve([]),
  ]);

  const currentPlan = subscription?.plan ?? plans.find((p) => p.slug === "free");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing details</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">{currentPlan?.name ?? "Free"}</h3>
                <p className="text-muted-foreground">
                  {currentPlan?.priceMonthly
                    ? `${formatCurrency(currentPlan.priceMonthly)}/month`
                    : "Free forever"}
                </p>
              </div>
              {subscription && (
                <Badge variant={subscription.status === "active" ? "default" : "destructive"}>
                  {subscription.status}
                </Badge>
              )}
            </div>

            {subscription && (
              <div className="text-muted-foreground text-sm">
                {subscription.cancelAtPeriodEnd ? (
                  <p>Cancels on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                ) : (
                  <p>Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                )}
              </div>
            )}

            <BillingActions
              tenantId={tenantId}
              hasSubscription={!!subscription}
              cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
            />
          </CardContent>
        </Card>

        {/* Plan Features */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Features</CardTitle>
            <CardDescription>What&apos;s included in your plan</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {currentPlan?.features?.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2
                    className={`h-4 w-4 ${
                      feature.included ? "text-green-500" : "text-muted-foreground"
                    }`}
                  />
                  <span className={feature.included ? "" : "text-muted-foreground line-through"}>
                    {feature.name}
                    {feature.limit && ` (${feature.limit})`}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Plans */}
      {!subscription && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Upgrade Your Plan</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={plan.slug === "pro" ? "border-primary" : ""}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    {formatCurrency(plan.priceMonthly)}
                    <span className="text-muted-foreground text-sm font-normal">/month</span>
                  </div>
                  <Link href={`/api/stripe/checkout?plan=${plan.slug}`}>
                    <Button
                      className="w-full"
                      variant={plan.slug === "pro" ? "default" : "outline"}
                    >
                      {plan.priceMonthly === 0 ? "Current Plan" : "Get Started"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Invoice History */}
      <div className="mt-8">
        <InvoiceHistory invoices={invoices} />
      </div>
    </div>
  );
}

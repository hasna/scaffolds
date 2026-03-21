import { db } from "@scaffold-news/database/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Flag, Settings } from "lucide-react";
import { FeatureFlagActions } from "./feature-flag-actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Feature Flags - Admin",
};

export default async function FeatureFlagsPage() {
  const [featureFlags, plans, planFeatures] = await Promise.all([
    db.query.featureFlags.findMany({
      orderBy: (flags, { asc }) => [asc(flags.name)],
    }),
    db.query.pricingPlans.findMany({
      orderBy: (plans, { asc }) => [asc(plans.sortOrder)],
    }),
    db.query.planFeatures.findMany(),
  ]);

  // Create a map of plan features for quick lookup
  const planFeaturesMap = new Map<string, typeof planFeatures>();
  for (const pf of planFeatures) {
    const key = `${pf.planId}-${pf.featureFlagId}`;
    if (!planFeaturesMap.has(key)) {
      planFeaturesMap.set(key, []);
    }
    planFeaturesMap.get(key)!.push(pf);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Flag className="h-6 w-6" />
          Feature Flags
        </h1>
        <p className="text-muted-foreground">Manage feature availability across plans</p>
      </div>

      {/* Feature Flags Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Features</CardTitle>
          <CardDescription>Configure which features are available for each plan</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Default</TableHead>
                {plans.map((plan) => (
                  <TableHead key={plan.id} className="text-center">
                    {plan.name}
                  </TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {featureFlags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{flag.name}</div>
                      {flag.description && (
                        <div className="text-muted-foreground text-sm">{flag.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="bg-muted rounded px-1.5 py-0.5 text-sm">{flag.key}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={flag.defaultEnabled ? "default" : "secondary"}>
                      {flag.defaultEnabled ? "On" : "Off"}
                    </Badge>
                  </TableCell>
                  {plans.map((plan) => {
                    const planFeature = planFeatures.find(
                      (pf) => pf.planId === plan.id && pf.featureFlagId === flag.id
                    );
                    const isEnabled = planFeature?.enabled ?? flag.defaultEnabled;
                    const hasLimits = Boolean(
                      planFeature?.limits && Object.keys(planFeature.limits as object).length > 0
                    );

                    return (
                      <TableCell key={plan.id} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge
                            variant={isEnabled ? "default" : "outline"}
                            className="cursor-default"
                          >
                            {isEnabled ? "Yes" : "No"}
                          </Badge>
                          {hasLimits && (
                            <span className="text-muted-foreground text-xs">(limited)</span>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    <FeatureFlagActions
                      flag={flag}
                      plans={plans}
                      planFeatures={planFeatures.filter((pf) => pf.featureFlagId === flag.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan Features Summary */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const enabledFeatures = featureFlags.filter((flag) => {
            const planFeature = planFeatures.find(
              (pf) => pf.planId === plan.id && pf.featureFlagId === flag.id
            );
            return planFeature?.enabled ?? flag.defaultEnabled;
          });

          return (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {plan.name}
                </CardTitle>
                <CardDescription>
                  {enabledFeatures.length} of {featureFlags.length} features enabled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {featureFlags.slice(0, 5).map((flag) => {
                    const planFeature = planFeatures.find(
                      (pf) => pf.planId === plan.id && pf.featureFlagId === flag.id
                    );
                    const isEnabled = planFeature?.enabled ?? flag.defaultEnabled;

                    return (
                      <li
                        key={flag.id}
                        className={`flex items-center gap-2 text-sm ${
                          isEnabled ? "" : "text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isEnabled ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                        {flag.name}
                      </li>
                    );
                  })}
                  {featureFlags.length > 5 && (
                    <li className="text-muted-foreground text-sm">
                      +{featureFlags.length - 5} more...
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

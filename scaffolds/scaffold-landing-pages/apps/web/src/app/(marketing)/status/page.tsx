"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useState, useEffect } from "react";

type Status = "operational" | "degraded" | "outage" | "maintenance";

interface Service {
  name: string;
  status: Status;
  uptime: number;
  latency?: number;
}

interface Incident {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  severity: "minor" | "major" | "critical";
  createdAt: string;
  updatedAt: string;
  updates: {
    time: string;
    message: string;
    status: string;
  }[];
}

const services: Service[] = [
  { name: "API", status: "operational", uptime: 99.99, latency: 45 },
  { name: "Web Application", status: "operational", uptime: 99.98, latency: 120 },
  { name: "Database", status: "operational", uptime: 99.99, latency: 12 },
  { name: "Background Jobs", status: "operational", uptime: 99.95 },
  { name: "Webhooks", status: "operational", uptime: 99.97, latency: 230 },
  { name: "AI Assistant", status: "operational", uptime: 99.90, latency: 850 },
  { name: "Email Service", status: "operational", uptime: 99.99 },
  { name: "File Storage", status: "operational", uptime: 99.99, latency: 65 },
];

const recentIncidents: Incident[] = [
  {
    id: "1",
    title: "Elevated API Latency",
    status: "resolved",
    severity: "minor",
    createdAt: "Dec 15, 2025 14:30 UTC",
    updatedAt: "Dec 15, 2025 15:45 UTC",
    updates: [
      {
        time: "15:45 UTC",
        message: "All systems are now operating normally.",
        status: "resolved",
      },
      {
        time: "15:15 UTC",
        message: "We've deployed a fix and are monitoring.",
        status: "monitoring",
      },
      {
        time: "14:45 UTC",
        message: "We've identified the root cause as a database connection pool issue.",
        status: "identified",
      },
      {
        time: "14:30 UTC",
        message: "We're investigating reports of elevated API latency.",
        status: "investigating",
      },
    ],
  },
  {
    id: "2",
    title: "Scheduled Maintenance",
    status: "resolved",
    severity: "minor",
    createdAt: "Dec 10, 2025 02:00 UTC",
    updatedAt: "Dec 10, 2025 04:30 UTC",
    updates: [
      {
        time: "04:30 UTC",
        message: "Maintenance completed successfully.",
        status: "resolved",
      },
      {
        time: "02:00 UTC",
        message: "Scheduled maintenance has begun.",
        status: "investigating",
      },
    ],
  },
];

const statusConfig: Record<
  Status,
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  operational: {
    label: "Operational",
    color: "text-green-500",
    icon: CheckCircle,
  },
  degraded: {
    label: "Degraded Performance",
    color: "text-yellow-500",
    icon: AlertTriangle,
  },
  outage: { label: "Major Outage", color: "text-red-500", icon: XCircle },
  maintenance: {
    label: "Under Maintenance",
    color: "text-blue-500",
    icon: RefreshCw,
  },
};

const severityColors: Record<Incident["severity"], string> = {
  minor: "bg-yellow-100 text-yellow-800",
  major: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

function getOverallStatus(services: Service[]): Status {
  if (services.some((s) => s.status === "outage")) return "outage";
  if (services.some((s) => s.status === "maintenance")) return "maintenance";
  if (services.some((s) => s.status === "degraded")) return "degraded";
  return "operational";
}

export default function StatusPage() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const overallStatus = getOverallStatus(services);
  const config = statusConfig[overallStatus];
  const StatusIcon = config.icon;

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href={"/" as Route} className="flex items-center gap-2 text-xl font-bold">
            <Zap className="h-5 w-5" />
            SaaS Scaffold
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Overall Status */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div
            className={`rounded-lg border p-8 text-center ${
              overallStatus === "operational"
                ? "bg-green-50 border-green-200"
                : overallStatus === "degraded"
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-red-50 border-red-200"
            }`}
          >
            <StatusIcon
              className={`h-12 w-12 mx-auto mb-4 ${config.color}`}
            />
            <h1 className="text-2xl font-bold mb-2">{config.label}</h1>
            <p className="text-muted-foreground">
              {overallStatus === "operational"
                ? "All systems are operating normally."
                : "We are currently experiencing issues."}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-6">Services</h2>

          <div className="space-y-2">
            {services.map((service) => {
              const serviceConfig = statusConfig[service.status];
              const ServiceIcon = serviceConfig.icon;

              return (
                <div
                  key={service.name}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <ServiceIcon
                      className={`h-5 w-5 ${serviceConfig.color}`}
                    />
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {service.latency !== undefined && (
                      <span>{service.latency}ms</span>
                    )}
                    <span>{service.uptime}% uptime</span>
                    <Badge
                      variant="outline"
                      className={
                        service.status === "operational"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : ""
                      }
                    >
                      {serviceConfig.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Uptime Chart Placeholder */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-6">90-Day Uptime</h2>

          <div className="flex gap-0.5">
            {Array.from({ length: 90 }).map((_, i) => (
              <div
                key={i}
                className={`h-8 flex-1 rounded-sm ${
                  Math.random() > 0.02 ? "bg-green-500" : "bg-yellow-500"
                }`}
                title={`Day ${90 - i}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </section>

      {/* Recent Incidents */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-6">Recent Incidents</h2>

          {recentIncidents.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-muted-foreground">
                No incidents reported in the last 14 days.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{incident.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {incident.createdAt}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className={severityColors[incident.severity]}
                      >
                        {incident.severity}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          incident.status === "resolved"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {incident.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3 pl-4 border-l-2">
                    {incident.updates.map((update, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{update.time}</span>
                        <span className="text-muted-foreground ml-2">
                          {update.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Subscribe */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-xl font-bold mb-4">Get Status Updates</h2>
          <p className="text-muted-foreground mb-6">
            Subscribe to receive notifications about service status changes.
          </p>
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <Button>Subscribe</Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} SaaS Scaffold. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

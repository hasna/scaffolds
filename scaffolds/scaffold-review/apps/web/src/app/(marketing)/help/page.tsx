import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Book,
  MessageCircle,
  Video,
  FileText,
  HelpCircle,
  ArrowRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

const categories = [
  {
    icon: Book,
    title: "Getting Started",
    description: "Learn the basics and set up your account",
    articles: [
      "Quick start guide",
      "Account setup",
      "First project walkthrough",
      "Inviting team members",
    ],
  },
  {
    icon: Zap,
    title: "API Documentation",
    description: "Complete API reference and examples",
    articles: [
      "Authentication",
      "REST API endpoints",
      "Webhooks setup",
      "Rate limiting",
    ],
  },
  {
    icon: MessageCircle,
    title: "AI Assistant",
    description: "Get the most out of the AI features",
    articles: [
      "Using the chat widget",
      "Custom system prompts",
      "Token usage and limits",
      "Best practices",
    ],
  },
  {
    icon: FileText,
    title: "Billing & Plans",
    description: "Manage your subscription and payments",
    articles: [
      "Plan comparison",
      "Upgrading your plan",
      "Payment methods",
      "Invoices and receipts",
    ],
  },
];

const popularArticles = [
  { title: "How to set up webhooks", category: "Integrations" },
  { title: "Managing team permissions", category: "Teams" },
  { title: "API rate limits explained", category: "API" },
  { title: "Configuring SSO", category: "Security" },
  { title: "Exporting your data", category: "Data" },
  { title: "Troubleshooting common issues", category: "Support" },
];

export default function HelpPage() {
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

      {/* Hero Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="outline" className="mb-4">
            Help Center
          </Badge>
          <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Search our knowledge base or browse categories below.
          </p>

          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for articles, guides, and FAQs..."
              className="pl-12 h-12 text-lg"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {categories.map((category) => (
              <div
                key={category.title}
                className="border rounded-lg p-6 hover:border-primary transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{category.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {category.description}
                    </p>
                    <ul className="space-y-2">
                      {category.articles.map((article) => (
                        <li key={article}>
                          <Link
                            href="#"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            {article}
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Popular Articles</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularArticles.map((article) => (
              <Link
                key={article.title}
                href="#"
                className="border rounded-lg p-4 hover:border-primary transition-colors bg-background"
              >
                <Badge variant="secondary" className="mb-2">
                  {article.category}
                </Badge>
                <h3 className="font-medium">{article.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Still need help?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 border rounded-lg">
              <MessageCircle className="h-10 w-10 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Live Chat</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Chat with our support team in real-time.
              </p>
              <Button variant="outline" size="sm">
                Start Chat
              </Button>
            </div>

            <div className="text-center p-6 border rounded-lg">
              <HelpCircle className="h-10 w-10 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Submit a Ticket</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get help from our support team via email.
              </p>
              <Link href="/contact">
                <Button variant="outline" size="sm">
                  Contact Us
                </Button>
              </Link>
            </div>

            <div className="text-center p-6 border rounded-lg">
              <Video className="h-10 w-10 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Video Tutorials</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Watch step-by-step guides and tutorials.
              </p>
              <Button variant="outline" size="sm">
                Watch Videos
              </Button>
            </div>
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

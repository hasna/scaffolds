"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Phone,
  MapPin,
  Loader2,
  CheckCircle2,
  Twitter,
  Github,
  Linkedin,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const contactMethods = [
  {
    icon: Mail,
    title: "Email Support",
    description: "Send us an email and we'll get back to you within 24 hours.",
    contact: "support@example.com",
    href: "mailto:support@example.com",
  },
  {
    icon: Phone,
    title: "Phone Support",
    description: "Call us during business hours (9am-5pm PST).",
    contact: "+1 (555) 123-4567",
    href: "tel:+15551234567",
  },
];

const offices = [
  {
    city: "San Francisco",
    address: "100 Market Street, Suite 300",
    country: "United States",
  },
  {
    city: "London",
    address: "25 Old Broad Street",
    country: "United Kingdom",
  },
];

const socialLinks = [
  { name: "Twitter", icon: Twitter, href: "https://twitter.com" },
  { name: "GitHub", icon: Github, href: "https://github.com" },
  { name: "LinkedIn", icon: Linkedin, href: "https://linkedin.com" },
];

const subjects = [
  { value: "general", label: "General Inquiry" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Technical Support" },
  { value: "billing", label: "Billing" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
];

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: subject,
      message: formData.get("message") as string,
    };

    try {
      const response = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to send message");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-12 md:py-20">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center mb-12">
        <Badge variant="outline" className="mb-4">
          Contact
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Get in Touch</h1>
        <p className="text-lg text-muted-foreground">
          Have a question or need help? We'd love to hear from you.
        </p>
      </div>

      {/* Contact Methods */}
      <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto mb-12">
        {contactMethods.map((method, index) => (
          <Card key={index}>
            <CardHeader>
              <method.icon className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">{method.title}</CardTitle>
              <CardDescription>{method.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href={method.href}
                className="text-primary hover:underline font-medium"
              >
                {method.contact}
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact Form */}
      <div className="max-w-2xl mx-auto mb-16">
        {submitted ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
              <p className="text-muted-foreground mb-4">
                Thank you for contacting us. We'll get back to you within 24
                hours.
              </p>
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Send Another Message
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Send a Message</CardTitle>
              <CardDescription>
                Fill out the form below and we'll respond as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={subject} onValueChange={setSubject} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" name="message" rows={5} required />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !subject}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Office Locations */}
      <div className="max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl font-bold text-center mb-8">Our Offices</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {offices.map((office, index) => (
            <Card key={index}>
              <CardHeader>
                <MapPin className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">{office.city}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{office.address}</p>
                <p className="text-muted-foreground">{office.country}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Follow Us</h2>
        <div className="flex justify-center gap-4">
          {socialLinks.map((social, index) => (
            <a
              key={index}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-full border hover:bg-accent transition-colors"
            >
              <social.icon className="h-5 w-5" />
              <span className="sr-only">{social.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

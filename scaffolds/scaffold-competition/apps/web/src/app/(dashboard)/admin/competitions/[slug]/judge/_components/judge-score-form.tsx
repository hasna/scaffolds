"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface Props {
  submissionId: string;
}

export function JudgeScoreForm({ submissionId }: Props) {
  const [score, setScore] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, score, feedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Score submitted!");
      setFeedback("");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t pt-4 space-y-4"
    >
      <p className="text-sm font-medium">Submit your score</p>

      {/* Score slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500" />
            Score
          </Label>
          <span className="text-lg font-bold tabular-nums">{score}/10</span>
        </div>
        <Slider
          min={1}
          max={10}
          step={1}
          value={[score]}
          onValueChange={([v]) => setScore(v)}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 — Poor</span>
          <span>10 — Excellent</span>
        </div>
      </div>

      {/* Feedback */}
      <div className="space-y-2">
        <Label htmlFor={`feedback-${submissionId}`}>
          Feedback <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={`feedback-${submissionId}`}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What did you think about this submission?"
          rows={3}
        />
      </div>

      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Score"}
      </Button>
    </form>
  );
}

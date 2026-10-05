"use client";

import { useState, useTransition } from "react";
import { Check, PlayCircle, FileText } from "lucide-react";
import { toggleLessonComplete } from "@/lib/progress-actions";
import type { Database } from "@/lib/supabase/types";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];

export function LessonRow({ lesson, initiallyComplete }: { lesson: Lesson; initiallyComplete: boolean }) {
  const [complete, setComplete] = useState(initiallyComplete);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !complete;
    setComplete(next); // optimistic
    startTransition(async () => {
      await toggleLessonComplete(lesson.id, next);
    });
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      <button
        onClick={toggle}
        disabled={pending}
        aria-label={complete ? "Mark incomplete" : "Mark complete"}
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${
          complete ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
        }`}
      >
        {complete ? <Check className="size-3" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${complete ? "text-muted-foreground line-through" : ""}`}>
          {lesson.title}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {lesson.video_url ? (
            <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
              <PlayCircle className="size-3.5" /> Video
            </a>
          ) : null}
          {lesson.resource_url ? (
            <a href={lesson.resource_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
              <FileText className="size-3.5" /> Resources
            </a>
          ) : null}
        </div>
        {lesson.content ? (
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{lesson.content}</p>
        ) : null}
      </div>
    </div>
  );
}

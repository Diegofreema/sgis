"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudentQuestion } from "@/types/exam";

type QuestionCardProps = {
  question: StudentQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedOption: string | undefined;
  isFlagged: boolean;
  onSelectOption: (option: string) => void;
  onToggleFlag: () => void;
};

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedOption,
  isFlagged,
  onSelectOption,
  onToggleFlag,
}: QuestionCardProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="space-y-6"
      >
        {/* Question header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Question {questionNumber} of {totalQuestions}
            </p>
            {question.subject && (
              <span className="text-xs bg-primary/10 text-primary rounded-md px-2 py-0.5 font-medium">
                {question.subject}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFlag}
            className={cn(
              "gap-1.5 h-7 text-xs",
              isFlagged
                ? "text-warning bg-warning/10 hover:bg-warning/20"
                : "text-muted-foreground hover:text-warning"
            )}
          >
            <Flag className="h-3.5 w-3.5" />
            {isFlagged ? "Flagged" : "Flag"}
          </Button>
        </div>

        {/* Question text */}
        <div className="space-y-4">
          <p className="text-foreground leading-relaxed text-base font-medium">
            {question.questionText}
          </p>

          {question.questionImageUrl && (
            <div className="relative rounded-xl overflow-hidden bg-muted max-w-md">
              <Image
                src={question.questionImageUrl}
                alt="Question image"
                width={600}
                height={400}
                className="w-full h-auto object-contain"
              />
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {question.options.map((option) => {
            const isSelected = selectedOption === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onSelectOption(option.id)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150 group",
                  isSelected
                    ? "border-primary bg-primary/8 shadow-brand-sm"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                )}
              >
                {/* Option letter circle */}
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  )}
                >
                  {option.id.toUpperCase()}
                </span>
                <span
                  className={cn(
                    "text-sm leading-relaxed mt-0.5 transition-colors",
                    isSelected ? "text-primary font-medium" : "text-foreground"
                  )}
                >
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

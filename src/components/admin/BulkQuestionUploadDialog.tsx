"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { bulkCreateQuestionBankItems } from "@/server/actions/admin.actions";
import {
  BULK_QUESTION_TEMPLATE_HEADERS,
  MAX_BULK_QUESTION_UPLOAD,
} from "@/lib/question-bank";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BulkRow = {
  questionText: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation?: string;
};

function getCellValue(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

export function BulkQuestionUploadDialog() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload() {
    if (!file) {
      toast.error("Choose an Excel file.");
      return;
    }

    setIsUploading(true);

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;

      if (!sheet) {
        toast.error("The workbook is empty.");
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      const missingHeaders = BULK_QUESTION_TEMPLATE_HEADERS.filter(
        (header) => rows[0] && !(header in rows[0])
      );

      if (rows[0] && missingHeaders.length > 0) {
        toast.error("Use the template columns.");
        return;
      }

      const payload = rows
        .map((row) => ({
          questionText: getCellValue(row, "questionText"),
          subject: getCellValue(row, "subject"),
          difficulty: (getCellValue(row, "difficulty").toLowerCase() ||
            "medium") as BulkRow["difficulty"],
          marks: Number(getCellValue(row, "marks") || "1"),
          optionA: getCellValue(row, "optionA"),
          optionB: getCellValue(row, "optionB"),
          optionC: getCellValue(row, "optionC"),
          optionD: getCellValue(row, "optionD"),
          correctOption: getCellValue(row, "correctOption").toLowerCase(),
          explanation: getCellValue(row, "explanation"),
        }))
        .filter((row) =>
          [
            row.questionText,
            row.subject,
            row.optionA,
            row.optionB,
            row.optionC,
            row.optionD,
          ].some(Boolean)
        );

      if (payload.length === 0) {
        toast.error("No questions found in the file.");
        return;
      }
      if (payload.length > MAX_BULK_QUESTION_UPLOAD) {
        toast.error(`Upload ${MAX_BULK_QUESTION_UPLOAD} questions or fewer.`);
        return;
      }

      const result = await bulkCreateQuestionBankItems({
        questions: payload.map((row, index) => ({
          questionText: row.questionText,
          subject: row.subject,
          difficulty: row.difficulty,
          marks: row.marks,
          correctOption: row.correctOption,
          explanation: row.explanation,
          sortOrder: index,
          options: [
            { id: "a", text: row.optionA },
            { id: "b", text: row.optionB },
            { id: "c", text: row.optionC },
            { id: "d", text: row.optionD },
          ],
        })),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`Imported ${result.data.created} questions.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Unable to read that Excel file.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setFile(null);
          if (inputRef.current) inputRef.current.value = "";
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">Bulk Upload Questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild type="button" variant="outline" className="gap-2">
              <a href="/templates/question-bank-template.xlsx" download>
                <Download className="h-4 w-4" />
                Download Template
              </a>
            </Button>
            <Label
              htmlFor="question-bulk-file"
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {file ? "Change File" : "Choose Excel File"}
            </Label>
            <Input
              id="question-bulk-file"
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={(event) =>
                setFile(event.target.files?.[0] ?? null)
              }
            />
          </div>

          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {file ? file.name : "No file selected"}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import Questions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

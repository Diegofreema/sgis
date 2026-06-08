"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  CircleAlert,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createStudentAccount } from "@/server/actions/auth.actions";
import { formatDate, getFullName } from "@/lib/utils";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type StudentSummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  requiresPasswordChange: boolean;
  applicationStatus: string | null;
  paymentStatus: string | null;
  examStatus: string | null;
  createdAt: string;
};

type Props = {
  students: StudentSummary[];
};

function statusLabel(value: string | null, empty: string) {
  if (!value) return empty;
  return value.replaceAll("_", " ");
}

export function StudentsDashboardClient({ students }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setCreating(true);
    const result = await createStudentAccount(values);
    setCreating(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    form.reset();
    if (result.data.delivery === "outbox") {
      toast.success(
        `Student account created. Credentials were written to the local outbox at ${result.data.filePath}.`
      );
    } else {
      toast.success("Student account created and credentials emailed.");
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-h3 font-bold text-foreground">My Students</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create student accounts, track onboarding, and continue each student’s admission workflow.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-base flex items-center gap-2 text-primary">
            <UserPlus className="h-4 w-4" />
            Create a student account
          </CardTitle>
          <CardDescription className="text-xs">
            We’ll generate a secure temporary password and email it directly to the student.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input disabled={creating} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input disabled={creating} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Student email</FormLabel>
                      <FormControl>
                        <Input disabled={creating} type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone number</FormLabel>
                      <FormControl>
                        <Input disabled={creating} type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of birth</FormLabel>
                      <FormControl>
                        <Input disabled={creating} type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="gap-2 font-medium shadow-brand-sm" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Create and Email Credentials
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-foreground">Linked students</h2>
          <Badge variant="outline">{students.length} student{students.length === 1 ? "" : "s"}</Badge>
        </div>

        {students.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center space-y-3">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">No student accounts yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {students.map((student) => (
              <Card key={student.id} className="border-border/70">
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {getFullName(student.firstName, student.lastName)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{student.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {formatDate(student.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="capitalize">
                        Application: {statusLabel(student.applicationStatus, "not started")}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        Payment: {statusLabel(student.paymentStatus, "pending")}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        Exam: {statusLabel(student.examStatus, "locked")}
                      </Badge>
                      {student.requiresPasswordChange && (
                        <Badge className="bg-warning/20 text-warning border-warning/30 gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Password rotation pending
                        </Badge>
                      )}
                    </div>
                  </div>

                  {student.requiresPasswordChange && (
                    <div className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
                      <CircleAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <p>
                        This student must change their temporary password after first login before
                        they can use their own dashboard.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link href={`/dashboard/profile?student=${student.id}`}>
                        Profile <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link href={`/dashboard/application?student=${student.id}`}>
                        <FileText className="h-3.5 w-3.5" />
                        Application
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link href={`/dashboard/payments?student=${student.id}`}>
                        <CreditCard className="h-3.5 w-3.5" />
                        Payments
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link href={`/dashboard/exam?student=${student.id}`}>
                        <BookOpen className="h-3.5 w-3.5" />
                        Exam Status
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

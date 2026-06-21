"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowRight,
  Camera,
  Loader2,
  Lock,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { getInitials, getFullName } from "@/lib/utils";
import { updateProfile } from "@/server/actions/auth.actions";
import { PasswordUpdateForm } from "@/components/forms/PasswordUpdateForm";
import type { UserProfile } from "@/types/auth";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT – Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(7, "Valid phone number required").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  address: z.string().optional(),
  state: z.string().optional(),
  lga: z.string().optional(),
  previousSchool: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  actor: UserProfile;
  profile: UserProfile;
  isManagingStudent: boolean;
  isProfileLocked?: boolean;
};

export function ProfileFormClient({ actor, profile, isManagingStudent, isProfileLocked = false }: Props) {
  const setProfile = useAuthStore((state) => state.setProfile);

  useEffect(() => {
    if (!isManagingStudent) {
      setProfile(profile);
    }
  }, [isManagingStudent, profile, setProfile]);

  const fullName = getFullName(profile.firstName, profile.lastName);
  const studentMustChangePassword =
    profile.role === "student" && profile.requiresPasswordChange && !isManagingStudent;
  const isStudent = profile.role === "student";
  const isParent = profile.role === "parent";
  const readOnly = studentMustChangePassword || isProfileLocked;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      phone: profile.phone ?? "",
      dateOfBirth: profile.dateOfBirth ?? "",
      gender: (profile.gender ?? undefined) as "male" | "female" | "other" | undefined,
      address: profile.address ?? "",
      state: (profile as UserProfile & { state?: string | null }).state ?? "",
      lga: (profile as UserProfile & { lga?: string | null }).lga ?? "",
      previousSchool: profile.previousSchool ?? "",
      guardianName: profile.guardianName ?? "",
      guardianPhone: profile.guardianPhone ?? "",
      guardianEmail: profile.guardianEmail ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const result = await updateProfile({
      ...values,
      gender: values.gender ?? null,
      targetStudentProfileId: isManagingStudent ? profile.id : undefined,
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Profile updated successfully!");
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-serif text-h3 font-bold text-foreground">
            {isManagingStudent ? "Student Profile" : "My Profile"}
          </h1>
          <Badge variant="outline" className="capitalize">
            {profile.role}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          {isManagingStudent
            ? `You are updating ${fullName}'s school record as a parent.`
            : "Keep your information up to date for your application."}
        </p>
      </div>

      {isManagingStudent && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Parent-managed student view</p>
            <p className="text-xs text-muted-foreground mt-1">
              You can update this student&apos;s school record and continue their admission workflow.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/dashboard/students">
              Back to Students <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {isProfileLocked && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Profile locked</p>
              <p className="text-xs text-muted-foreground">
                Your profile is locked after payment approval. This ensures your identity can be
                verified on exam day. Contact the school office if you need to make changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {studentMustChangePassword && !isProfileLocked && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Password change required</p>
              <p className="text-xs text-muted-foreground">
                Change the temporary password sent to your email before editing your profile
                or using the rest of the dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatarUrl ?? undefined} alt={fullName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold font-serif">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          {!readOnly && (
            <button
              type="button"
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
              aria-label="Upload photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div>
          <p className="font-semibold text-foreground">{fullName}</p>
          <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
          <p className="text-xs text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* ── Personal Information ──────────────────────────── */}
          <div>
            <h2 className="font-serif font-semibold text-foreground mb-4 text-sm">
              Personal Information
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input disabled={readOnly} {...field} />
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
                      <Input disabled={readOnly} {...field} />
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
                      <Input type="tel" disabled={readOnly} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date of birth — students only */}
              {isStudent && (
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of birth</FormLabel>
                      <FormControl>
                        <Input type="date" disabled={readOnly} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={readOnly}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other / Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Previous school — students only */}
              {isStudent && (
                <FormField
                  control={form.control}
                  name="previousSchool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous school</FormLabel>
                      <FormControl>
                        <Input disabled={readOnly} placeholder="Current / last school" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* State — students only */}
              {isStudent && (
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State of origin</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={readOnly}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {NIGERIAN_STATES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* LGA — students only */}
              {isStudent && (
                <FormField
                  control={form.control}
                  name="lga"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local Government Area (LGA)</FormLabel>
                      <FormControl>
                        <Input disabled={readOnly} placeholder="e.g. Owerri Municipal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="mt-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Home address</FormLabel>
                    <FormControl>
                      <Textarea disabled={readOnly} placeholder="Full address" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ── Guardian Info — students only ───────────────── */}
          {isStudent && (
            <div>
              <h2 className="font-serif font-semibold text-foreground mb-4 text-sm">
                Parent / Guardian Information
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="guardianName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guardian full name</FormLabel>
                      <FormControl>
                        <Input disabled={readOnly} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guardianPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guardian phone</FormLabel>
                      <FormControl>
                        <Input type="tel" disabled={readOnly} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guardianEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guardian email</FormLabel>
                      <FormControl>
                        <Input type="email" disabled={readOnly} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="font-medium"
            disabled={form.formState.isSubmitting || readOnly}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </Form>

      {!isManagingStudent && (
        <PasswordUpdateForm
          heading="Account security"
          description={
            profile.role === "student" && profile.requiresPasswordChange
              ? "Set a private password now to unlock the rest of your dashboard."
              : "Change your password any time to keep your account secure."
          }
          submitLabel="Change Password"
          successMessage="Password updated. Redirecting…"
        />
      )}

      {actor.role === "parent" && !isManagingStudent && isParent && (
        <Card className="border-primary/15 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base flex items-center gap-2 text-primary">
              <Users className="h-4 w-4" />
              Student Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Create and manage the student accounts linked to your parent profile.
            </p>
            <Button asChild className="gap-2 font-medium shadow-brand-sm">
              <Link href="/dashboard/students">
                Open Student Manager <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

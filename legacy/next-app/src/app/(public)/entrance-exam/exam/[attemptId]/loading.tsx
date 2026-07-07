import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PublicExamLoading() {
  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto flex max-w-md items-center justify-center">
        <Card className="w-full">
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <h1 className="font-serif text-xl font-semibold text-foreground">
                Loading your exam
              </h1>
              <p className="text-sm text-muted-foreground">
                Fetching your questions and restoring your attempt.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

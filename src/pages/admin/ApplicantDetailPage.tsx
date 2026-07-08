import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { NotFound } from "@/components/shared/NotFound";
import { ApplicantDetailClient } from "@/components/admin/ApplicantDetailClient";
import { getApplicationById, type ApplicationDetailData } from "@/lib/admin-applications";

const routeApi = getRouteApi("/admin/applicants/$id");

export function ApplicantDetailPage() {
  const { id } = routeApi.useParams();
  const [state, setState] = useState<ApplicationDetailData | "loading" | "notfound">("loading");

  useEffect(() => {
    let active = true;
    setState("loading");
    getApplicationById(id)
      .then((data) => {
        if (!active) return;
        setState(data ?? "notfound");
      })
      .catch((e) => {
        console.error("[admin applicant detail]", e);
        if (active) setState("notfound");
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (state === "loading") return <AdminLoading />;
  if (state === "notfound") return <NotFound />;

  return (
    <ApplicantDetailClient
      application={state.application}
      supportingDocuments={state.supportingDocuments}
      examAttempt={state.examAttempt}
    />
  );
}

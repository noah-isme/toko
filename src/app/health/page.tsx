import { getHealthStatus } from "@/lib/api/health";

export const revalidate = 0;

export default async function HealthPage() {
  let errorMessage: string | null = null;
  let status: Awaited<ReturnType<typeof getHealthStatus>> | null = null;

  try {
    status = await getHealthStatus();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  if (errorMessage) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">API health</h1>
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Connection failed</p>
          <p>{errorMessage}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Ensure the backend is running or enable the mock API during development. The MSW handlers
          provide a fallback when the backend is unavailable.
        </p>
      </section>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">API health</h1>
      <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm">
        <p className="font-medium text-emerald-700">Connection successful</p>
        <p className="text-emerald-600">Timestamp: {new Date(status.timestamp).toLocaleString()}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        The data above is served from{" "}
        <code>{process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:8080/api/v1"}</code>. Update
        your environment variables to point at a different backend without changing the code.
      </p>
    </section>
  );
}

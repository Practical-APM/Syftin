export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logProductionEnvIssues } = await import("@/lib/security/env-validation");
    logProductionEnvIssues();
  }
}

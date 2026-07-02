"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Check,
  CloudUpload,
  Copy,
  Database,
  Key,
  Loader2,
  RefreshCw,
  Send,
  Server,
  Webhook,
} from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/error-fallback";
import type { OrgDeliveryConfig } from "@/lib/data/delivery";
import type { BucketDeliveryConfig } from "@/lib/data/bucket-delivery";
import type { SftpDeliveryConfig } from "@/lib/data/sftp-delivery";
import type { ExportScheduleConfig } from "@/lib/data/scheduled-exports";
import type { WarehouseDeliveryConfig } from "@/lib/data/warehouse-delivery";
import { getPublicSiteUrl } from "@/lib/env";

type DeliveryLog = {
  id: string;
  job_id: string;
  channel: string;
  event_type: string;
  status: string;
  attempt_count: number;
  last_error: string | null;
  delivered_at: string | null;
  created_at: string;
};

export function IntegrationsPanel() {
  const siteUrl = getPublicSiteUrl();
  const [config, setConfig] = useState<OrgDeliveryConfig | null>(null);
  const [bucket, setBucket] = useState<BucketDeliveryConfig | null>(null);
  const [sftp, setSftp] = useState<SftpDeliveryConfig | null>(null);
  const [schedule, setSchedule] = useState<ExportScheduleConfig | null>(null);
  const [warehouse, setWarehouse] = useState<WarehouseDeliveryConfig | null>(null);
  const [log, setLog] = useState<DeliveryLog[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [notifyFailed, setNotifyFailed] = useState(false);
  const [includeData, setIncludeData] = useState(false);
  const [defaultFormat, setDefaultFormat] = useState<"json" | "csv" | "ndjson">("json");
  const [bucketEnabled, setBucketEnabled] = useState(false);
  const [bucketProvider, setBucketProvider] = useState<"s3" | "gcs">("s3");
  const [bucketName, setBucketName] = useState("");
  const [bucketRegion, setBucketRegion] = useState("");
  const [bucketPrefix, setBucketPrefix] = useState("syftin/");
  const [bucketEndpoint, setBucketEndpoint] = useState("");
  const [s3AccessKeyId, setS3AccessKeyId] = useState("");
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState("");
  const [gcsProjectId, setGcsProjectId] = useState("");
  const [gcsServiceAccountJson, setGcsServiceAccountJson] = useState("");
  const [sftpEnabled, setSftpEnabled] = useState(false);
  const [sftpHost, setSftpHost] = useState("");
  const [sftpPort, setSftpPort] = useState(22);
  const [sftpUsername, setSftpUsername] = useState("");
  const [sftpAuthMethod, setSftpAuthMethod] = useState<"password" | "private_key">("password");
  const [sftpRemotePath, setSftpRemotePath] = useState("/syftin");
  const [sftpPassword, setSftpPassword] = useState("");
  const [sftpPrivateKey, setSftpPrivateKey] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<"daily" | "weekly">("daily");
  const [scheduleChannel, setScheduleChannel] = useState<"bucket" | "sftp">("bucket");
  const [warehouseEnabled, setWarehouseEnabled] = useState(false);
  const [warehouseProvider, setWarehouseProvider] = useState<"snowflake" | "bigquery">("snowflake");
  const [snowflakeAccount, setSnowflakeAccount] = useState("");
  const [snowflakeWarehouse, setSnowflakeWarehouse] = useState("");
  const [snowflakeDatabase, setSnowflakeDatabase] = useState("");
  const [snowflakeSchema, setSnowflakeSchema] = useState("PUBLIC");
  const [snowflakeTable, setSnowflakeTable] = useState("");
  const [snowflakeUser, setSnowflakeUser] = useState("");
  const [snowflakePassword, setSnowflakePassword] = useState("");
  const [bqProjectId, setBqProjectId] = useState("");
  const [bqDataset, setBqDataset] = useState("");
  const [bqTable, setBqTable] = useState("");
  const [bqServiceAccountJson, setBqServiceAccountJson] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingBucket, setTestingBucket] = useState(false);
  const [testingSftp, setTestingSftp] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/org/delivery")
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load delivery settings.");
        return res.json();
      })
      .then((data) => {
        const cfg = data.config as OrgDeliveryConfig;
        const bucketCfg = data.bucket as BucketDeliveryConfig;
        const sftpCfg = data.sftp as SftpDeliveryConfig;
        const scheduleCfg = data.schedule as ExportScheduleConfig;
        const warehouseCfg = data.warehouse as WarehouseDeliveryConfig;
        setConfig(cfg);
        setBucket(bucketCfg);
        setSftp(sftpCfg);
        setSchedule(scheduleCfg);
        setWarehouse(warehouseCfg);
        setLog(data.recentDeliveries ?? []);
        setWebhookUrl(cfg.webhookUrl ?? "");
        setWebhookEnabled(cfg.webhookEnabled);
        setNotifyFailed(cfg.webhookNotifyFailed);
        setIncludeData(cfg.webhookIncludeData);
        setDefaultFormat(cfg.defaultExportFormat);
        setBucketEnabled(bucketCfg.enabled);
        setBucketProvider(bucketCfg.provider ?? "s3");
        setBucketName(bucketCfg.bucketName ?? "");
        setBucketRegion(bucketCfg.region ?? "");
        setBucketPrefix(bucketCfg.prefix);
        setBucketEndpoint(bucketCfg.endpoint ?? "");
        setGcsProjectId(bucketCfg.gcsProjectId ?? "");
        setSftpEnabled(sftpCfg.enabled);
        setSftpHost(sftpCfg.host ?? "");
        setSftpPort(sftpCfg.port);
        setSftpUsername(sftpCfg.username ?? "");
        setSftpAuthMethod(sftpCfg.authMethod ?? "password");
        setSftpRemotePath(sftpCfg.remotePath);
        setScheduleEnabled(scheduleCfg.enabled);
        setScheduleFrequency(scheduleCfg.frequency ?? "daily");
        setScheduleChannel(scheduleCfg.channel ?? "bucket");
        setWarehouseEnabled(warehouseCfg.enabled);
        setWarehouseProvider(warehouseCfg.provider ?? "snowflake");
        setSnowflakeAccount(warehouseCfg.snowflakeAccount ?? "");
        setSnowflakeWarehouse(warehouseCfg.snowflakeWarehouse ?? "");
        setSnowflakeDatabase(warehouseCfg.snowflakeDatabase ?? "");
        setSnowflakeSchema(warehouseCfg.snowflakeSchema);
        setSnowflakeTable(warehouseCfg.snowflakeTable ?? "");
        setBqProjectId(warehouseCfg.bqProjectId ?? "");
        setBqDataset(warehouseCfg.bqDataset ?? "");
        setBqTable(warehouseCfg.bqTable ?? "");
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Request failed."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveWebhook() {
    setSaving(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/org/delivery", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: webhookUrl || null,
        webhookEnabled,
        webhookNotifyFailed: notifyFailed,
        webhookIncludeData: includeData,
        webhookSecret: webhookSecret || undefined,
        defaultExportFormat: defaultFormat,
        bucketEnabled,
        bucketProvider,
        bucketName: bucketName || null,
        bucketRegion: bucketRegion || null,
        bucketPrefix,
        bucketEndpoint: bucketEndpoint || null,
        gcsProjectId: gcsProjectId || null,
        s3AccessKeyId: s3AccessKeyId || undefined,
        s3SecretAccessKey: s3SecretAccessKey || undefined,
        gcsServiceAccountJson: gcsServiceAccountJson || undefined,
        sftpEnabled,
        sftpHost: sftpHost || null,
        sftpPort,
        sftpUsername: sftpUsername || null,
        sftpAuthMethod,
        sftpRemotePath,
        sftpPassword: sftpPassword || undefined,
        sftpPrivateKey: sftpPrivateKey || undefined,
        exportScheduleEnabled: scheduleEnabled,
        exportScheduleFrequency: scheduleFrequency,
        exportScheduleChannel: scheduleChannel,
        warehouseEnabled,
        warehouseProvider,
        snowflakeAccount: snowflakeAccount || null,
        snowflakeWarehouse: snowflakeWarehouse || null,
        snowflakeDatabase: snowflakeDatabase || null,
        snowflakeSchema,
        snowflakeTable: snowflakeTable || null,
        snowflakeUser: snowflakeUser || undefined,
        snowflakePassword: snowflakePassword || undefined,
        bqProjectId: bqProjectId || null,
        bqDataset: bqDataset || null,
        bqTable: bqTable || null,
        bqServiceAccountJson: bqServiceAccountJson || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Save failed.");
      return;
    }
    setConfig(data.config);
    setBucket(data.bucket);
    setSftp(data.sftp);
    setSchedule(data.schedule);
    setWarehouse(data.warehouse);
    setWebhookSecret("");
    setS3AccessKeyId("");
    setS3SecretAccessKey("");
    setGcsServiceAccountJson("");
    setSftpPassword("");
    setSftpPrivateKey("");
    setSnowflakeUser("");
    setSnowflakePassword("");
    setBqServiceAccountJson("");
    setMessage("Delivery settings saved.");
    load();
  }

  async function testWebhook() {
    setTesting(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/org/delivery/test", { method: "POST" });
    const data = await res.json();
    setTesting(false);
    if (!res.ok) {
      setError(data.error ?? "Test failed.");
      return;
    }
    setMessage("Test webhook sent — check your endpoint.");
  }

  async function testBucket() {
    setTestingBucket(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/org/delivery/bucket-test", { method: "POST" });
    const data = await res.json();
    setTestingBucket(false);
    if (!res.ok) {
      setError(data.error ?? "Bucket test failed.");
      return;
    }
    setMessage(`Test file uploaded to ${data.objectKey ?? "your bucket"}.`);
  }

  async function testSftp() {
    setTestingSftp(true);
    setMessage(null);
    setError(null);
    const res = await fetch("/api/org/delivery/sftp-test", { method: "POST" });
    const data = await res.json();
    setTestingSftp(false);
    if (!res.ok) {
      setError(data.error ?? "SFTP test failed.");
      return;
    }
    setMessage(`Test file uploaded to ${data.remotePath ?? "your SFTP server"}.`);
  }

  async function rotateKey() {
    setRotating(true);
    setNewApiKey(null);
    setError(null);
    const res = await fetch("/api/org/delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rotate_api_key" }),
    });
    const data = await res.json();
    setRotating(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create API key.");
      return;
    }
    setNewApiKey(data.apiKey);
    load();
  }

  function copyKey() {
    if (!newApiKey) return;
    void navigator.clipboard.writeText(newApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const apiExample = `curl -H "Authorization: Bearer sftn_live_…" \\
  "${siteUrl}/api/v1/jobs"`;

  return (
    <>
      <DashboardHeader
        title="Integrations"
        description="Automate delivery and API access."
      />
      <DashboardPage>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-graphite-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <InlineError message={error} onRetry={load} />
        ) : (
          <>
            {message && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {message}
              </div>
            )}

            <Panel>
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-honey-600" />
                <h2 className="text-sm font-semibold text-graphite-900">Webhooks</h2>
              </div>
              <p className="mt-2 text-sm text-graphite-500">
                We POST to your URL when a job completes or fails. Verify payloads with{" "}
                <code className="text-xs">X-Syftin-Signature</code> (HMAC-SHA256).
              </p>
              <div className="mt-5 space-y-4">
                <label className="block text-sm">
                  <span className="font-medium text-graphite-700">Endpoint URL</span>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-app.com/webhooks/syftin"
                    className="app-input mt-1.5"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-graphite-700">
                    Signing secret{" "}
                    {config?.hasWebhookSecret && (
                      <span className="text-graphite-400">(configured)</span>
                    )}
                  </span>
                  <input
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder={config?.hasWebhookSecret ? "Leave blank to keep" : "Optional"}
                    className="app-input mt-1.5 font-mono"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-graphite-700">
                  <input
                    type="checkbox"
                    checked={webhookEnabled}
                    onChange={(e) => setWebhookEnabled(e.target.checked)}
                  />
                  Enable webhooks for completed jobs
                </label>
                <label className="flex items-center gap-2 text-sm text-graphite-700">
                  <input
                    type="checkbox"
                    checked={notifyFailed}
                    onChange={(e) => setNotifyFailed(e.target.checked)}
                    disabled={!webhookEnabled}
                  />
                  Notify on job failures
                </label>
                <label className="flex items-center gap-2 text-sm text-graphite-700">
                  <input
                    type="checkbox"
                    checked={includeData}
                    onChange={(e) => setIncludeData(e.target.checked)}
                  />
                  Include row data in payload (small jobs only; large sets use download URLs)
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" disabled={saving} onClick={saveWebhook}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save webhook"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={testing || !webhookUrl}
                    onClick={testWebhook}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {testing ? "Sending…" : "Send test"}
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <CloudUpload className="h-4 w-4 text-honey-600" />
                <h2 className="text-sm font-semibold text-graphite-900">Bucket push</h2>
              </div>
              <p className="mt-2 text-sm text-graphite-500">
                Upload completed job exports to your S3 bucket (AWS, Cloudflare R2, MinIO) or
                Google Cloud Storage. Uses your workspace default export format.
              </p>
              <div className="mt-5 space-y-4">
                <label className="flex items-center gap-2 text-sm text-graphite-700">
                  <input
                    type="checkbox"
                    checked={bucketEnabled}
                    onChange={(e) => setBucketEnabled(e.target.checked)}
                  />
                  Enable bucket push on job completion
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-graphite-700">Provider</span>
                  <select
                    value={bucketProvider}
                    onChange={(e) => setBucketProvider(e.target.value as "s3" | "gcs")}
                    className="app-input mt-1.5"
                  >
                    <option value="s3">S3-compatible (AWS, R2, MinIO)</option>
                    <option value="gcs">Google Cloud Storage</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-graphite-700">Bucket name</span>
                  <input
                    type="text"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                    placeholder="my-company-syftin-exports"
                    className="app-input mt-1.5"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-graphite-700">Object prefix</span>
                  <input
                    type="text"
                    value={bucketPrefix}
                    onChange={(e) => setBucketPrefix(e.target.value)}
                    placeholder="syftin/"
                    className="app-input mt-1.5 font-mono"
                  />
                </label>
                {bucketProvider === "s3" ? (
                  <>
                    <label className="block text-sm">
                      <span className="font-medium text-graphite-700">Region</span>
                      <input
                        type="text"
                        value={bucketRegion}
                        onChange={(e) => setBucketRegion(e.target.value)}
                        placeholder="ap-south-1"
                        className="app-input mt-1.5"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium text-graphite-700">
                        Custom endpoint{" "}
                        <span className="text-graphite-400">(R2 / MinIO only)</span>
                      </span>
                      <input
                        type="url"
                        value={bucketEndpoint}
                        onChange={(e) => setBucketEndpoint(e.target.value)}
                        placeholder="https://…r2.cloudflarestorage.com"
                        className="app-input mt-1.5"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium text-graphite-700">
                        Access key ID{" "}
                        {bucket?.hasS3Credentials && (
                          <span className="text-graphite-400">(configured)</span>
                        )}
                      </span>
                      <input
                        type="text"
                        value={s3AccessKeyId}
                        onChange={(e) => setS3AccessKeyId(e.target.value)}
                        placeholder={bucket?.hasS3Credentials ? "Leave blank to keep" : "AKIA…"}
                        className="app-input mt-1.5 font-mono"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium text-graphite-700">Secret access key</span>
                      <input
                        type="password"
                        value={s3SecretAccessKey}
                        onChange={(e) => setS3SecretAccessKey(e.target.value)}
                        placeholder={bucket?.hasS3Credentials ? "Leave blank to keep" : "••••••••"}
                        className="app-input mt-1.5 font-mono"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="block text-sm">
                      <span className="font-medium text-graphite-700">GCS project ID</span>
                      <input
                        type="text"
                        value={gcsProjectId}
                        onChange={(e) => setGcsProjectId(e.target.value)}
                        placeholder="my-gcp-project"
                        className="app-input mt-1.5"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium text-graphite-700">
                        Service account JSON{" "}
                        {bucket?.hasGcsCredentials && (
                          <span className="text-graphite-400">(configured)</span>
                        )}
                      </span>
                      <textarea
                        value={gcsServiceAccountJson}
                        onChange={(e) => setGcsServiceAccountJson(e.target.value)}
                        placeholder={
                          bucket?.hasGcsCredentials
                            ? "Leave blank to keep existing credentials"
                            : '{"type":"service_account",…}'
                        }
                        rows={4}
                        className="app-input mt-1.5 font-mono text-xs"
                      />
                    </label>
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" disabled={saving} onClick={saveWebhook}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save bucket settings"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={testingBucket || !bucketName}
                    onClick={testBucket}
                  >
                    <CloudUpload className="h-3.5 w-3.5" />
                    {testingBucket ? "Uploading…" : "Upload test file"}
                  </Button>
                </div>
                <p className="text-xs text-graphite-500">
                  Objects land at{" "}
                  <code className="text-[11px]">
                    {bucketPrefix || "syftin/"}{"{org_id}"}/{"{job_id}"}/syftin-{"{job_id}"}.{"{format}"}
                  </code>
                  . Credentials are encrypted with your server secret.
                </p>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-honey-600" />
                <h2 className="text-sm font-semibold text-graphite-900">SFTP drop</h2>
              </div>
              <p className="mt-2 text-sm text-graphite-500">
                Drop completed job exports on your SFTP server — common for legacy ETL and
                banking-style file intake. Uses your workspace default export format.
              </p>
              <div className="mt-5 space-y-4">
                <label className="flex items-center gap-2 text-sm text-graphite-700">
                  <input
                    type="checkbox"
                    checked={sftpEnabled}
                    onChange={(e) => setSftpEnabled(e.target.checked)}
                  />
                  Enable SFTP drop on job completion
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-medium text-graphite-700">Host</span>
                    <input
                      type="text"
                      value={sftpHost}
                      onChange={(e) => setSftpHost(e.target.value)}
                      placeholder="sftp.partner.com"
                      className="app-input mt-1.5"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-graphite-700">Port</span>
                    <input
                      type="number"
                      value={sftpPort}
                      onChange={(e) => setSftpPort(Number(e.target.value) || 22)}
                      min={1}
                      max={65535}
                      className="app-input mt-1.5"
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="font-medium text-graphite-700">Username</span>
                  <input
                    type="text"
                    value={sftpUsername}
                    onChange={(e) => setSftpUsername(e.target.value)}
                    placeholder="syftin-ingest"
                    className="app-input mt-1.5"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-graphite-700">Remote base path</span>
                  <input
                    type="text"
                    value={sftpRemotePath}
                    onChange={(e) => setSftpRemotePath(e.target.value)}
                    placeholder="/syftin"
                    className="app-input mt-1.5 font-mono"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-graphite-700">Authentication</span>
                  <select
                    value={sftpAuthMethod}
                    onChange={(e) =>
                      setSftpAuthMethod(e.target.value as "password" | "private_key")
                    }
                    className="app-input mt-1.5"
                  >
                    <option value="password">Password</option>
                    <option value="private_key">SSH private key</option>
                  </select>
                </label>
                {sftpAuthMethod === "password" ? (
                  <label className="block text-sm">
                    <span className="font-medium text-graphite-700">
                      Password{" "}
                      {sftp?.hasPassword && (
                        <span className="text-graphite-400">(configured)</span>
                      )}
                    </span>
                    <input
                      type="password"
                      value={sftpPassword}
                      onChange={(e) => setSftpPassword(e.target.value)}
                      placeholder={sftp?.hasPassword ? "Leave blank to keep" : "••••••••"}
                      className="app-input mt-1.5"
                    />
                  </label>
                ) : (
                  <label className="block text-sm">
                    <span className="font-medium text-graphite-700">
                      Private key (PEM){" "}
                      {sftp?.hasPrivateKey && (
                        <span className="text-graphite-400">(configured)</span>
                      )}
                    </span>
                    <textarea
                      value={sftpPrivateKey}
                      onChange={(e) => setSftpPrivateKey(e.target.value)}
                      placeholder={
                        sftp?.hasPrivateKey
                          ? "Leave blank to keep existing key"
                          : "-----BEGIN OPENSSH PRIVATE KEY-----"
                      }
                      rows={4}
                      className="app-input mt-1.5 font-mono text-xs"
                    />
                  </label>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" disabled={saving} onClick={saveWebhook}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save SFTP settings"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={testingSftp || !sftpHost}
                    onClick={testSftp}
                  >
                    <Server className="h-3.5 w-3.5" />
                    {testingSftp ? "Uploading…" : "Upload test file"}
                  </Button>
                </div>
                <p className="text-xs text-graphite-500">
                  Files land at{" "}
                  <code className="text-[11px]">
                    {sftpRemotePath || "/syftin"}/{"{org_id}"}/{"{job_id}"}/syftin-{"{job_id}"}.{"{format}"}
                  </code>
                  . Credentials are encrypted at rest.
                </p>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-honey-600" />
                <h2 className="text-sm font-semibold text-graphite-900">Data warehouse load</h2>
              </div>
              <p className="mt-2 text-sm text-graphite-500">
                Insert each job record into Snowflake or BigQuery on completion. Target table must
                include columns: job_id, organization_id, domain, job_name, completed_at, payload,
                loaded_at.
              </p>
              <div className="mt-5 space-y-4">
                <label className="flex items-center gap-2 text-sm text-graphite-700">
                  <input
                    type="checkbox"
                    checked={warehouseEnabled}
                    onChange={(e) => setWarehouseEnabled(e.target.checked)}
                  />
                  Enable warehouse load on job completion
                </label>
                <select
                  value={warehouseProvider}
                  onChange={(e) =>
                    setWarehouseProvider(e.target.value as "snowflake" | "bigquery")
                  }
                  className="app-input w-full text-sm"
                >
                  <option value="snowflake">Snowflake</option>
                  <option value="bigquery">BigQuery</option>
                </select>
                {warehouseProvider === "snowflake" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      className="app-input text-sm"
                      placeholder="Account (xy12345.ap-south-1)"
                      value={snowflakeAccount}
                      onChange={(e) => setSnowflakeAccount(e.target.value)}
                    />
                    <input
                      className="app-input text-sm"
                      placeholder="Warehouse"
                      value={snowflakeWarehouse}
                      onChange={(e) => setSnowflakeWarehouse(e.target.value)}
                    />
                    <input
                      className="app-input text-sm"
                      placeholder="Database"
                      value={snowflakeDatabase}
                      onChange={(e) => setSnowflakeDatabase(e.target.value)}
                    />
                    <input
                      className="app-input text-sm"
                      placeholder="Schema"
                      value={snowflakeSchema}
                      onChange={(e) => setSnowflakeSchema(e.target.value)}
                    />
                    <input
                      className="app-input col-span-full text-sm"
                      placeholder="Table name"
                      value={snowflakeTable}
                      onChange={(e) => setSnowflakeTable(e.target.value)}
                    />
                    <input
                      className="app-input text-sm"
                      placeholder={
                        warehouse?.hasSnowflakeCredentials ? "User (configured)" : "Username"
                      }
                      value={snowflakeUser}
                      onChange={(e) => setSnowflakeUser(e.target.value)}
                    />
                    <input
                      type="password"
                      className="app-input text-sm"
                      placeholder={
                        warehouse?.hasSnowflakeCredentials ? "Password (keep)" : "Password"
                      }
                      value={snowflakePassword}
                      onChange={(e) => setSnowflakePassword(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input
                      className="app-input w-full text-sm"
                      placeholder="GCP project ID"
                      value={bqProjectId}
                      onChange={(e) => setBqProjectId(e.target.value)}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input
                        className="app-input text-sm"
                        placeholder="Dataset"
                        value={bqDataset}
                        onChange={(e) => setBqDataset(e.target.value)}
                      />
                      <input
                        className="app-input text-sm"
                        placeholder="Table"
                        value={bqTable}
                        onChange={(e) => setBqTable(e.target.value)}
                      />
                    </div>
                    <textarea
                      className="app-input w-full font-mono text-xs"
                      rows={3}
                      placeholder="Service account JSON"
                      value={bqServiceAccountJson}
                      onChange={(e) => setBqServiceAccountJson(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-honey-600" />
                <h2 className="text-sm font-semibold text-graphite-900">Scheduled batch exports</h2>
              </div>
              <p className="mt-2 text-sm text-graphite-500">
                Bundle new completed jobs into one NDJSON file daily or weekly. Delivered via your
                configured bucket or SFTP channel. Cron runs at 02:00 UTC.
              </p>
              <div className="mt-5 space-y-4">
                <label className="flex items-center gap-2 text-sm text-graphite-700">
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                  />
                  Enable scheduled batch exports
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <select
                    value={scheduleFrequency}
                    onChange={(e) =>
                      setScheduleFrequency(e.target.value as "daily" | "weekly")
                    }
                    className="app-input text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly (Monday UTC)</option>
                  </select>
                  <select
                    value={scheduleChannel}
                    onChange={(e) =>
                      setScheduleChannel(e.target.value as "bucket" | "sftp")
                    }
                    className="app-input text-sm"
                  >
                    <option value="bucket">Deliver via bucket</option>
                    <option value="sftp">Deliver via SFTP</option>
                  </select>
                </div>
                {schedule?.lastRunAt && (
                  <p className="text-xs text-graphite-500">
                    Last run: {new Date(schedule.lastRunAt).toLocaleString()}
                  </p>
                )}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-honey-600" />
                <h2 className="text-sm font-semibold text-graphite-900">REST API</h2>
              </div>
              <p className="mt-2 text-sm text-graphite-500">
                Machine-to-machine access with an API key. Session cookies not required.
              </p>
              {config?.apiKeyPrefix && (
                <p className="mt-3 font-mono text-xs text-graphite-600">
                  Active key: {config.apiKeyPrefix}…
                </p>
              )}
              {newApiKey && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-medium text-amber-900">
                    Copy your new API key now — it won&apos;t be shown again.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="break-all text-xs text-graphite-800">{newApiKey}</code>
                    <button
                      type="button"
                      onClick={copyKey}
                      className="inline-flex items-center gap-1 text-xs text-honey-700"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
              <Button
                type="button"
                size="sm"
                className="mt-4"
                disabled={rotating}
                onClick={rotateKey}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {rotating ? "Generating…" : config?.apiKeyPrefix ? "Rotate API key" : "Generate API key"}
              </Button>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-graphite-950 p-4 font-mono text-[11px] leading-relaxed text-emerald-400/90">
                {apiExample}
              </pre>
              <p className="mt-3 text-xs text-graphite-500">
                Endpoints: <code>GET /api/v1/jobs</code>,{" "}
                <code>GET /api/v1/jobs/:id</code>,{" "}
                <code>GET /api/v1/jobs/:id/result?format=json|csv|ndjson</code>
              </p>
            </Panel>

            <Panel>
              <h2 className="text-sm font-semibold text-graphite-900">Export formats</h2>
              <p className="mt-2 text-sm text-graphite-500">
                Default format for API downloads and manual exports from Downloads.
              </p>
              <select
                value={defaultFormat}
                onChange={(e) =>
                  setDefaultFormat(e.target.value as "json" | "csv" | "ndjson")
                }
                className="mt-4 rounded-lg border border-ivory-200 bg-ivory-50 px-3 py-2 text-sm"
              >
                <option value="json">JSON (array of objects)</option>
                <option value="csv">CSV (spreadsheet)</option>
                <option value="ndjson">NDJSON (one JSON object per line)</option>
              </select>
              <ul className="mt-4 space-y-2 text-xs text-graphite-500">
                <li>
                  <strong className="text-graphite-700">JSON</strong> — best for apps and warehouses
                </li>
                <li>
                  <strong className="text-graphite-700">CSV</strong> — Excel, Sheets, BI tools
                </li>
                <li>
                  <strong className="text-graphite-700">NDJSON</strong> — streaming ETL pipelines
                </li>
              </ul>
            </Panel>

            {log.length > 0 && (
              <Panel>
                <h2 className="text-sm font-semibold text-graphite-900">Recent deliveries</h2>
                <ul className="mt-4 divide-y divide-ivory-100 text-sm">
                  {log.map((entry) => (
                    <li key={entry.id} className="flex justify-between gap-4 py-2.5">
                      <span className="font-mono text-xs text-graphite-600">
                        {entry.job_id.slice(0, 8)}…
                        <span className="ml-2 text-graphite-400">
                          {entry.channel}
                          {entry.channel === "webhook" ? ` · ${entry.event_type}` : ""}
                        </span>
                      </span>
                      <span
                        className={
                          entry.status === "delivered"
                            ? "text-emerald-600"
                            : entry.status === "failed"
                              ? "text-red-600"
                              : "text-graphite-500"
                        }
                      >
                        {entry.status}
                        {entry.last_error ? ` — ${entry.last_error}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
        )}
      </DashboardPage>
    </>
  );
}

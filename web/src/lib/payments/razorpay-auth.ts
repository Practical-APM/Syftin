export function getRazorpayAuthHeader(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay server keys are not configured.");
  }
  const token = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return `Basic ${token}`;
}

export async function razorpayApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: getRazorpayAuthHeader(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: { description?: string } }).error?.description ??
      `Razorpay API error (${res.status}).`;
    throw new Error(message);
  }

  return data as T;
}

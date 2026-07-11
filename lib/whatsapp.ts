/**
 * WhatsApp OTP delivery via the configured API endpoint.
 *
 * Required env variables:
 *   WHATSAPP_ENDPOINT          — base URL  e.g. https://wa.codeprompt.in
 *   WHATSAPP_KEY               — API key sent as X-Api-Key header
 *   WHATSAPP_SESSION_ID        — session ID used in the URL path
 *   WHATSAPP_OTP_TEMPLATE_ID   — template UUID
 *   WHATSAPP_OTP_TEMPLATE_NAME — template name slug
 *
 * API contract:
 *   POST {WHATSAPP_ENDPOINT}/api/sessions/{sessionId}/messages/send-template
 *   Headers: X-Api-Key: {WHATSAPP_KEY}
 *   Body:
 *   {
 *     "chatId":       "91XXXXXXXXXX@c.us",
 *     "templateId":   "{WHATSAPP_OTP_TEMPLATE_ID}",
 *     "templateName": "{WHATSAPP_OTP_TEMPLATE_NAME}",
 *     "vars": { "otp": "123456" }
 *   }
 */

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`[WhatsApp] Missing required env variable: ${key}`);
  return val;
}

interface WhatsAppErrorBody {
  message?: string;
  error?:   string;
}

export async function sendOtpWhatsApp(phone: string, otp: string): Promise<void> {
  const endpoint   = requireEnv("WHATSAPP_ENDPOINT");
  const apiKey     = requireEnv("WHATSAPP_KEY");
  const sessionId  = requireEnv("WHATSAPP_SESSION_ID");
  const templateId = requireEnv("WHATSAPP_OTP_TEMPLATE_ID");
  const templateName = requireEnv("WHATSAPP_OTP_TEMPLATE_NAME");

  // Phone must be digits only, country code prefixed (e.g. 919876543210)
  const normalizedPhone = phone.replace(/\D/g, "");

  const url  = `${endpoint}/api/sessions/${sessionId}/messages/send-template`;
  const body = {
    chatId:       `${normalizedPhone}@c.us`,
    templateId,
    templateName,
    vars: { otp },
  };

  const res = await fetch(url, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key":    apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const errBody = (await res.json()) as WhatsAppErrorBody;
      detail = errBody.message ?? errBody.error ?? "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(
      `[WhatsApp] Request failed — HTTP ${res.status}${detail ? `: ${detail}` : ""}`
    );
  }
}

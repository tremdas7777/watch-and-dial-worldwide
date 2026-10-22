const SAGACEPAY_BASE_URL = (
  process.env["SAGACEPAY_BASE_URL"] ?? "https://sagacepay.com/api"
).replace(/\/$/, "");

export const SAGACEPAY_AMOUNT = 137;
export const SAGACEPAY_PRODUCT_NAME = "Acesso WPP — 1 ano";

type SagacePayErrorPayload = {
  message?: unknown;
  statusCode?: unknown;
};

export type CreateSaleInput = {
  customer: {
    name?: string;
    document: string;
    email?: string;
    phone?: string;
  };
  externalId: string;
  idempotencyKey: string;
  tracking?: Record<string, string>;
  postbackUrl?: string;
};

export type SaleResponse = {
  id?: string;
  status?: string;
  amount?: number;
  pixCode?: string;
  pixQrCode?: string;
  transactionId?: string;
  [key: string]: unknown;
};

function getApiKey(): string {
  const apiKey = process.env["SAGACEPAY_API_KEY"];
  if (!apiKey) {
    throw new SagacePayConfigError("SAGACEPAY_API_KEY não está configurada no servidor.");
  }
  return apiKey;
}

export class SagacePayConfigError extends Error {
  readonly code = "SAGACEPAY_NOT_CONFIGURED";
}

export class SagacePayApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SagacePayApiError";
  }
}

async function parseApiResponse(response: Response): Promise<SaleResponse> {
  const raw = await response.text();
  let payload: SaleResponse & SagacePayErrorPayload = {};

  try {
    payload = (raw ? JSON.parse(raw) : {}) as SaleResponse & SagacePayErrorPayload;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message =
      typeof payload.message === "string"
        ? payload.message
        : `A SagacePay respondeu com HTTP ${response.status}.`;
    throw new SagacePayApiError(message, response.status);
  }

  return payload;
}

async function sagacePayRequest(path: string, init: RequestInit): Promise<SaleResponse> {
  const response = await fetch(`${SAGACEPAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
      ...(init.headers ?? {}),
    },
  });

  return parseApiResponse(response);
}

export async function createSagacePaySale(input: CreateSaleInput): Promise<SaleResponse> {
  const body: Record<string, unknown> = {
    amount: SAGACEPAY_AMOUNT,
    description: SAGACEPAY_PRODUCT_NAME,
    expirationInSeconds: 86400,
    externalId: input.externalId,
    customer: {
      document: input.customer.document,
      ...(input.customer.name ? { name: input.customer.name } : {}),
      ...(input.customer.email ? { email: input.customer.email } : {}),
      ...(input.customer.phone ? { phone: input.customer.phone } : {}),
    },
    items: [
      {
        description: SAGACEPAY_PRODUCT_NAME,
        quantity: 1,
        unitPrice: SAGACEPAY_AMOUNT,
        tangible: false,
      },
    ],
    ...(input.tracking && Object.keys(input.tracking).length > 0
      ? { tracking: input.tracking }
      : {}),
  };

  if (input.postbackUrl) body["postbackUrl"] = input.postbackUrl;

  return sagacePayRequest("/sales", {
    method: "POST",
    headers: {
      "idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify(body),
  });
}

export async function getSagacePaySale(id: string): Promise<SaleResponse> {
  return sagacePayRequest(`/sales/${encodeURIComponent(id)}`, { method: "GET" });
}

export function getWebhookSecret(): string {
  return process.env["SAGACEPAY_WEBHOOK_SECRET"] ?? "";
}

export function getPostbackUrl(): string | undefined {
  const value = process.env["SAGACEPAY_POSTBACK_URL"]?.trim();
  return value || undefined;
}

export function toPublicApiError(error: unknown): { message: string; status: number } {
  if (error instanceof SagacePayConfigError) {
    return {
      message:
        "O pagamento ainda não está configurado. Configure a integração SagacePay no servidor.",
      status: 503,
    };
  }

  if (error instanceof SagacePayApiError) {
    if (error.status === 401 || error.status === 403) {
      return {
        message: "A configuração da SagacePay foi rejeitada. Verifique a API key no servidor.",
        status: 502,
      };
    }
    if (error.status === 429) {
      return {
        message:
          "A SagacePay recebeu muitas tentativas. Aguarde alguns instantes e tente novamente.",
        status: 429,
      };
    }
    return { message: error.message, status: error.status >= 500 ? 502 : 400 };
  }

  return { message: "Não foi possível criar a cobrança PIX. Tente novamente.", status: 500 };
}

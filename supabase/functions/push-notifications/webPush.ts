// RFC 8292 (VAPID ES256) and RFC 8291 (aes128gcm) implementation over Web Crypto API.

const TEXT_ENCODER = new TextEncoder();

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface WebPushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface WebPushSendResult {
  ok: boolean;
  status: number;
  gone: boolean;
  error?: string;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(paddingLength);
  const binary = atob(padded);
  const output = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i);
  }
  return output;
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(new ArrayBuffer(totalLength));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function hmacSha256(
  keyBytes: Uint8Array<ArrayBuffer>,
  dataBytes: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", hmacKey, dataBytes);
  return new Uint8Array(signature);
}

export async function createVapidAuthorizationHeader(
  endpoint: string,
  vapid: VapidConfig,
  expirationSecondsFromNow = 12 * 60 * 60,
): Promise<string> {
  const publicKeyBytes = base64UrlDecode(vapid.publicKey.trim());
  const privateKeyBytes = base64UrlDecode(vapid.privateKey.trim());

  if (publicKeyBytes.byteLength !== 65 || publicKeyBytes[0] !== 0x04) {
    throw new Error("VAPID_PUBLIC_KEY deve ser uma chave P-256 descomprimida (65 bytes).");
  }
  if (privateKeyBytes.byteLength !== 32) {
    throw new Error("VAPID_PRIVATE_KEY deve ter 32 bytes em base64url.");
  }

  const x = base64UrlEncode(publicKeyBytes.subarray(1, 33));
  const y = base64UrlEncode(publicKeyBytes.subarray(33, 65));
  const d = base64UrlEncode(privateKeyBytes);

  const signingKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const audience = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + expirationSecondsFromNow;

  const headerPart = base64UrlEncode(
    TEXT_ENCODER.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  );
  const payloadPart = base64UrlEncode(
    TEXT_ENCODER.encode(
      JSON.stringify({ aud: audience, exp, sub: vapid.subject }),
    ),
  );
  const unsignedToken = `${headerPart}.${payloadPart}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    TEXT_ENCODER.encode(unsignedToken),
  );

  const jwt = `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
  return `vapid t=${jwt}, k=${vapid.publicKey.trim()}`;
}

export async function encryptWebPushPayload(
  payload: string | Uint8Array,
  subscriptionKeys: Pick<WebPushSubscriptionKeys, "p256dh" | "auth">,
  deterministic?: {
    asKeyPair: CryptoKeyPair;
    salt: Uint8Array<ArrayBuffer>;
  },
): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = base64UrlDecode(subscriptionKeys.p256dh);
  const authSecret = base64UrlDecode(subscriptionKeys.auth);

  if (uaPublic.byteLength !== 65 || uaPublic[0] !== 0x04) {
    throw new Error("Chave p256dh da inscrição inválida.");
  }
  if (authSecret.byteLength !== 16) {
    throw new Error("Segredo auth da inscrição inválido.");
  }

  const asKeyPair =
    deterministic?.asKeyPair ??
    (await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    ));

  const asPublic = new Uint8Array(
    await crypto.subtle.exportKey("raw", asKeyPair.publicKey),
  );

  const uaCryptoKey = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: uaCryptoKey },
      asKeyPair.privateKey,
      256,
    ),
  );

  const prkKey = await hmacSha256(authSecret, sharedSecret);
  const keyInfo = concatBytes(
    TEXT_ENCODER.encode("WebPush: info\x00"),
    uaPublic,
    asPublic,
    new Uint8Array([0x01]),
  );
  const ikm = await hmacSha256(prkKey, keyInfo);

  const salt =
    deterministic?.salt ??
    crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));

  const prk = await hmacSha256(salt, ikm);

  const cekFull = await hmacSha256(
    prk,
    concatBytes(
      TEXT_ENCODER.encode("Content-Encoding: aes128gcm\x00"),
      new Uint8Array([0x01]),
    ),
  );
  const cek = cekFull.slice(0, 16);

  const nonceFull = await hmacSha256(
    prk,
    concatBytes(
      TEXT_ENCODER.encode("Content-Encoding: nonce\x00"),
      new Uint8Array([0x01]),
    ),
  );
  const nonce = nonceFull.slice(0, 12);

  const payloadBytes =
    typeof payload === "string"
      ? TEXT_ENCODER.encode(payload)
      : new Uint8Array(payload);

  // RFC 8188 final record delimiter 0x02
  const plaintext = concatBytes(payloadBytes, new Uint8Array([0x02]));

  const cekKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      cekKey,
      plaintext,
    ),
  );

  // Header: salt (16) || rs = 4096 (4 BE) || idlen = 65 (1) || keyid (65)
  const recordSizeHeader = new Uint8Array([0x00, 0x00, 0x10, 0x00, 65]);
  return concatBytes(salt, recordSizeHeader, asPublic, ciphertext);
}

export async function sendWebPushNotification(
  subscription: WebPushSubscriptionKeys,
  payloadJson: string,
  vapid: VapidConfig,
  ttlSeconds = 86400,
): Promise<WebPushSendResult> {
  const [authorization, body] = await Promise.all([
    createVapidAuthorizationHeader(subscription.endpoint, vapid),
    encryptWebPushPayload(payloadJson, subscription),
  ]);

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      TTL: String(ttlSeconds),
      Urgency: "normal",
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
    },
    body,
  });

  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      gone: false,
    };
  }

  const errorText = await response.text().catch(() => "");
  const gone = response.status === 404 || response.status === 410;

  return {
    ok: false,
    status: response.status,
    gone,
    error: errorText
      ? `HTTP ${response.status}: ${errorText.slice(0, 200)}`
      : `HTTP ${response.status}`,
  };
}

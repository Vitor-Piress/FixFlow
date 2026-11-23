import assert from "node:assert/strict";
import { createDecipheriv, createECDH, createHmac, generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import {
  buildSnoozeUntilIso,
  formatBadgeCount,
  getNotificationStageBadgeMeta,
  inferDeviceLabel,
  isIosUserAgent,
  isNotificationSnoozed,
  partitionNotifications,
  urlBase64ToUint8Array,
} from "../../src/lib/notifications.ts";
import {
  buildWebPushMessages,
  filterEligibleAlertsForSlot,
  MAX_PUSH_NOTIFICATIONS_PER_RUN,
  type NotificationDigestCandidate,
} from "../../supabase/functions/push-notifications/summary.ts";
import {
  base64UrlDecode,
  base64UrlEncode,
  createVapidAuthorizationHeader,
  encryptWebPushPayload,
} from "../../supabase/functions/push-notifications/webPush.ts";

function decryptAes128GcmPayload(
  body: Uint8Array,
  uaPrivateKeyRaw: Buffer,
  uaPublicKeyRaw: Buffer,
  authSecret: Buffer,
): string {
  const salt = body.subarray(0, 16);
  const rs = body.subarray(16, 20).readUInt32BE(0);
  const idlen = body[20];
  assert.equal(rs, 4096);
  assert.equal(idlen, 65);

  const asPublic = body.subarray(21, 21 + idlen);
  const ciphertextAndTag = body.subarray(21 + idlen);
  const ciphertext = ciphertextAndTag.subarray(0, ciphertextAndTag.length - 16);
  const authTag = ciphertextAndTag.subarray(ciphertextAndTag.length - 16);

  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(uaPrivateKeyRaw);
  const sharedSecret = ecdh.computeSecret(asPublic);

  const prkKey = createHmac("sha256", authSecret).update(sharedSecret).digest();
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\x00", "utf8"),
    uaPublicKeyRaw,
    asPublic,
    Buffer.from([0x01]),
  ]);
  const ikm = createHmac("sha256", prkKey).update(keyInfo).digest();
  const prk = createHmac("sha256", salt).update(ikm).digest();

  const cek = createHmac("sha256", prk)
    .update(Buffer.from("Content-Encoding: aes128gcm\x00\x01", "utf8"))
    .digest()
    .subarray(0, 16);
  const nonce = createHmac("sha256", prk)
    .update(Buffer.from("Content-Encoding: nonce\x00\x01", "utf8"))
    .digest()
    .subarray(0, 12);

  const decipher = createDecipheriv("aes-128-gcm", cek, nonce);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  assert.equal(decrypted[decrypted.length - 1], 0x02);
  return decrypted.subarray(0, decrypted.length - 1).toString("utf8");
}

describe("notifications domain helpers", () => {
  it("decodes base64url VAPID key to Uint8Array", () => {
    const sample = new Uint8Array([4, 1, 2, 255, 254, 128]);
    const encoded = Buffer.from(sample).toString("base64url");
    const decoded = urlBase64ToUint8Array(encoded);
    assert.deepEqual(Array.from(decoded), Array.from(sample));
  });

  it("detects iOS user agents and infers readable device labels", () => {
    assert.equal(
      isIosUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15",
      ),
      true,
    );
    assert.equal(isIosUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X)", 5), true);
    assert.equal(isIosUserAgent("Mozilla/5.0 (X11; Linux x86_64)", 0), false);

    assert.equal(
      inferDeviceLabel(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Safari/604.1",
        true,
      ),
      "iPhone · App instalado",
    );
    assert.equal(
      inferDeviceLabel(
        "Mozilla/5.0 (Linux; Android 14) Chrome/131.0.0.0 Mobile Safari/537.36",
        false,
      ),
      "Android · Chrome",
    );
  });

  it("calculates snooze timestamp, checks expiry, and partitions alerts", () => {
    const base = new Date("2026-11-23T12:00:00.000Z");
    const snooze3 = buildSnoozeUntilIso(3, base);
    assert.equal(snooze3, "2026-11-26T12:00:00.000Z");
    assert.equal(isNotificationSnoozed(snooze3, Date.parse("2026-11-24T00:00:00.000Z")), true);
    assert.equal(isNotificationSnoozed(snooze3, Date.parse("2026-11-27T00:00:00.000Z")), false);

    const nowMs = Date.parse("2026-11-23T15:00:00.000Z");
    const partition = partitionNotifications(
      [
        { id: "1", read_at: null, snoozed_until: null, severity: "critical" },
        { id: "2", read_at: null, snoozed_until: null, severity: "warning" },
        { id: "3", read_at: "2026-11-23T10:00:00.000Z", snoozed_until: null, severity: "info" },
        { id: "4", read_at: null, snoozed_until: "2026-11-25T15:00:00.000Z", severity: "warning" },
      ],
      nowMs,
    );

    assert.equal(partition.active.length, 3);
    assert.equal(partition.snoozed.length, 1);
    assert.equal(partition.unreadCount, 2);
    assert.equal(partition.criticalUnreadCount, 1);
  });

  it("formats bell badge counters and stage badges", () => {
    assert.equal(formatBadgeCount(0), "");
    assert.equal(formatBadgeCount(4), "4");
    assert.equal(formatBadgeCount(12), "9+");
    assert.deepEqual(getNotificationStageBadgeMeta("overdue", "critical"), {
      label: "Atrasado",
      variant: "danger",
    });
    assert.deepEqual(
      getNotificationStageBadgeMeta("completed_unpaid", "warning"),
      {
        label: "Sem pagamento",
        variant: "warning",
      },
    );
  });
});

describe("Web Push digest filtering and summary", () => {
  const baseAlert: NotificationDigestCandidate = {
    id: "a1",
    dedupe_key: "finance_due:1",
    category: "finance_due",
    severity: "warning",
    stage: "due_today",
    stage_rank: 2,
    title: "Conta vence hoje: Energia",
    body: "Despesa de R$ 220,00 com vencimento hoje.",
    action_url: "/finance?month=2026-11&filter=pending",
    last_pushed_at: null,
    last_pushed_stage: null,
    last_pushed_slot_date: null,
    last_pushed_slot: null,
  };

  it("filters morning and evening eligible alerts without duplicate spam", () => {
    const alreadyPushedMorningCritical: NotificationDigestCandidate = {
      ...baseAlert,
      id: "a2",
      stage: "overdue",
      stage_rank: 3,
      severity: "critical",
      last_pushed_at: "2026-11-22T11:00:00.000Z",
      last_pushed_stage: "overdue",
      last_pushed_slot_date: "2026-11-22",
      last_pushed_slot: "morning",
    };
    const alreadyPushedTodayMorningStale: NotificationDigestCandidate = {
      ...baseAlert,
      id: "a3",
      category: "quote_stale",
      stage: "sent_stale",
      stage_rank: 2,
      last_pushed_at: "2026-11-23T11:00:00.000Z",
      last_pushed_stage: "sent_stale",
      last_pushed_slot_date: "2026-11-23",
      last_pushed_slot: "morning",
    };

    const morningEligible = filterEligibleAlertsForSlot(
      [baseAlert, alreadyPushedMorningCritical, alreadyPushedTodayMorningStale],
      "morning",
      "2026-11-23",
    );
    assert.deepEqual(
      morningEligible.map((item) => item.id),
      ["a1", "a2"],
    );

    const eveningEligible = filterEligibleAlertsForSlot(
      [
        {
          ...baseAlert,
          last_pushed_at: "2026-11-23T11:00:00.000Z",
          last_pushed_stage: "due_today",
          last_pushed_slot_date: "2026-11-23",
          last_pushed_slot: "morning",
        },
        alreadyPushedTodayMorningStale,
      ],
      "evening",
      "2026-11-23",
    );
    assert.deepEqual(
      eveningEligible.map((item) => item.id),
      ["a1"],
    );
  });

  it("sends individual notifications up to the cap of 5 and summarizes overflow in the 5th card", () => {
    assert.equal(MAX_PUSH_NOTIFICATIONS_PER_RUN, 5);
    assert.deepEqual(
      buildWebPushMessages([], 0, "morning", "2026-11-23"),
      [],
    );

    const threeAlerts: NotificationDigestCandidate[] = [
      baseAlert,
      {
        ...baseAlert,
        id: "c1",
        dedupe_key: "contract_due:1",
        category: "contract_due",
        title: "Clínica Vida: contrato vence hoje",
        body: "Mensalidade de R$ 1.500,00 prevista para hoje (23/11/2026).",
        action_url: "/finance?month=2026-11&filter=pending",
      },
      {
        ...baseAlert,
        id: "q1",
        dedupe_key: "quote_unpaid:1",
        category: "quote_unpaid",
        title: "Condomínio Sol & Mar ainda não pagou (#007)",
        body: "Serviço concluído há 2 dias, R$ 1.220,00 aguardando pagamento.",
        action_url: "/quotes/quote-1",
      },
    ];

    const directMessages = buildWebPushMessages(
      threeAlerts,
      4,
      "morning",
      "2026-11-23",
    );
    assert.equal(directMessages.length, 3);
    assert.deepEqual(directMessages[0], {
      title: baseAlert.title,
      body: baseAlert.body,
      url: baseAlert.action_url,
      tag: "fixflow-finance_due:1",
      badgeCount: 4,
      alertIds: ["a1"],
    });
    assert.equal(directMessages[2].title, "Condomínio Sol & Mar ainda não pagou (#007)");
    assert.equal(directMessages[2].url, "/quotes/quote-1");
    assert.deepEqual(directMessages[2].alertIds, ["q1"]);

    // Exact cap (5 alerts) -> 5 individual notifications without overflow card.
    const fiveAlerts: NotificationDigestCandidate[] = [
      ...threeAlerts,
      {
        ...baseAlert,
        id: "q2",
        dedupe_key: "quote_stale:2",
        category: "quote_stale",
        title: "Orçamento de João Silva em aberto há 8 dias (#008)",
        action_url: "/quotes/quote-2",
      },
      {
        ...baseAlert,
        id: "f2",
        dedupe_key: "finance_due:2",
        category: "finance_due",
        title: "Internet fibra: vence hoje",
      },
    ];
    const fiveMessages = buildWebPushMessages(
      fiveAlerts,
      5,
      "morning",
      "2026-11-23",
    );
    assert.equal(fiveMessages.length, 5);
    assert.equal(
      fiveMessages.every((msg) => msg.alertIds.length === 1),
      true,
    );

    // 7 alerts (> 5) -> 4 individual + 1 overflow card covering remaining 3.
    const sevenAlerts: NotificationDigestCandidate[] = [
      ...fiveAlerts,
      {
        ...baseAlert,
        id: "c2",
        dedupe_key: "contract_due:2",
        category: "contract_due",
        title: "Padaria Central: contrato a vencer",
      },
      {
        ...baseAlert,
        id: "q3",
        dedupe_key: "quote_stale:3",
        category: "quote_stale",
        title: "Rascunho de Maria em aberto há 4 dias (#009)",
      },
    ];

    const cappedMessages = buildWebPushMessages(
      sevenAlerts,
      7,
      "evening",
      "2026-11-23",
    );
    assert.equal(cappedMessages.length, 5);
    assert.deepEqual(
      cappedMessages.slice(0, 4).map((msg) => msg.alertIds),
      [["a1"], ["c1"], ["q1"], ["q2"]],
    );
    assert.deepEqual(cappedMessages[4], {
      title: "FixFlow: e mais 3 pendências",
      body: "1 vencimento, 1 contrato e 1 orçamento parado. Toque para ver na central.",
      url: "/?notifications=open",
      tag: "fixflow-overflow-2026-11-23-evening",
      badgeCount: 7,
      alertIds: ["f2", "c2", "q3"],
    });
  });
});

describe("RFC 8291 & RFC 8292 Web Push crypto", () => {
  it("encrypts payload decryptable with ECDH P-256 + aes128gcm and signs ES256 VAPID JWT", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
    });
    const publicJwk = publicKey.export({ format: "jwk" });
    const privateJwk = privateKey.export({ format: "jwk" });

    const vapidPublicRaw = Buffer.concat([
      Buffer.from([0x04]),
      Buffer.from(publicJwk.x!, "base64url"),
      Buffer.from(publicJwk.y!, "base64url"),
    ]);

    const vapidHeader = await createVapidAuthorizationHeader(
      "https://fcm.googleapis.com/fcm/send/sample-token",
      {
        publicKey: base64UrlEncode(vapidPublicRaw),
        privateKey: privateJwk.d!,
        subject: "mailto:contato@fixflow.app",
      },
    );

    assert.ok(vapidHeader.startsWith("vapid t="));
    const jwt = vapidHeader.split("t=")[1].split(",")[0];
    const [headerB64, claimsB64, sigB64] = jwt.split(".");
    const claims = JSON.parse(Buffer.from(claimsB64, "base64url").toString("utf8"));
    assert.equal(claims.aud, "https://fcm.googleapis.com");
    assert.equal(claims.sub, "mailto:contato@fixflow.app");

    const verifyKey = await crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", x: publicJwk.x, y: publicJwk.y, ext: true },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const sigValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      verifyKey,
      base64UrlDecode(sigB64),
      new TextEncoder().encode(`${headerB64}.${claimsB64}`),
    );
    assert.equal(sigValid, true);

    const ua = createECDH("prime256v1");
    ua.generateKeys();
    const authSecret = Buffer.from("0123456789abcdef0123456789abcdef", "hex");

    const samplePayload = JSON.stringify({
      title: "FixFlow",
      body: "Conta de R$ 150,00 vence hoje.",
      url: "/finance?month=2026-11&filter=pending",
    });

    const encrypted = await encryptWebPushPayload(samplePayload, {
      p256dh: ua.getPublicKey().toString("base64url"),
      auth: authSecret.toString("base64url"),
    });

    const decrypted = decryptAes128GcmPayload(
      Buffer.from(encrypted),
      ua.getPrivateKey(),
      ua.getPublicKey(),
      authSecret,
    );
    assert.equal(decrypted, samplePayload);
  });
});

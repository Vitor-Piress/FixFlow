import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQuotePaymentPixTxid,
  buildQuotePixTxid,
  computeCrc16Ccitt,
  extractPixCity,
  formatEmvTlv,
  formatPixAmountFromCents,
  formatPixMerchantName,
  generateQuoteStaticPix,
  generateStaticPix,
  normalizePixAsciiText,
  sanitizeAndValidatePixKey,
} from "../../src/lib/pix.ts";

function parseEmvTlv(payload: string): Map<string, string> {
  const tags = new Map<string, string>();
  let cursor = 0;

  while (cursor < payload.length) {
    const id = payload.slice(cursor, cursor + 2);
    const length = Number.parseInt(payload.slice(cursor + 2, cursor + 4), 10);
    assert.ok(/^\d{2}$/.test(id), `Invalid EMV tag id "${id}"`);
    assert.ok(
      Number.isInteger(length) && length >= 1,
      `Invalid EMV length for tag "${id}"`,
    );

    const valueStart = cursor + 4;
    const valueEnd = valueStart + length;
    assert.ok(
      valueEnd <= payload.length,
      `Tag "${id}" overflows payload length`,
    );

    tags.set(id, payload.slice(valueStart, valueEnd));
    cursor = valueEnd;
  }

  assert.equal(cursor, payload.length);
  return tags;
}

describe("computeCrc16Ccitt", () => {
  it("matches the official CCITT-FALSE check vector for 123456789", () => {
    assert.equal(computeCrc16Ccitt("123456789"), "29B1");
  });
});

describe("sanitizeAndValidatePixKey", () => {
  it("validates and strips mask from valid CPFs and rejects invalid or repeated ones", () => {
    assert.deepEqual(sanitizeAndValidatePixKey("529.982.247-25"), {
      key: "52998224725",
      type: "cpf",
    });
    assert.deepEqual(sanitizeAndValidatePixKey("  52998224725 "), {
      key: "52998224725",
      type: "cpf",
    });
    assert.equal(sanitizeAndValidatePixKey("111.111.111-11"), null);
    assert.equal(sanitizeAndValidatePixKey("529.982.247-00"), null);
    assert.equal(sanitizeAndValidatePixKey("489.999.988-88"), null);
  });

  it("validates and strips mask from valid CNPJs and rejects invalid ones", () => {
    assert.deepEqual(sanitizeAndValidatePixKey("12.345.678/0001-95"), {
      key: "12345678000195",
      type: "cnpj",
    });
    assert.deepEqual(sanitizeAndValidatePixKey("12345678000195"), {
      key: "12345678000195",
      type: "cnpj",
    });
    assert.equal(sanitizeAndValidatePixKey("11111111111111"), null);
    assert.equal(sanitizeAndValidatePixKey("12.345.678/0001-00"), null);
  });

  it("normalizes Brazilian phones to +55 format and rejects invalid numbers", () => {
    assert.deepEqual(sanitizeAndValidatePixKey("(48) 99999-8888"), {
      key: "+5548999998888",
      type: "phone",
    });
    assert.deepEqual(sanitizeAndValidatePixKey("+55 (48) 3222-4455"), {
      key: "+554832224455",
      type: "phone",
    });
    assert.deepEqual(sanitizeAndValidatePixKey("5548999998888"), {
      key: "+5548999998888",
      type: "phone",
    });
    assert.deepEqual(sanitizeAndValidatePixKey("48999998888"), {
      key: "+5548999998888",
      type: "phone",
    });
    assert.deepEqual(sanitizeAndValidatePixKey("4832224455"), {
      key: "+554832224455",
      type: "phone",
    });
    assert.equal(sanitizeAndValidatePixKey("99999999999"), null);
    assert.equal(sanitizeAndValidatePixKey("(00) 99999-8888"), null);
    assert.equal(sanitizeAndValidatePixKey("(48) 89999-8888"), null);
    assert.equal(sanitizeAndValidatePixKey("+1 555 123 4567"), null);
  });

  it("validates email and EVP UUID keys while preserving trimmed value", () => {
    assert.deepEqual(
      sanitizeAndValidatePixKey("  contato@climatech.com.br "),
      {
        key: "contato@climatech.com.br",
        type: "email",
      },
    );
    assert.equal(sanitizeAndValidatePixKey("invalido@"), null);
    assert.equal(
      sanitizeAndValidatePixKey(`${"a".repeat(70)}@test.com`),
      null,
    );

    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    assert.deepEqual(sanitizeAndValidatePixKey(` ${uuid} `), {
      key: uuid,
      type: "evp",
    });
  });

  it("rejects empty or non-key text strings", () => {
    assert.equal(sanitizeAndValidatePixKey(""), null);
    assert.equal(sanitizeAndValidatePixKey("   "), null);
    assert.equal(sanitizeAndValidatePixKey(null), null);
    assert.equal(sanitizeAndValidatePixKey("chave48999998888"), null);
  });
});

describe("ASCII normalization, city extraction, txid, and amount formatting", () => {
  it("normalizes accented merchant names and truncates at 25 characters", () => {
    assert.equal(
      normalizePixAsciiText("João & Maria Climatização!", 25),
      "JOAO MARIA CLIMATIZACAO",
    );
    assert.equal(
      formatPixMerchantName("Carlos Henrique da Silva Oliveira"),
      "CARLOS HENRIQUE DA SILVA",
    );
    assert.equal(
      formatPixMerchantName("   ", "ClimaTech Serviços Prediais"),
      "CLIMATECH SERVICOS PREDIA",
    );
    assert.equal(formatPixMerchantName("", "---"), "FIXFLOW");
  });

  it("extracts city before separator, normalizes up to 15 chars, and falls back to BRASIL", () => {
    assert.equal(extractPixCity("São José - SC"), "SAO JOSE");
    assert.equal(extractPixCity("Florianópolis/SC"), "FLORIANOPOLIS");
    assert.equal(extractPixCity("São Bernardo do Campo - SP"), "SAO BERNARDO DO");
    assert.equal(extractPixCity(""), "BRASIL");
    assert.equal(extractPixCity(null), "BRASIL");
  });

  it("builds padded alphanumeric quote txid and falls back to ***", () => {
    assert.equal(buildQuotePixTxid(42), "FIXFLOW0042");
    assert.equal(buildQuotePixTxid(7), "FIXFLOW0007");
    assert.equal(buildQuotePixTxid(0), "***");
    assert.equal(buildQuotePixTxid(-3), "***");
    assert.equal(buildQuotePixTxid(Number.NaN), "***");
  });

  it("formats positive integer cents to decimal Pix string", () => {
    assert.equal(formatPixAmountFromCents(15000), "150.00");
    assert.equal(formatPixAmountFromCents(5), "0.05");
    assert.equal(formatPixAmountFromCents(0), null);
    assert.equal(formatPixAmountFromCents(-100), null);
    assert.equal(formatPixAmountFromCents(12.5), null);
  });
});

describe("generateStaticPix & generateQuoteStaticPix", () => {
  it("returns null when pix_key is missing/invalid or total_cents <= 0", () => {
    assert.equal(
      generateStaticPix({
        pixKey: "",
        merchantName: "Carlos",
        merchantCity: "São José - SC",
        totalCents: 15000,
      }),
      null,
    );
    assert.equal(
      generateStaticPix({
        pixKey: "chave-invalida",
        merchantName: "Carlos",
        merchantCity: "São José - SC",
        totalCents: 15000,
      }),
      null,
    );
    assert.equal(
      generateStaticPix({
        pixKey: "12.345.678/0001-95",
        merchantName: "Carlos",
        merchantCity: "São José - SC",
        totalCents: 0,
      }),
      null,
    );
    assert.equal(
      generateQuoteStaticPix({ quote_number: 7, total_cents: 122000 }, null),
      null,
    );
  });

  it("generates a valid EMVCo TLV BR Code with verified nested tags and CRC16", () => {
    const result = generateQuoteStaticPix(
      { quote_number: 7, total_cents: 122000 },
      {
        pix_key: "12.345.678/0001-95",
        owner_name: "Carlos Henrique Silva",
        business_name: "ClimaTech Serviços Prediais",
        city_state: "São José - SC",
      },
    );

    assert.ok(result !== null);
    assert.equal(result.pixKey, "12345678000195");
    assert.equal(result.pixKeyType, "cnpj");
    assert.equal(result.merchantName, "CARLOS HENRIQUE SILVA");
    assert.equal(result.merchantCity, "SAO JOSE");
    assert.equal(result.amount, "1220.00");
    assert.equal(result.txid, "FIXFLOW0007");

    const topTags = parseEmvTlv(result.payload);
    assert.equal(topTags.get("00"), "01");
    assert.equal(topTags.get("52"), "0000");
    assert.equal(topTags.get("53"), "986");
    assert.equal(topTags.get("54"), "1220.00");
    assert.equal(topTags.get("58"), "BR");
    assert.equal(topTags.get("59"), "CARLOS HENRIQUE SILVA");
    assert.equal(topTags.get("60"), "SAO JOSE");

    const tag26 = parseEmvTlv(topTags.get("26") ?? "");
    assert.equal(tag26.get("00"), "br.gov.bcb.pix");
    assert.equal(tag26.get("01"), "12345678000195");

    const tag62 = parseEmvTlv(topTags.get("62") ?? "");
    assert.equal(tag62.get("05"), "FIXFLOW0007");

    const crcTagValue = topTags.get("63");
    assert.ok(crcTagValue && /^[0-9A-F]{4}$/.test(crcTagValue));
    const expectedCrc = computeCrc16Ccitt(result.payload.slice(0, -4));
    assert.equal(crcTagValue, expectedCrc);
    assert.equal(result.payload.endsWith(`6304${expectedCrc}`), true);
  });

  it("throws when EMV TLV value byte length exceeds 99", () => {
    assert.throws(() => formatEmvTlv("01", "a".repeat(100)), RangeError);
  });

  it("generates installment-specific Pix payload for the next unpaid installment", () => {
    assert.equal(buildQuotePaymentPixTxid(7, 2), "FIXFLOW0007P2");

    const result = generateQuoteStaticPix(
      {
        quote_number: 7,
        total_cents: 122000,
        payments: [
          {
            installment_number: 1,
            label: "Entrada (50%)",
            amount_cents: 61000,
            due_date: "2026-11-20",
            status: "paid",
          },
          {
            installment_number: 2,
            label: "Saldo (50%)",
            amount_cents: 61000,
            due_date: "2026-12-05",
            status: "pending",
          },
        ],
      },
      {
        pix_key: "12.345.678/0001-95",
        owner_name: "Carlos Henrique Silva",
        business_name: "ClimaTech Serviços Prediais",
        city_state: "São José - SC",
      },
    );

    assert.ok(result !== null);
    assert.equal(result.amount, "610.00");
    assert.equal(result.txid, "FIXFLOW0007P2");
    assert.deepEqual(result.targetPayment, {
      installment_number: 2,
      label: "Saldo (50%)",
      amount_cents: 61000,
      due_date: "2026-12-05",
    });

    const tags = parseEmvTlv(result.payload);
    assert.equal(tags.get("54"), "610.00");
    assert.equal(parseEmvTlv(tags.get("62") ?? "").get("05"), "FIXFLOW0007P2");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DOCUMENT_INPUT_MAX_LENGTH,
  isValidDocumentBR,
  isValidPhoneBR,
  maskDocumentBR,
  maskPhoneBR,
  PHONE_INPUT_MAX_LENGTH,
} from "../../src/lib/masks.ts";

describe("maskPhoneBR", () => {
  it("formats landline (10 digits) and mobile (11 digits) progressively", () => {
    assert.equal(maskPhoneBR(""), "");
    assert.equal(maskPhoneBR("48"), "(48");
    assert.equal(maskPhoneBR("48322"), "(48) 322");
    assert.equal(maskPhoneBR("4832224455"), "(48) 3222-4455");
    assert.equal(maskPhoneBR("48999998888"), "(48) 99999-8888");
    assert.equal(maskPhoneBR("48999998888").length, PHONE_INPUT_MAX_LENGTH);
  });

  it("caps extra characters and strips country code 55 on paste", () => {
    assert.equal(maskPhoneBR("4899999888812345"), "(48) 99999-8888");
    assert.equal(maskPhoneBR("+55 (48) 99999-8888"), "(48) 99999-8888");
    assert.equal(maskPhoneBR("554832224455"), "(48) 3222-4455");
    assert.equal(maskPhoneBR("abc48def99999ghi8888"), "(48) 99999-8888");
  });

  it("validates empty, 10-digit, and 11-digit phones", () => {
    assert.equal(isValidPhoneBR(""), true);
    assert.equal(isValidPhoneBR("(48) 3222-4455"), true);
    assert.equal(isValidPhoneBR("(48) 99999-8888"), true);
    assert.equal(isValidPhoneBR("5548999998888"), true);
    assert.equal(isValidPhoneBR("(48) 9999"), false);
    assert.equal(isValidPhoneBR("48999998888123"), false);
  });
});

describe("maskDocumentBR", () => {
  it("formats CPF up to 11 digits and switches to CNPJ for 12-14 digits", () => {
    assert.equal(maskDocumentBR(""), "");
    assert.equal(maskDocumentBR("123"), "123");
    assert.equal(maskDocumentBR("123456"), "123.456");
    assert.equal(maskDocumentBR("12345678901"), "123.456.789-01");
    assert.equal(maskDocumentBR("123456780001"), "12.345.678/0001");
    assert.equal(maskDocumentBR("12345678000195"), "12.345.678/0001-95");
    assert.equal(
      maskDocumentBR("12345678000195").length,
      DOCUMENT_INPUT_MAX_LENGTH,
    );
  });

  it("caps document input at 14 digits", () => {
    assert.equal(
      maskDocumentBR("123456780001959999"),
      "12.345.678/0001-95",
    );
  });

  it("validates empty, 11-digit CPF, and 14-digit CNPJ", () => {
    assert.equal(isValidDocumentBR(""), true);
    assert.equal(isValidDocumentBR("123.456.789-01"), true);
    assert.equal(isValidDocumentBR("12.345.678/0001-95"), true);
    assert.equal(isValidDocumentBR("123.456.789"), false);
    assert.equal(isValidDocumentBR("12.345.678/0001"), false);
  });
});

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { parseSecrets, verifySignature } from "./signature.ts";

const TEST_SECRET = "a".repeat(64);
const PROD_SECRET = "b".repeat(64);

function sign(manifest: string, secret: string, ts = "1742505638683") {
  const v1 = createHmac("sha256", secret).update(manifest.replace("%TS%", ts)).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

const input = (xSignature: string | null, dataId: string | null = "123456", xRequestId: string | null = "req-1") => ({
  xSignature,
  xRequestId,
  dataId,
});

const STANDARD = "id:123456;request-id:req-1;ts:%TS%;";

describe("claves secretas", () => {
  it("parseSecrets separa por coma y limpia espacios", () => {
    assert.deepEqual(parseSecrets(" a , b\n"), ["a", "b"]);
    assert.deepEqual(parseSecrets("solo"), ["solo"]);
    assert.deepEqual(parseSecrets(""), []);
    assert.deepEqual(parseSecrets(undefined), []);
    assert.deepEqual(parseSecrets(",,"), []);
  });
});

describe("verificación de firma", () => {
  it("acepta una firma correcta", () => {
    const r = verifySignature(input(sign(STANDARD, TEST_SECRET)), [TEST_SECRET]);
    assert.deepEqual(r, { valid: true, secretIndex: 0 });
  });

  it("con dos claves (prueba y producción) acepta la firma de cualquiera de las dos", () => {
    const secrets = [TEST_SECRET, PROD_SECRET];
    assert.deepEqual(verifySignature(input(sign(STANDARD, TEST_SECRET)), secrets), { valid: true, secretIndex: 0 });
    assert.deepEqual(verifySignature(input(sign(STANDARD, PROD_SECRET)), secrets), { valid: true, secretIndex: 1 });
  });

  it("rechaza una clave equivocada e informa que ningún armado alternativo coincide", () => {
    const r = verifySignature(input(sign(STANDARD, "otra".repeat(16))), [TEST_SECRET]);
    assert.equal(r.valid, false);
    if (r.valid) return;
    assert.equal(r.reason, "SignatureMismatch");
    assert.equal(r.diagnostics.matchedVariant, null);
    assert.deepEqual(r.diagnostics.secretLengths, [64]);
    assert.equal(r.diagnostics.hasDataId, true);
    assert.equal(r.diagnostics.hasRequestId, true);
    assert.equal(r.diagnostics.tsDigits, 13);
  });

  it("si la clave es correcta pero el texto firmado se armó distinto, lo detecta (no es la clave)", () => {
    const sinRequestId = sign("id:123456;ts:%TS%;", TEST_SECRET);
    const r = verifySignature(input(sinRequestId), [TEST_SECRET]);
    assert.equal(r.valid, false);
    if (r.valid) return;
    assert.equal(r.diagnostics.matchedVariant, "sin-request-id");

    const enSegundos = sign("id:123456;request-id:req-1;ts:1742505638;", TEST_SECRET);
    const r2 = verifySignature(input(enSegundos.replace(/ts=\d+/, "ts=1742505638683")), [TEST_SECRET]);
    assert.equal(r2.valid, false);
    if (!r2.valid) assert.equal(r2.diagnostics.matchedVariant, "ts-en-segundos");
  });

  it("no revela la clave ni la firma en el diagnóstico", () => {
    const r = verifySignature(input(sign(STANDARD, "otra".repeat(16))), [TEST_SECRET]);
    const dump = JSON.stringify(r);
    assert.ok(!dump.includes(TEST_SECRET) && !dump.includes("v1="));
  });

  it("encabezado ausente o mal formado", () => {
    const missing = verifySignature(input(null), [TEST_SECRET]);
    assert.ok(!missing.valid && missing.reason === "MissingSignatureHeader");
    const malformed = verifySignature(input("cualquier-cosa"), [TEST_SECRET]);
    assert.ok(!malformed.valid && malformed.reason === "MalformedSignatureHeader");
  });

  it("un data.id distinto al firmado invalida la firma", () => {
    const r = verifySignature(input(sign(STANDARD, TEST_SECRET), "999"), [TEST_SECRET]);
    assert.equal(r.valid, false);
  });
});

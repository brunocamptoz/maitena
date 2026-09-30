import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { serverEnv } from "./env.ts";

describe("serverEnv", () => {
  const withEnv = (value: string | undefined, fn: () => void) => {
    const before = process.env.TEST_ENV_VALUE;
    if (value === undefined) delete process.env.TEST_ENV_VALUE;
    else process.env.TEST_ENV_VALUE = value;
    try {
      fn();
    } finally {
      if (before === undefined) delete process.env.TEST_ENV_VALUE;
      else process.env.TEST_ENV_VALUE = before;
    }
  };

  it("limpia espacios y saltos de línea de más", () => {
    withEnv("  abc123\n", () => assert.equal(serverEnv("TEST_ENV_VALUE"), "abc123"));
    withEnv("abc123\r\n", () => assert.equal(serverEnv("TEST_ENV_VALUE"), "abc123"));
  });

  it("quita comillas que envuelven el valor", () => {
    withEnv('"abc123"', () => assert.equal(serverEnv("TEST_ENV_VALUE"), "abc123"));
    withEnv("'abc123' ", () => assert.equal(serverEnv("TEST_ENV_VALUE"), "abc123"));
  });

  it("no toca comillas internas", () => {
    withEnv('ab"c', () => assert.equal(serverEnv("TEST_ENV_VALUE"), 'ab"c'));
  });

  it("vacío o inexistente = undefined", () => {
    withEnv("", () => assert.equal(serverEnv("TEST_ENV_VALUE"), undefined));
    withEnv("   ", () => assert.equal(serverEnv("TEST_ENV_VALUE"), undefined));
    withEnv(undefined, () => assert.equal(serverEnv("TEST_ENV_VALUE"), undefined));
  });
});

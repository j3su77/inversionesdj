import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  activeIdentificationKey,
  parseClientIdentification,
} from "./client-identification";

describe("activeIdentificationKey", () => {
  it("maps document number to string key", () => {
    assert.equal(activeIdentificationKey(123456789), "123456789");
  });
});

describe("parseClientIdentification", () => {
  it("accepts positive integers", () => {
    assert.equal(parseClientIdentification(123456), 123456);
    assert.equal(parseClientIdentification("987654"), 987654);
  });

  it("rejects invalid values", () => {
    assert.equal(parseClientIdentification(0), null);
    assert.equal(parseClientIdentification(-1), null);
    assert.equal(parseClientIdentification("abc"), null);
    assert.equal(parseClientIdentification(""), null);
    assert.equal(parseClientIdentification(undefined), null);
    assert.equal(parseClientIdentification(1.5), null);
  });
});

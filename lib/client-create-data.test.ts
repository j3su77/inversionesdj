import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseClientCreateBody } from "./client-create-data";

describe("parseClientCreateBody", () => {
  it("parses a minimal valid payload", () => {
    const result = parseClientCreateBody({
      fullName: " Juan Pérez ",
      identification: "100200300",
      nationality: "Colombia",
      dateOfBirth: "1990-05-15T00:00:00.000Z",
      placeOfBirth: "Bogotá",
      isDisallowed: false,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.fullName, "Juan Pérez");
    assert.equal(result.data.identification, 100200300);
    assert.equal(result.data.nationality, "Colombia");
    assert.equal(result.data.placeOfBirth, "Bogotá");
    assert.equal(result.data.isDisallowed, false);
  });

  it("requires fullName and identification", () => {
    const noName = parseClientCreateBody({
      identification: 1,
      dateOfBirth: "1990-01-01",
    });
    assert.equal(noName.ok, false);

    const noId = parseClientCreateBody({
      fullName: "Test",
      dateOfBirth: "1990-01-01",
    });
    assert.equal(noId.ok, false);
  });

  it("rejects invalid dateOfBirth", () => {
    const result = parseClientCreateBody({
      fullName: "Test",
      identification: 123,
      dateOfBirth: "invalid",
    });
    assert.equal(result.ok, false);
  });
});

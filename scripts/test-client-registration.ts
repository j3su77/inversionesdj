/**
 * Prueba de integración: alta, duplicado, soft delete y re-alta con el mismo documento.
 *
 * Uso: npm run test:clients
 * Requiere DATABASE_URL en .env (usa IDs de prueba altos para no chocar con datos reales).
 */
import { strict as assert } from "node:assert";
import { db } from "../lib/db";
import {
  activeIdentificationKey,
  findActiveClientByIdentification,
  isIdentificationAvailableForNewClient,
} from "../lib/client-identification";
import { parseClientCreateBody } from "../lib/client-create-data";

const TEST_IDENTIFICATION = 9_900_001;

function sampleBody(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Cliente Prueba Registro",
    identification: TEST_IDENTIFICATION,
    nationality: "Test",
    dateOfBirth: "1990-01-15T00:00:00.000Z",
    placeOfBirth: "Test City",
    isDisallowed: false,
    ...overrides,
  };
}

async function cleanup() {
  await db.client.deleteMany({
    where: { identification: TEST_IDENTIFICATION },
  });
}

async function run() {
  console.log("→ Limpieza inicial…");
  await cleanup();

  const parsed = parseClientCreateBody(sampleBody());
  assert.equal(parsed.ok, true, "payload de prueba debe ser válido");
  if (!parsed.ok) return;

  console.log("→ Crear cliente activo…");
  const created = await db.client.create({ data: parsed.data });
  assert.equal(created.identification, TEST_IDENTIFICATION);
  assert.equal(
    created.activeIdentificationKey,
    activeIdentificationKey(TEST_IDENTIFICATION),
  );
  assert.equal(created.deletedAt, null);

  const active = await findActiveClientByIdentification(TEST_IDENTIFICATION);
  assert.ok(active);
  assert.equal(await isIdentificationAvailableForNewClient(TEST_IDENTIFICATION), false);

  console.log("→ Duplicado activo debe fallar (unique lógico)…");
  let duplicateBlocked = false;
  try {
    await db.client.create({ data: parsed.data });
  } catch {
    duplicateBlocked = true;
  }
  assert.equal(duplicateBlocked, true, "no debe permitir dos activos con mismo documento");

  console.log("→ Soft delete…");
  const deletedAt = new Date("2026-01-01T12:00:00.000Z");
  await db.client.update({
    where: { id: created.id },
    data: {
      deletedAt,
      activeIdentificationKey: null,
      status: "INACTIVE",
    },
  });

  assert.equal(
    await isIdentificationAvailableForNewClient(TEST_IDENTIFICATION),
    true,
    "tras eliminar, el documento debe estar disponible",
  );
  assert.equal(await findActiveClientByIdentification(TEST_IDENTIFICATION), null);

  console.log("→ Re-crear con el mismo documento…");
  const recreated = await db.client.create({ data: parsed.data });
  assert.equal(recreated.identification, TEST_IDENTIFICATION);
  assert.equal(recreated.deletedAt, null);
  assert.notEqual(recreated.id, created.id);

  console.log("→ Limpieza final…");
  await cleanup();

  console.log("\n✓ Todas las pruebas de registro pasaron.");
}

run()
  .catch((err) => {
    console.error("\n✗ Falló la prueba de registro:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

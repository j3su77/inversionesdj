/**
 * Rellena activeIdentificationKey en clientes activos existentes (una sola vez tras migrar).
 * Uso: npx tsx scripts/backfill-active-identification-key.ts
 */
import { db } from "../lib/db";

async function main() {
  const active = await db.client.findMany({
    where: { deletedAt: null },
    select: { id: true, identification: true, activeIdentificationKey: true },
  });

  const byIdentification = new Map<number, typeof active>();
  for (const row of active) {
    const list = byIdentification.get(row.identification) ?? [];
    list.push(row);
    byIdentification.set(row.identification, list);
  }

  let updated = 0;
  let duplicateGroups = 0;

  for (const [identification, rows] of byIdentification) {
    const canonicalKey = String(identification);
    if (rows.length > 1) {
      duplicateGroups++;
      console.warn(
        `⚠ Documento ${identification} tiene ${rows.length} clientes activos; solo uno recibe la clave canónica. Revise manualmente.`,
      );
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const key = i === 0 ? canonicalKey : `${canonicalKey}-dup-${row.id.slice(0, 8)}`;
      if (row.activeIdentificationKey === key) continue;
      await db.client.update({
        where: { id: row.id },
        data: { activeIdentificationKey: key },
      });
      updated++;
    }
  }

  console.log(
    `Clientes activos: ${active.length}, actualizados: ${updated}, grupos duplicados: ${duplicateGroups}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

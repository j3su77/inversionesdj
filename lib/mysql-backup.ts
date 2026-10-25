import { spawn } from "child_process";

export type MysqlConnectionParams = {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  socketPath?: string;
};

export function parseMysqlDatabaseUrl(databaseUrl: string): MysqlConnectionParams {
  const parsed = new URL(databaseUrl);
  const database = parsed.pathname.replace(/^\//, "").split("?")[0];

  if (!database) {
    throw new Error("DATABASE_URL no incluye nombre de base de datos");
  }

  if (parsed.protocol !== "mysql:") {
    throw new Error(
      "La copia desde la app solo está soportada con conexión mysql:// directa (no Prisma Accelerate)"
    );
  }

  const host = parsed.hostname;
  const socket = parsed.searchParams.get("socket");

  return {
    host: socket ? host : mysqldumpTcpHost(host),
    port: parsed.port || "3306",
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    ...(socket ? { socketPath: socket } : {}),
  };
}

/** localhost hace que el cliente MySQL use el socket Unix; Prisma suele ir por TCP. */
function mysqldumpTcpHost(host: string) {
  if (host === "localhost" || host === "::1") {
    return "127.0.0.1";
  }
  return host;
}

export function createMysqlDump(params: MysqlConnectionParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const args = params.socketPath
      ? [
          `--socket=${params.socketPath}`,
          `--user=${params.user}`,
        ]
      : [
          `--host=${params.host}`,
          `--port=${params.port}`,
          `--protocol=TCP`,
          `--user=${params.user}`,
        ];

    const proc = spawn(
      "mysqldump",
      [
        ...args,
        "--single-transaction",
        "--routines",
        "--triggers",
        "--set-gtid-purged=OFF",
        params.database,
      ],
      {
        env: { ...process.env, MYSQL_PWD: params.password },
      }
    );

    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    proc.on("error", (err) => {
      if ("code" in err && err.code === "ENOENT") {
        reject(
          new Error(
            "mysqldump no está instalado en el servidor. Instálalo o haz la copia desde el panel de MySQL."
          )
        );
        return;
      }
      reject(err);
    });

    proc.on("close", (code) => {
      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
      if (code !== 0) {
        reject(
          new Error(stderr || `mysqldump terminó con código ${code ?? "desconocido"}`)
        );
        return;
      }
      if (stderr) {
        console.warn("[MYSQL_BACKUP]", stderr);
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

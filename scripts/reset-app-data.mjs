#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const CONTRACT_PDF_BUCKET = "contract-pdfs";
const STORAGE_PAGE_SIZE = 100;
const STORAGE_DELETE_BATCH_SIZE = 100;

/**
 * Operational tables cleared in FK- and trigger-safe order.
 * Deleting `quotes` before `quote_items`/`quote_payments` lets PostgreSQL
 * cascade cleanly without re-firing quote payment recalculation triggers.
 */
const TABLES_TO_CLEAR = [
  "notifications",
  "financial_transactions",
  "quotes",
  "quote_payments",
  "quote_items",
  "contracts",
  "recurring_expenses",
  "materials",
  "services",
  "suppliers",
  "clients",
];

const PRESERVED_TABLES = [
  "business_profile",
  "notification_preferences",
  "push_subscriptions",
];

function printHelp() {
  console.log(`
FixFlow — Limpeza de dados operacionais (preserva usuário, perfil e preferências)

Uso:
  npm run reset:data -- --dry-run   Lista o que seria apagado sem alterar nada
  npm run reset:data                Executa a limpeza após confirmação interativa

Variáveis opcionais para evitar digitar credenciais:
  FIXFLOW_RESET_EMAIL
  FIXFLOW_RESET_PASSWORD

Notas:
  - Usa apenas VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do ambiente/.env.local.
  - Preserva auth.users, business_profile, notification_preferences e push_subscriptions.
  - Remove também todos os arquivos do bucket privado "${CONTRACT_PDF_BUCKET}".
  - Para zerar a numeração sequencial de orçamentos (#001), execute scripts/reset-app-data.sql
    no SQL Editor do Supabase.
`);
}

function loadEnvFromFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function promptLine(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptPassword(question) {
  if (!process.stdin.isTTY) {
    return promptLine(question);
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let value = "";

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    function cleanup() {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    }

    function onData(chunk) {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup();
          stdout.write("\n");
          reject(new Error("Operação cancelada pelo usuário."));
          return;
        }

        if (char === "\r" || char === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(value);
          return;
        }

        if (char === "\u007f" || char === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }

        if (char >= " ") {
          value += char;
          stdout.write("*");
        }
      }
    }

    stdin.on("data", onData);
  });
}

async function countTableRows(supabase, tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(`Falha ao contar "${tableName}": ${error.message}`);
  }

  return count ?? 0;
}

async function listBucketFilesRecursive(supabase, prefix = "") {
  const paths = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(CONTRACT_PDF_BUCKET)
      .list(prefix, {
        limit: STORAGE_PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      throw new Error(
        `Falha ao listar arquivos em "${CONTRACT_PDF_BUCKET}/${prefix}": ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        const nested = await listBucketFilesRecursive(supabase, fullPath);
        paths.push(...nested);
      } else {
        paths.push(fullPath);
      }
    }

    if (data.length < STORAGE_PAGE_SIZE) {
      break;
    }

    offset += STORAGE_PAGE_SIZE;
  }

  return paths;
}

async function collectContractPdfPaths(supabase) {
  const uniquePaths = new Set();

  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("pdf_path")
    .not("pdf_path", "is", null);

  if (error) {
    throw new Error(`Falha ao consultar pdf_path de contracts: ${error.message}`);
  }

  for (const row of contracts ?? []) {
    if (typeof row.pdf_path === "string" && row.pdf_path.trim() !== "") {
      uniquePaths.add(row.pdf_path.trim());
    }
  }

  const bucketFiles = await listBucketFilesRecursive(supabase);
  for (const filePath of bucketFiles) {
    uniquePaths.add(filePath);
  }

  return Array.from(uniquePaths);
}

async function removeBucketFiles(supabase, filePaths) {
  let removed = 0;

  for (let i = 0; i < filePaths.length; i += STORAGE_DELETE_BATCH_SIZE) {
    const batch = filePaths.slice(i, i + STORAGE_DELETE_BATCH_SIZE);
    const { error } = await supabase.storage
      .from(CONTRACT_PDF_BUCKET)
      .remove(batch);

    if (error) {
      throw new Error(
        `Falha ao remover arquivos do bucket "${CONTRACT_PDF_BUCKET}": ${error.message}`,
      );
    }

    removed += batch.length;
  }

  return removed;
}

async function clearTable(supabase, tableName) {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .not("id", "is", null);

  if (error) {
    throw new Error(`Falha ao limpar "${tableName}": ${error.message}`);
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--help") || args.has("-h")) {
    printHelp();
    return;
  }

  const isDryRun = args.has("--dry-run");
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..");

  loadEnvFromFile(path.join(projectRoot, ".env.local"));
  loadEnvFromFile(path.join(projectRoot, ".env"));

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausente. Configure .env.local antes de executar.",
    );
  }

  const email =
    process.env.FIXFLOW_RESET_EMAIL?.trim() ||
    (await promptLine("E-mail da conta FixFlow: "));
  if (!email) {
    throw new Error("E-mail não informado.");
  }

  const password =
    process.env.FIXFLOW_RESET_PASSWORD ||
    (await promptPassword("Senha da conta FixFlow: "));
  if (!password) {
    throw new Error("Senha não informada.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (authError || !authData.user) {
    throw new Error(
      `Falha ao autenticar no Supabase Auth: ${authError?.message ?? "sessão indisponível"}`,
    );
  }

  try {
    const { data: profile } = await supabase
      .from("business_profile")
      .select("business_name, owner_name")
      .eq("id", 1)
      .maybeSingle();

    const operationalCounts = new Map();
    for (const table of TABLES_TO_CLEAR) {
      operationalCounts.set(table, await countTableRows(supabase, table));
    }

    const preservedCounts = new Map();
    for (const table of PRESERVED_TABLES) {
      preservedCounts.set(table, await countTableRows(supabase, table));
    }

    const pdfPaths = await collectContractPdfPaths(supabase);
    const totalOperationalRows = Array.from(operationalCounts.values()).reduce(
      (sum, count) => sum + count,
      0,
    );

    console.log("\n=== Dados que serão PRESERVADOS ===");
    console.log(`- Conta Auth: ${authData.user.email}`);
    if (profile) {
      console.log(
        `- business_profile: ${profile.business_name || "(sem nome comercial)"} · ${profile.owner_name || "(sem titular)"}`,
      );
    }
    for (const [table, count] of preservedCounts) {
      console.log(`- ${table}: ${count} registro(s)`);
    }

    console.log("\n=== Dados operacionais encontrados para LIMPEZA ===");
    for (const [table, count] of operationalCounts) {
      console.log(`- ${table}: ${count} registro(s)`);
    }
    console.log(
      `- Storage (${CONTRACT_PDF_BUCKET}): ${pdfPaths.length} arquivo(s) PDF`,
    );

    if (isDryRun) {
      console.log("\n[dry-run] Nenhuma alteração foi feita.");
      return;
    }

    if (totalOperationalRows === 0 && pdfPaths.length === 0) {
      console.log("\nO banco e o bucket já estão limpos. Nada a fazer.");
      return;
    }

    const confirmation = await promptLine(
      '\nEsta ação apagará permanentemente os dados operacionais acima.\nDigite "LIMPAR" para confirmar: ',
    );

    if (confirmation !== "LIMPAR") {
      console.log("Operação cancelada. Nenhum dado foi removido.");
      return;
    }

    console.log("\nExecutando limpeza...");

    if (pdfPaths.length > 0) {
      const removedPdfs = await removeBucketFiles(supabase, pdfPaths);
      console.log(
        `- Removidos ${removedPdfs} arquivo(s) de "${CONTRACT_PDF_BUCKET}".`,
      );
    }

    for (const table of TABLES_TO_CLEAR) {
      await clearTable(supabase, table);
    }

    let remainingOperationalRows = 0;
    for (const table of TABLES_TO_CLEAR) {
      remainingOperationalRows += await countTableRows(supabase, table);
    }

    console.log(
      `\nLimpeza concluída. Registros operacionais restantes: ${remainingOperationalRows}.`,
    );
    console.log(
      "Preservados: auth.users, business_profile, notification_preferences e push_subscriptions.",
    );
    console.log(
      "Dica: se quiser reiniciar a numeração de orçamentos para #001, rode scripts/reset-app-data.sql no SQL Editor do Supabase.",
    );
  } finally {
    await supabase.auth.signOut();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nErro: ${message}`);
  process.exitCode = 1;
});

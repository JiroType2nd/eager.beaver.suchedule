#!/usr/bin/env node
/**
 * Secret Manager に本番用シークレットを登録するスクリプト。
 * 使い方: node scripts/gcp-secrets-upload.mjs [GCP_PROJECT_ID]
 * 事前に gcloud auth login と gcloud config set project PROJECT_ID を実行しておくか、
 * 引数でプロジェクト ID を渡してください。
 *
 * .env から DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET を読み、
 * NEXTAUTH_SECRET / ENCRYPTION_KEY は新規生成、NEXTAUTH_URL はプレースホルダで登録します。
 */

import { readFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';

const projectId = process.argv[2] || process.env.GOOGLE_CLOUD_PROJECT;

function parseEnv(content) {
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    }
    env[key] = value;
  }
  return env;
}

const isWin = process.platform === 'win32';
const gcloudCmd = isWin ? 'gcloud.cmd' : 'gcloud';

function runGcloud(args, stdinValue) {
  return new Promise((resolve, reject) => {
    const allArgs = projectId ? [...args, `--project=${projectId}`] : args;
    const child = spawn(gcloudCmd, allArgs, {
      stdio: stdinValue !== undefined ? ['pipe', 'inherit', 'inherit'] : ['inherit', 'inherit', 'inherit'],
      shell: isWin, // Windows で PATH から gcloud を探す
    });
    if (stdinValue !== undefined) {
      child.stdin.write(stdinValue, (err) => {
        if (err) reject(err);
        else child.stdin.end();
      });
    }
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`gcloud exit ${code}`))));
    child.on('error', reject);
  });
}

async function ensureSecret(name) {
  try {
    await runGcloud(['secrets', 'describe', name]);
  } catch {
    await runGcloud(['secrets', 'create', name, '--replication-policy=automatic']);
  }
}

async function addSecretVersion(name, value) {
  await ensureSecret(name);
  await runGcloud(['secrets', 'versions', 'add', name, '--data-file=-'], value);
  console.log(`  OK: ${name}`);
}

async function main() {
  if (!projectId) {
    console.error('Usage: node scripts/gcp-secrets-upload.mjs <GCP_PROJECT_ID>');
    console.error('   or set GOOGLE_CLOUD_PROJECT environment variable.');
    console.error('   You can also run: gcloud config set project YOUR_PROJECT_ID');
    process.exit(1);
  }

  const envPath = '.env';
  if (!existsSync(envPath)) {
    console.error('.env not found. Create .env with DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.');
    process.exit(1);
  }

  const env = parseEnv(readFileSync(envPath, 'utf8'));

  const secrets = {
    DATABASE_URL: env.DATABASE_URL || '',
    NEXTAUTH_SECRET: randomBytes(32).toString('base64'),
    NEXTAUTH_URL: 'https://localhost', // Step 4 で Cloud Run URL が決まったら Secret Manager で手動更新
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET || '',
    ENCRYPTION_KEY: randomBytes(32).toString('hex'),
  };

  if (!secrets.DATABASE_URL) {
    console.error('.env に DATABASE_URL がありません。');
    process.exit(1);
  }

  console.log(`Project: ${projectId}`);
  console.log('Registering secrets to Secret Manager...\n');

  for (const [name, value] of Object.entries(secrets)) {
    if (!value && (name === 'GOOGLE_CLIENT_ID' || name === 'GOOGLE_CLIENT_SECRET')) {
      console.log(`  Skip: ${name} (empty in .env)`);
      continue;
    }
    try {
      await addSecretVersion(name, value);
    } catch (e) {
      console.error(`  Failed: ${name}`, e.message);
      process.exit(1);
    }
  }

  console.log('\nDone. NEXTAUTH_URL は Step 4 で Cloud Run の URL が分かったら、コンソールで編集してください。');
}

main();

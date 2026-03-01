/**
 * サーバー起動時に実行。環境変数の前後の空白・改行を除去する。
 * Secret Manager から取り込んだ値に改行が含まれていると、redirect_uri_mismatch や invalid_client の原因になる。
 * 複数行貼り付けで「2行目以降」が client_id に付与され 401 invalid_client になるため、1行目のみ採用する。
 */
function sanitizeSecretValue(value: string): string {
  const firstLine = value.split(/\r?\n/)[0] ?? '';
  return firstLine.trim();
}

export async function register() {
  const trimKeys = ['NEXTAUTH_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
  for (const key of trimKeys) {
    if (typeof process.env[key] === 'string') {
      process.env[key] = sanitizeSecretValue(process.env[key]);
    }
  }
}

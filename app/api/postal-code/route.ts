import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';

type ZipcloudResult = {
  address1: string;
  address2: string;
  address3: string;
};

type ZipcloudResponse = {
  status: number;
  message?: string;
  results?: ZipcloudResult[];
};

/**
 * 郵便番号から住所を取得（zipcloud API をプロキシ）
 * GET /api/postal-code?zip=1000001
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zip = searchParams.get('zip')?.replace(/-/g, '').trim();
  if (!zip || !/^\d{7}$/.test(zip)) {
    return apiError('BAD_REQUEST', '7桁の郵便番号を入力してください', 400);
  }

  try {
    const res = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`,
      { next: { revalidate: 86400 } }
    );
    const data: ZipcloudResponse = await res.json();

    if (data.status !== 200 || !data.results || data.results.length === 0) {
      return apiError('NOT_FOUND', data.message ?? '住所が見つかりません', 404);
    }

    const r = data.results[0];
    const address = `${r.address1}${r.address2}${r.address3}`.trim();
    return apiSuccess({ address, prefecture: r.address1, city: r.address2, town: r.address3 });
  } catch (e) {
    console.error('[postal-code]', e);
    return apiError('INTERNAL', '住所の取得に失敗しました', 500);
  }
}

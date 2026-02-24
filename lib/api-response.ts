import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'INTERNAL';

export function apiError(code: ApiErrorCode, message: string, status: number = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

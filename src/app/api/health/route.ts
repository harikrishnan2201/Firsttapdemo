import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Returns a safe status object so you can verify environment variables are
 * present on the deployed Vercel instance WITHOUT exposing any secret values.
 */
export async function GET() {
  const sarvamKey = process.env.SARVAM_API_KEY ?? '';
  const geminiKey = process.env.GEMINI_API_KEY ?? '';

  return NextResponse.json({
    status: 'ok',
    sarvamKeyPresent: sarvamKey.trim().length > 0,
    geminiKeyPresent: geminiKey.trim().length > 0,
    llmModel: process.env.SARVAM_LLM_MODEL || 'sarvam-105b-conversations',
    sttModel: 'saaras:v3',
    ttsProvider: 'sarvam-ai',
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'FirstTap',
  });
}

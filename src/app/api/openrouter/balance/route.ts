import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();
    const token = apiKey || process.env.OPENROUTER_API_KEY;

    if (!token) {
      return NextResponse.json(
        { isValid: false, error: 'API ключ OpenRouter не указан' },
        { status: 400 }
      );
    }

    // 1. Check Key Details
    const keyRes = await axios.get('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 2. Check Credits
    let creditsData = null;
    try {
      const credRes = await axios.get('https://openrouter.ai/api/v1/credits', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      creditsData = credRes.data.data;
    } catch (e) {
      // Credits endpoint might require special permissions or be part of key info
    }

    const keyInfo = keyRes.data.data;
    return NextResponse.json({
      isValid: true,
      label: keyInfo.label || 'Default Key',
      usage: keyInfo.usage || 0,
      limit: keyInfo.limit || null,
      isFreeTier: keyInfo.is_free_tier || false,
      totalCredits: creditsData?.total_credits,
      totalUsage: creditsData?.total_usage,
    });
  } catch (err: any) {
    const message = err.response?.data?.error?.message || err.message || 'Ошибка проверки ключа';
    return NextResponse.json(
      { isValid: false, error: message },
      { status: err.response?.status || 500 }
    );
  }
}

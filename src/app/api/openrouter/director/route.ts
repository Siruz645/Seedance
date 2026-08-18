import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const { userIdea, cameraMotion, duration, hasStartFrame, hasEndFrame, model, apiKey } = await req.json();
    const token = apiKey || process.env.OPENROUTER_API_KEY;

    if (!token) {
      return NextResponse.json(
        { error: 'Необходимо указать OpenRouter API Key в настройках студии.' },
        { status: 400 }
      );
    }

    const selectedModel = model || 'anthropic/claude-3.7-sonnet';

    const systemPrompt = `Ты — ведущий голливудский ИИ-режиссер и мировой эксперт по видео-генераторам ByteDance Seedance / SeaDance.
Твоя задача: взять сырую идею сцены от пользователя и преобразовать её в безупречный, кинематографический промпт строго по 4-компонентному стандарту:
[Вектор движения камеры] + [Действие субъекта и соматика Anti-Stiffness] + [Физика окружения / свет] + [Модификаторы рендеринга и 24fps].

ПРАВИЛА И СТАНДАРТЫ:
1. Anti-Stiffness (Живая моторика): Обязательно внедряй микро-саккады глаз (rapid eye saccades), дыхание (chest heaving with breath), микромимику.
2. Anti-Slowmo: Обязательно добавляй модификаторы скорости: "snappy real-time speed, 24fps high motion fidelity, zero slow-motion".
3. NO BACKGROUND MUSIC: Категорически запрещено писать "cinematic music", "epic soundtrack", "BGM". Только звуки окружения/интершум (SFX).
4. Если сцена в режиме Image-to-Video (есть Start Frame): НЕ переписывай интерьер или одежду с нуля — пиши только вектор действия и движение!
5. Если есть надписи/текст: пиши их в кавычках строго на русском языке.

Верни ответ СТРОГО в формате JSON:
{
  "refinedPrompt": "Готовый английский кинематографический промпт со всеми векторами и соматикой",
  "negativePrompt": "blur, low quality, static, distortion, extra limbs, morphing, slow-motion, plastic skin",
  "suggestedCameraMotion": "push_in | pull_out | tracking_left | tracking_right | orbital_360 | steadicam_follow",
  "actingDirectives": ["Список 2-3 ключевых соматических указаний на русском языке для режиссера"]
}`;

    const userPrompt = `Идея сцены: "${userIdea}"
Желаемое движение камеры: ${cameraMotion || 'автоматически'}
Длительность: ${duration || 5} сек
Наличие Start Frame: ${hasStartFrame ? 'ДА (режим I2V)' : 'НЕТ (режим T2V)'}
Наличие End Frame: ${hasEndFrame ? 'ДА (интерполяция)' : 'НЕТ'}`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: selectedModel,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        provider: {
          data_collection: 'deny',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'HTTP-Referer': 'https://seedance-studio.local',
          'X-Title': 'Seedance Studio AI Director',
          'Content-Type': 'application/json',
        },
      }
    );

    const contentStr = response.data.choices[0]?.message?.content || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(contentStr);
    } catch {
      // Clean potential markdown blocks ```json ... ```
      const cleaned = contentStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || 'Ошибка генерации промпта';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

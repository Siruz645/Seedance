import axios from 'axios';

export interface AIExpansionRequest {
  userIdea: string;
  cameraMotion?: string;
  duration?: number;
  hasStartFrame?: boolean;
  hasEndFrame?: boolean;
  model?: string;
  apiKey?: string;
}

export interface AIExpansionResponse {
  refinedPrompt: string;
  negativePrompt: string;
  suggestedCameraMotion: string;
  actingDirectives: string[];
}

export async function callOpenRouterDirector(params: AIExpansionRequest): Promise<AIExpansionResponse> {
  const response = await axios.post('/api/openrouter/director', params);
  return response.data;
}

export async function checkOpenRouterBalance(apiKey: string): Promise<{
  isValid: boolean;
  label?: string;
  usage?: number;
  limit?: number;
  isFreeTier?: boolean;
  error?: string;
}> {
  try {
    const response = await axios.post('/api/openrouter/balance', { apiKey });
    return response.data;
  } catch (err: any) {
    return {
      isValid: false,
      error: err.response?.data?.error || err.message || 'Ошибка подключения к OpenRouter',
    };
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('تعذر الاتصال بالخادم. تحقق من الاتصال وإعدادات API.', 0);
  }

  if (!response.ok) {
    throw new ApiError(
      response.status === 404 ? 'المورد المطلوب غير موجود.' : 'فشل جلب البيانات من الخادم.',
      response.status,
    );
  }

  return (await response.json()) as T;
}

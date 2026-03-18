import { apiClient } from '../../shared/api';

export async function sendChatMessage(
  message: string,
  character: string,
  history: { role: string; content: string }[]
): Promise<{ response: string }> {
  const res = await apiClient.post<{ success: boolean; response: string }>('/chat/send', {
    message,
    character,
    history,
  });
  return { response: res.data.response };
}

import { apiClient } from '../../shared/api';
import { Conversation, ChatMessage } from '../../shared/types';

export async function getConversations(): Promise<Conversation[]> {
  const response = await apiClient.get<Conversation[]>('/messages/conversations');
  return response.data;
}

export async function getOrCreateConversation(recipientId: string): Promise<{ conversation: { id: string; participants: { id: string; name: string }[] } }> {
  const response = await apiClient.post('/messages/conversations', { recipientId });
  return response.data;
}

export async function getMessages(conversationId: string, before?: string): Promise<ChatMessage[]> {
  const params: any = {};
  if (before) params.before = before;
  const response = await apiClient.get<ChatMessage[]>(`/messages/conversations/${conversationId}/messages`, { params });
  return response.data;
}

export async function sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
  const response = await apiClient.post<ChatMessage>(`/messages/conversations/${conversationId}/messages`, { content });
  return response.data;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await apiClient.put(`/messages/conversations/${conversationId}/read`);
}

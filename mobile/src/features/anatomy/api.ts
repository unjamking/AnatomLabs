import { apiClient } from '../../shared/api';
import { BodyPart, ApiResponse } from '../../shared/types';

export async function getBodyParts(layer?: number): Promise<BodyPart[]> {
  const params = layer ? { layer } : {};
  const response = await apiClient.get<ApiResponse<BodyPart[]>>('/body-parts', { params });
  return response.data.data;
}

export async function getBodyPart(id: string): Promise<BodyPart> {
  const response = await apiClient.get<ApiResponse<BodyPart>>(`/body-parts/${id}`);
  return response.data.data;
}

export async function getMuscles(): Promise<any[]> {
  const response = await apiClient.get<ApiResponse<any[]>>('/body-parts');
  return response.data.data;
}

export async function getMuscle(id: string): Promise<any> {
  const response = await apiClient.get<ApiResponse<any>>(`/body-parts/${id}`);
  return response.data.data;
}

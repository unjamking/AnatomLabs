import { apiClient } from '../../shared/api';
import { Booking } from '../../shared/types';

export async function createBooking(data: { coachId: string; date: string; timeSlot: string; goal?: string }): Promise<{ message: string; booking: Booking }> {
  const response = await apiClient.post('/bookings', data);
  return response.data;
}

export async function getMyBookings(): Promise<Booking[]> {
  const response = await apiClient.get<Booking[]>('/bookings');
  return response.data;
}

export async function cancelBooking(id: string): Promise<{ message: string; booking: Booking }> {
  const response = await apiClient.put(`/bookings/${id}/cancel`);
  return response.data;
}

import axios from 'axios';
import apiClient from '../api/client';
import type { AuthToken } from '../store/authStore';

export type LoginRequest = {
  userid: string;
  password: string;
};

export type LoginResponse = AuthToken;

function toErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim().length > 0) {
      return detail;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Login failed. Please try again.';
}

export const authService = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', payload);
      return response.data;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  },
};

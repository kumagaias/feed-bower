// Mock authentication for local development
import { User } from '@/types';

export class MockAuthService {
  private static currentUser: User | null = null;

  static async login(email: string, password: string): Promise<User> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Only allow dev user for mock authentication
    if (email !== 'dev@feed-bower.local' || password !== 'password') {
      throw new Error('Incorrect username or password.');
    }

    // Get actual user ID from backend API
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/dev-user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get dev user info');
      }

      const devUserData = await response.json();
      
      const userData: User = {
        id: devUserData.user_id,
        email: devUserData.email,
        name: devUserData.name,
        isGuest: false,
      };

      this.currentUser = userData;
      
      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('mockAuth', JSON.stringify(userData));
      }

      return userData;
    } catch (error) {
      console.error('Failed to get dev user from backend:', error);
      throw new Error('Authentication failed. Please ensure backend is running.');
    }
  }

  static async logout(): Promise<void> {
    this.currentUser = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mockAuth');
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Check localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mockAuth');
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
          return this.currentUser;
        } catch (error) {
          localStorage.removeItem('mockAuth');
        }
      }
    }

    return null;
  }

  static async getAuthToken(): Promise<string | null> {
    const user = await this.getCurrentUser();
    if (user) {
      // Return a mock JWT token
      return `mock-jwt-token-${user.id}`;
    }
    return null;
  }
}
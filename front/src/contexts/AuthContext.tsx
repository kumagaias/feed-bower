"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "@/types";
import { signIn, signOut, getCurrentUser, fetchAuthSession, AuthError } from 'aws-amplify/auth';
import '@/lib/amplify'; // Ensure Amplify is configured

// Error message translations
const translateAuthError = (error: string): string => {
  const errorTranslations: Record<string, string> = {
    'Incorrect username or password.': 'ユーザー名またはパスワードが正しくありません。',
    'User does not exist.': 'ユーザーが存在しません。',
    'Password attempts exceeded': 'パスワードの試行回数が上限を超えました。',
    'User is not confirmed.': 'ユーザーが確認されていません。',
    'Invalid verification code provided, please try again.': '無効な確認コードです。もう一度お試しください。',
    'An account with the given email already exists.': 'このメールアドレスは既に使用されています。',
    'Password did not conform with policy': 'パスワードがポリシーに準拠していません。',
    'Username cannot be empty': 'ユーザー名を入力してください。',
    'Password cannot be empty': 'パスワードを入力してください。',
    'Sign in not completed': 'サインインが完了しませんでした。',
    'Login failed': 'ログインに失敗しました。',
    'Failed to initialize authentication': '認証の初期化に失敗しました。',
    'Cognito configuration missing': 'Cognito設定が見つかりません。',
    'Failed to configure Amplify': 'Amplifyの設定に失敗しました。',
  };

  return errorTranslations[error] || error;
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Ensure Amplify is configured on mount
  useEffect(() => {
    try {
      const { Amplify } = require('aws-amplify');
      
      // Check if environment variables are available
      if (!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 
          !process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || 
          !process.env.NEXT_PUBLIC_AWS_REGION) {
        console.error('Missing Cognito environment variables');
        setError(translateAuthError('Cognito configuration missing'));
        setIsLoading(false);
        return;
      }
      
      const config = {
        Auth: {
          Cognito: {
            userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
            userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
            region: process.env.NEXT_PUBLIC_AWS_REGION,
            signUpVerificationMethod: 'code' as const,
            loginWith: {
              email: true,
            },
          },
        },
      };



      Amplify.configure(config);
      
      // Initialize auth check after configuration
      setTimeout(() => {
        checkAuth();
      }, 100);
    } catch (error) {
      console.error('Failed to configure Amplify:', error);
      setError(translateAuthError('Failed to initialize authentication'));
      setIsLoading(false);
    }
  }, []);

  // Login function using Cognito
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Sign in with Cognito
      const signInResult = await signIn({
        username: email,
        password: password,
      });

      if (signInResult.isSignedIn) {
        // Get current user info from Cognito
        const cognitoUser = await getCurrentUser();

        // Convert Cognito user to our User type
        const userData: User = {
          id: cognitoUser.userId,
          email: cognitoUser.signInDetails?.loginId || email,
          name: cognitoUser.signInDetails?.loginId || email, // Will be updated from user attributes
          isGuest: false,
        };

        setUser(userData);
      } else {
        throw new Error("Sign in not completed");
      }
    } catch (error) {
      setUser(null);
      
      let errorMessage = "Login failed";
      if (error instanceof AuthError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Translate error message to Japanese
      const translatedError = translateAuthError(errorMessage);
      setError(translatedError);
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function using Cognito
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Sign out from Cognito
      await signOut();
      setUser(null);
      setError(null);
      
      // Force redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      // Clear user state even if logout fails
      setUser(null);
      setError(null);
      
      // Force redirect to home page even on error
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication status using Cognito
  const checkAuth = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Get current user from Cognito
      const cognitoUser = await getCurrentUser();

      // Convert Cognito user to our User type
      const userData: User = {
        id: cognitoUser.userId,
        email: cognitoUser.signInDetails?.loginId || cognitoUser.username,
        name: cognitoUser.signInDetails?.loginId || cognitoUser.username,
        isGuest: false,
      };

      setUser(userData);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Note: checkAuth is now called from the Amplify configuration useEffect

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        error,
        login,
        logout,
        checkAuth,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper function to get auth token for API requests
export async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch (error) {
    console.log('Failed to get auth token:', error);
    return null;
  }
}
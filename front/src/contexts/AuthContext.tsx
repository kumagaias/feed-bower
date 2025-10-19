"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "@/types";

// Error message translations
const translateAuthError = (error: string): string => {
  const errorTranslations: Record<string, string> = {
    "Incorrect username or password.":
      "ユーザー名またはパスワードが正しくありません。",
    "User does not exist.": "ユーザーが存在しません。",
    "Password attempts exceeded": "パスワードの試行回数が上限を超えました。",
    "User is not confirmed.": "ユーザーが確認されていません。",
    "Invalid verification code provided, please try again.":
      "無効な確認コードです。もう一度お試しください。",
    "An account with the given email already exists.":
      "このメールアドレスは既に使用されています。",
    "Password did not conform with policy":
      "パスワードがポリシーに準拠していません。",
    "Username cannot be empty": "ユーザー名を入力してください。",
    "Password cannot be empty": "パスワードを入力してください。",
    "Sign in not completed": "サインインが完了しませんでした。",
    "Login failed": "ログインに失敗しました。",
    "Failed to initialize authentication": "認証の初期化に失敗しました。",
    "Cognito configuration missing": "Cognito設定が見つかりません。",
    "Failed to configure Amplify": "Amplifyの設定に失敗しました。",
  };

  return errorTranslations[error] || error;
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, language: string) => Promise<void>;
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

  // Initialize authentication on mount
  useEffect(() => {
    console.log("Initializing Custom Cognito Client authentication");
    
    // カスタムCognitoクライアントで認証チェックを実行
    const initializeAuth = async () => {
      try {
        // 少し待ってから認証チェック
        setTimeout(() => {
          checkAuth();
        }, 200);
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Register function using Custom Cognito Client
  const register = async (
    email: string,
    password: string,
    name: string,
    language: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Use Custom Cognito Client (supports both local Magneto and AWS production)
      console.log('Using Custom Cognito Client for registration', {
        email,
        name,
        language,
      });
      const { customCognitoAuth } = await import('@/lib/cognito-client');

      // Automatically sign in after email confirmation
      const signInResult = await customCognitoAuth.signIn(email, password);

      if (signInResult.isSignedIn) {
        const cognitoUser = await customCognitoAuth.getCurrentUser();
        const userData: User = {
          id: cognitoUser?.userId || 'unknown',
          email: cognitoUser?.email || email,
          name: cognitoUser?.username || name,
          isGuest: false,
        };
        setUser(userData);
      } else {
        throw new Error("Sign in not completed after registration");
      }
    } catch (error) {
      setUser(null);

      let errorMessage = "Registration failed";
      if (error instanceof Error) {
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

  // Login function using Custom Cognito Client (both local and production)
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Use Custom Cognito Client (supports both local Magneto and AWS production)
      console.log('🔐 Login attempt:', { email, passwordLength: password.length });
      const { customCognitoAuth } = await import('@/lib/cognito-client');

      console.log('📞 Calling customCognitoAuth.signIn...');
      const signInResult = await customCognitoAuth.signIn(email, password);
      console.log('📥 Sign in result:', signInResult);

      if (signInResult.isSignedIn) {
        console.log('✅ Sign in successful, getting user info...');
        const cognitoUser = await customCognitoAuth.getCurrentUser();
        console.log('👤 Cognito user:', cognitoUser);
        
        const userData: User = {
          id: cognitoUser?.userId || 'unknown',
          email: cognitoUser?.email || email,
          name: cognitoUser?.username || email,
          isGuest: false,
        };
        setUser(userData);
        console.log('✅ Login successful, user set:', userData.email);
      } else {
        console.log('❌ Sign in result indicates failure');
        throw new Error("Sign in not completed");
      }
    } catch (error) {
      console.error('❌ Login error caught:', error);
      setUser(null);

      let errorMessage = "Login failed";
      if (error instanceof Error) {
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

  // Logout function using Custom Cognito Client
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Use Custom Cognito Client
      const { customCognitoAuth } = await import('@/lib/cognito-client');
      await customCognitoAuth.signOut();

      setUser(null);
      setError(null);

      // Force redirect to home page
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (error) {
      // Clear user state even if logout fails
      setUser(null);
      setError(null);

      // Force redirect to home page even on error
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication status using Custom Cognito Client
  const checkAuth = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Check Custom Cognito Client (local Magneto or AWS production)
      const { customCognitoAuth } = await import('@/lib/cognito-client');
      
      console.log('🔍 Checking auth status...');
      console.log('🔑 Has access token:', !!customCognitoAuth.getAccessToken());
      
      if (!customCognitoAuth.getAccessToken()) {
        console.log('⚠️ No access token found, user not authenticated');
        setUser(null);
        return;
      }
      
      const cognitoUser = await customCognitoAuth.getCurrentUser();
      
      if (cognitoUser) {
        console.log('✅ User authenticated:', cognitoUser.email);
        const userData: User = {
          id: cognitoUser.userId,
          email: cognitoUser.email || cognitoUser.username,
          name: cognitoUser.username,
          isGuest: false,
        };
        setUser(userData);
      } else {
        console.log('⚠️ No user data returned');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ checkAuth error:', error);
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
        register,
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
    // Use Custom Cognito Client (local Magneto or AWS production)
    const { customCognitoAuth } = await import('@/lib/cognito-client');
    
    // Try ID token first (required by backend), then access token as fallback
    const idToken = customCognitoAuth.getIdToken();
    const accessToken = customCognitoAuth.getAccessToken();
    
    const token = idToken || accessToken;
    
    if (token) {
      console.log("✅ Auth token retrieved successfully", {
        tokenType: idToken ? 'id' : 'access',
        tokenLength: token.length,
        tokenPreview: `${token.substring(0, 20)}...`
      });
      return token;
    }

    console.log("⚠️ No auth token available");
    return null;
  } catch (error) {
    console.log("❌ Failed to get auth token:", error);
    return null;
  }
}

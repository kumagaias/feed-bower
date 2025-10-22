"use client";

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GetUserCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const isLocalDevelopment = process.env.NEXT_PUBLIC_USE_COGNITO_LOCAL === "true";

// Cognitoクライアントの設定（本番・ローカル両対応）
const cognitoConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || "ap-northeast-1",
  // ローカル開発時のみダミー認証情報を使用
  ...(isLocalDevelopment && {
    credentials: {
      accessKeyId: "test",
      secretAccessKey: "test",
    },
    endpoint:
      process.env.NEXT_PUBLIC_AWS_ENDPOINT_URL_COGNITO_IDP ||
      "http://localhost:9229",
  }),
  // 本番環境では認証情報は自動取得、エンドポイントはデフォルト
};

console.log("Cognito Client Config:", {
  region: cognitoConfig.region,
  endpoint: cognitoConfig.endpoint,
  isLocalDevelopment,
});

const cognitoClient = new CognitoIdentityProviderClient({
  ...cognitoConfig,
  requestHandler: {
    requestTimeout: 30000,
  },
});

export interface CognitoUser {
  userId: string;
  username: string;
  email?: string;
}

export interface SignInResult {
  isSignedIn: boolean;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
}

export class CustomCognitoAuth {
  private userPoolId: string;
  private clientId: string;
  private accessToken: string | null = null;
  private idToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.userPoolId =
      process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "ap-northeast-1_default";
    this.clientId =
      process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || "default";

    // localStorageからトークンを復元
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("cognito_access_token");
      this.idToken = localStorage.getItem("cognito_id_token");
      this.refreshToken = localStorage.getItem("cognito_refresh_token");
    }
  }

  // トークンを取得するメソッド
  getAccessToken(): string | null {
    if (this.accessToken) return this.accessToken;
    // localStorageからも確認
    if (typeof window !== "undefined") {
      return localStorage.getItem("cognito_access_token");
    }
    return null;
  }

  getIdToken(): string | null {
    if (this.idToken) return this.idToken;
    // localStorageからも確認
    if (typeof window !== "undefined") {
      return localStorage.getItem("cognito_id_token");
    }
    return null;
  }

  // トークンの有効期限をチェック
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= exp;
    } catch (error) {
      console.error('Failed to parse token:', error);
      return true;
    }
  }

  // 認証状態をチェック
  isAuthenticated(): boolean {
    const idToken = this.getIdToken();
    if (!idToken) return false;
    
    // トークンの有効期限をチェック
    if (this.isTokenExpired(idToken)) {
      console.log('⚠️ ID token is expired');
      return false;
    }
    
    return true;
  }

  async signIn(username: string, password: string): Promise<SignInResult> {
    try {
      console.log("🔐 Attempting sign in with custom Cognito client");
      console.log("UserPoolId:", this.userPoolId);
      console.log("ClientId:", this.clientId);
      console.log("Endpoint:", cognitoConfig.endpoint);

      // 基本的なバリデーション
      if (!username || !password) {
        throw new Error("Username and password are required");
      }

      const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      });

      const response = await cognitoClient.send(command);

      console.log(11111111);
      console.log(username);
      console.log(password);
      console.log(response);

      console.log(
        "📦 Raw response from Magnito:",
        JSON.stringify(response, null, 2)
      );
      console.log(
        "🔍 response.AuthenticationResult exists?",
        !!response.AuthenticationResult
      );
      console.log("🔍 response keys:", Object.keys(response));

      // Force error if no AuthenticationResult
      if (!response.AuthenticationResult) {
        console.error(
          "❌ No AuthenticationResult in response - authentication failed"
        );
        throw new Error("Authentication failed: Invalid credentials");
      }

      if (response.AuthenticationResult) {
        // トークンを保存（メモリとlocalStorage両方）
        this.accessToken = response.AuthenticationResult.AccessToken || null;
        this.idToken = response.AuthenticationResult.IdToken || null;
        this.refreshToken = response.AuthenticationResult.RefreshToken || null;

        // localStorageにも保存
        if (typeof window !== "undefined") {
          if (this.accessToken)
            localStorage.setItem("cognito_access_token", this.accessToken);
          if (this.idToken)
            localStorage.setItem("cognito_id_token", this.idToken);
          if (this.refreshToken)
            localStorage.setItem("cognito_refresh_token", this.refreshToken);
        }

        console.log("✅ Sign in successful");
        console.log("🔑 Tokens saved:", {
          hasAccessToken: !!this.accessToken,
          hasIdToken: !!this.idToken,
          hasRefreshToken: !!this.refreshToken,
          accessTokenPreview: this.accessToken?.substring(0, 50) + "...",
          idTokenPreview: this.idToken?.substring(0, 50) + "...",
          tokensAreSame: this.accessToken === this.idToken,
        });

        return {
          isSignedIn: true,
          accessToken: response.AuthenticationResult.AccessToken,
          idToken: response.AuthenticationResult.IdToken,
          refreshToken: response.AuthenticationResult.RefreshToken,
        };
      } else {
        console.log("❌ Sign in failed: No authentication result");
        // Clear tokens on failure
        this.accessToken = null;
        this.idToken = null;
        this.refreshToken = null;
        return { isSignedIn: false };
      }
    } catch (error: any) {
      console.error("❌ Sign in error:", error);

      // Clear tokens on error
      this.accessToken = null;
      this.idToken = null;
      this.refreshToken = null;

      // 開発環境では詳細なエラー情報を表示
      if (isLocalDevelopment) {
        console.error("🔍 Error details:", {
          name: error.name,
          message: error.message,
          statusCode: error.$metadata?.httpStatusCode,
          requestId: error.$metadata?.requestId,
          response: error.$response,
          stack: error.stack,
        });
      }

      throw error;
    }
  }

  async getCurrentUser(): Promise<CognitoUser | null> {
    if (!this.accessToken) {
      throw new Error("No access token available");
    }

    try {
      const command = new GetUserCommand({
        AccessToken: this.accessToken,
      });

      const response = await cognitoClient.send(command);

      const email = response.UserAttributes?.find(
        (attr) => attr.Name === "email"
      )?.Value;
      const sub = response.UserAttributes?.find(
        (attr) => attr.Name === "sub"
      )?.Value;

      console.log("👤 Current user attributes:", {
        username: response.Username,
        sub: sub,
        email: email,
      });

      return {
        userId: sub || response.Username || "unknown",
        username: response.Username || "unknown",
        email: email,
      };
    } catch (error: any) {
      console.error("❌ Get current user error:", error);

      // 開発環境では詳細なエラー情報を表示
      if (isLocalDevelopment) {
        console.error("🔍 Error details:", {
          name: error.name,
          message: error.message,
          statusCode: error.$metadata?.httpStatusCode,
          requestId: error.$metadata?.requestId,
        });
      }

      throw error;
    }
  }

  async signOut(): Promise<void> {
    this.accessToken = null;
    this.idToken = null;
    this.refreshToken = null;

    // localStorageからも削除
    if (typeof window !== "undefined") {
      localStorage.removeItem("cognito_access_token");
      localStorage.removeItem("cognito_id_token");
      localStorage.removeItem("cognito_refresh_token");
    }

    console.log("✅ Sign out successful");
  }

  async signUp(
    username: string,
    password: string,
    email: string,
    name?: string
  ): Promise<boolean> {
    try {
      console.log("📝 Attempting sign up with custom Cognito client", {
        username,
        email,
        name,
      });

      const userAttributes = [
        {
          Name: "email",
          Value: email,
        },
      ];

      // Add name attribute if provided
      if (name) {
        userAttributes.push({
          Name: "name",
          Value: name,
        });
      }

      const signUpParams = {
        ClientId: this.clientId,
        Username: username,
        Password: password,
        UserAttributes: userAttributes,
      };

      console.log("📤 Sending SignUp command with params:", {
        ClientId: signUpParams.ClientId,
        Username: signUpParams.Username,
        PasswordLength: signUpParams.Password.length,
        UserAttributes: signUpParams.UserAttributes,
      });

      // 開発環境では直接fetch APIを使用（AWS SDKのContent-Type問題を回避）
      if (isLocalDevelopment) {
        console.log("🔧 Using direct fetch API for local development");
        const response = await fetch("http://localhost:9229/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Target": "AWSCognitoIdentityProviderService.SignUp",
          },
          body: JSON.stringify(signUpParams),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Fetch API error:", response.status, errorText);
          throw new Error(`SignUp failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log("✅ Sign up successful via fetch API:", result);
        return true;
      }

      // 本番環境ではAWS SDKを使用
      const command = new SignUpCommand(signUpParams);
      const response = await cognitoClient.send(command);
      console.log("✅ Sign up successful:", response.UserSub);

      // ローカル開発時は自動確認
      if (isLocalDevelopment) {
        console.log("🔧 Auto-confirming user in local development...");
        try {
          await this.confirmSignUp(username, "123456"); // ダミー確認コード
          console.log("✅ User auto-confirmed");
        } catch (confirmError) {
          console.warn(
            "⚠️ Auto-confirm failed (user may already be confirmed):",
            confirmError
          );
        }
      }

      return true;
    } catch (error: any) {
      console.error("❌ Sign up error:", error);

      // 開発環境では詳細なエラー情報を表示
      if (isLocalDevelopment) {
        console.error("🔍 Error details:", {
          name: error.name,
          message: error.message,
          statusCode: error.$metadata?.httpStatusCode,
          requestId: error.$metadata?.requestId,
          response: error.$response,
          stack: error.stack,
        });
      }

      throw error;
    }
  }

  async confirmSignUp(
    username: string,
    confirmationCode: string
  ): Promise<boolean> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
      });

      await cognitoClient.send(command);
      console.log("✅ Sign up confirmation successful");
      return true;
    } catch (error: any) {
      console.error("❌ Sign up confirmation error:", error);

      // 開発環境では詳細なエラー情報を表示
      if (isLocalDevelopment) {
        console.error("🔍 Error details:", {
          name: error.name,
          message: error.message,
          statusCode: error.$metadata?.httpStatusCode,
          requestId: error.$metadata?.requestId,
        });
      }

      throw error;
    }
  }
}

export const customCognitoAuth = new CustomCognitoAuth();

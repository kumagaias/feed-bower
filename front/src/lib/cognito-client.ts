'use client';

import { CognitoIdentityProviderClient, InitiateAuthCommand, GetUserCommand, SignUpCommand, ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';

const isLocalDevelopment = process.env.NEXT_PUBLIC_USE_COGNITO_LOCAL === 'true';

// Cognitoクライアントの設定（本番・ローカル両対応）
const cognitoConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1',
  // ローカル開発時のみダミー認証情報を使用
  ...(isLocalDevelopment && {
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
    endpoint: process.env.NEXT_PUBLIC_AWS_ENDPOINT_URL_COGNITO_IDP || 'http://localhost:9229',
  }),
  // 本番環境では認証情報は自動取得、エンドポイントはデフォルト
};

console.log('Cognito Client Config:', {
  region: cognitoConfig.region,
  endpoint: cognitoConfig.endpoint,
  isLocalDevelopment,
});

const cognitoClient = new CognitoIdentityProviderClient(cognitoConfig);

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
    this.userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'ap-northeast-1_default';
    this.clientId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || 'default';
    
    // localStorageからトークンを復元
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('cognito_access_token');
      this.idToken = localStorage.getItem('cognito_id_token');
      this.refreshToken = localStorage.getItem('cognito_refresh_token');
    }
  }

  // トークンを取得するメソッド
  getAccessToken(): string | null {
    if (this.accessToken) return this.accessToken;
    // localStorageからも確認
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cognito_access_token');
    }
    return null;
  }

  getIdToken(): string | null {
    if (this.idToken) return this.idToken;
    // localStorageからも確認
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cognito_id_token');
    }
    return null;
  }

  // 認証状態をチェック
  isAuthenticated(): boolean {
    const accessToken = this.getAccessToken();
    return accessToken !== null;
  }

  async signIn(username: string, password: string): Promise<SignInResult> {
    try {
      console.log('🔐 Attempting sign in with custom Cognito client');
      console.log('UserPoolId:', this.userPoolId);
      console.log('ClientId:', this.clientId);
      console.log('Endpoint:', cognitoConfig.endpoint);

      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      });

      const response = await cognitoClient.send(command);
      
      if (response.AuthenticationResult) {
        // トークンを保存（メモリとlocalStorage両方）
        this.accessToken = response.AuthenticationResult.AccessToken || null;
        this.idToken = response.AuthenticationResult.IdToken || null;
        this.refreshToken = response.AuthenticationResult.RefreshToken || null;
        
        // localStorageにも保存
        if (typeof window !== 'undefined') {
          if (this.accessToken) localStorage.setItem('cognito_access_token', this.accessToken);
          if (this.idToken) localStorage.setItem('cognito_id_token', this.idToken);
          if (this.refreshToken) localStorage.setItem('cognito_refresh_token', this.refreshToken);
        }
        
        console.log('✅ Sign in successful');
        console.log('🔑 Tokens saved:', {
          hasAccessToken: !!this.accessToken,
          hasIdToken: !!this.idToken,
          hasRefreshToken: !!this.refreshToken,
        });
        
        return {
          isSignedIn: true,
          accessToken: response.AuthenticationResult.AccessToken,
          idToken: response.AuthenticationResult.IdToken,
          refreshToken: response.AuthenticationResult.RefreshToken,
        };
      } else {
        console.log('❌ Sign in failed: No authentication result');
        return { isSignedIn: false };
      }
    } catch (error) {
      console.error('❌ Sign in error:', error);
      
      // ローカル開発時でユーザーが存在しない場合、自動作成を試行
      if (isLocalDevelopment && username === 'dev@feed-bower.local') {
        console.log('🔧 User not found in local development, attempting to create user...');
        try {
          await this.signUp(username, password, username);
          console.log('✅ Development user created, retrying sign in...');
          
          // ユーザー作成後に再度サインインを試行
          return await this.signIn(username, password);
        } catch (signUpError) {
          console.error('❌ Failed to create development user:', signUpError);
        }
      }
      
      throw error;
    }
  }

  async getCurrentUser(): Promise<CognitoUser | null> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      const command = new GetUserCommand({
        AccessToken: this.accessToken,
      });

      const response = await cognitoClient.send(command);
      
      const email = response.UserAttributes?.find(attr => attr.Name === 'email')?.Value;
      const sub = response.UserAttributes?.find(attr => attr.Name === 'sub')?.Value;
      
      console.log('👤 Current user attributes:', {
        username: response.Username,
        sub: sub,
        email: email
      });
      
      return {
        userId: sub || response.Username || 'unknown',
        username: response.Username || 'unknown',
        email: email,
      };
    } catch (error) {
      console.error('❌ Get current user error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    this.accessToken = null;
    this.idToken = null;
    this.refreshToken = null;
    
    // localStorageからも削除
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cognito_access_token');
      localStorage.removeItem('cognito_id_token');
      localStorage.removeItem('cognito_refresh_token');
    }
    
    console.log('✅ Sign out successful');
  }

  async signUp(username: string, password: string, email: string): Promise<boolean> {
    try {
      console.log('📝 Attempting sign up with custom Cognito client');
      
      const command = new SignUpCommand({
        ClientId: this.clientId,
        Username: username,
        Password: password,
        UserAttributes: [
          {
            Name: 'email',
            Value: email,
          },
        ],
      });

      const response = await cognitoClient.send(command);
      console.log('✅ Sign up successful:', response.UserSub);
      
      // ローカル開発時は自動確認
      if (isLocalDevelopment) {
        await this.confirmSignUp(username, '123456'); // ダミー確認コード
      }
      
      return true;
    } catch (error) {
      console.error('❌ Sign up error:', error);
      throw error;
    }
  }

  async confirmSignUp(username: string, confirmationCode: string): Promise<boolean> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
      });

      await cognitoClient.send(command);
      console.log('✅ Sign up confirmation successful');
      return true;
    } catch (error) {
      console.error('❌ Sign up confirmation error:', error);
      throw error;
    }
  }
}

export const customCognitoAuth = new CustomCognitoAuth();
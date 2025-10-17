"use client";

import { Amplify } from "aws-amplify";

let isConfigured = false;

export const configureAmplify = () => {
  if (isConfigured) {
    return;
  }

  const isLocalDevelopment =
    process.env.NEXT_PUBLIC_USE_COGNITO_LOCAL === "true";

  // 環境変数の検証
  const requiredEnvVars = {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
    region: process.env.NEXT_PUBLIC_AWS_REGION,
  };

  console.log("Environment variables check:", requiredEnvVars);
  console.log("All Cognito environment variables:", {
    NEXT_PUBLIC_COGNITO_USER_POOL_ID:
      process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID:
      process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION,
    NEXT_PUBLIC_USE_COGNITO_LOCAL: process.env.NEXT_PUBLIC_USE_COGNITO_LOCAL,
    NEXT_PUBLIC_COGNITO_ENDPOINT: process.env.NEXT_PUBLIC_COGNITO_ENDPOINT,
    NEXT_PUBLIC_AWS_ENDPOINT_URL_COGNITO_IDP:
      process.env.NEXT_PUBLIC_AWS_ENDPOINT_URL_COGNITO_IDP,
  });

  const baseConfig = {
    userPoolId: requiredEnvVars.userPoolId || "ap-northeast-1_default",
    userPoolClientId: requiredEnvVars.userPoolClientId || "default",
    region: requiredEnvVars.region || "ap-northeast-1",
    signUpVerificationMethod: "code" as const,
    loginWith: {
      email: true,
    },
  };

  // Magnetoの場合の設定
  if (isLocalDevelopment) {
    console.log("Local development mode enabled for Cognito");

    const cognitoEndpoint =
      process.env.NEXT_PUBLIC_AWS_ENDPOINT_URL_COGNITO_IDP ||
      "http://localhost:9229";
    console.log("Using Cognito endpoint:", cognitoEndpoint);

    // AWS SDKのグローバル設定でローカルエンドポイントを使用
    if (typeof window !== "undefined") {
      // AWS SDK v3用の設定
      (window as any).AWS_SDK_CONFIG = {
        endpoint: cognitoEndpoint,
        region: baseConfig.region,
      };

      // 環境変数をグローバルに設定（安全な方法で）
      try {
        (window as any).process = (window as any).process || {};
        (window as any).process.env = (window as any).process.env || {};
        (window as any).process.env.AWS_ENDPOINT_URL_COGNITO_IDP =
          cognitoEndpoint;
      } catch (error) {
        console.warn("Could not set process.env:", error);
      }

      console.log(
        "AWS SDK configured for local Cognito endpoint:",
        cognitoEndpoint
      );
    }
  }

  // 環境に応じてAmplify設定を切り替え
  const amplifyConfig = {
    Auth: {
      Cognito: {
        ...baseConfig,
        // ローカル開発時のみエンドポイントを追加
        ...(isLocalDevelopment && {
          endpoint:
            process.env.NEXT_PUBLIC_AWS_ENDPOINT_URL_COGNITO_IDP ||
            "http://localhost:9229",
        }),
      },
    },
  };

  console.log("Final Amplify Config:", JSON.stringify(amplifyConfig, null, 2));

  // Amplify設定後に実際の設定を確認
  setTimeout(() => {
    try {
      const currentConfig = Amplify.getConfig();
      console.log(
        "Actual Amplify Config after configure:",
        JSON.stringify(currentConfig, null, 2)
      );
    } catch (error) {
      console.warn("Could not get Amplify config:", error);
    }
  }, 200);

  console.log("Amplify Config (Magnito):", {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    isLocalDevelopment,
  });

  // Amplifyを設定
  Amplify.configure(amplifyConfig);

  // ローカル開発時は追加でAWS SDKの設定を強制的にオーバーライド
  if (isLocalDevelopment && typeof window !== "undefined") {
    const cognitoEndpoint =
      process.env.NEXT_PUBLIC_AWS_ENDPOINT_URL_COGNITO_IDP ||
      "http://localhost:9229";

    // Amplifyの内部設定を直接変更
    setTimeout(() => {
      try {
        // AWS SDKのグローバル設定を強制的に変更
        if (typeof window !== "undefined") {
          // AWS SDK v3のグローバル設定
          (window as any).AWS_CONFIG = {
            region: baseConfig.region,
            endpoint: cognitoEndpoint,
            credentials: {
              accessKeyId: "test",
              secretAccessKey: "test",
            },
          };

          // Amplifyの内部で使用されるAWS設定を上書き
          (window as any).AWS_ENDPOINT_URL_COGNITO_IDP = cognitoEndpoint;

          console.log(
            "AWS SDK global config set for local endpoint:",
            cognitoEndpoint
          );
        }

        console.log(
          "Forced Cognito endpoint configuration applied:",
          cognitoEndpoint
        );
      } catch (error) {
        console.warn(
          "Failed to override Cognito endpoint configuration:",
          error
        );
      }
    }, 100);
  }

  isConfigured = true;
  console.log("Amplify configured successfully");
};

// クライアントサイドでのみ自動設定
if (typeof window !== "undefined") {
  configureAmplify();
}

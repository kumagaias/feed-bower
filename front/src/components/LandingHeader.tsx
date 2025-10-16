"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { ApiError } from "@/lib/api";
import Link from "next/link";

export default function LandingHeader() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { language, setLanguage } = useApp();
  const { login, error: authError, clearError, isAuthenticated } = useAuth();
  const t = useTranslation(language);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    clearError();
    setIsSubmitting(true);

    try {
      console.log("Attempting login...");
      await login(email, password);
      console.log("Login successful, closing modal");
      // Only close modal if login was successful
      setShowLogin(false);
      setEmail("");
      setPassword("");

      // Redirect will be handled by the auth context
    } catch (error) {
      console.log("Login failed, keeping modal open:", error);
      let errorMessage = t.error;

      if (error instanceof ApiError) {
        if (error.status === 401) {
          errorMessage = t.authRequired;
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        // Translate common error messages
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("check your credentials")
        ) {
          errorMessage = t.authFailed;
        } else if (error.message === "Token verification failed") {
          errorMessage = t.tokenVerificationFailed;
        } else if (error.message === "Invalid response from server") {
          errorMessage = t.invalidResponse;
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevLogin = async () => {
    setError("");
    clearError();
    setIsSubmitting(true);

    try {
      await login("dev@feed-bower.local", "DevPassword123!");
      // Only close modal if login was successful
      setShowLogin(false);
      setEmail("");
      setPassword("");
    } catch (error) {
      let errorMessage =
        "開発用ユーザーでのログインに失敗しました。Cognitoユーザープールを確認してください。";

      if (error instanceof ApiError) {
        if (error.status === 401) {
          errorMessage = language === "ja" ? t.authRequired : t.authRequired;
        } else {
          errorMessage = `開発用ユーザーでのログインに失敗: ${error.message}`;
        }
      } else if (error instanceof Error) {
        // Translate common error messages for dev login
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("check your credentials")
        ) {
          errorMessage = language === "ja" ? t.authFailed : t.authFailed;
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 shadow-sm z-50"
        style={{
          backgroundColor: "#14b8a6",
          borderBottom: "2px solid #505050",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="relative">
                <div className="text-2xl opacity-20 absolute top-0.5 left-0.5">
                  🪺
                </div>
                <div className="text-2xl relative z-10">🪺</div>
              </div>
              <span className="text-xl font-bold" style={{ color: "#F5F5DC" }}>
                Feed Bower
              </span>
            </Link>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setLanguage("en")}
                  className={`text-xl transition-all ${
                    language === "en"
                      ? "scale-125 opacity-100"
                      : "opacity-50 hover:opacity-75"
                  }`}
                  title="Switch to English"
                >
                  🇺🇸
                </button>
                <span className="text-white opacity-50">/</span>
                <button
                  onClick={() => setLanguage("ja")}
                  className={`text-xl transition-all ${
                    language === "ja"
                      ? "scale-125 opacity-100"
                      : "opacity-50 hover:opacity-75"
                  }`}
                  title="日本語に切り替え"
                >
                  🇯🇵
                </button>
              </div>

              <button
                onClick={() => setShowLogin(true)}
                id="login-button"
                className="px-4 py-2 rounded-lg transition-colors font-medium"
                style={{ backgroundColor: "#f59e0b", color: "white" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#0f766e")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f59e0b")
                }
              >
                {t.login}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <div className="text-2xl">🪺</div>
                <h2 className="text-2xl font-bold text-gray-800">{t.login}</h2>
              </div>
              <button
                onClick={() => {
                  setShowLogin(false);
                  setError("");
                  clearError();
                  setEmail("");
                  setPassword("");
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e0b] focus:border-transparent disabled:opacity-50"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.password}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f59e0b] focus:border-transparent disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>

              {(error || authError) && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
                  {error || authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#14b8a6", color: "white" }}
                onMouseEnter={(e) =>
                  !isSubmitting &&
                  (e.currentTarget.style.backgroundColor = "#505050")
                }
                onMouseLeave={(e) =>
                  !isSubmitting &&
                  (e.currentTarget.style.backgroundColor = "#14b8a6")
                }
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t.loading}
                  </span>
                ) : (
                  t.login
                )}
              </button>
            </form>

            {/* Development Info */}
            {process.env.NODE_ENV === "development" && (
              <div className="text-center text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                <p className="font-medium text-blue-800 mb-2">
                  開発環境用アカウント (Cognito)
                </p>
                <p className="mb-2">Email: dev@feed-bower.local</p>
                <p className="mb-3">Password: DevPassword123!</p>
                <button
                  onClick={handleDevLogin}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isSubmitting ? "接続中..." : "開発用ユーザーでログイン"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

// Password strength calculation
function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 25;
  if (/[a-z]/.test(password)) score += 12.5;
  if (/[A-Z]/.test(password)) score += 12.5;
  if (/[0-9]/.test(password)) score += 12.5;
  if (/[^a-zA-Z0-9]/.test(password)) score += 12.5;

  let label = "";
  let color = "";

  if (score < 25) {
    label = "弱い";
    color = "#ef4444";
  } else if (score < 50) {
    label = "普通";
    color = "#f59e0b";
  } else if (score < 75) {
    label = "良い";
    color = "#10b981";
  } else {
    label = "強い";
    color = "#14b8a6";
  }

  return { score, label, color };
}

// Password validation
function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("パスワードは8文字以上である必要があります");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("小文字を含める必要があります");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("大文字を含める必要があります");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("数字を含める必要があります");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Email validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export default function SignupPage() {
  const router = useRouter();
  const { language, setLanguage } = useApp();
  const { register, error: authError, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    language: language,
  });

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    name?: string;
    general?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = calculatePasswordStrength(formData.password);
  const passwordValidation = validatePassword(formData.password);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field-specific error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    clearError();
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = "メールアドレスを入力してください";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "有効なメールアドレスを入力してください";
    }

    // Name validation
    if (!formData.name) {
      newErrors.name = "名前を入力してください";
    } else if (formData.name.length < 1 || formData.name.length > 50) {
      newErrors.name = "名前は1〜50文字で入力してください";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "パスワードを入力してください";
    } else if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0];
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "パスワード（確認）を入力してください";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "パスワードが一致しません";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("📝 handleSubmit called");
    e.preventDefault();
    console.log("✅ preventDefault called");

    if (!validateForm()) {
      console.log("❌ Form validation failed");
      return;
    }

    console.log("✅ Form validation passed");
    setIsSubmitting(true);
    setErrors({});
    clearError();

    try {
      console.log("🚀 Starting signup process...", {
        email: formData.email,
        name: formData.name,
        language: formData.language,
      });

      // Use the register function from AuthContext which handles auto-login
      await register(
        formData.email,
        formData.password,
        formData.name,
        formData.language
      );

      console.log("✅ Registration successful!");

      // Update language preference
      setLanguage(formData.language as "ja" | "en");

      // Show welcome message (toast would be better, but we'll use a simple approach)
      console.log("Welcome to Feed Bower!");

      // Redirect to bowers page
      router.push("/bowers");
    } catch (error) {
      console.error("❌ Signup error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error?.constructor?.name,
      });

      let errorMessage = "アカウント作成に失敗しました";

      if (error instanceof Error) {
        if (
          error.message.includes("already exists") ||
          error.message.includes("UsernameExistsException")
        ) {
          errorMessage = "このメールアドレスは既に使用されています";
        } else if (error.message.includes("Network")) {
          errorMessage = "ネットワークエラーが発生しました";
        } else if (error.message.includes("Password")) {
          errorMessage = "パスワードがポリシーに準拠していません";
        } else {
          errorMessage = error.message;
        }
      }

      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#f0fdf4" }}
    >
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4">
            <div className="text-3xl">🪺</div>
            <span className="text-2xl font-bold" style={{ color: "#14b8a6" }}>
              Feed Bower
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            アカウント作成
          </h1>
          <p className="text-gray-600">
            あなただけのフィード体験を始めましょう
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent disabled:opacity-50 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent disabled:opacity-50 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="山田太郎"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent disabled:opacity-50 pr-10 ${
                  errors.password ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            {/* Password strength indicator */}
            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">パスワード強度:</span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: passwordStrength.color }}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${passwordStrength.score}%`,
                      backgroundColor: passwordStrength.color,
                    }}
                  />
                </div>
              </div>
            )}

            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}

            {/* Password requirements */}
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              <p className="font-medium">パスワードの要件:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li
                  className={
                    formData.password.length >= 8 ? "text-green-600" : ""
                  }
                >
                  8文字以上
                </li>
                <li
                  className={
                    /[a-z]/.test(formData.password) ? "text-green-600" : ""
                  }
                >
                  小文字を含む
                </li>
                <li
                  className={
                    /[A-Z]/.test(formData.password) ? "text-green-600" : ""
                  }
                >
                  大文字を含む
                </li>
                <li
                  className={
                    /[0-9]/.test(formData.password) ? "text-green-600" : ""
                  }
                >
                  数字を含む
                </li>
              </ul>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード（確認） <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleChange("confirmPassword", e.target.value)
                }
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent disabled:opacity-50 pr-10 ${
                  errors.confirmPassword ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              言語 / Language
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value="ja"
                  checked={formData.language === "ja"}
                  onChange={(e) => handleChange("language", e.target.value)}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-[#14b8a6] focus:ring-[#14b8a6]"
                />
                <span className="text-sm text-gray-700">🇯🇵 日本語</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value="en"
                  checked={formData.language === "en"}
                  onChange={(e) => handleChange("language", e.target.value)}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-[#14b8a6] focus:ring-[#14b8a6]"
                />
                <span className="text-sm text-gray-700">🇺🇸 English</span>
              </label>
            </div>
          </div>

          {/* General Error */}
          {(errors.general || authError) && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
              {errors.general || authError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            onClick={(e) => {
              console.log("🔘 Button clicked!");
            }}
            className="w-full px-4 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#14b8a6", color: "white" }}
            onMouseEnter={(e) =>
              !isSubmitting &&
              (e.currentTarget.style.backgroundColor = "#0f766e")
            }
            onMouseLeave={(e) =>
              !isSubmitting &&
              (e.currentTarget.style.backgroundColor = "#14b8a6")
            }
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                アカウント作成中...
              </span>
            ) : (
              "アカウントを作成"
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            既にアカウントをお持ちの方は{" "}
            <Link
              href="/"
              className="font-medium hover:underline"
              style={{ color: "#14b8a6" }}
            >
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

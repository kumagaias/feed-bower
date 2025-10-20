"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/i18n";
import VerificationModal from "./VerificationModal";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Password validation (Cognito compatible)
// 8文字以上、英数字1文字以上
function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("パスワードは8文字以上である必要があります");
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push("英字を含める必要があります");
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

export default function SignupModal({ isOpen, onClose }: SignupModalProps) {
  const router = useRouter();
  const { language, setLanguage } = useApp();
  const { register, error: authError, clearError } = useAuth();
  const t = useTranslation(language);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    language: language,
  });
  
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    clearError();
    
    try {
      console.log("🚀 Starting signup process...", {
        email: formData.email,
        language: formData.language,
      });
      
      // Cognito にサインアップ
      const { customCognitoAuth } = await import('@/lib/cognito-client');
      await customCognitoAuth.signUp(
        formData.email,
        formData.password,
        formData.email,
        formData.email.split("@")[0]
      );
      
      console.log("✅ Signup successful! Email verification link sent.");
      
      // Update language preference
      setLanguage(formData.language as "ja" | "en");
      
      // 成功メッセージを表示
      setShowSuccess(true);
    } catch (error) {
      console.error("❌ Signup error:", error);
      
      let errorMessage = "アカウント作成に失敗しました";
      
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        if (error.message.includes("already exists") || error.message.includes("UsernameExistsException")) {
          errorMessage = "このメールアドレスは既に使用されています";
        } else if (error.message.includes("Network") || error.message.includes("network")) {
          errorMessage = "ネットワークエラーが発生しました。接続を確認してください。";
        } else if (error.message.includes("Password") || error.message.includes("password")) {
          errorMessage = "パスワードがポリシーに準拠していません（8文字以上、英数字を含む）";
        } else if (error.message.includes("domain") || error.message.includes("Domain")) {
          errorMessage = "システム設定エラーが発生しました。管理者に連絡してください。";
        } else if (error.message.includes("InvalidParameterException")) {
          errorMessage = "入力内容に問題があります。メールアドレスとパスワードを確認してください。";
        } else {
          errorMessage = `エラー: ${error.message}`;
        }
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  // 成功メッセージを表示
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">📧</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {language === "ja" ? "確認メールを送信しました" : "Verification Email Sent"}
            </h2>
            <p className="text-gray-600 mb-6">
              {language === "ja" 
                ? `${formData.email} に確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。`
                : `We've sent a verification email to ${formData.email}. Please click the link in the email to activate your account.`
              }
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                {language === "ja"
                  ? "💡 メールが届かない場合は、迷惑メールフォルダをご確認ください。"
                  : "💡 If you don't see the email, please check your spam folder."
                }
              </p>
            </div>
            <button
              onClick={() => {
                setShowSuccess(false);
                onClose();
              }}
              className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium"
            >
              {language === "ja" ? "閉じる" : "Close"}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="text-2xl">🪺</div>
            <h2 className="text-2xl font-bold text-gray-800">{t.createAccount}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.email} <span className="text-red-500">*</span>
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
          
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.password} <span className="text-red-500">*</span>
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
            
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
            
            {/* Password requirements */}
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              <p className="font-medium">{t.passwordRequirements}</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li className={formData.password.length >= 8 ? "text-green-600" : ""}>
                  8文字以上
                </li>
                <li className={/[a-zA-Z]/.test(formData.password) ? "text-green-600" : ""}>
                  英字を含む
                </li>
                <li className={/[0-9]/.test(formData.password) ? "text-green-600" : ""}>
                  数字を含む
                </li>
              </ul>
            </div>
          </div>
          
          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.confirmPassword} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
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
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
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
            className="w-full px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#14b8a6", color: "white" }}
            onMouseEnter={(e) =>
              !isSubmitting && (e.currentTarget.style.backgroundColor = "#0f766e")
            }
            onMouseLeave={(e) =>
              !isSubmitting && (e.currentTarget.style.backgroundColor = "#14b8a6")
            }
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                作成中...
              </span>
            ) : (
              t.createAccount
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

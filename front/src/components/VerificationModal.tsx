"use client";

import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";

interface VerificationModalProps {
  isOpen: boolean;
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onClose: () => void;
}

export default function VerificationModal({
  isOpen,
  email,
  onVerify,
  onResend,
  onClose,
}: VerificationModalProps) {
  const { language } = useApp();
  const t = useTranslation(language);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await onVerify(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.verificationFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError("");
    try {
      await onResend();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.resendFailed);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <div className="text-2xl">📧</div>
            <h2 className="text-2xl font-bold text-gray-800">{t.verifyEmail}</h2>
          </div>
          <p className="text-sm text-gray-600">
            {t.verificationCodeSent} <strong>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.verificationCode}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent disabled:opacity-50 text-center text-2xl tracking-widest"
              placeholder="000000"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || code.length !== 6}
            className="w-full px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#14b8a6", color: "white" }}
          >
            {isSubmitting ? t.verifying : t.verify}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-sm text-[#14b8a6] hover:underline disabled:opacity-50"
            >
              {isResending ? t.resending : t.resendCode}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-600 hover:underline"
            >
              {t.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

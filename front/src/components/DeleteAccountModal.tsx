"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const router = useRouter();
  const { language } = useApp();
  const { user, logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");

  const requiredText = language === "ja" ? "削除する" : "DELETE";

  const handleDelete = async () => {
    if (confirmText !== requiredText) {
      setError(language === "ja" 
        ? `「${requiredText}」と入力してください` 
        : `Please type "${requiredText}"`);
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const { authApi } = await import("@/lib/api");
      await authApi.deleteCurrentUser();
      
      // Logout and redirect
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Delete account error:", error);
      setError(language === "ja" 
        ? "アカウント削除に失敗しました。もう一度お試しください。" 
        : "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800">
              {language === "ja" ? "アカウント削除" : "Delete Account"}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-500 hover:text-gray-700 text-xl disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-800 mb-2">
              {language === "ja" ? "⚠️ 警告：この操作は取り消せません" : "⚠️ Warning: This action cannot be undone"}
            </p>
            <p className="text-sm text-red-700">
              {language === "ja" 
                ? "アカウントを削除すると、以下のデータがすべて削除されます：" 
                : "Deleting your account will permanently remove:"}
            </p>
          </div>

          {/* Data List */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-start space-x-2">
              <span className="text-red-500 mt-0.5">🗑️</span>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {language === "ja" ? "すべてのバウアー（フィードコレクション）" : "All bowers (feed collections)"}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-red-500 mt-0.5">🗑️</span>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {language === "ja" ? "登録したすべてのフィード" : "All registered feeds"}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-red-500 mt-0.5">🗑️</span>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {language === "ja" ? "いいねした記事" : "Liked articles"}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-red-500 mt-0.5">🗑️</span>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {language === "ja" ? "ひよこの成長記録" : "Chick growth records"}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-red-500 mt-0.5">🗑️</span>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {language === "ja" ? "アカウント情報" : "Account information"}
                </p>
              </div>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-600 mb-1">
                {language === "ja" ? "削除されるアカウント：" : "Account to be deleted:"}
              </p>
              <p className="text-sm font-medium text-blue-800">{user.email}</p>
            </div>
          )}

          {/* Confirmation Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === "ja" 
                ? `確認のため「${requiredText}」と入力してください` 
                : `Type "${requiredText}" to confirm`}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setError("");
              }}
              disabled={isDeleting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
              placeholder={requiredText}
              autoComplete="off"
            />
            {error && (
              <p className="text-red-600 text-sm mt-1">{error}</p>
            )}
          </div>

          {/* Info Message */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">
              {language === "ja" 
                ? "💡 アカウントを削除しても、いつでも新しいアカウントを作成できます。" 
                : "💡 You can always create a new account after deletion."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {language === "ja" ? "キャンセル" : "Cancel"}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== requiredText}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {language === "ja" ? "削除中..." : "Deleting..."}
              </span>
            ) : (
              language === "ja" ? "アカウントを削除" : "Delete Account"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

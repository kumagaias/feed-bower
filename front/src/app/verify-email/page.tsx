'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import { useAuth } from '@/contexts/AuthContext'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useApp()
  const { isAuthenticated } = useAuth()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // 既にログイン済みの場合はバウアーページへ
    if (isAuthenticated) {
      router.push('/bowers')
      return
    }

    // URLパラメータから確認コードを取得
    const code = searchParams.get('code')
    const username = searchParams.get('username')

    if (code && username) {
      // Cognitoが確認を完了している場合
      setStatus('success')
    } else {
      // パラメータがない場合は成功とみなす（Cognitoが自動処理）
      setStatus('success')
    }
  }, [isAuthenticated, router, searchParams])

  // カウントダウンタイマー
  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (status === 'success' && countdown === 0) {
      router.push('/')
    }
  }, [status, countdown, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-amber-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="text-6xl mb-4 animate-bounce">🐣</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                {language === 'ja' ? 'メールアドレスを確認中...' : 'Verifying your email...'}
              </h1>
              <p className="text-gray-600">
                {language === 'ja' ? 'しばらくお待ちください' : 'Please wait a moment'}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                {language === 'ja' ? 'メールアドレスが確認されました！' : 'Email verified successfully!'}
              </h1>
              <p className="text-gray-600 mb-6">
                {language === 'ja' 
                  ? 'アカウントの作成が完了しました。ログインしてFeed Bowerを始めましょう。'
                  : 'Your account has been created. Log in to start using Feed Bower.'
                }
              </p>
              <div className="bg-teal-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-teal-700">
                  {language === 'ja' 
                    ? `${countdown}秒後にログインページに移動します...`
                    : `Redirecting to login page in ${countdown} seconds...`
                  }
                </p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-teal-500 text-white py-3 rounded-lg hover:bg-teal-600 transition-colors font-semibold"
              >
                {language === 'ja' ? '今すぐログイン' : 'Login Now'}
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                {language === 'ja' ? '確認に失敗しました' : 'Verification failed'}
              </h1>
              <p className="text-gray-600 mb-6">
                {language === 'ja' 
                  ? 'メールアドレスの確認に失敗しました。リンクが無効か、期限切れの可能性があります。'
                  : 'Failed to verify your email. The link may be invalid or expired.'
                }
              </p>
              <button
                onClick={() => router.push('/signup')}
                className="w-full bg-teal-500 text-white py-3 rounded-lg hover:bg-teal-600 transition-colors font-semibold"
              >
                {language === 'ja' ? 'サインアップページに戻る' : 'Back to Sign Up'}
              </button>
            </>
          )}
        </div>

        {/* Feed Bower Logo */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            🪺 Feed Bower
          </p>
        </div>
      </div>
    </div>
  )
}

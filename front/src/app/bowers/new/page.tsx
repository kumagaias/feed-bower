'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/lib/i18n'
import { useBowers } from '@/hooks/useBowers'
import Layout from '@/components/Layout'
import Toast from '@/components/Toast'
import BowerEditModal from '@/components/BowerEditModal'
import { colors } from '@/styles/colors'

export default function NewBowerPage() {
  const { language } = useApp()
  const { isAuthenticated, isLoading } = useAuth()
  const t = useTranslation(language)
  const router = useRouter()
  const { createBower } = useBowers()

  const [showEditModal, setShowEditModal] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  // Redirect to home if not logged in
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">🪺</div>
              <p className="text-lg">{language === 'ja' ? '読み込み中...' : 'Loading...'}</p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // Don't render if not logged in
  if (!isAuthenticated) {
    return null
  }

  // Handle modal close
  const handleModalClose = () => {
    setShowEditModal(false)
    router.push('/bowers')
  }

  // Handle bower save
  const handleBowerSave = async (bowerData: { name: string; keywords: string[]; feeds: any[] }) => {
    if (!bowerData.name.trim()) {
      setToast({
        message: language === 'ja' ? 'バウアー名を入力してください' : 'Please enter a bower name',
        type: 'error'
      })
      return
    }

    if (bowerData.keywords.length === 0) {
      setToast({
        message: language === 'ja' ? '少なくとも1つのキーワードを追加してください' : 'Please add at least one keyword',
        type: 'error'
      })
      return
    }

    try {
      // Show creating toast
      setToast({
        message: language === 'ja' ? 'バウアーを作成中...' : 'Creating bower...',
        type: 'success'
      })

      const bower = await createBower({
        name: bowerData.name.trim(),
        keywords: bowerData.keywords,
        is_public: false // デフォルトは非公開
      })

      if (bower) {
        setShowEditModal(false) // モーダルを閉じる
        setToast({
          message: language === 'ja' ? 'バウアーを作成しました！' : 'Bower created successfully!',
          type: 'success'
        })
        
        // Redirect to bowers page after a short delay
        setTimeout(() => {
          router.push('/bowers')
        }, 1000)
      } else {
        setToast({
          message: language === 'ja' ? 'バウアーの作成に失敗しました' : 'Failed to create bower',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Failed to create bower:', error)
      setToast({
        message: language === 'ja' ? 'バウアーの作成に失敗しました' : 'Failed to create bower',
        type: 'error'
      })
    }
  }

  return (
    <Layout>
      {/* バウアー編集モーダルを使用 */}
      <BowerEditModal
        isOpen={showEditModal}
        onClose={handleModalClose}
        onSave={handleBowerSave}
        bower={null} // 新規作成なのでnull
      />

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  )
}
'use client'

import Layout from '@/components/Layout'

export default function BowersPage() {
  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            バウアー
          </h1>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🪺</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                バウアーがまだありません
              </h2>
              <p className="text-gray-500 mb-6">
                最初のバウアーを作成して、AIにフィードを見つけてもらいましょう
              </p>
              <button className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors">
                新しいバウアーを作成
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
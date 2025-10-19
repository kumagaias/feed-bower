/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // 静的エクスポート（SPA）
  images: {
    unoptimized: true,  // 静的エクスポートでは画像最適化が使えない
  },
  env: {
    // ローカル開発時のCognito設定を強制
    AWS_ENDPOINT_URL_COGNITO_IDP: process.env.NODE_ENV === 'development' ? 'http://localhost:9229' : undefined,
  },
  serverExternalPackages: ['aws-amplify'],
}

module.exports = nextConfig
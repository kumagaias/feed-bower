/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Amplify Hosting 用
  env: {
    // ローカル開発時のCognito設定を強制
    AWS_ENDPOINT_URL_COGNITO_IDP: process.env.NODE_ENV === 'development' ? 'http://localhost:9229' : undefined,
  },
  serverExternalPackages: ['aws-amplify'],
}

module.exports = nextConfig
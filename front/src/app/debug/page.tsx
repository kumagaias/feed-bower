'use client'

export default function DebugPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Environment Variables:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>NEXT_PUBLIC_COGNITO_USER_POOL_ID: {process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'Not set'}</li>
            <li>NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID: {process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || 'Not set'}</li>
            <li>NEXT_PUBLIC_AWS_REGION: {process.env.NEXT_PUBLIC_AWS_REGION || 'Not set'}</li>
            <li>NEXT_PUBLIC_API_URL: {process.env.NEXT_PUBLIC_API_URL || 'Not set'}</li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Node Environment:</h2>
          <p>NODE_ENV: {process.env.NODE_ENV}</p>
        </div>
      </div>
    </div>
  )
}
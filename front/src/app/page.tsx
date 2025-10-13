export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-[var(--color-primary)] mb-8">
          Feed Bower
        </h1>
      </div>

      <div className="relative flex place-items-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[var(--color-secondary)] mb-4">
            Welcome to Feed Bower
          </h2>
          <p className="text-[var(--color-text-muted)] mb-8">
            AI-powered RSS feed management system
          </p>
          
          {/* Navigation buttons */}
          <div className="flex gap-4 justify-center">
            <a href="/feeds" className="bg-[var(--color-primary)] text-[var(--color-button-text)] px-6 py-3 rounded-lg hover:bg-[var(--color-secondary)] transition-colors animate-float inline-block">
              Get Started
            </a>
            <a href="/bowers" className="bg-[var(--color-accent)] text-[var(--color-button-text)] px-6 py-3 rounded-lg hover:opacity-90 transition-opacity inline-block">
              View Bowers
            </a>
          </div>
        </div>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left mt-16">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-[var(--color-tertiary)] hover:bg-[var(--color-background-card)]">
          <h3 className="mb-3 text-2xl font-semibold text-[var(--color-primary)]">
            🐣 Chick System
          </h3>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Gamified experience with your personal chick companion
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-[var(--color-tertiary)] hover:bg-[var(--color-background-card)]">
          <h3 className="mb-3 text-2xl font-semibold text-[var(--color-primary)]">
            🏠 Bowers
          </h3>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Organize your feeds by keywords and interests
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-[var(--color-tertiary)] hover:bg-[var(--color-background-card)]">
          <h3 className="mb-3 text-2xl font-semibold text-[var(--color-primary)]">
            📰 Smart Feeds
          </h3>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            AI-powered RSS feed recommendations and management
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-[var(--color-tertiary)] hover:bg-[var(--color-background-card)]">
          <h3 className="mb-3 text-2xl font-semibold text-[var(--color-primary)]">
            🌐 Multi-language
          </h3>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Support for Japanese and English interfaces
          </p>
        </div>
      </div>
    </main>
  )
}
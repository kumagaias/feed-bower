// Validation utility functions

// URL validation
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

// RSS/Atom feed URL validation
export function isValidFeedUrl(url: string): boolean {
  if (!isValidUrl(url)) return false
  
  // Common feed URL patterns
  const feedPatterns = [
    /\/feed\/?$/i,
    /\/rss\/?$/i,
    /\/atom\/?$/i,
    /\.xml$/i,
    /\.rss$/i,
    /\/feed\.xml$/i,
    /\/rss\.xml$/i,
    /\/atom\.xml$/i,
  ]
  
  return feedPatterns.some(pattern => pattern.test(url))
}

// Email validation
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Bower name validation
export function isValidBowerName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  
  // Must be 1-50 characters, alphanumeric and spaces allowed
  return name.trim().length >= 1 && name.trim().length <= 50
}

// Keyword validation
export function isValidKeyword(keyword: string): boolean {
  if (!keyword || typeof keyword !== 'string') return false
  
  // Must be 1-30 characters, no special characters except hyphen and underscore
  const keywordRegex = /^[a-zA-Z0-9\-_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]{1,30}$/
  return keywordRegex.test(keyword.trim())
}

// Validation error messages
export const validationMessages = {
  en: {
    invalidUrl: 'Please enter a valid URL',
    invalidFeedUrl: 'Please enter a valid RSS/Atom feed URL',
    invalidEmail: 'Please enter a valid email address',
    invalidBowerName: 'Bower name must be 1-50 characters',
    invalidKeyword: 'Keyword must be 1-30 characters and contain only letters, numbers, spaces, hyphens, and underscores',
    required: 'This field is required',
  },
  ja: {
    invalidUrl: '有効なURLを入力してください',
    invalidFeedUrl: '有効なRSS/AtomフィードのURLを入力してください',
    invalidEmail: '有効なメールアドレスを入力してください',
    invalidBowerName: 'バウアー名は1-50文字で入力してください',
    invalidKeyword: 'キーワードは1-30文字で、文字・数字・スペース・ハイフン・アンダースコアのみ使用できます',
    required: 'この項目は必須です',
  },
}

// Get validation message
export function getValidationMessage(key: keyof typeof validationMessages.en, language: 'en' | 'ja' = 'en'): string {
  return validationMessages[language][key] || validationMessages.en[key]
}
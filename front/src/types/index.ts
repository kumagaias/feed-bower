export interface Feed {
  id: string
  title: string
  url: string
  description: string
  category: string
  lastUpdated: Date
}

export interface Article {
  id: string
  feedId: string
  title: string
  content: string
  url: string
  publishedAt: Date
  liked: boolean
}

export interface Bower {
  id: string
  name: string
  keywords: string[]
  feeds: Feed[]
  color: string
  createdAt: Date
  isPublic: boolean
  creatorId?: string
  creatorName?: string
  likes?: number
  likedBy?: string[]
  eggColors?: string[]
}

export interface User {
  id: string
  email: string
  name: string
  isGuest: boolean
}

export interface ChickStats {
  totalLikes: number
  level: number
  experience: number
  nextLevelExp: number
  checkedDays: number
}
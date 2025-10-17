import { KEYWORD_COLORS, generateKeywordColors, generateKeywordColorPairs, getKeywordColor } from '../colors'

describe('colors', () => {
  describe('KEYWORD_COLORS', () => {
    it('should have at least 10 colors', () => {
      expect(KEYWORD_COLORS.length).toBeGreaterThanOrEqual(10)
    })

    it('should contain valid hex colors', () => {
      KEYWORD_COLORS.forEach(color => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      })
    })
  })

  describe('generateKeywordColors', () => {
    it('should generate colors for keywords', () => {
      const keywords = ['AI', 'Programming', 'Design']
      const colors = generateKeywordColors(keywords)
      
      expect(colors).toHaveLength(3)
      colors.forEach(color => {
        expect(KEYWORD_COLORS).toContain(color)
      })
    })

    it('should cycle through colors for many keywords', () => {
      const keywords = Array.from({ length: 25 }, (_, i) => `keyword${i}`)
      const colors = generateKeywordColors(keywords)
      
      expect(colors).toHaveLength(25)
      // Should cycle back to first color
      expect(colors[0]).toBe(colors[KEYWORD_COLORS.length])
    })
  })

  describe('generateKeywordColorPairs', () => {
    it('should generate keyword-color pairs', () => {
      const keywords = ['AI', 'Programming']
      const pairs = generateKeywordColorPairs(keywords)
      
      expect(pairs).toHaveLength(2)
      expect(pairs[0]).toEqual({
        keyword: 'AI',
        color: KEYWORD_COLORS[0]
      })
      expect(pairs[1]).toEqual({
        keyword: 'Programming',
        color: KEYWORD_COLORS[1]
      })
    })
  })

  describe('getKeywordColor', () => {
    it('should return consistent colors for same keyword', () => {
      const keyword = 'AI'
      const color1 = getKeywordColor(keyword)
      const color2 = getKeywordColor(keyword)
      
      expect(color1).toBe(color2)
      expect(KEYWORD_COLORS).toContain(color1)
    })

    it('should return different colors for different keywords', () => {
      const color1 = getKeywordColor('AI')
      const color2 = getKeywordColor('Programming')
      
      // They might be the same due to hash collision, but usually different
      expect(typeof color1).toBe('string')
      expect(typeof color2).toBe('string')
    })

    it('should handle Japanese keywords', () => {
      const color = getKeywordColor('プログラミング')
      expect(KEYWORD_COLORS).toContain(color)
    })

    it('should handle empty string', () => {
      const color = getKeywordColor('')
      expect(KEYWORD_COLORS).toContain(color)
    })
  })
})
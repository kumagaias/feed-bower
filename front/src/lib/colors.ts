// 共通のキーワード色配列
export const KEYWORD_COLORS = [
  '#14b8a6', // teal-500
  '#4ECDC4', // light teal
  '#45B7D1', // sky blue
  '#96CEB4', // mint green
  '#DDA0DD', // plum
  '#98D8C8', // aqua
  '#F4A460', // sandy brown
  '#87CEEB', // sky blue
  '#FFB6C1', // light pink
  '#20B2AA', // light sea green
  '#FF6347', // tomato
  '#40E0D0', // turquoise
  '#DA70D6', // orchid
  '#32CD32', // lime green
  '#FF69B4', // hot pink
  '#00CED1', // dark turquoise
  '#FFD700', // gold
  '#FF1493', // deep pink
  '#00FA9A', // medium spring green
  '#1E90FF'  // dodger blue
];

// キーワードに基づいて色を生成する関数
export const generateKeywordColors = (keywords: string[]): string[] => {
  return keywords.map((_, index) => KEYWORD_COLORS[index % KEYWORD_COLORS.length]);
};

// キーワードと色のペアを生成する関数
export const generateKeywordColorPairs = (keywords: string[]): Array<{keyword: string, color: string}> => {
  return keywords.map((keyword, index) => ({
    keyword,
    color: KEYWORD_COLORS[index % KEYWORD_COLORS.length]
  }));
};

// キーワードの文字列をハッシュ化して一貫した色を取得する関数
export const getKeywordColor = (keyword: string): string => {
  // 文字列をハッシュ化（簡単なハッシュ関数）
  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    const char = keyword.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  
  // ハッシュ値を色配列のインデックスに変換
  const colorIndex = Math.abs(hash) % KEYWORD_COLORS.length;
  return KEYWORD_COLORS[colorIndex];
};
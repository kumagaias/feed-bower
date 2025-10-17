#!/usr/bin/env node

/**
 * 開発用: 複数のフィードを並列で追加するスクリプト
 * Usage: node scripts/add-feeds-parallel.js
 */

const API_BASE_URL = 'http://localhost:8080/api';

// 開発用のフィードリスト
const DEVELOPMENT_FEEDS = [
  {
    url: 'https://dev.to/feed',
    title: 'DEV Community',
    description: 'Programming articles and tutorials'
  },
  {
    url: 'https://techcrunch.com/feed/',
    title: 'TechCrunch',
    description: 'Latest technology news'
  },
  {
    url: 'https://www.theverge.com/rss/index.xml',
    title: 'The Verge',
    description: 'Technology and culture'
  },
  {
    url: 'https://qiita.com/tags/programming/feed',
    title: 'Qiita Programming',
    description: 'Japanese programming articles'
  },
  {
    url: 'https://zenn.dev/feed',
    title: 'Zenn',
    description: 'Japanese tech articles'
  }
];

async function addFeed(bowerId, feed) {
  try {
    console.log(`📡 Adding feed: ${feed.title}`);
    
    const response = await fetch(`${API_BASE_URL}/feeds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 開発用の認証ヘッダー（実際の実装に合わせて調整）
        'Authorization': 'Bearer dev-token'
      },
      body: JSON.stringify({
        bower_id: bowerId,
        url: feed.url,
        title: feed.title,
        description: feed.description
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Successfully added: ${feed.title}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to add ${feed.title}:`, error.message);
    return null;
  }
}

async function addFeedsParallel(bowerId, feeds) {
  console.log(`🚀 Starting parallel feed addition for bower: ${bowerId}`);
  console.log(`📊 Total feeds to add: ${feeds.length}`);
  
  const startTime = Date.now();
  
  // Promise.allで並列実行
  const results = await Promise.all(
    feeds.map(feed => addFeed(bowerId, feed))
  );
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // 結果の集計
  const successful = results.filter(result => result !== null);
  const failed = results.filter(result => result === null);
  
  console.log('\n📈 Results Summary:');
  console.log(`⏱️  Total time: ${duration}ms`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📊 Success rate: ${((successful.length / feeds.length) * 100).toFixed(1)}%`);
  
  return {
    successful,
    failed: failed.length,
    duration,
    successRate: (successful.length / feeds.length) * 100
  };
}

// メイン実行
async function main() {
  const bowerId = process.argv[2] || 'mock-bower-1';
  
  console.log('🔧 Development Feed Addition Script');
  console.log(`🎯 Target Bower ID: ${bowerId}`);
  console.log('=' .repeat(50));
  
  try {
    const results = await addFeedsParallel(bowerId, DEVELOPMENT_FEEDS);
    
    if (results.successful.length > 0) {
      console.log('\n🎉 Feed addition completed successfully!');
    } else {
      console.log('\n⚠️  No feeds were added successfully.');
    }
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみmainを実行
if (require.main === module) {
  main();
}

module.exports = { addFeedsParallel, DEVELOPMENT_FEEDS };
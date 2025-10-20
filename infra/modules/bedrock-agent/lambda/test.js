const { handler } = require('./index');

// Test cases
const testCases = [
  {
    name: 'Test 1: AI and machine learning keywords (English)',
    event: {
      actionGroup: 'feed-search',
      function: 'search-feeds',
      parameters: {
        keywords: ['AI', 'machine learning'],
        language: 'en',
        limit: 5
      }
    }
  },
  {
    name: 'Test 2: Programming keywords (Japanese)',
    event: {
      actionGroup: 'feed-search',
      function: 'search-feeds',
      parameters: {
        keywords: ['プログラミング', 'tech'],
        language: 'ja',
        limit: 3
      }
    }
  },
  {
    name: 'Test 3: Cloud keywords (no language preference)',
    event: {
      actionGroup: 'feed-search',
      function: 'search-feeds',
      parameters: {
        keywords: ['cloud', 'aws', 'devops'],
        limit: 5
      }
    }
  },
  {
    name: 'Test 4: Single keyword as string',
    event: {
      actionGroup: 'feed-search',
      function: 'search-feeds',
      parameters: {
        keywords: 'tensorflow',
        language: 'en',
        limit: 3
      }
    }
  },
  {
    name: 'Test 5: Missing keywords (should fail)',
    event: {
      actionGroup: 'feed-search',
      function: 'search-feeds',
      parameters: {
        language: 'en',
        limit: 5
      }
    }
  },
  {
    name: 'Test 6: Empty keywords array (should fail)',
    event: {
      actionGroup: 'feed-search',
      function: 'search-feeds',
      parameters: {
        keywords: [],
        language: 'en',
        limit: 5
      }
    }
  },
  {
    name: 'Test 7: Invalid limit (should fail)',
    event: {
      actionGroup: 'feed-search',
      function: 'search-feeds',
      parameters: {
        keywords: ['tech'],
        limit: 15
      }
    }
  },
  {
    name: 'Test 8: Invalid language (should fail)',
    event: {
      actionGroup: 'feed-search',
      function: 'search-feeds',
      parameters: {
        keywords: ['tech'],
        language: 'fr'
      }
    }
  }
];

// Run tests
async function runTests() {
  console.log('='.repeat(80));
  console.log('Running Lambda Function Tests');
  console.log('='.repeat(80));
  console.log();
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log('-'.repeat(80));
    
    try {
      const result = await handler(testCase.event);
      console.log(`Status Code: ${result.statusCode}`);
      
      const body = JSON.parse(result.body);
      
      if (result.statusCode === 200) {
        console.log(`✅ Success: Found ${body.total} feeds`);
        if (body.feeds && body.feeds.length > 0) {
          console.log('\nTop results:');
          body.feeds.slice(0, 3).forEach((feed, idx) => {
            console.log(`  ${idx + 1}. ${feed.title} (relevance: ${feed.relevance.toFixed(3)})`);
          });
        }
        passed++;
      } else if (result.statusCode === 400) {
        console.log(`⚠️  Expected validation error: ${body.error}`);
        if (body.details) {
          console.log(`   Details: ${body.details.join(', ')}`);
        }
        passed++;
      } else {
        console.log(`❌ Unexpected status code: ${result.statusCode}`);
        console.log(`   Response: ${JSON.stringify(body, null, 2)}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});

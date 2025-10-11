package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"

	"feed-bower-api/internal/model"
	dynamodbpkg "feed-bower-api/pkg/dynamodb"
)

// ArticleRepository defines the interface for article data operations
type ArticleRepository interface {
	Create(ctx context.Context, article *model.Article) error
	GetByID(ctx context.Context, articleID string) (*model.Article, error)
	GetByFeedID(ctx context.Context, feedID string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Article, map[string]types.AttributeValue, error)
	GetByFeedIDs(ctx context.Context, feedIDs []string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Article, map[string]types.AttributeValue, error)
	GetByURL(ctx context.Context, url string) (*model.Article, error)
	Update(ctx context.Context, article *model.Article) error
	Delete(ctx context.Context, articleID string) error
	List(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Article, map[string]types.AttributeValue, error)
	Search(ctx context.Context, query string, feedIDs []string, limit int32) ([]*model.Article, error)
	BatchCreate(ctx context.Context, articles []*model.Article) error
}

// articleRepository implements ArticleRepository interface
type articleRepository struct {
	client *dynamodbpkg.Client
	tables *dynamodbpkg.TableNames
}

// NewArticleRepository creates a new article repository
func NewArticleRepository(client *dynamodbpkg.Client) ArticleRepository {
	return &articleRepository{
		client: client,
		tables: client.GetTableNames(),
	}
}

// Create creates a new article in DynamoDB
func (r *articleRepository) Create(ctx context.Context, article *model.Article) error {
	if article == nil {
		return errors.New("article cannot be nil")
	}

	// Generate UUID if not provided
	if article.ArticleID == "" {
		article.ArticleID = uuid.New().String()
	}

	// Marshal article to DynamoDB attribute values
	item, err := attributevalue.MarshalMap(article)
	if err != nil {
		return fmt.Errorf("failed to marshal article: %w", err)
	}

	// Create the item with condition that article_id doesn't exist
	input := &dynamodb.PutItemInput{
		TableName:           aws.String(r.tables.Articles),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(article_id)"),
	}

	_, err = r.client.PutItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("article with ID %s already exists", article.ArticleID)
		}
		return fmt.Errorf("failed to create article: %w", err)
	}

	return nil
}

// GetByID retrieves an article by its ID
func (r *articleRepository) GetByID(ctx context.Context, articleID string) (*model.Article, error) {
	if articleID == "" {
		return nil, errors.New("articleID cannot be empty")
	}

	input := &dynamodb.GetItemInput{
		TableName: aws.String(r.tables.Articles),
		Key: map[string]types.AttributeValue{
			"article_id": &types.AttributeValueMemberS{Value: articleID},
		},
	}

	result, err := r.client.GetItem(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get article by ID: %w", err)
	}

	if result.Item == nil {
		return nil, fmt.Errorf("article with ID %s not found", articleID)
	}

	var article model.Article
	err = attributevalue.UnmarshalMap(result.Item, &article)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal article: %w", err)
	}

	return &article, nil
}

// GetByFeedID retrieves articles by feed ID using GSI, sorted by published_at descending
func (r *articleRepository) GetByFeedID(ctx context.Context, feedID string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Article, map[string]types.AttributeValue, error) {
	if feedID == "" {
		return nil, nil, errors.New("feedID cannot be empty")
	}
	if limit <= 0 {
		limit = 50 // Default limit
	}

	input := &dynamodb.QueryInput{
		TableName:              aws.String(r.tables.Articles),
		IndexName:              aws.String("FeedIdPublishedAtIndex"),
		KeyConditionExpression: aws.String("feed_id = :feed_id"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":feed_id": &types.AttributeValueMemberS{Value: feedID},
		},
		Limit:            aws.Int32(limit),
		ScanIndexForward: aws.Bool(false), // Sort by published_at descending
	}

	if lastKey != nil {
		input.ExclusiveStartKey = lastKey
	}

	result, err := r.client.Query(ctx, input)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to query articles by feed ID: %w", err)
	}

	articles := make([]*model.Article, 0, len(result.Items))
	for _, item := range result.Items {
		var article model.Article
		err = attributevalue.UnmarshalMap(item, &article)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to unmarshal article: %w", err)
		}
		articles = append(articles, &article)
	}

	return articles, result.LastEvaluatedKey, nil
}

// GetByFeedIDs retrieves articles from multiple feeds, sorted by published_at descending
func (r *articleRepository) GetByFeedIDs(ctx context.Context, feedIDs []string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Article, map[string]types.AttributeValue, error) {
	if len(feedIDs) == 0 {
		return nil, nil, errors.New("feedIDs cannot be empty")
	}
	if limit <= 0 {
		limit = 50 // Default limit
	}

	// For multiple feed IDs, we need to use a scan with filter expression
	// This is not the most efficient approach, but DynamoDB doesn't support OR conditions in KeyConditionExpression
	filterExpressions := make([]string, len(feedIDs))
	expressionAttributeValues := make(map[string]types.AttributeValue)

	for i, feedID := range feedIDs {
		placeholder := fmt.Sprintf(":feed_id_%d", i)
		filterExpressions[i] = fmt.Sprintf("feed_id = %s", placeholder)
		expressionAttributeValues[placeholder] = &types.AttributeValueMemberS{Value: feedID}
	}

	filterExpression := fmt.Sprintf("(%s)", joinStrings(filterExpressions, " OR "))

	input := &dynamodb.ScanInput{
		TableName:                 aws.String(r.tables.Articles),
		FilterExpression:          aws.String(filterExpression),
		ExpressionAttributeValues: expressionAttributeValues,
		Limit:                     aws.Int32(limit),
	}

	if lastKey != nil {
		input.ExclusiveStartKey = lastKey
	}

	result, err := r.client.Scan(ctx, input)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to scan articles by feed IDs: %w", err)
	}

	articles := make([]*model.Article, 0, len(result.Items))
	for _, item := range result.Items {
		var article model.Article
		err = attributevalue.UnmarshalMap(item, &article)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to unmarshal article: %w", err)
		}
		articles = append(articles, &article)
	}

	return articles, result.LastEvaluatedKey, nil
}

// GetByURL retrieves an article by its URL (for duplicate checking)
func (r *articleRepository) GetByURL(ctx context.Context, url string) (*model.Article, error) {
	if url == "" {
		return nil, errors.New("url cannot be empty")
	}

	input := &dynamodb.ScanInput{
		TableName:        aws.String(r.tables.Articles),
		FilterExpression: aws.String("#url = :url"),
		ExpressionAttributeNames: map[string]string{
			"#url": "url", // 'url' might be a reserved keyword
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":url": &types.AttributeValueMemberS{Value: url},
		},
		Limit: aws.Int32(1),
	}

	result, err := r.client.Scan(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to scan articles by URL: %w", err)
	}

	if len(result.Items) == 0 {
		return nil, fmt.Errorf("article with URL %s not found", url)
	}

	var article model.Article
	err = attributevalue.UnmarshalMap(result.Items[0], &article)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal article: %w", err)
	}

	return &article, nil
}

// Update updates an existing article
func (r *articleRepository) Update(ctx context.Context, article *model.Article) error {
	if article == nil {
		return errors.New("article cannot be nil")
	}
	if article.ArticleID == "" {
		return errors.New("article ID cannot be empty")
	}

	// Marshal article to DynamoDB attribute values
	item, err := attributevalue.MarshalMap(article)
	if err != nil {
		return fmt.Errorf("failed to marshal article: %w", err)
	}

	// Update the item with condition that article_id exists
	input := &dynamodb.PutItemInput{
		TableName:           aws.String(r.tables.Articles),
		Item:                item,
		ConditionExpression: aws.String("attribute_exists(article_id)"),
	}

	_, err = r.client.PutItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("article with ID %s not found", article.ArticleID)
		}
		return fmt.Errorf("failed to update article: %w", err)
	}

	return nil
}

// Delete deletes an article by its ID
func (r *articleRepository) Delete(ctx context.Context, articleID string) error {
	if articleID == "" {
		return errors.New("articleID cannot be empty")
	}

	input := &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tables.Articles),
		Key: map[string]types.AttributeValue{
			"article_id": &types.AttributeValueMemberS{Value: articleID},
		},
		ConditionExpression: aws.String("attribute_exists(article_id)"),
	}

	_, err := r.client.DeleteItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("article with ID %s not found", articleID)
		}
		return fmt.Errorf("failed to delete article: %w", err)
	}

	return nil
}

// List retrieves a paginated list of articles
func (r *articleRepository) List(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Article, map[string]types.AttributeValue, error) {
	if limit <= 0 {
		limit = 50 // Default limit
	}

	input := &dynamodb.ScanInput{
		TableName: aws.String(r.tables.Articles),
		Limit:     aws.Int32(limit),
	}

	if lastKey != nil {
		input.ExclusiveStartKey = lastKey
	}

	result, err := r.client.Scan(ctx, input)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to list articles: %w", err)
	}

	articles := make([]*model.Article, 0, len(result.Items))
	for _, item := range result.Items {
		var article model.Article
		err = attributevalue.UnmarshalMap(item, &article)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to unmarshal article: %w", err)
		}
		articles = append(articles, &article)
	}

	return articles, result.LastEvaluatedKey, nil
}

// Search searches for articles by title or content
func (r *articleRepository) Search(ctx context.Context, query string, feedIDs []string, limit int32) ([]*model.Article, error) {
	if query == "" {
		return nil, errors.New("query cannot be empty")
	}
	if limit <= 0 {
		limit = 50 // Default limit
	}

	var filterExpression string
	expressionAttributeValues := map[string]types.AttributeValue{
		":query": &types.AttributeValueMemberS{Value: query},
	}

	// Base search expression
	searchExpression := "contains(title, :query) OR contains(content, :query)"

	if len(feedIDs) > 0 {
		// Add feed ID filter if provided
		feedFilterExpressions := make([]string, len(feedIDs))
		for i, feedID := range feedIDs {
			placeholder := fmt.Sprintf(":feed_id_%d", i)
			feedFilterExpressions[i] = fmt.Sprintf("feed_id = %s", placeholder)
			expressionAttributeValues[placeholder] = &types.AttributeValueMemberS{Value: feedID}
		}
		feedFilter := fmt.Sprintf("(%s)", joinStrings(feedFilterExpressions, " OR "))
		filterExpression = fmt.Sprintf("(%s) AND (%s)", searchExpression, feedFilter)
	} else {
		filterExpression = searchExpression
	}

	input := &dynamodb.ScanInput{
		TableName:                 aws.String(r.tables.Articles),
		FilterExpression:          aws.String(filterExpression),
		ExpressionAttributeValues: expressionAttributeValues,
		Limit:                     aws.Int32(limit),
	}

	result, err := r.client.Scan(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to search articles: %w", err)
	}

	articles := make([]*model.Article, 0, len(result.Items))
	for _, item := range result.Items {
		var article model.Article
		err = attributevalue.UnmarshalMap(item, &article)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal article: %w", err)
		}
		articles = append(articles, &article)
	}

	return articles, nil
}

// BatchCreate creates multiple articles in a single batch operation
func (r *articleRepository) BatchCreate(ctx context.Context, articles []*model.Article) error {
	if len(articles) == 0 {
		return nil
	}

	// DynamoDB batch write can handle up to 25 items at a time
	const batchSize = 25

	for i := 0; i < len(articles); i += batchSize {
		end := i + batchSize
		if end > len(articles) {
			end = len(articles)
		}

		batch := articles[i:end]
		if err := r.batchWriteArticles(ctx, batch); err != nil {
			return fmt.Errorf("failed to batch write articles (batch %d-%d): %w", i, end-1, err)
		}
	}

	return nil
}

// batchWriteArticles writes a batch of articles (up to 25 items)
func (r *articleRepository) batchWriteArticles(ctx context.Context, articles []*model.Article) error {
	writeRequests := make([]types.WriteRequest, 0, len(articles))

	for _, article := range articles {
		// Generate UUID if not provided
		if article.ArticleID == "" {
			article.ArticleID = uuid.New().String()
		}

		// Marshal article to DynamoDB attribute values
		item, err := attributevalue.MarshalMap(article)
		if err != nil {
			return fmt.Errorf("failed to marshal article: %w", err)
		}

		writeRequests = append(writeRequests, types.WriteRequest{
			PutRequest: &types.PutRequest{
				Item: item,
			},
		})
	}

	input := &dynamodb.BatchWriteItemInput{
		RequestItems: map[string][]types.WriteRequest{
			r.tables.Articles: writeRequests,
		},
	}

	_, err := r.client.BatchWriteItem(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to batch write articles: %w", err)
	}

	return nil
}

// Helper function to join strings with a separator
func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	if len(strs) == 1 {
		return strs[0]
	}

	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}
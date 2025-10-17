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

// FeedRepository defines the interface for feed data operations
type FeedRepository interface {
	Create(ctx context.Context, feed *model.Feed) error
	GetByID(ctx context.Context, feedID string) (*model.Feed, error)
	GetByBowerID(ctx context.Context, bowerID string) ([]*model.Feed, error)
	GetByURL(ctx context.Context, url string) (*model.Feed, error)
	Update(ctx context.Context, feed *model.Feed) error
	Delete(ctx context.Context, feedID string) error
	List(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Feed, map[string]types.AttributeValue, error)
	GetStaleFeeds(ctx context.Context, maxAgeSeconds int64, limit int32) ([]*model.Feed, error)
}

// feedRepository implements FeedRepository interface
type feedRepository struct {
	client *dynamodbpkg.Client
	tables *dynamodbpkg.TableNames
}

// NewFeedRepository creates a new feed repository
func NewFeedRepository(client *dynamodbpkg.Client) FeedRepository {
	return &feedRepository{
		client: client,
		tables: client.GetTableNames(),
	}
}

// Create creates a new feed in DynamoDB
func (r *feedRepository) Create(ctx context.Context, feed *model.Feed) error {
	if feed == nil {
		return errors.New("feed cannot be nil")
	}

	// Generate UUID if not provided
	if feed.FeedID == "" {
		feed.FeedID = uuid.New().String()
	}

	// Marshal feed to DynamoDB attribute values
	item, err := attributevalue.MarshalMap(feed)
	if err != nil {
		return fmt.Errorf("failed to marshal feed: %w", err)
	}

	// Create the item with condition that feed_id doesn't exist
	input := &dynamodb.PutItemInput{
		TableName:           aws.String(r.tables.Feeds),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(feed_id)"),
	}

	_, err = r.client.PutItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("feed with ID %s already exists", feed.FeedID)
		}
		return fmt.Errorf("failed to create feed: %w", err)
	}

	return nil
}

// GetByID retrieves a feed by its ID
func (r *feedRepository) GetByID(ctx context.Context, feedID string) (*model.Feed, error) {
	if feedID == "" {
		return nil, errors.New("feedID cannot be empty")
	}

	input := &dynamodb.GetItemInput{
		TableName: aws.String(r.tables.Feeds),
		Key: map[string]types.AttributeValue{
			"feed_id": &types.AttributeValueMemberS{Value: feedID},
		},
	}

	result, err := r.client.GetItem(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get feed by ID: %w", err)
	}

	if result.Item == nil {
		return nil, fmt.Errorf("feed with ID %s not found", feedID)
	}

	var feed model.Feed
	err = attributevalue.UnmarshalMap(result.Item, &feed)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal feed: %w", err)
	}

	return &feed, nil
}

// GetByBowerID retrieves feeds by bower ID using GSI
func (r *feedRepository) GetByBowerID(ctx context.Context, bowerID string) ([]*model.Feed, error) {
	if bowerID == "" {
		return nil, errors.New("bowerID cannot be empty")
	}

	input := &dynamodb.QueryInput{
		TableName:              aws.String(r.tables.Feeds),
		IndexName:              aws.String("BowerIdIndex"),
		KeyConditionExpression: aws.String("bower_id = :bower_id"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":bower_id": &types.AttributeValueMemberS{Value: bowerID},
		},
	}

	result, err := r.client.Query(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to query feeds by bower ID: %w", err)
	}

	feeds := make([]*model.Feed, 0, len(result.Items))
	for _, item := range result.Items {
		var feed model.Feed
		err = attributevalue.UnmarshalMap(item, &feed)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal feed: %w", err)
		}
		feeds = append(feeds, &feed)
	}

	return feeds, nil
}

// GetByURL retrieves a feed by its URL (for duplicate checking)
func (r *feedRepository) GetByURL(ctx context.Context, url string) (*model.Feed, error) {
	if url == "" {
		return nil, errors.New("url cannot be empty")
	}

	input := &dynamodb.ScanInput{
		TableName:        aws.String(r.tables.Feeds),
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
		return nil, fmt.Errorf("failed to scan feeds by URL: %w", err)
	}

	if len(result.Items) == 0 {
		return nil, fmt.Errorf("feed with URL %s not found", url)
	}

	var feed model.Feed
	err = attributevalue.UnmarshalMap(result.Items[0], &feed)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal feed: %w", err)
	}

	return &feed, nil
}

// Update updates an existing feed
func (r *feedRepository) Update(ctx context.Context, feed *model.Feed) error {
	if feed == nil {
		return errors.New("feed cannot be nil")
	}
	if feed.FeedID == "" {
		return errors.New("feed ID cannot be empty")
	}

	// Update timestamp
	feed.UpdateLastUpdated()

	// Marshal feed to DynamoDB attribute values
	item, err := attributevalue.MarshalMap(feed)
	if err != nil {
		return fmt.Errorf("failed to marshal feed: %w", err)
	}

	// Update the item with condition that feed_id exists
	input := &dynamodb.PutItemInput{
		TableName:           aws.String(r.tables.Feeds),
		Item:                item,
		ConditionExpression: aws.String("attribute_exists(feed_id)"),
	}

	_, err = r.client.PutItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("feed with ID %s not found", feed.FeedID)
		}
		return fmt.Errorf("failed to update feed: %w", err)
	}

	return nil
}

// Delete deletes a feed by its ID
func (r *feedRepository) Delete(ctx context.Context, feedID string) error {
	if feedID == "" {
		return errors.New("feedID cannot be empty")
	}

	input := &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tables.Feeds),
		Key: map[string]types.AttributeValue{
			"feed_id": &types.AttributeValueMemberS{Value: feedID},
		},
		ConditionExpression: aws.String("attribute_exists(feed_id)"),
	}

	_, err := r.client.DeleteItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("feed with ID %s not found", feedID)
		}
		return fmt.Errorf("failed to delete feed: %w", err)
	}

	return nil
}

// List retrieves a paginated list of feeds
func (r *feedRepository) List(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Feed, map[string]types.AttributeValue, error) {
	if limit <= 0 {
		limit = 50 // Default limit
	}

	input := &dynamodb.ScanInput{
		TableName: aws.String(r.tables.Feeds),
		Limit:     aws.Int32(limit),
	}

	if lastKey != nil {
		input.ExclusiveStartKey = lastKey
	}

	result, err := r.client.Scan(ctx, input)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to list feeds: %w", err)
	}

	feeds := make([]*model.Feed, 0, len(result.Items))
	for _, item := range result.Items {
		var feed model.Feed
		err = attributevalue.UnmarshalMap(item, &feed)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to unmarshal feed: %w", err)
		}
		feeds = append(feeds, &feed)
	}

	return feeds, result.LastEvaluatedKey, nil
}

// GetStaleFeeds retrieves feeds that haven't been updated for a specified time
func (r *feedRepository) GetStaleFeeds(ctx context.Context, maxAgeSeconds int64, limit int32) ([]*model.Feed, error) {
	if limit <= 0 {
		limit = 50 // Default limit
	}

	// Calculate the cutoff timestamp
	cutoffTimestamp := maxAgeSeconds

	input := &dynamodb.ScanInput{
		TableName:        aws.String(r.tables.Feeds),
		FilterExpression: aws.String("last_updated < :cutoff"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":cutoff": &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", cutoffTimestamp)},
		},
		Limit: aws.Int32(limit),
	}

	result, err := r.client.Scan(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get stale feeds: %w", err)
	}

	feeds := make([]*model.Feed, 0, len(result.Items))
	for _, item := range result.Items {
		var feed model.Feed
		err = attributevalue.UnmarshalMap(item, &feed)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal feed: %w", err)
		}
		feeds = append(feeds, &feed)
	}

	return feeds, nil
}

package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"feed-bower-api/internal/model"
	dynamodbpkg "feed-bower-api/pkg/dynamodb"
)

// ChickRepository defines the interface for chick stats and liked articles operations
type ChickRepository interface {
	// ChickStats operations
	CreateStats(ctx context.Context, stats *model.ChickStats) error
	GetStats(ctx context.Context, userID string) (*model.ChickStats, error)
	UpdateStats(ctx context.Context, stats *model.ChickStats) error
	DeleteStats(ctx context.Context, userID string) error

	// LikedArticle operations
	AddLikedArticle(ctx context.Context, likedArticle *model.LikedArticle) error
	RemoveLikedArticle(ctx context.Context, userID, articleID string) error
	GetLikedArticles(ctx context.Context, userID string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.LikedArticle, map[string]types.AttributeValue, error)
	IsArticleLiked(ctx context.Context, userID, articleID string) (bool, error)
	GetLikedArticleCount(ctx context.Context, userID string) (int, error)
}

// chickRepository implements ChickRepository interface
type chickRepository struct {
	client *dynamodbpkg.Client
	tables *dynamodbpkg.TableNames
}

// NewChickRepository creates a new chick repository
func NewChickRepository(client *dynamodbpkg.Client) ChickRepository {
	return &chickRepository{
		client: client,
		tables: client.GetTableNames(),
	}
}

// CreateStats creates new chick stats for a user
func (r *chickRepository) CreateStats(ctx context.Context, stats *model.ChickStats) error {
	if stats == nil {
		return errors.New("stats cannot be nil")
	}
	if stats.UserID == "" {
		return errors.New("user ID cannot be empty")
	}

	// Marshal stats to DynamoDB attribute values
	item, err := attributevalue.MarshalMap(stats)
	if err != nil {
		return fmt.Errorf("failed to marshal chick stats: %w", err)
	}

	// Create the item with condition that user_id doesn't exist
	input := &dynamodb.PutItemInput{
		TableName:           aws.String(r.tables.ChickStats),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(user_id)"),
	}

	_, err = r.client.PutItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("chick stats for user %s already exists", stats.UserID)
		}
		return fmt.Errorf("failed to create chick stats: %w", err)
	}

	return nil
}

// GetStats retrieves chick stats for a user
func (r *chickRepository) GetStats(ctx context.Context, userID string) (*model.ChickStats, error) {
	if userID == "" {
		return nil, errors.New("userID cannot be empty")
	}

	input := &dynamodb.GetItemInput{
		TableName: aws.String(r.tables.ChickStats),
		Key: map[string]types.AttributeValue{
			"user_id": &types.AttributeValueMemberS{Value: userID},
		},
	}

	result, err := r.client.GetItem(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get chick stats: %w", err)
	}

	if result.Item == nil {
		// Return default stats if not found
		return model.NewChickStats(userID), nil
	}

	var stats model.ChickStats
	err = attributevalue.UnmarshalMap(result.Item, &stats)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal chick stats: %w", err)
	}

	return &stats, nil
}

// UpdateStats updates existing chick stats
func (r *chickRepository) UpdateStats(ctx context.Context, stats *model.ChickStats) error {
	if stats == nil {
		return errors.New("stats cannot be nil")
	}
	if stats.UserID == "" {
		return errors.New("user ID cannot be empty")
	}

	// Marshal stats to DynamoDB attribute values
	item, err := attributevalue.MarshalMap(stats)
	if err != nil {
		return fmt.Errorf("failed to marshal chick stats: %w", err)
	}

	// Update the item (create if not exists)
	input := &dynamodb.PutItemInput{
		TableName: aws.String(r.tables.ChickStats),
		Item:      item,
	}

	_, err = r.client.PutItem(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to update chick stats: %w", err)
	}

	return nil
}

// DeleteStats deletes chick stats for a user
func (r *chickRepository) DeleteStats(ctx context.Context, userID string) error {
	if userID == "" {
		return errors.New("userID cannot be empty")
	}

	input := &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tables.ChickStats),
		Key: map[string]types.AttributeValue{
			"user_id": &types.AttributeValueMemberS{Value: userID},
		},
	}

	_, err := r.client.DeleteItem(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to delete chick stats: %w", err)
	}

	return nil
}

// AddLikedArticle adds a liked article for a user
func (r *chickRepository) AddLikedArticle(ctx context.Context, likedArticle *model.LikedArticle) error {
	if likedArticle == nil {
		return errors.New("liked article cannot be nil")
	}
	if likedArticle.UserID == "" {
		return errors.New("user ID cannot be empty")
	}
	if likedArticle.ArticleID == "" {
		return errors.New("article ID cannot be empty")
	}

	// Marshal liked article to DynamoDB attribute values
	item, err := attributevalue.MarshalMap(likedArticle)
	if err != nil {
		return fmt.Errorf("failed to marshal liked article: %w", err)
	}

	// Create the item with condition that the combination doesn't exist
	input := &dynamodb.PutItemInput{
		TableName:           aws.String(r.tables.LikedArticles),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(user_id) AND attribute_not_exists(article_id)"),
	}

	_, err = r.client.PutItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("article %s is already liked by user %s", likedArticle.ArticleID, likedArticle.UserID)
		}
		return fmt.Errorf("failed to add liked article: %w", err)
	}

	return nil
}

// RemoveLikedArticle removes a liked article for a user
func (r *chickRepository) RemoveLikedArticle(ctx context.Context, userID, articleID string) error {
	if userID == "" {
		return errors.New("userID cannot be empty")
	}
	if articleID == "" {
		return errors.New("articleID cannot be empty")
	}

	input := &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tables.LikedArticles),
		Key: map[string]types.AttributeValue{
			"user_id":    &types.AttributeValueMemberS{Value: userID},
			"article_id": &types.AttributeValueMemberS{Value: articleID},
		},
		ConditionExpression: aws.String("attribute_exists(user_id) AND attribute_exists(article_id)"),
	}

	_, err := r.client.DeleteItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("liked article not found for user %s and article %s", userID, articleID)
		}
		return fmt.Errorf("failed to remove liked article: %w", err)
	}

	return nil
}

// GetLikedArticles retrieves paginated liked articles for a user
func (r *chickRepository) GetLikedArticles(ctx context.Context, userID string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.LikedArticle, map[string]types.AttributeValue, error) {
	if userID == "" {
		return nil, nil, errors.New("userID cannot be empty")
	}
	if limit <= 0 {
		limit = 50 // Default limit
	}

	input := &dynamodb.QueryInput{
		TableName:              aws.String(r.tables.LikedArticles),
		KeyConditionExpression: aws.String("user_id = :user_id"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":user_id": &types.AttributeValueMemberS{Value: userID},
		},
		Limit:            aws.Int32(limit),
		ScanIndexForward: aws.Bool(false), // Sort by liked_at descending
	}

	if lastKey != nil {
		input.ExclusiveStartKey = lastKey
	}

	result, err := r.client.Query(ctx, input)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to query liked articles: %w", err)
	}

	likedArticles := make([]*model.LikedArticle, 0, len(result.Items))
	for _, item := range result.Items {
		var likedArticle model.LikedArticle
		err = attributevalue.UnmarshalMap(item, &likedArticle)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to unmarshal liked article: %w", err)
		}
		likedArticles = append(likedArticles, &likedArticle)
	}

	return likedArticles, result.LastEvaluatedKey, nil
}

// IsArticleLiked checks if an article is liked by a user
func (r *chickRepository) IsArticleLiked(ctx context.Context, userID, articleID string) (bool, error) {
	if userID == "" {
		return false, errors.New("userID cannot be empty")
	}
	if articleID == "" {
		return false, errors.New("articleID cannot be empty")
	}

	input := &dynamodb.GetItemInput{
		TableName: aws.String(r.tables.LikedArticles),
		Key: map[string]types.AttributeValue{
			"user_id":    &types.AttributeValueMemberS{Value: userID},
			"article_id": &types.AttributeValueMemberS{Value: articleID},
		},
	}

	result, err := r.client.GetItem(ctx, input)
	if err != nil {
		return false, fmt.Errorf("failed to check if article is liked: %w", err)
	}

	return result.Item != nil, nil
}

// GetLikedArticleCount gets the total count of liked articles for a user
func (r *chickRepository) GetLikedArticleCount(ctx context.Context, userID string) (int, error) {
	if userID == "" {
		return 0, errors.New("userID cannot be empty")
	}

	input := &dynamodb.QueryInput{
		TableName:              aws.String(r.tables.LikedArticles),
		KeyConditionExpression: aws.String("user_id = :user_id"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":user_id": &types.AttributeValueMemberS{Value: userID},
		},
		Select: types.SelectCount,
	}

	result, err := r.client.Query(ctx, input)
	if err != nil {
		return 0, fmt.Errorf("failed to count liked articles: %w", err)
	}

	return int(result.Count), nil
}

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

// BowerRepository defines the interface for bower data operations
type BowerRepository interface {
	Create(ctx context.Context, bower *model.Bower) error
	GetByID(ctx context.Context, bowerID string) (*model.Bower, error)
	GetByUserID(ctx context.Context, userID string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Bower, map[string]types.AttributeValue, error)
	Update(ctx context.Context, bower *model.Bower) error
	Delete(ctx context.Context, bowerID string) error
	ListPublic(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Bower, map[string]types.AttributeValue, error)
	Search(ctx context.Context, userID string, query string, limit int32) ([]*model.Bower, error)
}

// bowerRepository implements BowerRepository interface
type bowerRepository struct {
	client *dynamodbpkg.Client
	tables *dynamodbpkg.TableNames
}

// NewBowerRepository creates a new bower repository
func NewBowerRepository(client *dynamodbpkg.Client) BowerRepository {
	return &bowerRepository{
		client: client,
		tables: client.GetTableNames(),
	}
}

// Create creates a new bower in DynamoDB
func (r *bowerRepository) Create(ctx context.Context, bower *model.Bower) error {
	if bower == nil {
		return errors.New("bower cannot be nil")
	}

	// Generate UUID if not provided
	if bower.BowerID == "" {
		bower.BowerID = uuid.New().String()
	}

	// Marshal bower to DynamoDB attribute values
	item, err := attributevalue.MarshalMap(bower)
	if err != nil {
		return fmt.Errorf("failed to marshal bower: %w", err)
	}

	// Create the item with condition that bower_id doesn't exist
	input := &dynamodb.PutItemInput{
		TableName:           aws.String(r.tables.Bowers),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(bower_id)"),
	}

	_, err = r.client.PutItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("bower with ID %s already exists", bower.BowerID)
		}
		return fmt.Errorf("failed to create bower: %w", err)
	}

	return nil
}

// GetByID retrieves a bower by its ID
func (r *bowerRepository) GetByID(ctx context.Context, bowerID string) (*model.Bower, error) {
	if bowerID == "" {
		return nil, errors.New("bowerID cannot be empty")
	}

	input := &dynamodb.GetItemInput{
		TableName: aws.String(r.tables.Bowers),
		Key: map[string]types.AttributeValue{
			"bower_id": &types.AttributeValueMemberS{Value: bowerID},
		},
	}

	result, err := r.client.GetItem(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get bower by ID: %w", err)
	}

	if result.Item == nil {
		return nil, fmt.Errorf("bower with ID %s not found", bowerID)
	}

	var bower model.Bower
	err = attributevalue.UnmarshalMap(result.Item, &bower)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal bower: %w", err)
	}

	return &bower, nil
}

// GetByUserID retrieves bowers by user ID using GSI
func (r *bowerRepository) GetByUserID(ctx context.Context, userID string, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Bower, map[string]types.AttributeValue, error) {
	if userID == "" {
		return nil, nil, errors.New("userID cannot be empty")
	}
	if limit <= 0 {
		limit = 50 // Default limit
	}

	input := &dynamodb.QueryInput{
		TableName:              aws.String(r.tables.Bowers),
		IndexName:              aws.String("UserIdIndex"),
		KeyConditionExpression: aws.String("user_id = :user_id"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":user_id": &types.AttributeValueMemberS{Value: userID},
		},
		Limit:            aws.Int32(limit),
		ScanIndexForward: aws.Bool(false), // Sort by created_at descending
	}

	if lastKey != nil {
		input.ExclusiveStartKey = lastKey
	}

	result, err := r.client.Query(ctx, input)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to query bowers by user ID: %w", err)
	}

	bowers := make([]*model.Bower, 0, len(result.Items))
	for _, item := range result.Items {
		var bower model.Bower
		err = attributevalue.UnmarshalMap(item, &bower)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to unmarshal bower: %w", err)
		}
		bowers = append(bowers, &bower)
	}

	return bowers, result.LastEvaluatedKey, nil
}

// Update updates an existing bower
func (r *bowerRepository) Update(ctx context.Context, bower *model.Bower) error {
	if bower == nil {
		return errors.New("bower cannot be nil")
	}
	if bower.BowerID == "" {
		return errors.New("bower ID cannot be empty")
	}

	// Update timestamp
	bower.UpdateTimestamp()

	// Marshal bower to DynamoDB attribute values
	item, err := attributevalue.MarshalMap(bower)
	if err != nil {
		return fmt.Errorf("failed to marshal bower: %w", err)
	}

	// Update the item with condition that bower_id exists
	input := &dynamodb.PutItemInput{
		TableName:           aws.String(r.tables.Bowers),
		Item:                item,
		ConditionExpression: aws.String("attribute_exists(bower_id)"),
	}

	_, err = r.client.PutItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("bower with ID %s not found", bower.BowerID)
		}
		return fmt.Errorf("failed to update bower: %w", err)
	}

	return nil
}

// Delete deletes a bower by its ID
func (r *bowerRepository) Delete(ctx context.Context, bowerID string) error {
	if bowerID == "" {
		return errors.New("bowerID cannot be empty")
	}

	input := &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tables.Bowers),
		Key: map[string]types.AttributeValue{
			"bower_id": &types.AttributeValueMemberS{Value: bowerID},
		},
		ConditionExpression: aws.String("attribute_exists(bower_id)"),
	}

	_, err := r.client.DeleteItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("bower with ID %s not found", bowerID)
		}
		return fmt.Errorf("failed to delete bower: %w", err)
	}

	return nil
}

// ListPublic retrieves a paginated list of public bowers
func (r *bowerRepository) ListPublic(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.Bower, map[string]types.AttributeValue, error) {
	if limit <= 0 {
		limit = 50 // Default limit
	}

	input := &dynamodb.ScanInput{
		TableName:        aws.String(r.tables.Bowers),
		FilterExpression: aws.String("is_public = :is_public"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":is_public": &types.AttributeValueMemberBOOL{Value: true},
		},
		Limit: aws.Int32(limit),
	}

	if lastKey != nil {
		input.ExclusiveStartKey = lastKey
	}

	result, err := r.client.Scan(ctx, input)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to list public bowers: %w", err)
	}

	bowers := make([]*model.Bower, 0, len(result.Items))
	for _, item := range result.Items {
		var bower model.Bower
		err = attributevalue.UnmarshalMap(item, &bower)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to unmarshal bower: %w", err)
		}
		bowers = append(bowers, &bower)
	}

	return bowers, result.LastEvaluatedKey, nil
}

// Search searches for bowers by name or keywords for a specific user
func (r *bowerRepository) Search(ctx context.Context, userID string, query string, limit int32) ([]*model.Bower, error) {
	if userID == "" {
		return nil, errors.New("userID cannot be empty")
	}
	if query == "" {
		return nil, errors.New("query cannot be empty")
	}
	if limit <= 0 {
		limit = 50 // Default limit
	}

	input := &dynamodb.QueryInput{
		TableName:              aws.String(r.tables.Bowers),
		IndexName:              aws.String("UserIdIndex"),
		KeyConditionExpression: aws.String("user_id = :user_id"),
		FilterExpression:       aws.String("contains(#name, :query) OR contains(keywords, :query)"),
		ExpressionAttributeNames: map[string]string{
			"#name": "name", // 'name' is a reserved keyword in DynamoDB
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":user_id": &types.AttributeValueMemberS{Value: userID},
			":query":   &types.AttributeValueMemberS{Value: query},
		},
		Limit: aws.Int32(limit),
	}

	result, err := r.client.Query(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to search bowers: %w", err)
	}

	bowers := make([]*model.Bower, 0, len(result.Items))
	for _, item := range result.Items {
		var bower model.Bower
		err = attributevalue.UnmarshalMap(item, &bower)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal bower: %w", err)
		}
		bowers = append(bowers, &bower)
	}

	return bowers, nil
}

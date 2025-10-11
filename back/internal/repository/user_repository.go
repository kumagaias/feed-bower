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

// UserRepository defines the interface for user data operations
type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	GetByID(ctx context.Context, userID string) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	Update(ctx context.Context, user *model.User) error
	Delete(ctx context.Context, userID string) error
	List(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.User, map[string]types.AttributeValue, error)
}

// userRepository implements UserRepository interface
type userRepository struct {
	client *dynamodbpkg.Client
	tables *dynamodbpkg.TableNames
}

// NewUserRepository creates a new user repository
func NewUserRepository(client *dynamodbpkg.Client) UserRepository {
	return &userRepository{
		client: client,
		tables: client.GetTableNames(),
	}
}

// Create creates a new user in DynamoDB
func (r *userRepository) Create(ctx context.Context, user *model.User) error {
	if user == nil {
		return errors.New("user cannot be nil")
	}

	// Generate UUID if not provided
	if user.UserID == "" {
		user.UserID = uuid.New().String()
	}

	// Marshal user to DynamoDB attribute values
	item, err := attributevalue.MarshalMap(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user: %w", err)
	}

	// Create the item with condition that user_id doesn't exist
	input := &dynamodb.PutItemInput{
		TableName:           aws.String(r.tables.Users),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(user_id)"),
	}

	_, err = r.client.PutItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("user with ID %s already exists", user.UserID)
		}
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

// GetByID retrieves a user by their ID
func (r *userRepository) GetByID(ctx context.Context, userID string) (*model.User, error) {
	if userID == "" {
		return nil, errors.New("userID cannot be empty")
	}

	input := &dynamodb.GetItemInput{
		TableName: aws.String(r.tables.Users),
		Key: map[string]types.AttributeValue{
			"user_id": &types.AttributeValueMemberS{Value: userID},
		},
	}

	result, err := r.client.GetItem(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	if result.Item == nil {
		return nil, fmt.Errorf("user with ID %s not found", userID)
	}

	var user model.User
	err = attributevalue.UnmarshalMap(result.Item, &user)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal user: %w", err)
	}

	return &user, nil
}

// GetByEmail retrieves a user by their email using GSI
func (r *userRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	if email == "" {
		return nil, errors.New("email cannot be empty")
	}

	input := &dynamodb.QueryInput{
		TableName:              aws.String(r.tables.Users),
		IndexName:              aws.String("EmailIndex"),
		KeyConditionExpression: aws.String("email = :email"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":email": &types.AttributeValueMemberS{Value: email},
		},
		Limit: aws.Int32(1),
	}

	result, err := r.client.Query(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to query user by email: %w", err)
	}

	if len(result.Items) == 0 {
		return nil, fmt.Errorf("user with email %s not found", email)
	}

	var user model.User
	err = attributevalue.UnmarshalMap(result.Items[0], &user)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal user: %w", err)
	}

	return &user, nil
}

// Update updates an existing user
func (r *userRepository) Update(ctx context.Context, user *model.User) error {
	if user == nil {
		return errors.New("user cannot be nil")
	}
	if user.UserID == "" {
		return errors.New("user ID cannot be empty")
	}

	// Update timestamp
	user.UpdateTimestamp()

	// Marshal user to DynamoDB attribute values
	item, err := attributevalue.MarshalMap(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user: %w", err)
	}

	// Update the item with condition that user_id exists
	input := &dynamodb.PutItemInput{
		TableName:           aws.String(r.tables.Users),
		Item:                item,
		ConditionExpression: aws.String("attribute_exists(user_id)"),
	}

	_, err = r.client.PutItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("user with ID %s not found", user.UserID)
		}
		return fmt.Errorf("failed to update user: %w", err)
	}

	return nil
}

// Delete deletes a user by their ID
func (r *userRepository) Delete(ctx context.Context, userID string) error {
	if userID == "" {
		return errors.New("userID cannot be empty")
	}

	input := &dynamodb.DeleteItemInput{
		TableName: aws.String(r.tables.Users),
		Key: map[string]types.AttributeValue{
			"user_id": &types.AttributeValueMemberS{Value: userID},
		},
		ConditionExpression: aws.String("attribute_exists(user_id)"),
	}

	_, err := r.client.DeleteItem(ctx, input)
	if err != nil {
		var conditionalCheckErr *types.ConditionalCheckFailedException
		if errors.As(err, &conditionalCheckErr) {
			return fmt.Errorf("user with ID %s not found", userID)
		}
		return fmt.Errorf("failed to delete user: %w", err)
	}

	return nil
}

// List retrieves a paginated list of users
func (r *userRepository) List(ctx context.Context, limit int32, lastKey map[string]types.AttributeValue) ([]*model.User, map[string]types.AttributeValue, error) {
	if limit <= 0 {
		limit = 50 // Default limit
	}

	input := &dynamodb.ScanInput{
		TableName: aws.String(r.tables.Users),
		Limit:     aws.Int32(limit),
	}

	if lastKey != nil {
		input.ExclusiveStartKey = lastKey
	}

	result, err := r.client.Scan(ctx, input)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to list users: %w", err)
	}

	users := make([]*model.User, 0, len(result.Items))
	for _, item := range result.Items {
		var user model.User
		err = attributevalue.UnmarshalMap(item, &user)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to unmarshal user: %w", err)
		}
		users = append(users, &user)
	}

	return users, result.LastEvaluatedKey, nil
}
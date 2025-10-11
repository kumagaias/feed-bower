package dynamodb

import (
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

// Client wraps the AWS DynamoDB client with additional functionality
type Client struct {
	*dynamodb.Client
	TablePrefix string
}

// Config holds configuration for DynamoDB client
type Config struct {
	Region      string
	EndpointURL string // For local development
	TablePrefix string
}

// NewClient creates a new DynamoDB client with the provided configuration
func NewClient(ctx context.Context, cfg *Config) (*Client, error) {
	if cfg == nil {
		cfg = &Config{}
	}

	// Load AWS config
	awsCfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Override region if specified
	if cfg.Region != "" {
		awsCfg.Region = cfg.Region
	}

	// Create DynamoDB client options
	var options []func(*dynamodb.Options)

	// Set custom endpoint for local development
	if cfg.EndpointURL != "" {
		options = append(options, func(o *dynamodb.Options) {
			o.BaseEndpoint = aws.String(cfg.EndpointURL)
		})
	}

	// Create DynamoDB client
	client := dynamodb.NewFromConfig(awsCfg, options...)

	return &Client{
		Client:      client,
		TablePrefix: cfg.TablePrefix,
	}, nil
}

// NewClientFromEnv creates a new DynamoDB client using environment variables
func NewClientFromEnv(ctx context.Context) (*Client, error) {
	cfg := &Config{
		Region:      os.Getenv("AWS_REGION"),
		EndpointURL: os.Getenv("DYNAMODB_ENDPOINT_URL"),
		TablePrefix: os.Getenv("DYNAMODB_TABLE_PREFIX"),
	}

	// Set defaults
	if cfg.Region == "" {
		cfg.Region = "ap-northeast-1"
	}

	return NewClient(ctx, cfg)
}

// GetTableName returns the full table name with prefix
func (c *Client) GetTableName(tableName string) string {
	if c.TablePrefix == "" {
		return tableName
	}
	return c.TablePrefix + tableName
}

// TableNames contains all table names used by the application
type TableNames struct {
	Users         string
	Bowers        string
	Feeds         string
	Articles      string
	LikedArticles string
	ChickStats    string
}

// GetTableNames returns all table names with the configured prefix
func (c *Client) GetTableNames() *TableNames {
	return &TableNames{
		Users:         c.GetTableName("Users"),
		Bowers:        c.GetTableName("Bowers"),
		Feeds:         c.GetTableName("Feeds"),
		Articles:      c.GetTableName("Articles"),
		LikedArticles: c.GetTableName("LikedArticles"),
		ChickStats:    c.GetTableName("ChickStats"),
	}
}

// HealthCheck performs a basic health check on the DynamoDB connection
func (c *Client) HealthCheck(ctx context.Context) error {
	_, err := c.ListTables(ctx, &dynamodb.ListTablesInput{
		Limit: aws.Int32(1),
	})
	if err != nil {
		return fmt.Errorf("DynamoDB health check failed: %w", err)
	}
	return nil
}
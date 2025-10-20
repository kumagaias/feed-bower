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
	TableSuffix string
}

// Config holds configuration for DynamoDB client
type Config struct {
	Region      string
	EndpointURL string // For local development
	TablePrefix string
	TableSuffix string
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
		TableSuffix: cfg.TableSuffix,
	}, nil
}

// NewClientFromEnv creates a new DynamoDB client using environment variables
func NewClientFromEnv(ctx context.Context) (*Client, error) {
	cfg := &Config{
		Region:      os.Getenv("AWS_REGION"),
		EndpointURL: os.Getenv("DYNAMODB_ENDPOINT_URL"),
		TablePrefix: os.Getenv("DYNAMODB_TABLE_PREFIX"),
		TableSuffix: os.Getenv("DYNAMODB_TABLE_SUFFIX"),
	}

	// Set defaults
	if cfg.Region == "" {
		cfg.Region = "ap-northeast-1"
	}

	return NewClient(ctx, cfg)
}

// GetTableName returns the full table name with prefix and suffix
func (c *Client) GetTableName(tableName string) string {
	result := tableName
	if c.TablePrefix != "" {
		result = c.TablePrefix + result
	}
	if c.TableSuffix != "" {
		result = result + c.TableSuffix
	}
	return result
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

// GetTableNames returns all table names with the configured prefix and suffix
func (c *Client) GetTableNames() *TableNames {
	return &TableNames{
		Users:         c.GetTableName("users"),
		Bowers:        c.GetTableName("bowers"),
		Feeds:         c.GetTableName("feeds"),
		Articles:      c.GetTableName("articles"),
		LikedArticles: c.GetTableName("liked-articles"),
		ChickStats:    c.GetTableName("chick-stats"),
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

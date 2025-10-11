package dynamodb

import (
	"context"
	"testing"
)

func TestNewClient(t *testing.T) {
	ctx := context.Background()

	// Test with nil config (should use defaults)
	client, err := NewClient(ctx, nil)
	if err != nil {
		t.Errorf("NewClient with nil config failed: %v", err)
	}
	if client == nil {
		t.Error("NewClient returned nil client")
	}

	// Test with custom config
	cfg := &Config{
		Region:      "us-east-1",
		EndpointURL: "http://localhost:8000",
		TablePrefix: "test_",
	}
	client, err = NewClient(ctx, cfg)
	if err != nil {
		t.Errorf("NewClient with custom config failed: %v", err)
	}
	if client == nil {
		t.Error("NewClient returned nil client")
	}
	if client.TablePrefix != "test_" {
		t.Errorf("Expected table prefix 'test_', got '%s'", client.TablePrefix)
	}
}

func TestGetTableName(t *testing.T) {
	client := &Client{TablePrefix: "test_"}

	tableName := client.GetTableName("Users")
	expected := "test_Users"
	if tableName != expected {
		t.Errorf("Expected table name '%s', got '%s'", expected, tableName)
	}

	// Test with empty prefix
	client.TablePrefix = ""
	tableName = client.GetTableName("Users")
	expected = "Users"
	if tableName != expected {
		t.Errorf("Expected table name '%s', got '%s'", expected, tableName)
	}
}

func TestGetTableNames(t *testing.T) {
	client := &Client{TablePrefix: "dev_"}

	tableNames := client.GetTableNames()
	if tableNames == nil {
		t.Error("GetTableNames returned nil")
	}

	expected := "dev_Users"
	if tableNames.Users != expected {
		t.Errorf("Expected Users table name '%s', got '%s'", expected, tableNames.Users)
	}

	expected = "dev_Bowers"
	if tableNames.Bowers != expected {
		t.Errorf("Expected Bowers table name '%s', got '%s'", expected, tableNames.Bowers)
	}

	expected = "dev_Feeds"
	if tableNames.Feeds != expected {
		t.Errorf("Expected Feeds table name '%s', got '%s'", expected, tableNames.Feeds)
	}

	expected = "dev_Articles"
	if tableNames.Articles != expected {
		t.Errorf("Expected Articles table name '%s', got '%s'", expected, tableNames.Articles)
	}

	expected = "dev_LikedArticles"
	if tableNames.LikedArticles != expected {
		t.Errorf("Expected LikedArticles table name '%s', got '%s'", expected, tableNames.LikedArticles)
	}

	expected = "dev_ChickStats"
	if tableNames.ChickStats != expected {
		t.Errorf("Expected ChickStats table name '%s', got '%s'", expected, tableNames.ChickStats)
	}
}
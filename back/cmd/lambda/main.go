package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"

	"feed-bower-api/internal/handler"
	"feed-bower-api/internal/middleware"
	"feed-bower-api/internal/repository"
	"feed-bower-api/internal/service"
	dynamodbpkg "feed-bower-api/pkg/dynamodb"
)

// Config holds application configuration
type Config struct {
	// Database
	DynamoDBEndpoint string
	TablePrefix      string
	TableSuffix      string

	// Authentication
	JWTSecret         string
	CognitoUserPoolID string
	CognitoRegion     string
	CognitoClientID   string
	CognitoEndpoint   string
	UseCognito        bool

	// Bedrock
	BedrockAgentID    string
	BedrockAgentAlias string
	BedrockRegion     string

	// Server
	Port        string
	Environment string

	// Logging
	LogLevel string
}

// loadConfig loads configuration from environment variables
func loadConfig() *Config {
	config := &Config{
		DynamoDBEndpoint:  getEnv("DYNAMODB_ENDPOINT", ""),
		TablePrefix:       getEnv("DYNAMODB_TABLE_PREFIX", ""),
		TableSuffix:       getEnv("DYNAMODB_TABLE_SUFFIX", ""),
		JWTSecret:         getEnv("JWT_SECRET", "default-secret-change-in-production"),
		CognitoUserPoolID: getEnv("COGNITO_USER_POOL_ID", ""),
		CognitoRegion:     getEnv("COGNITO_REGION", "ap-northeast-1"),
		CognitoClientID:   getEnv("COGNITO_CLIENT_ID", ""),
		CognitoEndpoint:   getEnv("COGNITO_ENDPOINT", ""),
		UseCognito:        getEnv("USE_COGNITO", "false") == "true",
		BedrockAgentID:    getEnv("BEDROCK_AGENT_ID", ""),
		BedrockAgentAlias: getEnv("BEDROCK_AGENT_ALIAS", "production"),
		BedrockRegion:     getEnv("BEDROCK_REGION", "ap-northeast-1"),
		Port:              getEnv("PORT", "8080"),
		Environment:       getEnv("ENVIRONMENT", "development"),
		LogLevel:          getEnv("LOG_LEVEL", "info"),
	}

	// Validate required configuration
	// JWT_SECRET is only required when not using Cognito
	if !config.UseCognito && config.JWTSecret == "default-secret-change-in-production" && config.Environment == "production" {
		log.Fatal("JWT_SECRET must be set in production environment when not using Cognito")
	}

	// Log Bedrock configuration status
	if config.BedrockAgentID != "" {
		log.Printf("✅ Bedrock Agent configured: ID=%s, Alias=%s, Region=%s", config.BedrockAgentID, config.BedrockAgentAlias, config.BedrockRegion)
	} else {
		log.Println("⚠️  Bedrock Agent not configured, will use static feed mapping")
	}

	return config
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// setupRouter creates and configures the HTTP router
func setupRouter(config *Config) (*mux.Router, error) {
	ctx := context.Background()

	// Initialize DynamoDB client
	dbConfig := &dynamodbpkg.Config{
		EndpointURL: config.DynamoDBEndpoint,
		TablePrefix: config.TablePrefix,
		TableSuffix: config.TableSuffix,
	}

	dbClient, err := dynamodbpkg.NewClient(ctx, dbConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create DynamoDB client: %w", err)
	}

	// Load AWS config for Bedrock
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(config.BedrockRegion))
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Initialize repositories
	userRepo := repository.NewUserRepository(dbClient)
	bowerRepo := repository.NewBowerRepository(dbClient)
	feedRepo := repository.NewFeedRepository(dbClient)
	articleRepo := repository.NewArticleRepository(dbClient)
	chickRepo := repository.NewChickRepository(dbClient)

	// Initialize services
	var authService service.AuthService
	if config.UseCognito {
		log.Println("Using Cognito authentication")
		authService = service.NewCognitoAuthService(userRepo, config.CognitoUserPoolID, config.CognitoRegion, config.CognitoClientID, config.CognitoEndpoint)
	} else {
		log.Println("Using custom JWT authentication")
		authService = service.NewAuthService(userRepo, config.JWTSecret)
	}
	rssService := service.NewRSSService()
	bowerService := service.NewBowerService(bowerRepo, feedRepo)

	// Initialize Feed Service with Bedrock configuration
	feedServiceConfig := &service.FeedServiceConfig{
		AWSConfig:         awsCfg,
		BedrockAgentID:    config.BedrockAgentID,
		BedrockAgentAlias: config.BedrockAgentAlias,
		BedrockRegion:     config.BedrockRegion,
	}
	feedService := service.NewFeedService(feedRepo, bowerRepo, rssService, feedServiceConfig)

	articleService := service.NewArticleService(articleRepo, feedRepo, bowerRepo, chickRepo)
	chickService := service.NewChickService(chickRepo, articleRepo, feedRepo, bowerRepo)

	// Development user should be created using scripts/create-dev-user.sh

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	bowerHandler := handler.NewBowerHandler(bowerService)
	feedHandler := handler.NewFeedHandler(feedService)
	articleHandler := handler.NewArticleHandler(articleService)
	chickHandler := handler.NewChickHandler(chickService)

	// Create router
	router := mux.NewRouter()

	// Setup CORS middleware
	corsConfig := &middleware.CORSConfig{
		AllowedOrigins: []string{"https://www.feed-bower.net"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization", "X-Requested-With"},
		MaxAge:         86400,
	}

	if config.Environment != "production" {
		// In development, allow localhost origins
		corsConfig.AllowedOrigins = []string{
			"http://localhost:3000",
			"http://127.0.0.1:3000",
		}
	}

	// Setup authentication middleware
	authConfig := &middleware.AuthConfig{
		AuthService: authService,
		SkipPaths: []string{
			"/health",
			"/api/auth/guest",
			"/api/auth/register",
			"/api/auth/login",
			"/api/feeds/validate", // Public endpoint for feed validation
		},
	}

	// Apply middleware in order
	router.Use(middleware.CORS(corsConfig))
	router.Use(middleware.Logger(nil)) // Add request logging
	router.Use(middleware.Auth(authConfig))

	// Health check endpoint (no auth required)
	router.HandleFunc("/health", healthHandler).Methods("GET")

	// Register all routes
	authHandler.RegisterRoutes(router)
	bowerHandler.RegisterRoutes(router)
	feedHandler.RegisterRoutes(router)
	articleHandler.RegisterRoutes(router)
	chickHandler.RegisterRoutes(router)

	return router, nil
}

// healthHandler handles health check requests
func healthHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("💓 Health check requested from %s", r.RemoteAddr)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	response := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"service":   "feed-bower-api",
		"version":   "1.0.0",
	}

	fmt.Fprintf(w, `{"status":"%s","timestamp":"%s","service":"%s","version":"%s"}`,
		response["status"], response["timestamp"], response["service"], response["version"])
}

// isLambdaEnvironment checks if running in AWS Lambda
func isLambdaEnvironment() bool {
	return os.Getenv("AWS_LAMBDA_FUNCTION_NAME") != ""
}

// runScheduler runs the feed fetch scheduler
func runScheduler(config *Config) error {
	log.Println("🕐 Running in scheduler mode")

	// Initialize DynamoDB client
	dbConfig := &dynamodbpkg.Config{
		EndpointURL: config.DynamoDBEndpoint,
		TablePrefix: config.TablePrefix,
		TableSuffix: config.TableSuffix,
	}

	dbClient, err := dynamodbpkg.NewClient(context.Background(), dbConfig)
	if err != nil {
		return fmt.Errorf("failed to create DynamoDB client: %w", err)
	}

	// Initialize repositories
	feedRepo := repository.NewFeedRepository(dbClient)
	articleRepo := repository.NewArticleRepository(dbClient)

	// Initialize services
	rssService := service.NewRSSService()
	schedulerService := service.NewSchedulerService(feedRepo, articleRepo, rssService)

	// Run the scheduler
	ctx := context.Background()
	if err := schedulerService.FetchAllFeeds(ctx); err != nil {
		return fmt.Errorf("scheduler failed: %w", err)
	}

	log.Println("✅ Scheduler completed successfully")
	return nil
}

func main() {
	// Load .env file if not in Lambda environment
	if !isLambdaEnvironment() {
		if err := godotenv.Load(); err != nil {
			log.Printf("Warning: Could not load .env file: %v", err)
		} else {
			log.Println("Loaded .env file")
		}
	}

	// Load configuration
	config := loadConfig()

	// Setup logging
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Printf("Starting Feed Bower API - Environment: %s", config.Environment)

	// Check for scheduler mode
	if len(os.Args) > 1 && os.Args[1] == "--mode=scheduler" {
		if err := runScheduler(config); err != nil {
			log.Fatalf("Scheduler error: %v", err)
		}
		return
	}

	// Setup router
	router, err := setupRouter(config)
	if err != nil {
		log.Fatalf("Failed to setup router: %v", err)
	}

	// Check if running in Lambda environment
	if isLambdaEnvironment() {
		log.Println("Running in AWS Lambda environment")

		// Create a handler that can handle both API Gateway and EventBridge events
		handler := func(ctx context.Context, event interface{}) (interface{}, error) {
			// Check if this is an EventBridge event (scheduler mode)
			if eventMap, ok := event.(map[string]interface{}); ok {
				if mode, exists := eventMap["mode"]; exists && mode == "scheduler" {
					log.Println("🕐 EventBridge scheduler event detected")
					if err := runScheduler(config); err != nil {
						log.Printf("❌ Scheduler error: %v", err)
						return nil, err
					}
					return map[string]string{"status": "success", "message": "Scheduler completed"}, nil
				}
			}

			// Otherwise, treat as API Gateway event
			adapter := httpadapter.New(router)
			return adapter.ProxyWithContext(ctx, event)
		}

		// Start Lambda handler
		lambda.Start(handler)
	} else {
		// Running locally
		log.Printf("🚀 Running locally on port %s", config.Port)
		log.Printf("📊 Health check: http://localhost:%s/health", config.Port)
		log.Printf("🔧 Environment: %s", config.Environment)
		log.Printf("🗄️  DynamoDB endpoint: %s", config.DynamoDBEndpoint)
		log.Printf("🔐 Using Cognito: %v", config.UseCognito)
		log.Println("📝 Request logging enabled")
		log.Println("✅ Server ready to accept connections")

		// Create HTTP server
		server := &http.Server{
			Addr:         ":" + config.Port,
			Handler:      router,
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 15 * time.Second,
			IdleTimeout:  60 * time.Second,
		}

		// Start server
		log.Fatal(server.ListenAndServe())
	}
}

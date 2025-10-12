package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/gorilla/mux"

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
	
	// Authentication
	JWTSecret string
	
	// Server
	Port        string
	Environment string
	
	// Logging
	LogLevel string
}

// loadConfig loads configuration from environment variables
func loadConfig() *Config {
	config := &Config{
		DynamoDBEndpoint: getEnv("DYNAMODB_ENDPOINT", ""),
		TablePrefix:      getEnv("DYNAMODB_TABLE_PREFIX", ""),
		JWTSecret:        getEnv("JWT_SECRET", "default-secret-change-in-production"),
		Port:             getEnv("PORT", "8080"),
		Environment:      getEnv("ENVIRONMENT", "development"),
		LogLevel:         getEnv("LOG_LEVEL", "info"),
	}
	
	// Validate required configuration
	if config.JWTSecret == "default-secret-change-in-production" && config.Environment == "production" {
		log.Fatal("JWT_SECRET must be set in production environment")
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
	// Initialize DynamoDB client
	dbConfig := &dynamodbpkg.Config{
		EndpointURL: config.DynamoDBEndpoint,
		TablePrefix: config.TablePrefix,
	}
	
	dbClient, err := dynamodbpkg.NewClient(context.Background(), dbConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create DynamoDB client: %w", err)
	}

	// Initialize repositories
	userRepo := repository.NewUserRepository(dbClient)
	bowerRepo := repository.NewBowerRepository(dbClient)
	feedRepo := repository.NewFeedRepository(dbClient)
	articleRepo := repository.NewArticleRepository(dbClient)
	chickRepo := repository.NewChickRepository(dbClient)

	// Initialize services
	authService := service.NewAuthService(userRepo, config.JWTSecret)
	rssService := service.NewRSSService()
	bowerService := service.NewBowerService(bowerRepo, feedRepo)
	feedService := service.NewFeedService(feedRepo, bowerRepo, rssService)
	articleService := service.NewArticleService(articleRepo, feedRepo, bowerRepo, chickRepo)
	chickService := service.NewChickService(chickRepo, articleRepo, feedRepo, bowerRepo)

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
		AllowedOrigins: []string{"*"}, // Configure based on environment
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization", "X-Requested-With"},
		MaxAge:         86400,
	}
	
	if config.Environment == "production" {
		// In production, restrict origins
		corsConfig.AllowedOrigins = []string{
			"https://feed-bower.com",
			"https://www.feed-bower.com",
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

func main() {
	// Load configuration
	config := loadConfig()
	
	// Setup logging
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Printf("Starting Feed Bower API - Environment: %s", config.Environment)

	// Setup router
	router, err := setupRouter(config)
	if err != nil {
		log.Fatalf("Failed to setup router: %v", err)
	}

	// Check if running in Lambda environment
	if isLambdaEnvironment() {
		log.Println("Running in AWS Lambda environment")
		
		// Create Lambda adapter
		adapter := httpadapter.New(router)
		
		// Start Lambda handler
		lambda.Start(adapter.ProxyWithContext)
	} else {
		// Running locally
		log.Printf("Running locally on port %s", config.Port)
		log.Printf("Health check: http://localhost:%s/health", config.Port)
		
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
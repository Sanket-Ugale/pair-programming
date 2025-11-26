.PHONY: help build up down logs restart clean dev test

# Default ports (random non-default)
POSTGRES_PORT ?= 5433
REDIS_PORT ?= 6380
BACKEND_PORT ?= 8080
FRONTEND_PORT ?= 3080

help: ## Show this help message
	@echo "Pair Programming Platform - Docker Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'
	@echo ""
	@echo "Ports:"
	@echo "  PostgreSQL: $(POSTGRES_PORT)"
	@echo "  Redis:      $(REDIS_PORT)"
	@echo "  Backend:    $(BACKEND_PORT)"
	@echo "  Frontend:   $(FRONTEND_PORT)"

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d
	@echo ""
	@echo "Services started!"
	@echo "  Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo "  Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "  API Docs: http://localhost:$(BACKEND_PORT)/docs"
	@echo ""

down: ## Stop all services
	docker-compose down

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

logs-db: ## View database logs
	docker-compose logs -f postgres redis

restart: ## Restart all services
	docker-compose restart

restart-backend: ## Restart backend service
	docker-compose restart backend

clean: ## Remove all containers, volumes, and images
	docker-compose down -v --rmi all
	docker system prune -f

dev: ## Run development servers locally (without Docker)
	@echo "Starting development servers..."
	@echo "Make sure PostgreSQL and Redis are running locally"
	@cd backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
	@cd frontend && npm run dev &
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:3000"

test: ## Run tests
	@cd backend && source venv/bin/activate && pytest
	@cd frontend && npm test

db-shell: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli -a $(REDIS_PASSWORD)

status: ## Show status of all services
	docker-compose ps

migrate: ## Run database migrations
	docker-compose exec backend alembic upgrade head

seed: ## Seed database with sample data
	docker-compose exec backend python -c "from app.database import init_db; import asyncio; asyncio.run(init_db())"

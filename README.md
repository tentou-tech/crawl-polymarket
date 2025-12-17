# Polymarket Crawler

A high-performance crawler for fetching and storing Polymarket data, including real-time market events and trade data.

## Features

- **Real-time Event Listening**: Listens to Polygon blockchain events (via WebSocket).
- **Market Metadata Fetching**: Automatically fetches market metadata (slug, question, etc.) from the Polymarket/Gamma API when new assets are discovered.
- **Trade Parsing**: Parses trade details (Maker, Taker, Price, Side) and stores them in a normalized database schema.
- **Job Queues**: Uses BullMQ (Redis) to decouple event ingestion from heavy data processing.
- **PostgreSQL Storage**: normalized tables for `events`, `markets`, and `trades`.

## Crawled Contracts & Events

The crawler listens to the following contracts and events on the Polygon network:

### 1. CTF Exchange (Conditional Token Framework)
**Contract Addresses**:
- `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E` (CTF Exchange)
- `0xC5d563A36AE78145C45a50134d48A1215220f80a` (Neg Risk Adapter)

**Events**:
- `OrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 makerAssetId, uint256 takerAssetId, uint256 making, uint256 taking, uint256 fee)`
- `OrdersMatched(bytes32 indexed orderHash, address indexed maker, uint256 makerAssetId, uint256 takerAssetId, uint256 making, uint256 taking)`

### 2. UMA CTF Adapter
**Contract Addresses**:
- `0x6A9D222616C90FcA5754cd1333cFD9b7fb6a4F74`
- `0x157ce2d672854c848c9b79c49a8cc6cc89176a49`

**Events**:
- `QuestionResolved(bytes32 indexed questionID, int256 indexed settledPrice, uint256[] payouts)`
  - *Note*: This event triggers a market resolution update in the database.

## Tech Stack

- **Runtime**: Node.js (v20+)
- **Language**: TypeScript
- **Database**: PostgreSQL 15
- **Queue**: Redis 7 + BullMQ
- **Blockchain**: Viem (WebSocket)
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Docker & Docker Compose
- A Polygon RPC URL (WebSocket)

## Quick Start (Docker)

The easiest way to run the application is using Docker Compose.

1.  **Clone the repository**:
    ```bash
    git clone <repository_url>
    cd crawl-polymarket
    ```

2.  **Configure Environment**:
    Copy `.env.example` to `.env` and fill in your RPC URL.
    ```bash
    cp .env.example .env
    # Edit .env and set WS_RPC_URL=wss://...
    ```

3.  **Start the Service**:
    ```bash
    docker-compose up --build -d
    ```
    This will:
    *   Start PostgreSQL and Redis.
    *   Run database migrations (`db-migration` service).
    *   Start the main application (`app` service).

4.  **View Logs**:
    ```bash
    docker-compose logs -f app
    ```

## Development

### Manual Setup
If you prefer to run locally without Docker for development:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start dependencies (DB/Redis)**:
    You can use the provided docker-compose file to just start the infra:
    ```bash
    docker-compose up -d postgres redis
    ```

3.  **Run Migrations**:
    ```bash
    npm run migrate
    ```

4.  **Start in Dev Mode**:
    ```bash
    npm run dev
    ```

### Database Migrations

- **Run Migrations**: `npm run migrate`
- **Rollback**: `npm run migrate:rollback`
- **Create New**: `npm run migrate:make <name>`

### Queues Dashboard

A BullMQ dashboard is available at: `http://localhost:3000/admin/queues`

## Project Structure

- `src/database`: Knex models and migrations.
- `src/jobs`: BullMQ workers (`marketWorker`, `tradeWorker`) and queues.
- `src/services`: Core logic (Crawler, MarketService).
- `src/index.ts`: Application entry point.
- `docker-compose.yml`: Container orchestration.
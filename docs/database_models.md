# Database Models

This document provides an overview of the database models used in the application. These models are defined using [Objection.js](https://vincit.github.io/objection.js/).

## Event

Represents blockchain events captured by the crawler. It stores raw event data emitted by smart contracts.

- **Source File:** `src/database/models/Event.ts`
- **Table Name:** `events`

| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | No | Primary key. |
| `transactionHash` | String | **Yes** | Hash of the transaction that emitted the event. |
| `blockNumber` | Integer | **Yes** | Block number where the event occurred. |
| `contractAddress` | String | **Yes** | Address of the contract that emitted the event. |
| `eventName` | String | **Yes** | Name of the event (e.g., "ConditionResolution"). |
| `args` | Object | No | JSON object containing the decoded event arguments. |
| `createdAt` | Date | No | Timestamp when the record was created in the database. |

## Market

Represents a prediction market entity on Polymarket. It links on-chain condition IDs with off-chain market metadata.

- **Source File:** `src/database/models/Market.ts`
- **Table Name:** `markets`

| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | No | Primary key. |
| `conditionId` | String | **Yes** | The unique condition ID on the CTF (Conditional Token Framework). |
| `questionId` | String | No | The question ID used to derive the condition ID. |
| `slug` | String | **Yes** | URL-friendly identifier for the market (e.g., `will-bitcoin-hit-100k`). |
| `clobTokenId0` | String | No | CLOB Token ID for the first outcome. |
| `clobTokenId1` | String | No | CLOB Token ID for the second outcome. |
| `data` | Object | No | Additional JSON data retrieved from the market API (metadata, description, etc.). |
| `createdAt` | Date | No | Timestamp when the record was created. |
| `updatedAt` | Date | No | Timestamp when the record was last updated. |

## Trade

Represents a trade executed on the Polymarket CLOB (Central Limit Order Book) or related exchange protocols.

- **Source File:** `src/database/models/Trade.ts`
- **Table Name:** `trades`

| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer | No | Primary key. |
| `transactionHash` | String | No | Hash of the transaction containing the trade. |
| `blockNumber` | Integer | No | Block number where the trade was recorded. |
| `maker` | String | No | Wallet address of the order maker. |
| `taker` | String | No | Wallet address of the order taker (can be null). |
| `orderHash` | String | No | Unique hash of the order. |
| `assetId` | String | No | Identifier of the asset being traded (links to `clobTokenId0` or `clobTokenId1` in the `Market` table). |
| `side` | String | No | Side of the trade (e.g., "BUY", "SELL"). |
| `marketSlug` | String | No | Slug of the market associated with this trade (links to `slug` in the `Market` table). |
| `outcome` | String | No | Specific outcome token involved (e.g., "Yes"). |
| `price` | Number | No | Execution price per share. |
| `shares` | Number | No | Number of shares exchanged. |
| `usdcVolume` | Number | No | Total volume of the trade in USDC. |
| `timestamp` | Date | No | Time when the trade occurred. |
| `createdAt` | Date | No | Timestamp when the record was created in the database. |

## Appendix: Polymarket Market Data Structure

The `data` field in the `Market` model contains the raw JSON response from the Polymarket API. Key fields include:

### 1. The Bet (The Core Logic)
*   **`question`**: The primary question being bet on.
*   **`description`**: Detailed rules for resolution, including resolution sources (e.g., Binance, UMA).
*   **`outcomes`**: List of possible results (e.g., `["Yes", "No"]`).

### 2. Pricing and Probabilities
*   **`outcomePrices`**: Current trading prices for each outcome. These represent the market's estimated probability (e.g., `$0.02` = 2%).
*   **`lastTradePrice`**: The price of the most recent execution.

### 3. Trading Activity
*   **`volume`**: Total dollar amount traded in the market.
*   **`liquidity`**: Amount available in the order book to facilitate trades.
*   **`spread`**: The gap between the best bid and best ask.

### 4. Technical Identifiers (On-Chain)
*   **`clobTokenIds`**: Unique ERC-1155 token IDs for each outcome on the Polygon blockchain.
*   **`conditionId`**: Unique identifier on the Conditional Tokens Framework.
*   **`questionID`**: Identifier used by the Oracle (e.g., UMA) to verify the result.

### 5. Timeline
*   **`startDate` / `endDate`**: Opening and closing timestamps for trading.

### 6. Resolution
*   **`resolvedBy`**: The adapter contract address responsible for final resolution.
*   **`umaBond` / `umaReward`**: Parameters for UMA Optimistic Oracle resolution.

### 7. Hierarchy
*   **`events`**: The parent event this market belongs to (events can contain multiple related markets).

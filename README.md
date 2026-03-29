# File Version Management Microservice

A FastAPI + MongoDB microservice for managing file uploads with versioning, release-based validation, and comprehensive audit trails.

## Features

- **File Upload** - Upload `.txt` and `.pdf` files (max 10MB) with metadata
- **Release Version Validation** - Uploads only allowed within release date windows
- **External API Integration** - Obtains unique file IDs from an external service (with mock fallback)
- **File Versioning** - Tracks all versions of a file with uploader and checksum history
- **Duplicate Handling** - Same file name returns the same unique ID; new upload creates a new version
- **Soft Deletion** - Files are soft-deleted with full audit trail
- **Audit Logging** - Every upload and deletion is logged for audit purposes
- **Analytics APIs** - Query files by release, uploader, view upload stats, and more

## Tech Stack

- **Python 3.12+**
- **FastAPI** - Async web framework
- **MongoDB** - Document database (via Motor async driver)
- **Pydantic** - Data validation and settings management

## Project Structure

```
app/
├── core/
│   ├── config.py          # Application settings
│   └── database.py        # MongoDB connection and indexes
├── models/
│   └── schemas.py         # Pydantic models
├── routes/
│   ├── release_routes.py  # Release version CRUD
│   ├── file_routes.py     # File upload and delete
│   └── query_routes.py    # Query and analytics APIs
├── services/
│   ├── external_api.py    # External API client (with mock)
│   └── file_service.py    # Business logic
└── main.py                # FastAPI app entry point
```

## Quick Start

### Prerequisites

- Python 3.12+
- MongoDB running on `localhost:27017`

### Install & Run

```bash
# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Compose

```bash
docker-compose up --build
```

## API Endpoints

### Health
| Method | Endpoint    | Description          |
|--------|-------------|----------------------|
| GET    | `/`         | Service info         |
| GET    | `/health`   | Health check         |

### Release Versions (`/api/v1/releases`)
| Method | Endpoint                    | Description                 |
|--------|-----------------------------|-----------------------------|
| POST   | `/api/v1/releases/`         | Create a release version    |
| GET    | `/api/v1/releases/`         | List all release versions   |
| GET    | `/api/v1/releases/{version}`| Get a release version       |
| PUT    | `/api/v1/releases/{version}`| Update release dates        |
| DELETE | `/api/v1/releases/{version}`| Delete a release version    |

### Files (`/api/v1/files`)
| Method | Endpoint               | Description                          |
|--------|------------------------|--------------------------------------|
| POST   | `/api/v1/files/upload` | Upload a file (multipart form)       |
| DELETE | `/api/v1/files/`       | Delete a file by unique ID           |

### Query & Analytics (`/api/v1/query`)
| Method | Endpoint                                     | Description                        |
|--------|----------------------------------------------|------------------------------------|
| GET    | `/api/v1/query/files`                        | List all files                     |
| GET    | `/api/v1/query/files/by-release/{version}`   | Files by release version           |
| GET    | `/api/v1/query/files/{uniqueId}`             | File details with version history  |
| GET    | `/api/v1/query/files/{uniqueId}/stats`       | File upload statistics             |
| GET    | `/api/v1/query/audit-log`                    | Query audit log (with filters)     |
| GET    | `/api/v1/query/release-overview/{version}`   | Release overview with stats        |
| GET    | `/api/v1/query/uploaders/{name}`             | Files by uploader                  |
| GET    | `/api/v1/query/deletions`                    | All deletion records               |

### Interactive Docs

Once running, visit `http://localhost:8000/docs` for Swagger UI.

## MongoDB Schema

### `release_versions`
Stores release metadata with date windows for upload validation.

### `files`
Stores file metadata with embedded version history and deletion history. Uses the unique ID from the external API as a unique index.

### `audit_log`
Append-only log of all upload and delete actions for full audit trail.

## External API

The service integrates with an external API for file ID management. When the external API is unavailable, a mock implementation generates deterministic UUIDs based on file names (same file name always gets the same ID).

## Configuration

| Environment Variable      | Default                                    | Description                |
|---------------------------|--------------------------------------------|----------------------------|
| `MONGODB_URL`             | `mongodb://localhost:27017`                | MongoDB connection string  |
| `DATABASE_NAME`           | `file_version_management`                  | Database name              |
| `EXTERNAL_API_BASE_URL`   | `http://localhost:8001/api/v1/external`    | External API URL           |
| `MAX_FILE_SIZE_MB`        | `10`                                       | Max upload file size in MB |

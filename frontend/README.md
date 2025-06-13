# SocraticAI Development

This directory contains the React frontend built with Vite. The FastAPI backend lives in `../backend`.

## Prerequisites

- Python 3.9+
- Node.js (v16+ recommended)
- AWS credentials configured so `boto3` can access Bedrock and OpenSearch

## Running the Backend

1. Navigate to the backend directory:
   ```bash
   cd ../backend
   ```
2. Create and activate a virtual environment (one is provided but can be recreated):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install fastapi uvicorn boto3 opensearch-py python-dotenv
   ```
3. Add a `.env` file in `backend` with the following variables:
   ```
   AWS_REGION=<your-aws-region>
   OPENSEARCH_ENDPOINT=<your-opensearch-endpoint>
   ```
4. Start the API server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend will be accessible at `http://localhost:8000`.

## Running the Frontend

1. Switch to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The React app runs on `http://localhost:5173` and communicates with the backend at `http://localhost:8000`.

# Report Generator

An AI-powered research paper generator built with React frontend and FastAPI backend, leveraging AWS Bedrock for AI model inference and AWS OpenSearch for document search.

## 🚀 Features

- **AI-Powered Research**: Uses AWS Bedrock (Claude 3 Sonnet) for intelligent content generation
- **Document Search**: Integrated AWS OpenSearch for research source discovery
- **Interactive UI**: Modern React interface with project management capabilities
- **Structured Output**: Generates well-formatted research papers with proper citations
- **Project Management**: Save, load, and edit research projects

## 🏗️ Architecture

```
├── backend/           # FastAPI application
│   ├── app/          # Main application entry point
│   ├── routers/      # API endpoints
│   ├── schemas/      # Pydantic data models
│   └── services/     # Business logic (AWS integrations)
├── frontend/         # React + Vite application
│   └── src/
│       ├── components/  # React components
│       ├── context/     # React context providers
│       └── services/    # Frontend service layer
└── tests/           # Test suite
```

## 📋 Prerequisites

- Python 3.9+
- Node.js (v16+ recommended)
- AWS credentials configured for Bedrock and OpenSearch access

## 🛠️ Setup & Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install fastapi uvicorn boto3 opensearch-py python-dotenv
   ```

4. Create a `.env` file in the backend directory:
   ```env
   AWS_REGION=us-east-1
   OPENSEARCH_ENDPOINT=your-opensearch-endpoint-here
   ```

5. Start the backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at:
- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:8000

## 🧪 Running Tests

1. Ensure the backend virtual environment is active:
   ```bash
   cd backend
   source venv/bin/activate
   ```

2. Install test dependencies:
   ```bash
   pip install pytest
   ```

3. Run tests from the project root:
   ```bash
   pytest
   ```

## 🔧 Configuration

### AWS Setup

The application requires AWS credentials with access to:
- **AWS Bedrock**: For AI model inference (Claude 3 Sonnet)
- **AWS OpenSearch**: For document search capabilities

Configure AWS credentials using one of these methods:
- AWS CLI: `aws configure`
- Environment variables
- IAM roles (for EC2/ECS deployment)
- AWS SSO

### Environment Variables

Create a `.env` file in the backend directory with:
```env
AWS_REGION=us-east-1
OPENSEARCH_ENDPOINT=https://your-domain.region.es.amazonaws.com
```

## 🎯 Usage

1. **Start a New Project**: Create a new research project with title and description
2. **Generate Structure**: Use AI to create paper outline and methodology
3. **Research Sources**: Query knowledge base for relevant documents
4. **Draft Content**: Generate paper sections with AI assistance
5. **Refine & Export**: Edit and export your completed research paper

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: https://github.com/obrien-jimmy/report_generator
- **Issues**: https://github.com/obrien-jimmy/report_generator/issues

## 📧 Support

For questions or support, please open an issue in the GitHub repository.

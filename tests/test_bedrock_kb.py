import boto3
from unittest.mock import MagicMock, patch


def query_knowledge_base(kb_id: str, query: str):
    """Retrieve documents from a Bedrock knowledge base."""
    bedrock_agent = boto3.client("bedrock-agent-runtime", region_name="us-east-1")
    response = bedrock_agent.retrieve(
        knowledgeBaseId=kb_id,
        retrievalQuery={"text": query},
        retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 3}},
    )
    return response


def test_query_knowledge_base():
    fake_response = {"retrievalResults": [{"text": "Answer"}]}
    mock_client = MagicMock()
    mock_client.retrieve.return_value = fake_response

    with patch("boto3.client", return_value=mock_client) as mock_boto:
        result = query_knowledge_base("KB123", "What is testing?")

    mock_boto.assert_called_once_with("bedrock-agent-runtime", region_name="us-east-1")
    mock_client.retrieve.assert_called_once_with(
        knowledgeBaseId="KB123",
        retrievalQuery={"text": "What is testing?"},
        retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 3}},
    )
    assert isinstance(result, dict)
    assert "retrievalResults" in result

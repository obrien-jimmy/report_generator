import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

OPENSEARCH_ENDPOINT = os.getenv("OPENSEARCH_ENDPOINT")
AWS_REGION = os.getenv("AWS_REGION")

if not AWS_REGION:
    raise ValueError("AWS_REGION not found in environment variables")

# Only initialize OpenSearch client if endpoint is provided
client = None
if OPENSEARCH_ENDPOINT:
    credentials = boto3.Session().get_credentials()
    auth = AWSV4SignerAuth(credentials, AWS_REGION)

    client = OpenSearch(
        hosts=[{'host': OPENSEARCH_ENDPOINT, 'port': 443}],
        http_auth=auth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection
    )

def test_connection():
    # Only test connection if client is initialized
    if client is None:
        return False
    # Perform a basic test query against an index you already have
    # Replace "your-index-name" with an existing index in your OpenSearch domain
    return client.indices.exists("your-index-name")

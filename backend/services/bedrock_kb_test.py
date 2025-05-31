import boto3

bedrock_agent = boto3.client('bedrock-agent-runtime', region_name="us-east-1")

def query_knowledge_base(kb_id, query):
    response = bedrock_agent.retrieve(
        knowledgeBaseId=kb_id,
        retrievalQuery={
            'text': query
        },
        retrievalConfiguration={
            'vectorSearchConfiguration': {
                'numberOfResults': 3  # adjust as needed
            }
        }
    )
    return response

# Example test
if __name__ == "__main__":
    kb_id = '5Q4OCQRB4A'  # extracted from ARN/endpoint
    query = 'Explain the Socratic method.'

    response = query_knowledge_base(kb_id, query)
    print(response)

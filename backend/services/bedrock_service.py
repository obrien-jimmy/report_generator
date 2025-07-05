import boto3
import json
from botocore.exceptions import ClientError
import os
import time
import random
from dotenv import load_dotenv

load_dotenv()

def invoke_bedrock(prompt: str) -> str:
    """
    Invoke AWS Bedrock with the given prompt
    """
    try:
        # Initialize the Bedrock client
        bedrock_client = boto3.client(
            'bedrock-runtime',
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        
        # Prepare the request body for Claude
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        # Make the API call
        response = bedrock_client.invoke_model(
            modelId="anthropic.claude-3-sonnet-20240229-v1:0",
            body=json.dumps(request_body),
            contentType="application/json"
        )
        
        # Parse the response
        response_body = json.loads(response['body'].read())
        
        # Extract the text content
        if 'content' in response_body and len(response_body['content']) > 0:
            return response_body['content'][0]['text']
        else:
            return "No response generated"
            
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        if error_code == 'ThrottlingException':
            return f"Rate limit exceeded: {error_message}"
        elif error_code == 'ValidationException':
            return f"Validation error: {error_message}"
        else:
            return f"AWS Error ({error_code}): {error_message}"
    except Exception as e:
        return f"Unexpected error: {str(e)}"

import boto3
import json
import os
from dotenv import load_dotenv

load_dotenv()

bedrock = boto3.client(
    service_name='bedrock-runtime',
    # region_name=os.getenv("AWS_REGION")
    region_name='us-east-1'  # Explicitly set to us-east-1 for compatibility with Bedrock
)

def invoke_bedrock(prompt, model_id="anthropic.claude-3-5-sonnet-20240620-v1:0"):
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 2000,  # Explicitly corrected for Claude 3
        "temperature": 0.1,
        "top_p": 0.9,
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": prompt}]
            }
        ]
    })

    response = bedrock.invoke_model(
        modelId=model_id,
        contentType="application/json",
        accept="application/json",
        body=body
    )

    response_body = json.loads(response.get('body').read().decode('utf-8'))
    completion = response_body["content"][0]["text"]

    return completion

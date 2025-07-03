import boto3
import json
import os
import time
import random
from dotenv import load_dotenv

load_dotenv()

bedrock = boto3.client(
    service_name='bedrock-runtime',
    region_name='us-east-1'
)

# def invoke_bedrock(prompt, model_id="anthropic.claude-3-5-sonnet-20241022-v2:0", max_retries=3):
def invoke_bedrock(prompt, model_id="anthropic.claude-3-haiku-20240307-v1:0", max_retries=3):
    for attempt in range(max_retries):
        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2000,
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

        except Exception as e:
            error_str = str(e)
            print(f"Bedrock error (attempt {attempt + 1}): {error_str}")
            
            # Check for throttling/rate limit errors
            if any(term in error_str for term in ["ThrottlingException", "ServiceQuotaExceededException", "TooManyRequestsException"]):
                if attempt < max_retries - 1:
                    # Exponential backoff with jitter
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    print(f"Rate limited, retrying in {wait_time:.2f} seconds...")
                    time.sleep(wait_time)
                    continue
            
            # Re-raise the exception if it's not a rate limit error or we've exhausted retries
            raise e
    
    raise Exception(f"Failed after {max_retries} attempts")

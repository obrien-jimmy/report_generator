from fastapi import APIRouter, HTTPException
from schemas.thesis import PromptRequest
from services.bedrock_service import invoke_bedrock

router = APIRouter()

@router.post("/ai-response")
async def ai_response(request: PromptRequest):
    try:
        response = invoke_bedrock(request.prompt)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
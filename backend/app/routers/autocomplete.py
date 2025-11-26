from fastapi import APIRouter
from app.services.autocomplete_service import AutocompleteService
from app.schemas.room import AutocompleteRequest, AutocompleteResponse

router = APIRouter(tags=["autocomplete"])


@router.post("/autocomplete", response_model=AutocompleteResponse)
async def get_autocomplete(request: AutocompleteRequest):
    """
    Get AI-style autocomplete suggestion for the given code.
    
    This is a mocked implementation that provides rule-based suggestions
    based on common programming patterns and keywords.
    
    - **code**: Current code content
    - **cursorPosition**: Current cursor position in the code
    - **language**: Programming language (python, javascript, typescript)
    
    Returns a suggestion with the text to insert and position information.
    """
    return AutocompleteService.get_suggestion(request)

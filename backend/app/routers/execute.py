from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import asyncio

router = APIRouter(prefix="/api/execute", tags=["execute"])


class ExecuteRequest(BaseModel):
    code: str
    language: str


class ExecuteResponse(BaseModel):
    output: str
    error: str | None = None
    executionTime: float


# Language to Piston API language mapping
LANGUAGE_MAP = {
    "python": {"language": "python", "version": "3.10"},
    "javascript": {"language": "javascript", "version": "18.15.0"},
    "typescript": {"language": "typescript", "version": "5.0.3"},
    "java": {"language": "java", "version": "15.0.2"},
    "cpp": {"language": "c++", "version": "10.2.0"},
    "c": {"language": "c", "version": "10.2.0"},
    "go": {"language": "go", "version": "1.16.2"},
    "rust": {"language": "rust", "version": "1.68.2"},
    "ruby": {"language": "ruby", "version": "3.0.1"},
}

# Piston API endpoint (free public instance)
PISTON_API_URL = "https://emkc.org/api/v2/piston/execute"


@router.post("", response_model=ExecuteResponse)
async def execute_code(request: ExecuteRequest):
    """
    Execute code using Piston API.
    
    This endpoint sends code to the Piston code execution engine
    which runs the code in a sandboxed environment and returns the output.
    """
    lang_config = LANGUAGE_MAP.get(request.language)
    if not lang_config:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {request.language}. Supported languages: {', '.join(LANGUAGE_MAP.keys())}"
        )
    
    # Prepare request for Piston API
    piston_request = {
        "language": lang_config["language"],
        "version": lang_config["version"],
        "files": [
            {
                "name": f"main.{get_file_extension(request.language)}",
                "content": request.code
            }
        ],
        "stdin": "",
        "args": [],
        "compile_timeout": 10000,  # 10 seconds
        "run_timeout": 5000,  # 5 seconds
        "compile_memory_limit": -1,  # Unlimited
        "run_memory_limit": -1,  # Unlimited
    }
    
    try:
        import time
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(PISTON_API_URL, json=piston_request)
            
        execution_time = time.time() - start_time
        
        if response.status_code != 200:
            return ExecuteResponse(
                output="",
                error=f"Execution service error: {response.text}",
                executionTime=execution_time
            )
        
        result = response.json()
        
        # Extract output from response
        run_result = result.get("run", {})
        output = run_result.get("stdout", "")
        stderr = run_result.get("stderr", "")
        compile_result = result.get("compile", {})
        compile_output = compile_result.get("stdout", "") if compile_result else ""
        compile_error = compile_result.get("stderr", "") if compile_result else ""
        
        # Combine output
        full_output = output
        if compile_output:
            full_output = f"Compile Output:\n{compile_output}\n\n{full_output}"
        
        # Combine errors
        full_error = None
        if stderr or compile_error:
            error_parts = []
            if compile_error:
                error_parts.append(f"Compile Error:\n{compile_error}")
            if stderr:
                error_parts.append(f"Runtime Error:\n{stderr}")
            full_error = "\n\n".join(error_parts)
        
        return ExecuteResponse(
            output=full_output.strip() if full_output else "(No output)",
            error=full_error,
            executionTime=execution_time
        )
        
    except httpx.TimeoutException:
        return ExecuteResponse(
            output="",
            error="Execution timed out. Please try again or reduce the code complexity.",
            executionTime=30.0
        )
    except Exception as e:
        return ExecuteResponse(
            output="",
            error=f"Execution failed: {str(e)}",
            executionTime=0.0
        )


def get_file_extension(language: str) -> str:
    """Get file extension for a language."""
    extensions = {
        "python": "py",
        "javascript": "js",
        "typescript": "ts",
        "java": "java",
        "cpp": "cpp",
        "c": "c",
        "go": "go",
        "rust": "rs",
        "ruby": "rb",
    }
    return extensions.get(language, "txt")

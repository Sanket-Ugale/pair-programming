import re
from app.schemas.room import AutocompleteRequest, AutocompleteResponse


class AutocompleteService:
    """Service for providing mocked AI autocomplete suggestions."""
    
    # Python keyword completions
    PYTHON_KEYWORDS = {
        "def": "def function_name():\n    pass",
        "class": "class ClassName:\n    def __init__(self):\n        pass",
        "if": "if condition:\n    pass",
        "elif": "elif condition:\n    pass",
        "else": "else:\n    pass",
        "for": "for item in iterable:\n    pass",
        "while": "while condition:\n    pass",
        "try": "try:\n    pass\nexcept Exception as e:\n    pass",
        "except": "except Exception as e:\n    pass",
        "finally": "finally:\n    pass",
        "with": "with open('file.txt', 'r') as f:\n    pass",
        "import": "import module_name",
        "from": "from module import name",
        "return": "return value",
        "yield": "yield value",
        "lambda": "lambda x: x",
        "async": "async def function_name():\n    pass",
        "await": "await coroutine()",
        "print": "print()",
        "len": "len()",
        "range": "range()",
        "list": "list()",
        "dict": "dict()",
        "set": "set()",
        "tuple": "tuple()",
        "str": "str()",
        "int": "int()",
        "float": "float()",
        "bool": "bool()",
        "input": "input('Enter value: ')",
        "open": "open('filename', 'r')",
    }
    
    # JavaScript/TypeScript completions
    JS_KEYWORDS = {
        "function": "function name() {\n    \n}",
        "const": "const name = value;",
        "let": "let name = value;",
        "var": "var name = value;",
        "if": "if (condition) {\n    \n}",
        "else": "else {\n    \n}",
        "for": "for (let i = 0; i < length; i++) {\n    \n}",
        "while": "while (condition) {\n    \n}",
        "class": "class ClassName {\n    constructor() {\n        \n    }\n}",
        "import": "import { name } from 'module';",
        "export": "export default name;",
        "async": "async function name() {\n    \n}",
        "await": "await promise;",
        "try": "try {\n    \n} catch (error) {\n    \n}",
        "catch": "catch (error) {\n    \n}",
        "finally": "finally {\n    \n}",
        "return": "return value;",
        "console": "console.log();",
        "fetch": "fetch('url').then(res => res.json())",
        "arrow": "const fn = () => {\n    \n};",
        "map": ".map(item => item)",
        "filter": ".filter(item => item)",
        "reduce": ".reduce((acc, item) => acc, initialValue)",
        "usestate": "const [state, setState] = useState(initialValue);",
        "useeffect": "useEffect(() => {\n    \n}, []);",
        "interface": "interface Name {\n    property: type;\n}",
        "type": "type Name = {\n    property: type;\n};",
    }
    
    # Common patterns
    COMMON_PATTERNS = {
        "todo": "// TODO: ",
        "fixme": "// FIXME: ",
        "note": "// NOTE: ",
        "hack": "// HACK: ",
    }
    
    @staticmethod
    def get_current_word(code: str, cursor_position: int) -> tuple[str, int]:
        """Extract the current word being typed at cursor position."""
        if cursor_position > len(code):
            cursor_position = len(code)
        
        # Find the start of the current word
        start = cursor_position
        while start > 0 and code[start - 1].isalnum() or (start > 0 and code[start - 1] == '_'):
            start -= 1
        
        current_word = code[start:cursor_position].lower()
        return current_word, start
    
    @staticmethod
    def get_suggestion(request: AutocompleteRequest) -> AutocompleteResponse:
        """Get autocomplete suggestion based on current code and cursor position."""
        code = request.code
        cursor_position = request.cursorPosition
        language = request.language.lower()
        
        # Get current word being typed
        current_word, word_start = AutocompleteService.get_current_word(code, cursor_position)
        
        if not current_word:
            return AutocompleteResponse(
                suggestion="",
                startPosition=cursor_position,
                endPosition=cursor_position,
                description="No suggestion available"
            )
        
        # Select keyword dictionary based on language
        if language in ["python", "py"]:
            keywords = AutocompleteService.PYTHON_KEYWORDS
        elif language in ["javascript", "js", "typescript", "ts"]:
            keywords = AutocompleteService.JS_KEYWORDS
        else:
            keywords = {**AutocompleteService.PYTHON_KEYWORDS, **AutocompleteService.JS_KEYWORDS}
        
        # Add common patterns
        keywords = {**keywords, **AutocompleteService.COMMON_PATTERNS}
        
        # Find matching suggestions
        suggestion = ""
        description = ""
        
        # Exact match
        if current_word in keywords:
            suggestion = keywords[current_word]
            description = f"Complete '{current_word}' statement"
        else:
            # Prefix match
            for key, value in keywords.items():
                if key.startswith(current_word) and len(current_word) >= 2:
                    suggestion = value
                    description = f"Suggested completion for '{key}'"
                    break
        
        # Context-aware suggestions
        if not suggestion:
            # Check for common patterns in the code
            lines = code[:cursor_position].split('\n')
            if lines:
                current_line = lines[-1].strip()
                
                # Function definition
                if current_line.startswith("def ") and ":" not in current_line:
                    suggestion = "():\n    pass"
                    description = "Complete function definition"
                
                # Class definition
                elif current_line.startswith("class ") and ":" not in current_line:
                    suggestion = ":\n    def __init__(self):\n        pass"
                    description = "Complete class definition"
                
                # If statement
                elif current_line.startswith("if ") and ":" not in current_line:
                    suggestion = ":\n    pass"
                    description = "Complete if statement"
                
                # For loop
                elif current_line.startswith("for ") and ":" not in current_line:
                    suggestion = " in range():\n    pass"
                    description = "Complete for loop"
        
        return AutocompleteResponse(
            suggestion=suggestion,
            startPosition=word_start,
            endPosition=cursor_position,
            description=description or "No suggestion available"
        )

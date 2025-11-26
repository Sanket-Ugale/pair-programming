import { useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { RootState, AppDispatch } from '../store';
import { setCode, setCursorPosition } from '../store/slices/editorSlice';
import { useAutocomplete } from '../hooks';
import { getColorForUser } from '../types';

interface CodeEditorProps {
  onCodeChange: (code: string, cursorPosition: number) => void;
  onCursorChange: (cursorPosition: number) => void;
}

const CodeEditor = ({ onCodeChange, onCursorChange }: CodeEditorProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const isRemoteUpdateRef = useRef(false);
  
  const { code, language, remoteCursors, userId, users } = useSelector(
    (state: RootState) => state.editor
  );
  
  const { suggestion, acceptSuggestion, dismissSuggestion } = useAutocomplete(600);

  // Map our language names to Monaco language IDs
  const getMonacoLanguage = (lang: string): string => {
    const languageMap: Record<string, string> = {
      python: 'python',
      py: 'python',
      javascript: 'javascript',
      js: 'javascript',
      typescript: 'typescript',
      ts: 'typescript',
      java: 'java',
      cpp: 'cpp',
      'c++': 'cpp',
      go: 'go',
      rust: 'rust',
      ruby: 'ruby',
    };
    return languageMap[lang.toLowerCase()] || 'python';
  };

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    
    // Handle cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      const model = editor.getModel();
      if (model) {
        const offset = model.getOffsetAt(e.position);
        dispatch(setCursorPosition(offset));
        onCursorChange(offset);
      }
    });

    // Handle keyboard shortcuts for autocomplete
    editor.addCommand(
      9, // Tab key code
      () => {
        if (suggestion) {
          const result = acceptSuggestion();
          if (result) {
            dispatch(setCode(result.newCode));
            onCodeChange(result.newCode, result.newCursorPosition);
            
            const model = editor.getModel();
            if (model) {
              const position = model.getPositionAt(result.newCursorPosition);
              editor.setPosition(position);
            }
          }
        } else {
          editor.trigger('keyboard', 'tab', {});
        }
      }
    );

    // Escape to dismiss suggestion
    editor.addCommand(
      27, // Escape key code
      () => {
        dismissSuggestion();
      }
    );
  };

  const handleEditorChange: OnChange = (value) => {
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }
    
    const newCode = value || '';
    dispatch(setCode(newCode));
    
    const model = editorRef.current?.getModel();
    const position = editorRef.current?.getPosition();
    if (model && position) {
      const offset = model.getOffsetAt(position);
      onCodeChange(newCode, offset);
    }
  };

  // Update editor when code changes from remote
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== code) {
        isRemoteUpdateRef.current = true;
        const position = editorRef.current.getPosition();
        editorRef.current.setValue(code);
        if (position) {
          editorRef.current.setPosition(position);
        }
      }
    }
  }, [code]);

  // Render remote cursors with labels
  const renderRemoteCursors = useCallback(() => {
    if (!editorRef.current) return;
    
    const decorations: editor.IModelDeltaDecoration[] = [];
    const model = editorRef.current.getModel();
    
    if (!model) return;
    
    Object.entries(remoteCursors).forEach(([cursorUserId, cursor]) => {
      if (cursorUserId === userId) return;
      
      const position = model.getPositionAt(cursor.position);
      const color = cursor.color || getColorForUser(cursorUserId);
      const username = cursor.username || users[cursorUserId]?.username || `User ${cursorUserId.slice(0, 4)}`;
      
      // Cursor line decoration
      decorations.push({
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column + 1,
        },
        options: {
          className: `remote-cursor-${cursorUserId.replace(/[^a-zA-Z0-9]/g, '')}`,
          stickiness: 1,
          hoverMessage: { value: `**${username}**` },
        },
      });

      // Add custom style for this user's cursor
      const sanitizedId = cursorUserId.replace(/[^a-zA-Z0-9]/g, '');
      const styleId = `cursor-style-${sanitizedId}`;
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      
      styleEl.textContent = `
        .remote-cursor-${sanitizedId} {
          background-color: ${color}40;
          border-left: 2px solid ${color};
          position: relative;
        }
        .remote-cursor-${sanitizedId}::before {
          content: '${username}';
          position: absolute;
          top: -18px;
          left: -2px;
          font-size: 10px;
          font-weight: 600;
          color: white;
          background-color: ${color};
          padding: 1px 6px;
          border-radius: 3px 3px 3px 0;
          white-space: nowrap;
          z-index: 100;
          pointer-events: none;
        }
        .remote-cursor-${sanitizedId}::after {
          content: '';
          position: absolute;
          top: 0;
          left: -2px;
          width: 2px;
          height: 18px;
          background-color: ${color};
          animation: cursorBlink 1s infinite;
        }
        @keyframes cursorBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      `;
    });

    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, decorations);
  }, [remoteCursors, userId, users]);

  useEffect(() => {
    renderRemoteCursors();
  }, [renderRemoteCursors]);

  return (
    <div className="relative flex-1 flex flex-col">
      <Editor
        height="100%"
        language={getMonacoLanguage(language)}
        value={code}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
          fontLigatures: true,
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          bracketPairColorization: {
            enabled: true,
          },
        }}
      />
      
      {/* Autocomplete suggestion overlay */}
      {suggestion && suggestion.suggestion && (
        <div className="absolute bottom-4 right-4 max-w-md bg-editor-sidebar border border-editor-border rounded-lg p-4 shadow-xl z-50">
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-lg">💡</span>
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-2">{suggestion.description}</p>
              <pre className="text-sm text-primary-300 bg-editor-bg p-2 rounded overflow-x-auto max-h-32">
                {suggestion.suggestion}
              </pre>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    const result = acceptSuggestion();
                    if (result && editorRef.current) {
                      dispatch(setCode(result.newCode));
                      onCodeChange(result.newCode, result.newCursorPosition);
                      const model = editorRef.current.getModel();
                      if (model) {
                        const position = model.getPositionAt(result.newCursorPosition);
                        editorRef.current.setPosition(position);
                        editorRef.current.focus();
                      }
                    }
                  }}
                  className="px-3 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
                >
                  Accept (Tab)
                </button>
                <button
                  onClick={dismissSuggestion}
                  className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Dismiss (Esc)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;

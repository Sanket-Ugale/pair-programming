import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { clearExecutionResult } from '../store/slices/editorSlice';

const OutputPanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { executionResult, isExecuting } = useSelector((state: RootState) => state.editor);

  if (!executionResult && !isExecuting) {
    return null;
  }

  return (
    <div className="bg-editor-sidebar border-t border-editor-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-editor-border">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-300">Output</span>
          {executionResult && (
            <span className="text-xs text-gray-500">
              ({executionResult.executionTime.toFixed(2)}s)
            </span>
          )}
        </div>
        <button
          onClick={() => dispatch(clearExecutionResult())}
          className="p-1 text-gray-500 hover:text-white transition-colors"
          title="Close output"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-48 overflow-y-auto">
        {isExecuting ? (
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Running code...</span>
          </div>
        ) : executionResult ? (
          <div className="space-y-3">
            {/* Output */}
            {executionResult.output && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">OUTPUT:</div>
                <pre className="font-mono text-sm text-green-400 bg-black/30 p-3 rounded-lg whitespace-pre-wrap overflow-x-auto">
                  {executionResult.output}
                </pre>
              </div>
            )}

            {/* Error */}
            {executionResult.error && (
              <div>
                <div className="text-xs font-medium text-red-500 mb-1">ERROR:</div>
                <pre className="font-mono text-sm text-red-400 bg-red-950/30 p-3 rounded-lg whitespace-pre-wrap overflow-x-auto border border-red-900/50">
                  {executionResult.error}
                </pre>
              </div>
            )}

            {/* Success indicator */}
            {!executionResult.error && executionResult.output && (
              <div className="flex items-center gap-2 text-xs text-green-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Code executed successfully</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default OutputPanel;

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { setAutocompleteSuggestion, clearAutocompleteSuggestion } from '../store/slices/editorSlice';
import { api } from '../services/api';

export const useAutocomplete = (debounceMs: number = 600) => {
  const dispatch = useDispatch<AppDispatch>();
  const { code, cursorPosition, language, autocompleteSuggestion } = useSelector(
    (state: RootState) => state.editor
  );
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCodeRef = useRef<string>(code);

  const fetchSuggestion = useCallback(async () => {
    if (!code || cursorPosition < 0) {
      dispatch(clearAutocompleteSuggestion());
      return;
    }

    // Don't fetch if code hasn't changed
    if (code === lastCodeRef.current && autocompleteSuggestion) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.getAutocomplete({
        code,
        cursorPosition,
        language,
      });

      if (response.suggestion) {
        dispatch(setAutocompleteSuggestion(response));
      } else {
        dispatch(clearAutocompleteSuggestion());
      }
      lastCodeRef.current = code;
    } catch (error) {
      console.error('Autocomplete error:', error);
      dispatch(clearAutocompleteSuggestion());
    } finally {
      setIsLoading(false);
    }
  }, [code, cursorPosition, language, dispatch, autocompleteSuggestion]);

  // Debounced effect for autocomplete
  useEffect(() => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout
    debounceRef.current = setTimeout(() => {
      fetchSuggestion();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [code, cursorPosition, debounceMs, fetchSuggestion]);

  const acceptSuggestion = useCallback(() => {
    if (!autocompleteSuggestion) return null;
    
    const { suggestion, startPosition, endPosition } = autocompleteSuggestion;
    const newCode = 
      code.slice(0, startPosition) + 
      suggestion + 
      code.slice(endPosition);
    
    const newCursorPosition = startPosition + suggestion.length;
    
    dispatch(clearAutocompleteSuggestion());
    
    return { newCode, newCursorPosition };
  }, [autocompleteSuggestion, code, dispatch]);

  const dismissSuggestion = useCallback(() => {
    dispatch(clearAutocompleteSuggestion());
  }, [dispatch]);

  return {
    suggestion: autocompleteSuggestion,
    isLoading,
    acceptSuggestion,
    dismissSuggestion,
    fetchSuggestion,
  };
};

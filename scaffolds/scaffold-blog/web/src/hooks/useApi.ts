import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

interface UseApiOptions {
  skip?: boolean;
}

export function useApi<T>(
  endpoint: string,
  options: UseApiOptions = {}
): UseApiState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: !options.skip,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (options.skip) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await api.get<{ success: boolean; data: T }>(endpoint);
      setState({ data: response.data, isLoading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error('An error occurred'),
      });
    }
  }, [endpoint, options.skip]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

export function useApiMutation<TData, TVariables = unknown>() {
  const [state, setState] = useState<{
    isLoading: boolean;
    error: Error | null;
  }>({
    isLoading: false,
    error: null,
  });

  const mutate = useCallback(
    async (
      endpoint: string,
      data?: TVariables,
      method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
    ): Promise<TData | null> => {
      setState({ isLoading: true, error: null });

      try {
        let response: { success: boolean; data: TData };

        switch (method) {
          case 'POST':
            response = await api.post<{ success: boolean; data: TData }>(endpoint, data);
            break;
          case 'PUT':
            response = await api.put<{ success: boolean; data: TData }>(endpoint, data);
            break;
          case 'PATCH':
            response = await api.patch<{ success: boolean; data: TData }>(endpoint, data);
            break;
          case 'DELETE':
            response = await api.delete<{ success: boolean; data: TData }>(endpoint);
            break;
        }

        setState({ isLoading: false, error: null });
        return response.data;
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error('An error occurred');
        setState({ isLoading: false, error: err });
        return null;
      }
    },
    []
  );

  return {
    ...state,
    mutate,
  };
}

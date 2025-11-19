// Browser-compatible client that communicates with backend API
// Provides Supabase-compatible interface

import { getApiUrl } from '@/lib/init';

// Helper to get auth token
function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Helper function for API calls with authentication
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${getApiUrl()}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  });
  
  // Handle token expiration
  if (response.status === 401 || response.status === 403) {
    // Token expired or invalid - clear it
    localStorage.removeItem('auth_token');
    // Optionally redirect to login
    if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
      window.location.href = '/login';
    }
  }
  
  // Read response text once
  const text = await response.text();
  
  // Handle rate limiting (429) and other error status codes
  if (response.status === 429) {
    // Rate limited - try to parse JSON, but if it fails, return a helpful error
    try {
      const data = text ? JSON.parse(text) : {};
      return { 
        data: null, 
        error: { 
          message: data.message || data.error || 'Too many requests. Please wait a moment and try again.' 
        } 
      };
    } catch {
      return { 
        data: null, 
        error: { 
          message: 'Too many requests. Please wait a moment and try again.' 
        } 
      };
    }
  }
  
  // Check if response is JSON before parsing
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    // For error status codes, try to provide a helpful message
    if (response.status >= 400) {
      const errorMsg = text ? text.substring(0, 200) : response.statusText;
      console.error('Non-JSON error response:', { status: response.status, statusText: response.statusText, text: errorMsg });
      return { 
        data: null, 
        error: { 
          message: `Server error (${response.status}): ${errorMsg || response.statusText}` 
        } 
      };
    }
    console.error('Non-JSON response:', { status: response.status, statusText: response.statusText, text: text.substring(0, 200) });
    throw new Error(`Server returned non-JSON response (${response.status} ${response.statusText}): ${text.substring(0, 100)}`);
  }
  
  // If response is empty, return empty object
  if (!text || text.trim() === '') {
    return { data: null, error: null };
  }
  
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON parse error:', error);
    console.error('Response text:', text);
    // For error status codes, return error object instead of throwing
    if (response.status >= 400) {
      return { 
        data: null, 
        error: { 
          message: `Invalid response from server (${response.status}): ${text.substring(0, 100)}` 
        } 
      };
    }
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
  }
}

// Query builder for chaining
class QueryBuilder {
  private table: string;
  private filters: Record<string, any> = {};
  private selectColumns: string = '*';
  private orderBy: string | null = null;
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private pageNumber: number | null = null;
  private singleResult: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: any) {
    this.filters[column] = value;
    return this;
  }

  in(column: string, values: any[]) {
    this.filters[`${column}_in`] = values.join(',');
    return this;
  }

  is(column: string, value: any) {
    this.filters[`${column}_is`] = value;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = `${column}:${options?.ascending === false ? 'desc' : 'asc'}`;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  // Add pagination support
  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  // Add page-based pagination
  page(pageNum: number, pageSize: number = 50) {
    this.pageNumber = pageNum;
    this.limitCount = pageSize;
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  maybeSingle() {
    this.singleResult = true;
    return this;
  }

  async execute() {
    const params = new URLSearchParams();
    if (this.selectColumns !== '*') params.append('columns', this.selectColumns);
    
    Object.entries(this.filters).forEach(([key, value]) => {
      params.append(key, value);
    });
    
    if (this.orderBy) params.append('order', this.orderBy);
    
    // Handle pagination
    if (this.pageNumber) {
      params.append('page', this.pageNumber.toString());
      if (this.limitCount) params.append('limit', this.limitCount.toString());
    } else {
      if (this.limitCount) params.append('limit', this.limitCount.toString());
      if (this.offsetCount) params.append('offset', this.offsetCount.toString());
    }
    
    const queryString = params.toString();
    const url = `/api/${this.table}${queryString ? `?${queryString}` : ''}`;
    
    const result = await apiCall(url);
    
    if (this.singleResult && result.data) {
      return {
        ...result,
        data: Array.isArray(result.data) ? result.data[0] : result.data
      };
    }
    
    return result;
  }

  // Make it thenable so it can be awaited
  then(onfulfilled?: any, onrejected?: any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Supabase-compatible client interface
export const supabase = {
  from: (table: string) => ({
    select: (columns: string = '*', options?: { count?: 'exact' }) => {
      const builder = new QueryBuilder(table);
      return builder.select(columns);
    },

    insert: (data: any | any[]) => {
      // Return a chainable object that supports .select() and .single()
      return {
        select: (columns?: string) => ({
          single: async () => {
            try {
              const result = await apiCall(`/api/${table}`, {
                method: 'POST',
                body: JSON.stringify(Array.isArray(data) ? data : [data]),
              });
              
              // If result has data array, return first item
              if (result.data && Array.isArray(result.data) && result.data.length > 0) {
                return { ...result, data: result.data[0] };
              }
              return result;
            } catch (error: any) {
              return { data: null, error: { message: error.message } };
            }
          },
          async then(onfulfilled?: any, onrejected?: any) {
            try {
              const result = await apiCall(`/api/${table}`, {
                method: 'POST',
                body: JSON.stringify(Array.isArray(data) ? data : [data]),
              });
              return onfulfilled ? onfulfilled(result) : result;
            } catch (error: any) {
              const errorResult = { data: null, error: { message: error.message } };
              return onrejected ? onrejected(errorResult) : errorResult;
            }
          },
        }),
        async then(onfulfilled?: any, onrejected?: any) {
          try {
            const result = await apiCall(`/api/${table}`, {
              method: 'POST',
              body: JSON.stringify(Array.isArray(data) ? data : [data]),
            });
            return onfulfilled ? onfulfilled(result) : result;
          } catch (error: any) {
            const errorResult = { data: null, error: { message: error.message } };
            return onrejected ? onrejected(errorResult) : errorResult;
          }
        },
      };
    },

    update: (data: any) => {
      // Return an object with eq method for chaining
      return {
        eq: async (column: string, value: any) => {
          try {
            return await apiCall(`/api/${table}`, {
              method: 'PATCH',
              body: JSON.stringify({
                data,
                filters: { [column]: value }
              }),
            });
          } catch (error: any) {
            return { data: null, error: { message: error.message } };
          }
        },
      };
    },

    delete: () => ({
      eq: async (column: string, value: any) => {
        try {
          return await apiCall(`/api/${table}`, {
            method: 'DELETE',
            body: JSON.stringify({ [column]: value }),
          });
        } catch (error: any) {
          return { data: null, error: { message: error.message } };
        }
      },
    }),
  }),

  auth: {
    signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: any } }) => {
      try {
        const result = await apiCall('/api/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ 
            email, 
            password,
            full_name: options?.data?.full_name
          }),
        });
        
        // Store token if signup successful
        if (result.token && !result.error) {
          localStorage.setItem('auth_token', result.token);
        }
        
        return result;
      } catch (error: any) {
        return { user: null, error: { message: error.message } };
      }
    },

    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const result = await apiCall('/api/auth/signin', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        
        // Store token if signin successful
        if (result.token && !result.error) {
          localStorage.setItem('auth_token', result.token);
        }
        
        return result;
      } catch (error: any) {
        return { user: null, error: { message: error.message } };
      }
    },

    signOut: async () => {
      try {
        const result = await apiCall('/api/auth/signout', {
          method: 'POST',
        });
        
        // Clear token on signout
        localStorage.removeItem('auth_token');
        
        return result;
      } catch (error: any) {
        // Still clear token even if API call fails
        localStorage.removeItem('auth_token');
        return { error: { message: error.message } };
      }
    },

    getUser: async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          return { data: { user: null }, error: null };
        }
        
        // Fetch user from API with token
        const result = await apiCall('/api/auth/user');
        
        if (result.user) {
          return { data: { user: result.user }, error: null };
        } else if (result.error) {
          return { data: { user: null }, error: result.error };
        }
        
        return { data: { user: null }, error: null };
      } catch (error: any) {
        return { data: { user: null }, error: { message: error.message } };
      }
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Placeholder for auth state changes
      // You can implement this with WebSockets or polling if needed
      return {
        data: { subscription: { unsubscribe: () => {} } }
      };
    },
  },

  rpc: async (functionName: string, params?: any) => {
    try {
      return await apiCall(`/api/rpc/${functionName}`, {
        method: 'POST',
        body: JSON.stringify(params || {}),
      });
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  },
};

export default supabase;

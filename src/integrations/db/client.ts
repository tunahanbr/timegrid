// Browser-compatible client that communicates with backend API
// Provides Supabase-compatible interface

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper to get auth token
function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Helper function for API calls with authentication
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
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
  
  return response.json();
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

    insert: async (data: any | any[]) => {
      try {
        return await apiCall(`/api/${table}`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
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

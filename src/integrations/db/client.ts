// Browser-compatible client that communicates with backend API
// Provides Supabase-compatible interface

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  return response.json();
}

// Query builder for chaining
class QueryBuilder {
  private table: string;
  private filters: Record<string, any> = {};
  private selectColumns: string = '*';
  private orderBy: string | null = null;
  private limitCount: number | null = null;
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
    if (this.limitCount) params.append('limit', this.limitCount.toString());
    
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
        return await apiCall('/api/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ 
            email, 
            password,
            full_name: options?.data?.full_name
          }),
        });
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },

    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        return await apiCall('/api/auth/signin', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },

    signOut: async () => {
      try {
        return await apiCall('/api/auth/signout', {
          method: 'POST',
        });
      } catch (error: any) {
        return { error: { message: error.message } };
      }
    },

    getUser: async () => {
      try {
        // Check localStorage first (since we're using localStorage for auth)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            return { data: { user: userData }, error: null };
          } catch (e) {
            console.error('Error parsing stored user:', e);
          }
        }
        
        // Fallback to API call
        return await apiCall('/api/auth/user');
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

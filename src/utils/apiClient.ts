const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiClient {
    private token: string | null = localStorage.getItem('ecs_token');

    setToken(token: string | null) {
        this.token = token;
        if (token) {
            localStorage.setItem('ecs_token', token);
        } else {
            localStorage.removeItem('ecs_token');
        }
    }

    async request(endpoint: string, options: RequestInit = {}) {
        console.log(`[API] Request: ${endpoint}`, options.method || 'GET');
        const headers = { ...options.headers } as any;

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers,
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.group(`[API] JSON Parse Error: ${endpoint}`);
                console.error('Text:', text.substring(0, 1000));
                console.error('Error:', e);
                console.groupEnd();
                data = { error: `Invalid JSON response from server: ${text.substring(0, 50)}...` };
            }

            if (!response.ok) {
                console.error(`[API] Error ${response.status} from ${endpoint}:`, data);
                throw new Error(data.error || 'Something went wrong');
            }

            return data;
        } catch (err: any) {
            console.error(`[API] Fetch error for ${endpoint}:`, err.message);
            throw err;
        }
    }

    // Supabase-like query builder (Simplified)
    from(table: string) {
        const queryBuilder = {
            select: (query: string = '*') => queryBuilder,
            eq: (column: string, value: any) => {
                queryBuilder.params.append(column, value);
                return queryBuilder;
            },
            ilike: (column: string, value: any) => {
                queryBuilder.params.append(column, value);
                return queryBuilder;
            },
            like: (column: string, value: any) => {
                queryBuilder.params.append(column, value);
                return queryBuilder;
            },
            order: (column: string, { ascending = true } = {}) => {
                queryBuilder.params.append('sort_by', column);
                queryBuilder.params.append('order', ascending ? 'asc' : 'desc');
                return queryBuilder;
            },
            limit: (count: number) => queryBuilder,
            in: (column: string, values: any[]) => {
                values.forEach(v => queryBuilder.params.append(column, v));
                return queryBuilder;
            },
            filter: (column: string, operator: string, value: any) => {
                queryBuilder.params.append(column, value);
                return queryBuilder;
            },
            range: (from: number, to: number) => queryBuilder,
            single: async () => {
                const { data } = await queryBuilder.execute() as any;
                return { data: data?.[0] || null, error: null };
            },
            maybeSingle: async () => {
                const { data } = await queryBuilder.execute() as any;
                return { data: data?.[0] || null, error: null };
            },
            params: new URLSearchParams(),
            or: (query: string) => {
                queryBuilder.params.append('or', query);
                return queryBuilder;
            },
            execute: async () => {
                try {
                    const queryString = queryBuilder.params.toString();
                    const url = `/api/${table}${queryString ? `?${queryString}` : ''}`;
                    const data = await this.request(url);
                    return { data, count: Array.isArray(data) ? data.length : 0, error: null };
                } catch (err: any) {
                    console.warn(`[API] Query failed for ${table}:`, err.message);
                    return { data: [], count: 0, error: err };
                }
            },
            then: async (callback: any) => {
                try {
                    const result = await queryBuilder.execute();
                    return callback(result);
                } catch (err: any) {
                    return callback({ data: null, count: 0, error: err });
                }
            },
            insert: (data: any) => {
                let executed = false;
                let isSingle = false;
                const exec = async () => {
                    if (executed) return { data: null, error: null };
                    executed = true;
                    try {
                        const result = await this.request(`/api/${table}`, {
                            method: 'POST',
                            body: JSON.stringify(Array.isArray(data) ? data[0] : data),
                        });
                        // Supabase style: if single() was called, return the object directly
                        const finalData = isSingle ? (Array.isArray(result) ? result[0] : result) : result;
                        return { data: finalData, error: null };
                    } catch (err: any) {
                        return { data: null, error: err };
                    }
                };
                const builder: any = {
                    select: (query?: string) => builder,
                    single: () => {
                        isSingle = true;
                        return builder;
                    },
                    maybeSingle: () => {
                        isSingle = true;
                        return builder;
                    },
                    then: (onfulfilled: any, onrejected?: any) => exec().then(onfulfilled, onrejected),
                    catch: (onrejected: any) => exec().catch(onrejected)
                };
                return builder;
            },
            update: (data: any) => {
                const updateBuilder = {
                    eq: (column: string, value: any) => {
                        let executed = false;
                        const exec = async () => {
                            if (executed) return { data: null, error: null };
                            executed = true;
                            try {
                                const result = await this.request(`/api/${table}/${value}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify(data),
                                });
                                return { data: result, error: null };
                            } catch (err: any) {
                                return { data: null, error: err };
                            }
                        };
                        return {
                            then: (onfulfilled: any, onrejected?: any) => exec().then(onfulfilled, onrejected),
                            catch: (onrejected: any) => exec().catch(onrejected)
                        };
                    }
                };
                return updateBuilder;
            },
            delete: (options?: any) => {
                const deleteBuilder = {
                    eq: (column: string, value: any) => {
                        let executed = false;
                        const exec = async () => {
                            if (executed) return { data: null, error: null };
                            executed = true;
                            try {
                                const result = await this.request(`/api/${table}/${value}`, {
                                    method: 'DELETE',
                                });
                                return { data: result, count: 1, error: null };
                            } catch (err: any) {
                                return { data: null, count: 0, error: err };
                            }
                        };
                        return {
                            then: (onfulfilled: any, onrejected?: any) => exec().then(onfulfilled, onrejected),
                            catch: (onrejected: any) => exec().catch(onrejected)
                        };
                    }
                };
                return deleteBuilder;
            }
        };
        return queryBuilder;
    }

    async rpc(name: string, params: any = {}) {
        try {
            const result = await this.request(`/api/rpc/${name}`, {
                method: 'POST',
                body: JSON.stringify(params),
            });
            return { data: result, error: null };
        } catch (err: any) {
            console.warn(`[API] RPC failed for ${name}:`, err.message);
            return { data: null, error: err };
        }
    }

    // Add channel/subscribe mocks to prevent crashes
    channel = (name: string) => ({
        on: () => ({
            subscribe: () => ({
                unsubscribe: () => { }
            })
        }),
        subscribe: () => ({
            unsubscribe: () => { }
        })
    });

    removeChannel = () => { };

    storage = {
        from: (bucket: string) => ({
            upload: async (path: string, file: File) => {
                const formData = new FormData();
                formData.append('path', path);
                formData.append('bucket', bucket);
                formData.append('file', file);

                try {
                    const data = await this.request('/api/upload', {
                        method: 'POST',
                        body: formData,
                    });
                    // Map local backend response to Supabase style
                    return { data: { path: data.filename }, error: null };
                } catch (err: any) {
                    return { data: null, error: err };
                }
            },
            getPublicUrl: (path: string) => ({
                data: {
                    publicUrl: `${API_URL}/uploads/${path}`
                }
            })
        })
    };

    // Auth helper
    private authListeners: ((event: string, session: any) => void)[] = [];

    private emitAuthEvent(event: string, session: any) {
        this.authListeners.forEach(cb => cb(event, session));
    }

    auth = {
        signInWithPassword: async ({ email, password }: any) => {
            try {
                const data = await this.request('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password }),
                });
                this.setToken(data.token);
                // Standard Supabase-like session structure
                const session = { user: data.user, access_token: data.token };
                this.emitAuthEvent('SIGNED_IN', session);
                return { data: session, error: null };
            } catch (err: any) {
                return { data: null, error: err };
            }
        },
        signUp: async ({ email, password, options }: any) => {
            try {
                const data = await this.request('/api/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({
                        email,
                        password,
                        full_name: options?.data?.full_name,
                        role: options?.data?.role || 'branch_admin'
                    }),
                });
                return { data: { user: { id: data.userId, email } }, error: null };
            } catch (err: any) {
                return { data: null, error: err };
            }
        },
        signOut: async () => {
            this.setToken(null);
            this.emitAuthEvent('SIGNED_OUT', null);
            return { error: null };
        },
        getSession: async () => {
            if (!this.token) return { data: { session: null }, error: null };
            try {
                const data = await this.request('/api/auth/me');
                // Standard Supabase-like session structure
                const session = { user: data, access_token: this.token };
                return { data: session, error: null };
            } catch (err) {
                this.setToken(null);
                return { data: { session: null }, error: null };
            }
        },
        onAuthStateChange: (callback: any) => {
            this.authListeners.push(callback);
            return {
                data: {
                    subscription: {
                        unsubscribe: () => {
                            this.authListeners = this.authListeners.filter(cb => cb !== callback);
                        }
                    }
                }
            };
        }
    };
}

export const apiClient = new ApiClient();

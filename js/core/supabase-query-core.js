/**
 * ============================================================================
 * SUPABASE QUERY CORE MODULE
 * ============================================================================
 *
 * @sealed DO NOT MODIFY WITHOUT EXPLICIT AUTHORIZATION
 *
 * This module contains core database query patterns for Supabase operations.
 * Changes to this module require explicit user approval and version tracking.
 *
 * MODIFICATION HISTORY:
 * --------------------------------
 * v1.0.0 (2026-01-07) - Initial sealed version
 *
 * ============================================================================
 */

(function() {
    'use strict';

    const MODULE_VERSION = '1.0.0';
    const MODULE_NAME = 'SupabaseQueryCore';
    const CREATED_AT = '2026-01-07';

    /**
     * Core query operations for Supabase
     * All methods are pure functions that return query configuration objects
     */
    const SupabaseQueryCore = {
        /**
         * Module metadata
         */
        VERSION: MODULE_VERSION,
        NAME: MODULE_NAME,

        /**
         * Build SELECT query configuration
         * @param {string} table - Table name
         * @param {Object} options - Query options
         * @returns {Object} Query configuration
         */
        buildSelectQuery: function(table, options = {}) {
            const config = {
                operation: 'SELECT',
                table: table,
                columns: options.columns || '*',
                filters: [],
                orderBy: null,
                limit: null,
                offset: null,
                single: options.single || false
            };

            // Add filters
            if (options.eq) {
                Object.entries(options.eq).forEach(([col, val]) => {
                    config.filters.push({ type: 'eq', column: col, value: val });
                });
            }

            if (options.neq) {
                Object.entries(options.neq).forEach(([col, val]) => {
                    config.filters.push({ type: 'neq', column: col, value: val });
                });
            }

            if (options.in) {
                Object.entries(options.in).forEach(([col, vals]) => {
                    config.filters.push({ type: 'in', column: col, value: vals });
                });
            }

            // Add ordering
            if (options.orderBy) {
                config.orderBy = {
                    column: options.orderBy.column || options.orderBy,
                    ascending: options.orderBy.ascending !== false
                };
            }

            // Add pagination
            if (options.limit) config.limit = options.limit;
            if (options.offset) config.offset = options.offset;

            return Object.freeze(config);
        },

        /**
         * Build INSERT query configuration
         * @param {string} table - Table name
         * @param {Object|Array} data - Data to insert
         * @param {Object} options - Query options
         * @returns {Object} Query configuration
         */
        buildInsertQuery: function(table, data, options = {}) {
            const config = {
                operation: 'INSERT',
                table: table,
                data: Array.isArray(data) ? data : [data],
                returning: options.returning !== false,
                single: options.single || (!Array.isArray(data))
            };

            return Object.freeze(config);
        },

        /**
         * Build UPDATE query configuration
         * @param {string} table - Table name
         * @param {Object} data - Data to update
         * @param {Object} options - Query options with filters
         * @returns {Object} Query configuration
         */
        buildUpdateQuery: function(table, data, options = {}) {
            const config = {
                operation: 'UPDATE',
                table: table,
                data: { ...data, updated_at: new Date().toISOString() },
                filters: [],
                returning: options.returning !== false
            };

            // Add filters (required for UPDATE)
            if (options.eq) {
                Object.entries(options.eq).forEach(([col, val]) => {
                    config.filters.push({ type: 'eq', column: col, value: val });
                });
            }

            if (config.filters.length === 0) {
                throw new Error('UPDATE query requires at least one filter');
            }

            return Object.freeze(config);
        },

        /**
         * Build DELETE query configuration
         * @param {string} table - Table name
         * @param {Object} options - Query options with filters
         * @returns {Object} Query configuration
         */
        buildDeleteQuery: function(table, options = {}) {
            const config = {
                operation: 'DELETE',
                table: table,
                filters: []
            };

            // Add filters (required for DELETE)
            if (options.eq) {
                Object.entries(options.eq).forEach(([col, val]) => {
                    config.filters.push({ type: 'eq', column: col, value: val });
                });
            }

            if (config.filters.length === 0) {
                throw new Error('DELETE query requires at least one filter');
            }

            return Object.freeze(config);
        },

        /**
         * Build UPSERT query configuration
         * @param {string} table - Table name
         * @param {Object|Array} data - Data to upsert
         * @param {Object} options - Query options
         * @returns {Object} Query configuration
         */
        buildUpsertQuery: function(table, data, options = {}) {
            const config = {
                operation: 'UPSERT',
                table: table,
                data: Array.isArray(data) ? data : [data],
                onConflict: options.onConflict || null,
                ignoreDuplicates: options.ignoreDuplicates || false,
                returning: options.returning !== false
            };

            return Object.freeze(config);
        },

        /**
         * Execute query using Supabase client
         * @param {Object} client - Supabase client instance
         * @param {Object} queryConfig - Query configuration from build methods
         * @returns {Promise<Object>} Query result
         */
        executeQuery: async function(client, queryConfig) {
            if (!client) {
                throw new Error('Supabase client is required');
            }

            try {
                let query = client.from(queryConfig.table);

                switch (queryConfig.operation) {
                    case 'SELECT':
                        query = query.select(queryConfig.columns);
                        break;

                    case 'INSERT':
                        query = query.insert(queryConfig.data);
                        if (queryConfig.returning) query = query.select();
                        break;

                    case 'UPDATE':
                        query = query.update(queryConfig.data);
                        break;

                    case 'DELETE':
                        query = query.delete();
                        break;

                    case 'UPSERT':
                        const upsertOptions = {};
                        if (queryConfig.onConflict) {
                            upsertOptions.onConflict = queryConfig.onConflict;
                        }
                        upsertOptions.ignoreDuplicates = queryConfig.ignoreDuplicates;
                        query = query.upsert(queryConfig.data, upsertOptions);
                        if (queryConfig.returning) query = query.select();
                        break;

                    default:
                        throw new Error(`Unknown operation: ${queryConfig.operation}`);
                }

                // Apply filters
                if (queryConfig.filters) {
                    for (const filter of queryConfig.filters) {
                        switch (filter.type) {
                            case 'eq':
                                query = query.eq(filter.column, filter.value);
                                break;
                            case 'neq':
                                query = query.neq(filter.column, filter.value);
                                break;
                            case 'in':
                                query = query.in(filter.column, filter.value);
                                break;
                        }
                    }
                }

                // Apply ordering
                if (queryConfig.orderBy) {
                    query = query.order(queryConfig.orderBy.column, {
                        ascending: queryConfig.orderBy.ascending
                    });
                }

                // Apply pagination
                if (queryConfig.limit) {
                    query = query.limit(queryConfig.limit);
                }

                if (queryConfig.offset) {
                    query = query.range(
                        queryConfig.offset,
                        queryConfig.offset + (queryConfig.limit || 100) - 1
                    );
                }

                // Apply single row expectation
                if (queryConfig.single) {
                    query = query.single();
                }

                const { data, error } = await query;

                if (error) {
                    return {
                        success: false,
                        error: error.message,
                        code: error.code
                    };
                }

                return {
                    success: true,
                    data: data
                };

            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        },

        /**
         * Standard error handler for Supabase operations
         * @param {Error|Object} error - Error object
         * @param {string} operation - Operation name for logging
         * @returns {Object} Standardized error response
         */
        handleError: function(error, operation) {
            const errorMessage = error?.message || error?.error || 'Unknown error';
            const errorCode = error?.code || 'UNKNOWN';

            console.error(`[${MODULE_NAME}] ${operation} failed:`, errorMessage);

            return {
                success: false,
                error: errorMessage,
                code: errorCode,
                operation: operation,
                timestamp: new Date().toISOString()
            };
        },

        /**
         * Verify module integrity
         * @returns {Object} Integrity verification result
         */
        verifyIntegrity: function() {
            const requiredMethods = [
                'buildSelectQuery',
                'buildInsertQuery',
                'buildUpdateQuery',
                'buildDeleteQuery',
                'buildUpsertQuery',
                'executeQuery',
                'handleError'
            ];

            const missingMethods = requiredMethods.filter(
                method => typeof this[method] !== 'function'
            );

            return {
                valid: missingMethods.length === 0,
                version: MODULE_VERSION,
                name: MODULE_NAME,
                missingMethods: missingMethods,
                frozen: Object.isFrozen(this)
            };
        }
    };

    // Freeze the module to prevent modifications
    Object.freeze(SupabaseQueryCore);

    // Register globally
    if (typeof window !== 'undefined') {
        // Prevent re-registration
        if (window.SupabaseQueryCore) {
            console.warn(`[${MODULE_NAME}] Already registered. Skipping re-registration.`);
        } else {
            window.SupabaseQueryCore = SupabaseQueryCore;
            console.log(`[${MODULE_NAME}] v${MODULE_VERSION} loaded and sealed`);
        }
    }

    // Export for module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SupabaseQueryCore;
    }

})();

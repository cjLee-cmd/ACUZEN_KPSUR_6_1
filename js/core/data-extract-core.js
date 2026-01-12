/**
 * ============================================================================
 * DATA EXTRACTION CORE MODULE
 * ============================================================================
 *
 * @sealed DO NOT MODIFY WITHOUT EXPLICIT AUTHORIZATION
 *
 * This module contains core data extraction patterns for CS/PH/Table data
 * from markdown content.
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
    const MODULE_NAME = 'DataExtractCore';
    const CREATED_AT = '2026-01-07';

    /**
     * Data type patterns (immutable)
     */
    const DATA_PATTERNS = Object.freeze({
        CS: /^CS(\d+)_(.+)$/,    // CS0_성분명, CS5_국내허가일자
        PH: /^PH(\d+)_(.+)$/,    // PH4_원시자료서술문
        Table: /^표(\d+)_(.+)$/  // 표2_연도별판매량
    });

    /**
     * Reserved data not found marker
     */
    const DATA_NOT_FOUND = 'DATA_NOT_FOUND';

    /**
     * Core data extraction operations
     */
    const DataExtractCore = {
        /**
         * Module metadata
         */
        VERSION: MODULE_VERSION,
        NAME: MODULE_NAME,
        DATA_NOT_FOUND: DATA_NOT_FOUND,

        /**
         * Parse data variable ID
         * @param {string} variableId - Variable ID (e.g., "CS0_성분명")
         * @returns {Object|null} Parsed variable info
         */
        parseVariableId: function(variableId) {
            if (!variableId || typeof variableId !== 'string') {
                return null;
            }

            for (const [type, pattern] of Object.entries(DATA_PATTERNS)) {
                const match = variableId.match(pattern);
                if (match) {
                    return {
                        type: type,
                        number: parseInt(match[1], 10),
                        name: match[2],
                        fullId: variableId
                    };
                }
            }

            return null;
        },

        /**
         * Validate data value
         * @param {*} value - Value to validate
         * @returns {Object} Validation result
         */
        validateValue: function(value) {
            // Check for null/undefined
            if (value === null || value === undefined) {
                return { valid: false, reason: 'null_or_undefined' };
            }

            // Check for empty string
            if (typeof value === 'string' && value.trim() === '') {
                return { valid: false, reason: 'empty_string' };
            }

            // Check for DATA_NOT_FOUND marker
            if (value === DATA_NOT_FOUND) {
                return { valid: false, reason: 'not_found_marker' };
            }

            // Check for placeholder patterns
            const placeholderPatterns = [
                /^\[.*\]$/,           // [placeholder]
                /^<.*>$/,             // <placeholder>
                /^{.*}$/,             // {placeholder}
                /^N\/A$/i,            // N/A
                /^없음$/,             // 없음
                /^미확인$/,           // 미확인
                /^데이터\s*없음$/     // 데이터 없음
            ];

            for (const pattern of placeholderPatterns) {
                if (pattern.test(String(value))) {
                    return { valid: false, reason: 'placeholder_value' };
                }
            }

            return { valid: true };
        },

        /**
         * Detect data conflicts between values
         * @param {*} existingValue - Existing stored value
         * @param {*} newValue - New value to compare
         * @returns {Object} Conflict detection result
         */
        detectConflict: function(existingValue, newValue) {
            // No conflict if no existing value
            if (existingValue === null || existingValue === undefined) {
                return { hasConflict: false };
            }

            // Normalize for comparison
            const normalizedExisting = this.normalizeValue(existingValue);
            const normalizedNew = this.normalizeValue(newValue);

            // Check if values are equal
            if (normalizedExisting === normalizedNew) {
                return { hasConflict: false };
            }

            // Check if existing is array (already has conflicts)
            if (Array.isArray(existingValue)) {
                const alreadyIncludes = existingValue.some(
                    v => this.normalizeValue(v) === normalizedNew
                );
                return {
                    hasConflict: !alreadyIncludes,
                    existingValues: existingValue,
                    newValue: newValue
                };
            }

            return {
                hasConflict: true,
                existingValue: existingValue,
                newValue: newValue
            };
        },

        /**
         * Normalize value for comparison
         * @param {*} value - Value to normalize
         * @returns {string} Normalized string value
         */
        normalizeValue: function(value) {
            if (value === null || value === undefined) {
                return '';
            }

            return String(value)
                .trim()
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .replace(/[.,;:!?'"]+/g, '');
        },

        /**
         * Extract markdown table to structured data
         * @param {string} markdownTable - Markdown table string
         * @returns {Object} Structured table data
         */
        parseMarkdownTable: function(markdownTable) {
            if (!markdownTable || typeof markdownTable !== 'string') {
                return { success: false, error: 'Invalid input' };
            }

            const lines = markdownTable.trim().split('\n');
            if (lines.length < 2) {
                return { success: false, error: 'Table too short' };
            }

            // Parse header row
            const headerLine = lines[0];
            const headers = headerLine
                .split('|')
                .map(h => h.trim())
                .filter(h => h.length > 0);

            if (headers.length === 0) {
                return { success: false, error: 'No headers found' };
            }

            // Skip separator line (index 1)
            const dataLines = lines.slice(2);

            // Parse data rows
            const rows = [];
            for (const line of dataLines) {
                const cells = line
                    .split('|')
                    .map(c => c.trim())
                    .filter((_, index, arr) => {
                        // Filter empty first/last cells from | borders
                        return !(index === 0 && arr[index] === '') &&
                               !(index === arr.length - 1 && arr[index] === '');
                    });

                if (cells.length > 0) {
                    const row = {};
                    headers.forEach((header, i) => {
                        row[header] = cells[i] || '';
                    });
                    rows.push(row);
                }
            }

            return {
                success: true,
                headers: headers,
                rows: rows,
                rowCount: rows.length
            };
        },

        /**
         * Build JSON extraction prompt for LLM
         * @param {string} content - Content to extract from
         * @param {Array} dataDefinitions - Data definitions to extract
         * @param {string} sourceId - Source document identifier
         * @returns {string} LLM prompt
         */
        buildExtractionPrompt: function(content, dataDefinitions, sourceId) {
            const definitionsList = dataDefinitions
                .map(d => `- ${d.id}: ${d.description}`)
                .join('\n');

            return `당신은 PSUR(정기안전성갱신보고서) 데이터 추출 전문가입니다.

다음 문서에서 지정된 데이터를 추출해주세요.

## 소스 문서 ID: ${sourceId}

## 추출할 데이터 항목
${definitionsList}

## 문서 내용
${content}

## 출력 형식
반드시 다음 JSON 형식으로만 출력하세요:
\`\`\`json
{
  "추출된데이터ID": "추출된 값",
  "데이터를찾을수없으면": "${DATA_NOT_FOUND}"
}
\`\`\`

## 중요 규칙
1. 문서에 명확히 존재하는 데이터만 추출
2. 추측이나 유추 금지
3. 데이터가 없으면 반드시 "${DATA_NOT_FOUND}" 사용
4. JSON 형식 외 다른 텍스트 출력 금지`;
        },

        /**
         * Parse LLM extraction response
         * @param {string} response - LLM response text
         * @returns {Object} Parsed extraction result
         */
        parseExtractionResponse: function(response) {
            if (!response || typeof response !== 'string') {
                return { success: false, error: 'Invalid response' };
            }

            // Try to extract JSON from markdown code block
            const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

            let jsonStr;
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            } else {
                // Try to find raw JSON
                const jsonStartIndex = response.indexOf('{');
                const jsonEndIndex = response.lastIndexOf('}');

                if (jsonStartIndex !== -1 && jsonEndIndex > jsonStartIndex) {
                    jsonStr = response.substring(jsonStartIndex, jsonEndIndex + 1);
                } else {
                    return { success: false, error: 'No JSON found in response' };
                }
            }

            try {
                const data = JSON.parse(jsonStr);
                return { success: true, data: data };
            } catch (parseError) {
                return { success: false, error: `JSON parse error: ${parseError.message}` };
            }
        },

        /**
         * Merge extracted data with conflict detection
         * @param {Object} existingData - Existing data store
         * @param {Object} newData - New extracted data
         * @param {string} sourceId - Source identifier
         * @returns {Object} Merge result with conflicts
         */
        mergeData: function(existingData, newData, sourceId) {
            const result = {
                merged: { ...existingData },
                conflicts: [],
                added: [],
                skipped: []
            };

            for (const [key, value] of Object.entries(newData)) {
                // Validate value
                const validation = this.validateValue(value);
                if (!validation.valid) {
                    result.skipped.push({
                        key: key,
                        value: value,
                        reason: validation.reason
                    });
                    continue;
                }

                // Check for conflicts
                const conflictCheck = this.detectConflict(existingData[key], value);

                if (conflictCheck.hasConflict) {
                    // Record conflict
                    result.conflicts.push({
                        key: key,
                        existingValue: conflictCheck.existingValue || conflictCheck.existingValues,
                        newValue: value,
                        source: sourceId,
                        timestamp: new Date().toISOString()
                    });

                    // Store as array for later resolution
                    if (Array.isArray(result.merged[key])) {
                        result.merged[key].push(value);
                    } else if (result.merged[key] !== undefined) {
                        result.merged[key] = [result.merged[key], value];
                    } else {
                        result.merged[key] = value;
                    }
                } else if (!existingData[key]) {
                    // New data
                    result.merged[key] = value;
                    result.added.push({
                        key: key,
                        value: value,
                        source: sourceId
                    });
                }
                // If no conflict and existing equals new, skip (already have it)
            }

            return result;
        },

        /**
         * Verify module integrity
         * @returns {Object} Integrity verification result
         */
        verifyIntegrity: function() {
            const requiredMethods = [
                'parseVariableId',
                'validateValue',
                'detectConflict',
                'normalizeValue',
                'parseMarkdownTable',
                'buildExtractionPrompt',
                'parseExtractionResponse',
                'mergeData'
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
    Object.freeze(DataExtractCore);

    // Register globally
    if (typeof window !== 'undefined') {
        if (window.DataExtractCore) {
            console.warn(`[${MODULE_NAME}] Already registered. Skipping re-registration.`);
        } else {
            window.DataExtractCore = DataExtractCore;
            console.log(`[${MODULE_NAME}] v${MODULE_VERSION} loaded and sealed`);
        }
    }

    // Export for module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DataExtractCore;
    }

})();

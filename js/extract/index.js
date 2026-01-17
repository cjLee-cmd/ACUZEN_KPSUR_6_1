/**
 * Extract Module Index - 통합 Export
 * js/extract/index.js
 *
 * 모든 Extract 모듈을 통합하고 기존 DataExtractor와 호환성 유지
 *
 * 로드 순서:
 * 1. extract-base.js
 * 2. extract-cs.js
 * 3. extract-ph.js
 * 4. extract-tables.js
 * 5. index.js (이 파일)
 */

(function() {
    'use strict';

    /**
     * DataExtractor - 기존 API와 호환되는 통합 Facade
     */
    class DataExtractor {
        constructor() {
            // 서브모듈 확인
            if (!window.extractBase) {
                console.warn('⚠️ ExtractBase not loaded');
            }

            // 서브모듈 참조
            this.base = window.extractBase;
            this.cs = window.extractCS;
            this.ph = window.extractPH;
            this.tables = window.extractTables;

            // 신규 모듈 참조
            this.exampleLoader = window.exampleLoader;
            this.formatValidator = window.formatValidator;

            // 서브모듈에 base 주입
            if (this.cs && this.base) this.cs.base = this.base;
            if (this.ph && this.base) this.ph.base = this.base;
            if (this.tables && this.base) this.tables.base = this.base;
        }

        // ==========================================
        // Legacy API Methods (기존 코드 호환)
        // ==========================================

        /**
         * 마크다운에서 데이터 추출 (Legacy)
         */
        async extractFromMarkdown(markdownContent, rawId, dataDefinitions) {
            if (this.base) {
                return await this.base.extractFromMarkdown(markdownContent, rawId, dataDefinitions);
            }
            return { success: false, error: 'Base module not loaded' };
        }

        /**
         * 추출된 데이터 병합 (Legacy)
         */
        mergeExtractedData(newData, dataType = 'CS') {
            if (this.base) {
                this.base.mergeExtractedData(newData, dataType);
            }
        }

        // ==========================================
        // Type-specific Extraction Methods
        // ==========================================

        /**
         * CS 데이터 추출
         */
        async extractCSData(markdownFiles, csDefinitions) {
            if (this.cs) {
                return await this.cs.extract(markdownFiles, csDefinitions);
            }
            console.warn('[DataExtractor] ExtractCS not available');
            return {};
        }

        /**
         * PH 데이터 추출
         */
        async extractPHData(markdownFiles, phDefinitions) {
            if (this.ph) {
                return await this.ph.extract(markdownFiles, phDefinitions);
            }
            console.warn('[DataExtractor] ExtractPH not available');
            return {};
        }

        /**
         * Table 데이터 추출
         */
        async extractTableData(markdownFiles, tableDefinitions) {
            if (this.tables) {
                return await this.tables.extract(markdownFiles, tableDefinitions);
            }
            console.warn('[DataExtractor] ExtractTables not available');
            return {};
        }

        /**
         * 모든 데이터 추출 (CS + PH + Table)
         */
        async extractAllData(markdownFiles, definitions = {}) {
            console.log('[DataExtractor] Starting full extraction...');

            await this.extractCSData(markdownFiles, definitions.CS);
            await this.extractPHData(markdownFiles, definitions.PH);
            await this.extractTableData(markdownFiles, definitions.Table);

            console.log('[DataExtractor] Full extraction complete');
            return this.getExtractedData();
        }

        // ==========================================
        // Example-Enhanced Extraction Methods
        // ==========================================

        /**
         * 예시를 참고하여 데이터 추출 (권장)
         * @param {string} markdownContent - 마크다운 콘텐츠
         * @param {string} rawId - 원본 문서 ID
         * @param {object} dataDefinitions - 추출할 데이터 정의
         * @param {string[]} variableIds - 예시를 로드할 변수 ID 목록
         */
        async extractWithExamples(markdownContent, rawId, dataDefinitions, variableIds = []) {
            if (this.base && this.base.extractFromMarkdownWithExamples) {
                return await this.base.extractFromMarkdownWithExamples(
                    markdownContent,
                    rawId,
                    dataDefinitions,
                    variableIds
                );
            }
            // Fallback: 예시 없이 추출
            console.warn('[DataExtractor] extractFromMarkdownWithExamples not available, falling back');
            return await this.extractFromMarkdown(markdownContent, rawId, dataDefinitions);
        }

        /**
         * 예시 로더 초기화
         */
        async initializeExampleLoader() {
            if (this.exampleLoader) {
                return await this.exampleLoader.initialize();
            }
            console.warn('[DataExtractor] ExampleLoader not available');
            return false;
        }

        /**
         * 특정 변수의 예시 로드
         */
        async loadExamples(variableId) {
            if (this.exampleLoader) {
                return await this.exampleLoader.loadExamples(variableId);
            }
            return [];
        }

        /**
         * 예시 형식화 (프롬프트용)
         */
        async formatExamplesForPrompt(variableId, maxExamples = 2) {
            if (this.exampleLoader) {
                return await this.exampleLoader.formatExamplesForPrompt(variableId, maxExamples);
            }
            return '';
        }

        /**
         * 변수 ID에 예시가 있는지 확인
         */
        async hasExamples(variableId) {
            if (this.exampleLoader) {
                return await this.exampleLoader.hasExamples(variableId);
            }
            return false;
        }

        /**
         * 사용 가능한 예시 변수 ID 목록
         */
        async getAvailableExampleVariables() {
            if (this.exampleLoader) {
                return await this.exampleLoader.getAvailableVariableIds();
            }
            return [];
        }

        // ==========================================
        // Format Validation Methods
        // ==========================================

        /**
         * 테이블 형식 검증
         */
        validateTableFormat(content, options = {}) {
            if (this.formatValidator) {
                return this.formatValidator.validateTableFormat(content, options);
            }
            return { valid: true, errors: [], warnings: [] };
        }

        /**
         * PH (서술문) 형식 검증
         */
        validatePHFormat(content, options = {}) {
            if (this.formatValidator) {
                return this.formatValidator.validatePHFormat(content, options);
            }
            return { valid: true, errors: [], warnings: [] };
        }

        /**
         * 예시와 비교 검증
         */
        async compareWithExample(content, variableId) {
            if (this.formatValidator) {
                return await this.formatValidator.compareWithExample(content, variableId);
            }
            return { match: true, similarity: 100, differences: [] };
        }

        // ==========================================
        // Conflict Management (Delegation)
        // ==========================================

        /**
         * 충돌 해결
         */
        resolveConflict(key, selectedValue) {
            if (this.base) {
                return this.base.resolveConflict(key, selectedValue);
            }
            return false;
        }

        /**
         * 충돌 목록 가져오기
         */
        getConflicts() {
            if (this.base) {
                return this.base.getConflicts();
            }
            return [];
        }

        // ==========================================
        // Validation Methods
        // ==========================================

        /**
         * 누락된 데이터 확인
         */
        findMissingData(requiredFields) {
            if (this.base) {
                return this.base.findMissingData(requiredFields);
            }
            return { CS: [], PH: [], Table: [] };
        }

        /**
         * CS 필수 항목 검증
         */
        validateCS(requiredFields) {
            if (this.cs) {
                return this.cs.validateRequired(requiredFields);
            }
            return { valid: false, missing: requiredFields };
        }

        /**
         * PH 필수 항목 검증
         */
        validatePH(requiredFields) {
            if (this.ph) {
                return this.ph.validateRequired(requiredFields);
            }
            return { valid: false, missing: requiredFields };
        }

        /**
         * Table 필수 항목 검증
         */
        validateTables(requiredFields) {
            if (this.tables) {
                return this.tables.validateRequired(requiredFields);
            }
            return { valid: false, missing: requiredFields };
        }

        // ==========================================
        // Data Access Methods
        // ==========================================

        /**
         * 추출된 데이터 가져오기
         */
        getExtractedData() {
            if (this.base) {
                return this.base.getExtractedData();
            }
            return { CS: {}, PH: {}, Table: {} };
        }

        /**
         * 특정 타입의 데이터 가져오기
         */
        getData(dataType) {
            if (this.base) {
                return this.base.getData(dataType);
            }
            return {};
        }

        /**
         * 추출 이력 가져오기
         */
        getExtractionHistory() {
            if (this.base) {
                return this.base.getExtractionHistory();
            }
            return [];
        }

        // ==========================================
        // Export & Summary Methods
        // ==========================================

        /**
         * 추출 요약 생성
         */
        generateExtractionSummary(reportName) {
            if (this.base) {
                return this.base.generateExtractionSummary(reportName);
            }
            return { filename: '', content: '' };
        }

        /**
         * JSON 파일로 내보내기
         */
        exportToJSON(reportName) {
            if (this.base) {
                return this.base.exportToJSON(reportName);
            }
            return null;
        }

        // ==========================================
        // Definition Access Methods
        // ==========================================

        /**
         * CS 정의 가져오기
         */
        getCSDefinitions() {
            return window.CS_DEFINITIONS || (this.cs ? this.cs.getDefinitions() : {});
        }

        /**
         * PH 정의 가져오기
         */
        getPHDefinitions() {
            return window.PH_DEFINITIONS || (this.ph ? this.ph.getDefinitions() : {});
        }

        /**
         * Table 정의 가져오기
         */
        getTableDefinitions() {
            return window.TABLE_DEFINITIONS || (this.tables ? this.tables.getDefinitions() : {});
        }

        /**
         * 모든 정의 가져오기
         */
        getAllDefinitions() {
            return {
                CS: this.getCSDefinitions(),
                PH: this.getPHDefinitions(),
                Table: this.getTableDefinitions()
            };
        }

        // ==========================================
        // Utility Methods
        // ==========================================

        /**
         * 추출 초기화
         */
        clearExtractions() {
            if (this.base) {
                this.base.clearExtractions();
            }
        }

        /**
         * 상태 확인
         */
        getStatus() {
            const data = this.getExtractedData();
            return {
                csCount: Object.keys(data.CS).length,
                phCount: Object.keys(data.PH).length,
                tableCount: Object.keys(data.Table).length,
                conflictCount: this.getConflicts().length,
                historyCount: this.getExtractionHistory().length
            };
        }

        /**
         * 마크다운에서 표 직접 파싱
         */
        parseTablesFromMarkdown(markdownContent) {
            if (this.tables) {
                return this.tables.parseTablesFromMarkdown(markdownContent);
            }
            return [];
        }

        /**
         * 표를 마크다운으로 변환
         */
        tableToMarkdown(tableData) {
            if (this.tables) {
                return this.tables.toMarkdown(tableData);
            }
            return '';
        }
    }

    // Singleton 인스턴스 생성 및 전역 등록
    if (typeof window !== 'undefined') {
        // 모든 서브모듈이 로드되었는지 확인
        const requiredModules = ['extractBase', 'extractCS', 'extractPH', 'extractTables'];
        const missingModules = requiredModules.filter(mod => !window[mod]);

        if (missingModules.length > 0) {
            console.warn('⚠️ Missing Extract modules:', missingModules.join(', '));
            console.warn('⚠️ Make sure to load all modules before index.js');
        }

        // 기존 dataExtractor와 호환되는 통합 인스턴스 생성
        const dataExtractor = new DataExtractor();

        // 전역 등록 (기존 코드와 호환)
        window.DataExtractor = DataExtractor;
        window.dataExtractor = dataExtractor;

        // 네임스페이스 객체로도 접근 가능
        window.KPSUR = window.KPSUR || {};
        window.KPSUR.extract = {
            extractor: dataExtractor,
            base: window.extractBase,
            cs: window.extractCS,
            ph: window.extractPH,
            tables: window.extractTables,
            // 신규 모듈
            exampleLoader: window.exampleLoader,
            formatValidator: window.formatValidator
        };

        // 신규 모듈 로드 상태 확인
        const newModules = ['exampleLoader', 'formatValidator'];
        const loadedNewModules = newModules.filter(mod => window[mod]);
        if (loadedNewModules.length < newModules.length) {
            const missing = newModules.filter(mod => !window[mod]);
            console.warn('⚠️ Some new modules not loaded:', missing.join(', '));
        }

        console.log('✅ Extract modules loaded and integrated');
        console.log(`   - Base modules: extractBase, extractCS, extractPH, extractTables`);
        console.log(`   - New modules: ${loadedNewModules.join(', ') || 'none'}`);
    }

})();

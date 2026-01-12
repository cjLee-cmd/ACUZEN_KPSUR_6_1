/**
 * PSUR Module Index - 통합 Export
 * js/psur/index.js
 *
 * 모든 PSUR 모듈을 통합하고 기존 PSURGenerator와 호환성 유지
 *
 * 로드 순서:
 * 1. psur-templates.js
 * 2. psur-prompts.js
 * 3. psur-sections.js
 * 4. psur-core.js
 * 5. index.js (이 파일)
 */

(function() {
    'use strict';

    /**
     * PSURGenerator - 기존 API와 호환되는 통합 Facade
     */
    class PSURGenerator {
        constructor() {
            // 서브모듈 확인
            if (!window.psurTemplates) {
                console.warn('⚠️ PSURTemplates not loaded');
            }
            if (!window.psurPrompts) {
                console.warn('⚠️ PSURPrompts not loaded');
            }
            if (!window.psurSections) {
                console.warn('⚠️ PSURSections not loaded');
            }
            if (!window.psurCore) {
                console.warn('⚠️ PSURCore not loaded');
            }

            // 서브모듈 참조
            this.templates = window.psurTemplates;
            this.prompts = window.psurPrompts;
            this.sections = window.psurSections;
            this.core = window.psurCore;

            // 상태 관리
            this.initialized = false;
            this.reportId = null;
        }

        // ==========================================
        // Initialization
        // ==========================================

        /**
         * 초기화
         */
        async init(apiKey) {
            if (this.core) {
                await this.core.init(apiKey);
            }
            this.initialized = true;
            console.log('✅ PSURGenerator initialized');
            return this;
        }

        /**
         * 보고서 ID 설정
         */
        setReportId(reportId) {
            this.reportId = reportId;
            if (this.core) {
                this.core.setReportId(reportId);
            }
            if (this.sections) {
                this.sections.setReportId(reportId);
            }
        }

        /**
         * 보고서 ID 가져오기
         */
        getReportId() {
            return this.reportId || (this.core ? this.core.getReportId() : null);
        }

        // ==========================================
        // Template Methods (Delegation)
        // ==========================================

        /**
         * 템플릿 로드
         */
        async loadTemplates() {
            if (this.templates) {
                return await this.templates.loadTemplates();
            }
            return {};
        }

        /**
         * 예시 파일 로드
         */
        async loadExamples() {
            if (this.templates) {
                return await this.templates.loadExamples();
            }
            return {};
        }

        /**
         * UserPrompt 템플릿 로드
         */
        async loadUserPromptTemplate() {
            if (this.templates) {
                return await this.templates.loadUserPromptTemplate();
            }
            return null;
        }

        /**
         * 마크다운 결합
         */
        combineMarkdowns(markdownFiles) {
            if (this.templates) {
                return this.templates.combineMarkdowns(markdownFiles);
            }
            return '';
        }

        /**
         * 변환된 마크다운 배열 결합
         */
        combineAllMarkdowns(convertedMarkdowns) {
            if (this.templates) {
                return this.templates.combineAllMarkdowns(convertedMarkdowns);
            }
            return '';
        }

        /**
         * 특정 템플릿 가져오기
         */
        getTemplate(sectionId) {
            if (this.templates) {
                return this.templates.getTemplate(sectionId);
            }
            return '';
        }

        /**
         * 특정 예시 가져오기
         */
        getExample(sectionId) {
            if (this.templates) {
                return this.templates.getExample(sectionId);
            }
            return '';
        }

        // ==========================================
        // Prompt Methods (Delegation)
        // ==========================================

        /**
         * 전체 보고서 프롬프트 빌드
         */
        buildFullReportPrompt(combinedMarkdown, userInputData, templatesText, examplesText) {
            if (this.prompts) {
                return this.prompts.buildFullReportPrompt(combinedMarkdown, userInputData, templatesText, examplesText);
            }
            return '';
        }

        /**
         * 섹션 프롬프트 빌드
         */
        buildSectionPrompt(sectionId, sectionName, sectionDesc, combinedData, userInput, template, previousSections) {
            if (this.prompts) {
                return this.prompts.buildSectionPrompt(sectionId, sectionName, sectionDesc, combinedData, userInput, template, previousSections);
            }
            return '';
        }

        /**
         * 시스템 컨텍스트 가져오기
         */
        getSystemContext() {
            if (this.prompts) {
                return this.prompts.getSystemContext();
            }
            return '';
        }

        /**
         * 섹션명 가져오기
         */
        getSectionName(sectionId) {
            if (this.prompts) {
                return this.prompts.getSectionName(sectionId);
            }
            return `섹션 ${sectionId}`;
        }

        /**
         * 모든 섹션명 가져오기
         */
        getAllSectionNames() {
            if (this.prompts) {
                return this.prompts.getAllSectionNames();
            }
            return window.PSUR_SECTION_NAMES || {};
        }

        /**
         * Phase 2 섹션 목록
         */
        getPhase2Sections() {
            if (this.prompts) {
                return this.prompts.getPhase2Sections();
            }
            return window.PSUR_PHASE2_SECTIONS || [];
        }

        /**
         * Phase 3 섹션 목록
         */
        getPhase3Sections() {
            if (this.prompts) {
                return this.prompts.getPhase3Sections();
            }
            return window.PSUR_PHASE3_SECTIONS || [];
        }

        // ==========================================
        // Section Methods (Delegation)
        // ==========================================

        /**
         * 생성된 섹션 가져오기
         */
        getSections() {
            if (this.sections) {
                return this.sections.getSections();
            }
            return {};
        }

        /**
         * 섹션 설정
         */
        setSection(sectionId, data) {
            if (this.sections) {
                this.sections.setSection(sectionId, data);
            }
        }

        /**
         * 모든 섹션 설정
         */
        setSections(sections) {
            if (this.sections) {
                this.sections.setSections(sections);
            }
        }

        /**
         * 섹션 초기화
         */
        clearSections() {
            if (this.sections) {
                this.sections.clearSections();
            }
        }

        /**
         * 최종 보고서 결합
         */
        getFinalReport() {
            if (this.sections) {
                return this.sections.getFinalReport();
            }
            return '';
        }

        /**
         * LLM 응답에서 섹션 파싱
         */
        parseSectionsFromResponse(responseText) {
            if (this.sections) {
                return this.sections.parseSectionsFromResponse(responseText);
            }
            return {};
        }

        /**
         * DB에 섹션 저장
         */
        async saveSectionsToDB(sections = null) {
            if (this.sections) {
                return await this.sections.saveSectionsToDB(sections);
            }
            return { success: false, error: 'Sections module not loaded' };
        }

        /**
         * DB에서 섹션 로드
         */
        async loadSectionsFromDB() {
            if (this.sections) {
                return await this.sections.loadSectionsFromDB();
            }
            return null;
        }

        // ==========================================
        // Core Generation Methods (Delegation)
        // ==========================================

        /**
         * 전체 PSUR 보고서 생성 (단일 API 호출)
         */
        async generateFullReport(options = {}) {
            if (this.core) {
                return await this.core.generateFullReport(options);
            }
            return { success: false, error: 'Core module not loaded' };
        }

        /**
         * 단일 섹션 생성
         */
        async generateSection(sectionId, sectionName, sectionDesc, combinedData, userInput, previousSections = null) {
            if (this.core) {
                return await this.core.generateSection(sectionId, sectionName, sectionDesc, combinedData, userInput, previousSections);
            }
            return '';
        }

        /**
         * 전체 PSUR 보고서 생성 (2-Pass 방식)
         */
        async generateFullPSUR(combinedMarkdown, userInput, progressCallback) {
            if (this.core) {
                return await this.core.generateFullPSUR(combinedMarkdown, userInput, progressCallback);
            }
            return {};
        }

        /**
         * Gemini API 호출
         */
        async callGeminiAPI(prompt, maxTokens = 4096) {
            if (this.core) {
                return await this.core.callGeminiAPI(prompt, maxTokens);
            }
            throw new Error('Core module not loaded');
        }

        /**
         * 보고서 다운로드
         */
        downloadReport(filename = null) {
            if (this.core) {
                return this.core.downloadReport(filename);
            }
            return false;
        }

        /**
         * 생성된 전체 보고서 가져오기
         */
        getFullReport() {
            if (this.core) {
                return this.core.getFullReport();
            }
            return null;
        }

        // ==========================================
        // Utility Methods
        // ==========================================

        /**
         * 지연 함수
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * 상태 확인
         */
        getStatus() {
            return {
                initialized: this.initialized,
                reportId: this.reportId,
                templatesLoaded: this.templates?.templatesLoaded || false,
                examplesLoaded: this.templates?.examplesLoaded || false,
                sectionsCount: Object.keys(this.sections?.getSections() || {}).length,
                hasFullReport: !!this.core?.getFullReport()
            };
        }

        /**
         * 리셋
         */
        reset() {
            this.reportId = null;
            if (this.sections) {
                this.sections.clearSections();
            }
            console.log('[PSURGenerator] Reset complete');
        }
    }

    // Singleton 인스턴스 생성 및 전역 등록
    if (typeof window !== 'undefined') {
        // 모든 서브모듈이 로드되었는지 확인
        const requiredModules = ['psurTemplates', 'psurPrompts', 'psurSections', 'psurCore'];
        const missingModules = requiredModules.filter(mod => !window[mod]);

        if (missingModules.length > 0) {
            console.warn('⚠️ Missing PSUR modules:', missingModules.join(', '));
            console.warn('⚠️ Make sure to load all modules before index.js');
        }

        // 기존 PSURGenerator와 호환되는 통합 인스턴스 생성
        const psurGenerator = new PSURGenerator();

        // 전역 등록 (기존 코드와 호환)
        window.PSURGenerator = PSURGenerator;
        window.psurGenerator = psurGenerator;

        // 네임스페이스 객체로도 접근 가능
        window.KPSUR = window.KPSUR || {};
        window.KPSUR.psur = {
            generator: psurGenerator,
            templates: window.psurTemplates,
            prompts: window.psurPrompts,
            sections: window.psurSections,
            core: window.psurCore
        };

        console.log('✅ PSUR modules loaded and integrated');
    }

})();

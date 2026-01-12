/**
 * PSUR Core - 생성 엔진
 * js/psur/psur-core.js
 *
 * 보고서 생성, API 호출, 다운로드
 */

(function() {
    'use strict';

    /**
     * PSURCore - 생성 엔진 클래스
     */
    class PSURCore {
        constructor() {
            this.apiKey = null;
            this.model = 'gemini-3-flash-preview';
            this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
            this.generatedFullReport = null;

            // 서브모듈 참조
            this.templates = window.psurTemplates;
            this.prompts = window.psurPrompts;
            this.sections = window.psurSections;
        }

        /**
         * 초기화
         */
        async init(apiKey) {
            this.apiKey = apiKey;

            // 템플릿 로드
            if (this.templates) {
                await this.templates.loadTemplates();
            }

            return this;
        }

        /**
         * 보고서 ID 설정
         */
        setReportId(reportId) {
            if (this.sections) {
                this.sections.setReportId(reportId);
            }
        }

        /**
         * 보고서 ID 가져오기
         */
        getReportId() {
            return this.sections ? this.sections.getReportId() : null;
        }

        /**
         * Gemini API 호출
         */
        async callGeminiAPI(prompt, maxTokens = 4096) {
            const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

            const requestBody = {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: maxTokens,
                    topP: 0.95
                }
            };

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`API 오류: ${errorData.error?.message || response.statusText}`);
                }

                const data = await response.json();

                if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                    return data.candidates[0].content.parts[0].text;
                }

                throw new Error('유효한 응답을 받지 못했습니다.');
            } catch (error) {
                console.error('Gemini API 호출 실패:', error);
                throw error;
            }
        }

        /**
         * 전체 PSUR 보고서 생성 (단일 API 호출)
         */
        async generateFullReport(options = {}) {
            const {
                convertedMarkdowns = [],
                userInputData = '',
                useTestData = false,
                onProgress = null
            } = options;

            console.log('[PSURCore] Starting full report generation...');

            // API 키 확인
            if (!this.apiKey) {
                const storedKey = localStorage.getItem('GOOGLE_API_KEY');
                if (storedKey) {
                    this.apiKey = storedKey;
                } else {
                    return { success: false, error: 'API 키가 설정되지 않았습니다.' };
                }
            }

            // UserPrompt 템플릿 로드
            if (this.templates && !this.templates.userPromptTemplateLoaded) {
                if (onProgress) onProgress({ step: 'userPrompt', message: 'UserPrompt 템플릿 로드 중...' });
                await this.templates.loadUserPromptTemplate();
            }

            // 마크다운 통합
            if (onProgress) onProgress({ step: 'combine', message: '마크다운 통합 중...' });
            const combinedMarkdown = this.templates.combineAllMarkdowns(convertedMarkdowns);

            let prompt;

            // UserPrompt 로드 성공 시
            if (this.templates && this.templates.userPromptTemplate) {
                console.log('[PSURCore] UserPrompt.md 사용 - 추가 로드 스킵');
                if (onProgress) onProgress({ step: 'prompt', message: '프롬프트 생성 중 (UserPrompt 모드)...' });
                prompt = this.prompts.buildFullReportPrompt(combinedMarkdown, '', '', '');
            } else {
                // Fallback: 모든 리소스 로드
                console.warn('[PSURCore] UserPrompt.md 로드 실패 - Fallback 모드');

                if (this.templates && (!this.templates.templatesLoaded || Object.keys(this.templates.templates).length === 0)) {
                    if (onProgress) onProgress({ step: 'templates', message: '템플릿 로드 중...' });
                    await this.templates.loadTemplates();
                }

                if (this.templates && (!this.templates.examplesLoaded || Object.keys(this.templates.examples).length === 0)) {
                    if (onProgress) onProgress({ step: 'examples', message: '예시 파일 로드 중...' });
                    await this.templates.loadExamples();
                }

                let inputData = userInputData;
                if (useTestData || !inputData) {
                    if (onProgress) onProgress({ step: 'testdata', message: '테스트 데이터 로드 중...' });
                    inputData = await this.templates.loadTestRawData();
                }

                if (!inputData) {
                    return { success: false, error: '데이터 정의서(RawData_Definition)가 없습니다.' };
                }

                const templatesText = this.templates.combineTemplates();
                const examplesText = this.templates.combineExamples();

                if (onProgress) onProgress({ step: 'prompt', message: '프롬프트 생성 중 (Fallback 모드)...' });
                prompt = this.prompts.buildFullReportPrompt(combinedMarkdown, inputData, templatesText, examplesText);
            }

            console.log(`[PSURCore] Prompt length: ${prompt.length} chars`);

            // API 호출
            if (onProgress) onProgress({ step: 'api', message: 'LLM API 호출 중... (최대 2분 소요)' });

            try {
                const startTime = Date.now();
                const responseText = await this.callGeminiAPI(prompt, 65536);
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

                this.generatedFullReport = {
                    content: responseText,
                    generatedAt: new Date().toISOString(),
                    duration: elapsed,
                    model: this.model,
                    sourceFiles: convertedMarkdowns.length
                };

                // localStorage에 저장
                try {
                    localStorage.setItem('generatedPSURReport', JSON.stringify(this.generatedFullReport));
                } catch (e) {
                    console.warn('[PSURCore] Failed to save to localStorage:', e);
                }

                if (onProgress) onProgress({ step: 'complete', message: `생성 완료 (${elapsed}초)` });

                return {
                    success: true,
                    report: this.generatedFullReport
                };

            } catch (error) {
                console.error('[PSURCore] API call failed:', error);
                return { success: false, error: error.message };
            }
        }

        /**
         * 단일 섹션 생성
         */
        async generateSection(sectionId, sectionName, sectionDesc, combinedData, userInput, previousSections = null) {
            const template = this.templates ? this.templates.getTemplate(sectionId) : '';

            const prompt = this.prompts.buildSectionPrompt(
                sectionId, sectionName, sectionDesc,
                combinedData, userInput, template, previousSections
            );

            return await this.callGeminiAPI(prompt, 4096);
        }

        /**
         * 전체 PSUR 보고서 생성 (2-Pass 방식)
         */
        async generateFullPSUR(combinedMarkdown, userInput, progressCallback) {
            if (this.sections) {
                this.sections.clearSections();
            }

            const phase2Sections = this.prompts.getPhase2Sections();
            const phase3Sections = this.prompts.getPhase3Sections();
            const totalSections = phase2Sections.length + phase3Sections.length;
            let currentSection = 0;

            // Phase 2: 메인 컨텐츠 섹션
            if (progressCallback) {
                progressCallback({ phase: 2, message: 'Phase 2: 메인 컨텐츠 섹션 생성 중...' });
            }

            for (const section of phase2Sections) {
                currentSection++;
                if (progressCallback) {
                    progressCallback({
                        phase: 2,
                        section: section.name,
                        progress: Math.round((currentSection / totalSections) * 100)
                    });
                }

                try {
                    const content = await this.generateSection(
                        section.id, section.name, section.desc,
                        combinedMarkdown, userInput
                    );
                    this.sections.setSection(section.id, {
                        name: section.name,
                        content: content
                    });
                    console.log(`생성 완료: ${section.id}_${section.name}`);

                    await this.delay(1000);
                } catch (error) {
                    console.error(`섹션 생성 실패: ${section.id}`, error);
                    this.sections.setSection(section.id, {
                        name: section.name,
                        content: `# ${section.id}. ${section.name}\n\n[생성 오류: ${error.message}]`
                    });
                }
            }

            // Phase 3: 문서 전체 참조 섹션
            if (progressCallback) {
                progressCallback({ phase: 3, message: 'Phase 3: 종합 섹션 생성 중...' });
            }

            // 이전 섹션들 문자열화
            let previousSectionsText = "";
            const generatedSections = this.sections.getSections();
            for (const [id, section] of Object.entries(generatedSections)) {
                previousSectionsText += `### ${id}. ${section.name}\n${section.content}\n\n---\n\n`;
            }

            for (const section of phase3Sections) {
                currentSection++;
                if (progressCallback) {
                    progressCallback({
                        phase: 3,
                        section: section.name,
                        progress: Math.round((currentSection / totalSections) * 100)
                    });
                }

                try {
                    const content = await this.generateSection(
                        section.id, section.name, section.desc,
                        combinedMarkdown, userInput, previousSectionsText
                    );
                    this.sections.setSection(section.id, {
                        name: section.name,
                        content: content
                    });
                    console.log(`생성 완료: ${section.id}_${section.name}`);

                    await this.delay(1000);
                } catch (error) {
                    console.error(`섹션 생성 실패: ${section.id}`, error);
                    this.sections.setSection(section.id, {
                        name: section.name,
                        content: `# ${section.id}. ${section.name}\n\n[생성 오류: ${error.message}]`
                    });
                }
            }

            return this.sections.getSections();
        }

        /**
         * 보고서 다운로드
         */
        downloadReport(filename = null) {
            if (!this.generatedFullReport) {
                console.warn('[PSURCore] No report to download');
                return false;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '').substring(0, 15);
            const finalFilename = filename || `PSUR_Full_Report_${timestamp}.md`;

            let content = `# PSUR 전체 보고서\n\n`;
            content += `**생성 모델:** ${this.generatedFullReport.model}\n`;
            content += `**생성 시간:** ${this.generatedFullReport.generatedAt}\n`;
            content += `**소요 시간:** ${this.generatedFullReport.duration}초\n`;
            content += `**원본 파일 수:** ${this.generatedFullReport.sourceFiles}\n\n`;
            content += `---\n\n`;
            content += this.generatedFullReport.content;

            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = finalFilename;
            link.click();
            URL.revokeObjectURL(url);

            console.log(`[PSURCore] Report downloaded: ${finalFilename}`);
            return true;
        }

        /**
         * 생성된 전체 보고서 가져오기
         */
        getFullReport() {
            return this.generatedFullReport;
        }

        /**
         * 지연 함수
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.PSURCore = PSURCore;
        window.psurCore = new PSURCore();
    }

})();

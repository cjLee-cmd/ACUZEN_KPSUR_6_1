/**
 * PSUR Templates - 템플릿 로드 및 결합
 * js/psur/psur-templates.js
 *
 * 템플릿, 예시, 컨텍스트 파일 로드 및 마크다운 결합
 */

(function() {
    'use strict';

    // RAW ID → 문서명 매핑
    const RAW_ID_NAMES = {
        'RAW1': '최신첨부문서',
        'RAW2.1': '용법용량',
        'RAW2.2': '효능효과',
        'RAW2.3': '사용상의주의사항',
        'RAW3': '시판후sales데이터',
        'RAW4': '허가현황',
        'RAW5': '안전성조치메일',
        'RAW6': '안전성조치변경',
        'RAW7': '안전성정보변경',
        'RAW12': '국내신속보고LineListing',
        'RAW14': '원시자료LineListing',
        'RAW15': '정기보고LineListing'
    };

    /**
     * PSURTemplates - 템플릿 관리 클래스
     */
    class PSURTemplates {
        constructor() {
            this.templates = {};
            this.examples = {};
            this.testRawData = null;
            this.generationContext = null;
            this.userPromptTemplate = null;

            this.templatesLoaded = false;
            this.examplesLoaded = false;
            this.testRawDataLoaded = false;
            this.generationContextLoaded = false;
            this.userPromptTemplateLoaded = false;
        }

        /**
         * 템플릿 파일들 로드
         */
        async loadTemplates() {
            if (this.templatesLoaded && Object.keys(this.templates).length > 0) {
                return this.templates;
            }

            const templateFiles = [
                '00_표지.md', '01_목차.md', '02_약어설명.md', '03_서론.md',
                '04_전세계판매허가현황.md', '05_안전성조치.md', '06_안전성정보참고정보변경.md',
                '07_환자노출.md', '08_개별증례병력.md', '09_시험.md', '10_기타정보.md',
                '11_종합적인안전성평가.md', '12_결론.md', '13_참고문헌.md', '14_별첨.md'
            ];

            const basePaths = [
                '../02_relateDocs/02_Templates/',
                './02_relateDocs/02_Templates/',
                '../Ref/Templates/',
                './Ref/Templates/'
            ];

            for (const file of templateFiles) {
                for (const basePath of basePaths) {
                    try {
                        const response = await fetch(basePath + file);
                        if (response.ok) {
                            const content = await response.text();
                            const id = file.split('_')[0];
                            this.templates[id] = content;
                            console.log(`템플릿 로드: ${file}`);
                            break;
                        }
                    } catch (error) {
                        // 다음 경로 시도
                    }
                }
            }

            this.templatesLoaded = true;
            console.log(`총 ${Object.keys(this.templates).length}개 템플릿 로드 완료`);
            return this.templates;
        }

        /**
         * 예시 파일 로드
         */
        async loadExamples() {
            if (this.examplesLoaded && Object.keys(this.examples).length > 0) {
                return this.examples;
            }

            console.log('[PSURTemplates] Loading example files...');

            const exampleFiles = [
                '00_표지.md', '01_목차.md', '02_약어설명.md', '03_서론.md',
                '04_전세계판매허가현황.md', '05_안전성조치.md', '06_안전성정보참고정보변경.md',
                '07_환자노출.md', '08_개별증례병력.md', '09_시험.md', '10_기타정보.md',
                '11_종합적인안전성평가.md', '12_결론.md', '13_참고문헌.md', '14_별첨.md'
            ];

            const basePaths = [
                '../Ref/Examples/',
                './Ref/Examples/',
                '../90_Test/03_Examples/'
            ];

            let loadedCount = 0;

            for (const basePath of basePaths) {
                for (const file of exampleFiles) {
                    try {
                        const response = await fetch(basePath + file);
                        if (response.ok) {
                            const content = await response.text();
                            const id = file.split('_')[0];
                            this.examples[id] = content;
                            loadedCount++;
                            console.log(`예시 파일 로드: ${file}`);
                        }
                    } catch (error) {
                        // 다음 경로 시도
                    }
                }
                if (loadedCount > 0) break;
            }

            this.examplesLoaded = loadedCount > 0;
            console.log(`[PSURTemplates] ${loadedCount}개 예시 파일 로드 완료`);
            return this.examples;
        }

        /**
         * 테스트용 RawData_Definition.md 로드
         */
        async loadTestRawData() {
            if (this.testRawDataLoaded && this.testRawData) {
                return this.testRawData;
            }

            console.log('[PSURTemplates] Loading test RawData_Definition...');

            const paths = [
                '../Ref/RawData_Definition.md',
                './Ref/RawData_Definition.md',
                '../90_Test/01_Context/RawData_Definition.md'
            ];

            for (const path of paths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        this.testRawData = await response.text();
                        this.testRawDataLoaded = true;
                        console.log(`[PSURTemplates] Test data loaded from ${path} (${this.testRawData.length} chars)`);
                        return this.testRawData;
                    }
                } catch (e) {
                    // 다음 경로 시도
                }
            }

            console.warn('[PSURTemplates] Test RawData_Definition not found');
            return '';
        }

        /**
         * PSUR 생성 컨텍스트 로드
         */
        async loadGenerationContext() {
            if (this.generationContextLoaded && this.generationContext) {
                return this.generationContext;
            }

            console.log('[PSURTemplates] Loading PSUR_Generation_Context...');

            const paths = [
                '../Ref/PSUR_Generation_Context.md',
                './Ref/PSUR_Generation_Context.md',
                '../90_Test/01_Context/PSUR_Generation_Context.md'
            ];

            for (const path of paths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        this.generationContext = await response.text();
                        this.generationContextLoaded = true;
                        console.log(`[PSURTemplates] Generation context loaded from ${path} (${this.generationContext.length} chars)`);
                        return this.generationContext;
                    }
                } catch (e) {
                    // 다음 경로 시도
                }
            }

            console.warn('[PSURTemplates] PSUR_Generation_Context not found');
            return '';
        }

        /**
         * UserPrompt 템플릿 로드
         * @param {boolean} forceReload - 캐시 무시하고 강제 로드
         */
        async loadUserPromptTemplate(forceReload = false) {
            if (!forceReload && this.userPromptTemplateLoaded && this.userPromptTemplate) {
                return this.userPromptTemplate;
            }

            console.log('[PSURTemplates] Loading UserPrompt.md...' + (forceReload ? ' (force reload)' : ''));

            // Cache-busting을 위한 타임스탬프
            const cacheBuster = `?t=${Date.now()}`;

            const paths = [
                '../01_Context/UserPrompt.md',
                './01_Context/UserPrompt.md',
                '/01_Context/UserPrompt.md',
                '../UserPrompt.md',
                './UserPrompt.md'
            ];

            for (const path of paths) {
                try {
                    const response = await fetch(path + cacheBuster, { cache: 'no-store' });
                    if (response.ok) {
                        this.userPromptTemplate = await response.text();
                        this.userPromptTemplateLoaded = true;
                        console.log(`[PSURTemplates] UserPrompt template loaded from ${path} (${this.userPromptTemplate.length} chars)`);
                        return this.userPromptTemplate;
                    }
                } catch (e) {
                    // 다음 경로 시도
                }
            }

            console.warn('[PSURTemplates] UserPrompt.md not found');
            return null;
        }

        /**
         * 마크다운 파일들을 하나로 결합 (객체 형식)
         */
        combineMarkdowns(markdownFiles) {
            let combined = "# 통합 RAW 데이터\n\n";

            for (const [rawId, content] of Object.entries(markdownFiles)) {
                combined += `## ${rawId}\n\n`;
                combined += content + "\n\n---\n\n";
            }

            return combined;
        }

        /**
         * 변환된 마크다운 배열을 하나로 결합
         */
        combineAllMarkdowns(convertedMarkdowns) {
            if (!convertedMarkdowns || convertedMarkdowns.length === 0) {
                console.warn('[PSURTemplates] No markdowns to combine');
                return '';
            }

            console.log(`[PSURTemplates] Combining ${convertedMarkdowns.length} markdown files...`);

            let combined = `# 통합 RAW 데이터\n`;
            combined += `생성일시: ${new Date().toISOString()}\n`;
            combined += `총 파일 수: ${convertedMarkdowns.length}개\n\n`;
            combined += `---\n\n`;

            // RAW ID 순서로 정렬
            const sorted = [...convertedMarkdowns].sort((a, b) => {
                const aId = (a.rawId || 'ZZZ').replace(/[^0-9.]/g, '') || '999';
                const bId = (b.rawId || 'ZZZ').replace(/[^0-9.]/g, '') || '999';
                return parseFloat(aId) - parseFloat(bId);
            });

            for (const file of sorted) {
                const content = file.markdown || file.content || '';
                if (content) {
                    const rawId = file.rawId || 'UNKNOWN';
                    const docName = RAW_ID_NAMES[rawId] || rawId;
                    const fileName = file.fileName || file.name || 'Untitled';

                    combined += `## [${rawId}] ${docName}\n`;
                    combined += `원본 파일: ${fileName}\n\n`;
                    combined += content + '\n\n';
                    combined += `---\n\n`;
                }
            }

            console.log(`[PSURTemplates] Combined: ${combined.length} chars`);
            return combined;
        }

        /**
         * 모든 예시 파일을 하나의 문자열로 결합
         */
        combineExamples() {
            let combined = `# PSUR 섹션별 예시\n\n`;

            const sectionOrder = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14'];

            for (const id of sectionOrder) {
                if (this.examples[id]) {
                    combined += `## 예시 ${id}\n\n`;
                    combined += this.examples[id] + '\n\n';
                    combined += `---\n\n`;
                }
            }

            return combined;
        }

        /**
         * 모든 템플릿을 하나의 문자열로 결합
         */
        combineTemplates() {
            let combined = `# PSUR 섹션 템플릿\n\n`;

            const sectionOrder = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14'];

            for (const id of sectionOrder) {
                if (this.templates[id]) {
                    combined += `## 섹션 ${id}\n\n`;
                    combined += this.templates[id] + '\n\n';
                    combined += `---\n\n`;
                }
            }

            return combined;
        }

        /**
         * 특정 템플릿 가져오기
         */
        getTemplate(sectionId) {
            return this.templates[sectionId] || '';
        }

        /**
         * 특정 예시 가져오기
         */
        getExample(sectionId) {
            return this.examples[sectionId] || '';
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.PSURTemplates = PSURTemplates;
        window.psurTemplates = new PSURTemplates();
    }

})();

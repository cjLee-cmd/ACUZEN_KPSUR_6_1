/**
 * PSUR Generator Module
 * Stage 2에서 마크다운 변환 후 LLM을 통해 PSUR 보고서 생성
 *
 * 주요 기능:
 * 1. 템플릿 파일 로드 (/03_Template/02_Sections/)
 * 2. 테스트용 RawData_Definition.md 로드
 * 3. 마크다운 파일 통합 (combineAllMarkdowns)
 * 4. 전체 PSUR 보고서 생성 (generateFullReport)
 * 5. 섹션 DB 저장 (Supabase 연동)
 */

// ES6 import 대신 window 객체에서 가져오기 (브라우저 스크립트 호환성)
const supabaseClient = (typeof window !== 'undefined' && window.supabaseClient)
    ? window.supabaseClient
    : null;

const PSURGenerator = {
    // 보고서 ID (DB 연동용)
    reportId: null,

    /**
     * 보고서 ID 설정 (DB 연동용)
     * @param {string} reportId - 보고서 UUID
     */
    setReportId(reportId) {
        this.reportId = reportId;
        console.log(`[PSURGenerator] Report ID set: ${reportId}`);
    },

    /**
     * 보고서 ID 가져오기
     */
    getReportId() {
        return this.reportId;
    },

    /**
     * 섹션들을 DB에 저장
     * @param {Object} sections - 섹션 객체 { '00': {...}, '01': {...}, ... }
     * @returns {Promise<Object>} - 저장 결과
     */
    async saveSectionsToDB(sections) {
        if (!this.reportId) {
            console.warn('[PSURGenerator] Report ID not set, skipping DB save');
            return { success: false, error: 'Report ID not set' };
        }

        if (!sections || Object.keys(sections).length === 0) {
            console.warn('[PSURGenerator] No sections to save');
            return { success: false, error: 'No sections to save' };
        }

        try {
            // 섹션 배열 형태로 변환
            const sectionsArray = Object.entries(sections).map(([sectionNumber, data]) => ({
                number: sectionNumber,
                name: data.name || '',
                content: data.content || ''
            }));

            console.log(`[PSURGenerator] Saving ${sectionsArray.length} sections to DB...`);

            const result = await supabaseClient.bulkUpsertSections(this.reportId, sectionsArray);

            if (result.success) {
                console.log(`[PSURGenerator] ✅ ${result.sections.length} sections saved to DB`);
            } else {
                console.error('[PSURGenerator] ❌ DB save failed:', result.error);
            }

            return result;

        } catch (error) {
            console.error('[PSURGenerator] DB save error:', error);
            return { success: false, error: error.message };
        }
    },

    // API 설정
    apiKey: null,
    model: 'gemini-3-flash-preview',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',

    // 테스트 데이터 관련
    testRawData: null,
    testRawDataLoaded: false,
    templatesLoaded: false,
    examplesLoaded: false,
    generationContextLoaded: false,

    // UserPrompt 템플릿
    userPromptTemplate: null,
    userPromptTemplateLoaded: false,

    // 예시 파일 저장소
    examples: {},

    // PSUR 생성 컨텍스트
    generationContext: null,

    // 생성된 전체 보고서
    generatedFullReport: null,

    // Line Listing 분석 결과
    lineListingAnalysis: null,

    // 2-Pass 섹션 정의
    PHASE2_SECTIONS: [
        { id: "00", name: "표지", desc: "기본 정보를 포함한 표지 페이지" },
        { id: "03", name: "서론", desc: "CS 변수 치환, 제품 소개 및 보고서 목적" },
        { id: "04", name: "전세계판매허가현황", desc: "RAW4 기반 국가별 허가 현황" },
        { id: "05", name: "안전성조치및참조정보", desc: "RAW1, RAW5-7 기반 허가사항 변경 내역" },
        { id: "06", name: "시판후노출환자현황", desc: "RAW3 기반 판매량 및 환자 노출 추정" },
        { id: "07", name: "임상시험", desc: "RAW8, RAW9 기반 임상시험 요약" },
        { id: "08", name: "개별증례병력", desc: "RAW10-15 기반 이상사례 분석" },
        { id: "09", name: "시험", desc: "진행중인 시험 정보" },
        { id: "10", name: "기타정보", desc: "기타 안전성 정보" },
        { id: "14", name: "별첨", desc: "상세 데이터 및 증례 목록" }
    ],

    PHASE3_SECTIONS: [
        { id: "11", name: "종합적인안전성평가", desc: "전체 안전성 데이터 종합 평가" },
        { id: "12", name: "결론", desc: "유익성-위해성 최종 결론" },
        { id: "02", name: "약어및정의", desc: "사용된 약어 정리" },
        { id: "13", name: "참고문헌", desc: "인용 문헌 목록" },
        { id: "01", name: "목차", desc: "전체 문서 목차" }
    ],

    // 시스템 컨텍스트
    SYSTEM_CONTEXT: `# PSUR(정기적 안전성 갱신 보고서) 생성 AI 어시스턴트

## 역할 정의
당신은 의약품 안전성 보고서(PSUR/PBRER) 작성을 전문으로 하는 AI 어시스턴트입니다.
식품의약품안전처 가이드라인에 따라 정확하고 규정을 준수하는 보고서를 작성합니다.

## 업무 목표
1. RAW 데이터 분석 및 구조화
2. 템플릿 변수 치환 (CS/PH 변수)
3. 섹션별 보고서 내용 생성
4. 규정 준수 검증

## 참조 파일 구조
- RAW1: 허가사항 (RAW1.1 사용상의 주의사항, RAW1.2 효능효과)
- RAW2: 기본 입력 (RAW2.1 제품정보, RAW2.2 보고서 일정, RAW2.3-2.6 상세정보)
- RAW3: 시판 후 판매 데이터
- RAW4: 전 세계 허가 현황
- RAW5-7: 안전성 관련 변경 정보
- RAW8-9: 임상시험 및 문헌 데이터
- RAW10-15: 이상사례 보고 데이터

## 출력 형식
- 순수 마크다운 형식으로 출력
- 제목에는 적절한 # 헤더 사용
- 표는 마크다운 테이블 형식 사용
- 설명 문구 없이 본문만 출력`,

    // 템플릿 저장소
    templates: {},

    // 생성된 섹션 저장소
    generatedSections: {},

    /**
     * 초기화
     */
    async init(apiKey) {
        this.apiKey = apiKey;
        await this.loadTemplates();
        return this;
    },

    /**
     * 템플릿 파일들 로드
     */
    async loadTemplates() {
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
                        break; // 성공하면 다음 파일로
                    }
                } catch (error) {
                    // 다음 경로 시도
                }
            }
        }

        console.log(`총 ${Object.keys(this.templates).length}개 템플릿 로드 완료`);
    },

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
    },

    /**
     * 변환된 마크다운 배열을 하나로 결합 (P15에서 사용)
     * @param {Array} convertedMarkdowns - [{fileName, rawId, markdown, ...}] 형태
     * @returns {string} 통합된 마크다운 문자열
     */
    combineAllMarkdowns(convertedMarkdowns) {
        if (!convertedMarkdowns || convertedMarkdowns.length === 0) {
            console.warn('[PSURGenerator] No markdowns to combine');
            return '';
        }

        console.log(`[PSURGenerator] Combining ${convertedMarkdowns.length} markdown files...`);

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

        console.log(`[PSURGenerator] Combined: ${combined.length} chars`);
        return combined;
    },

    /**
     * 테스트용 RawData_Definition.md 로드
     */
    async loadTestRawData() {
        if (this.testRawDataLoaded && this.testRawData) {
            return this.testRawData;
        }

        console.log('[PSURGenerator] Loading test RawData_Definition...');

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
                    console.log(`[PSURGenerator] Test data loaded from ${path} (${this.testRawData.length} chars)`);
                    return this.testRawData;
                }
            } catch (e) {
                // 다음 경로 시도
            }
        }

        console.warn('[PSURGenerator] Test RawData_Definition not found');
        return '';
    },

    /**
     * 예시 파일 로드 (/90_Test/03_Examples/)
     */
    async loadExamples() {
        if (this.examplesLoaded && Object.keys(this.examples).length > 0) {
            return this.examples;
        }

        console.log('[PSURGenerator] Loading example files...');

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
        console.log(`[PSURGenerator] ${loadedCount}개 예시 파일 로드 완료`);
        return this.examples;
    },

    /**
     * PSUR 생성 컨텍스트 로드
     */
    async loadGenerationContext() {
        if (this.generationContextLoaded && this.generationContext) {
            return this.generationContext;
        }

        console.log('[PSURGenerator] Loading PSUR_Generation_Context...');

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
                    console.log(`[PSURGenerator] Generation context loaded from ${path} (${this.generationContext.length} chars)`);
                    return this.generationContext;
                }
            } catch (e) {
                // 다음 경로 시도
            }
        }

        console.warn('[PSURGenerator] PSUR_Generation_Context not found');
        return '';
    },

    /**
     * UserPrompt 템플릿 로드 (UserPrompt_2_260115.md)
     */
    async loadUserPromptTemplate() {
        if (this.userPromptTemplateLoaded && this.userPromptTemplate) {
            return this.userPromptTemplate;
        }

        console.log('[PSURGenerator] Loading UserPrompt_2_260115.md...');

        const paths = [
            '../01_Context/UserPrompt_2_260115.md',
            './01_Context/UserPrompt_2_260115.md',
            '/01_Context/UserPrompt_2_260115.md',
            // Fallback paths
            '../UserPrompt_2_260115.md',
            './UserPrompt_2_260115.md'
        ];

        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    this.userPromptTemplate = await response.text();
                    this.userPromptTemplateLoaded = true;
                    console.log(`[PSURGenerator] UserPrompt template loaded from ${path} (${this.userPromptTemplate.length} chars)`);
                    return this.userPromptTemplate;
                }
            } catch (e) {
                // 다음 경로 시도
            }
        }

        console.warn('[PSURGenerator] UserPrompt_2_260115.md not found');
        return null;
    },

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
    },

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
    },

    /**
     * Line Listing 파일 감지 (RAW12-15)
     * @param {Array} convertedMarkdowns - 변환된 마크다운 배열
     * @returns {Array} Line Listing 파일들
     */
    detectLineListingFiles(convertedMarkdowns) {
        const lineListingRawIds = ['RAW12', 'RAW13', 'RAW14', 'RAW15'];
        return convertedMarkdowns.filter(file => {
            const rawId = file.rawId || file.assignedRawId || '';
            return lineListingRawIds.includes(rawId);
        });
    },

    /**
     * Line Listing 분석 실행 (싱글샷)
     * @param {Array} lineListingFiles - Line Listing 파일들
     * @param {Object} options - LLM 옵션
     * @param {Function} onProgress - 진행 콜백
     * @returns {Object} 분석 결과
     */
    async runLineListingAnalysis(lineListingFiles, options = {}, onProgress = null) {
        if (!window.extractLineListings) {
            console.warn('[PSURGenerator] extractLineListings 모듈이 로드되지 않았습니다.');
            return null;
        }

        if (!lineListingFiles || lineListingFiles.length === 0) {
            console.log('[PSURGenerator] Line Listing 파일이 없습니다.');
            return null;
        }

        console.log(`[PSURGenerator] ${lineListingFiles.length}개 Line Listing 파일 분석 시작...`);

        if (onProgress) {
            onProgress({ step: 'linelisting', message: 'Line Listing 분석 중...' });
        }

        try {
            // 모든 Line Listing 파일에서 데이터 추출
            let allAeData = [];
            let allCausData = [];

            for (const file of lineListingFiles) {
                const markdownContent = file.markdown || file.content || '';
                if (markdownContent) {
                    const parsed = window.extractLineListings.parseMarkdownTable(markdownContent);
                    allAeData = allAeData.concat(parsed.aeData || []);
                    allCausData = allCausData.concat(parsed.causData || []);
                }
            }

            if (allAeData.length === 0) {
                console.log('[PSURGenerator] Line Listing 데이터가 비어있습니다.');
                return null;
            }

            console.log(`[PSURGenerator] AE: ${allAeData.length}건, Causality: ${allCausData.length}건 추출됨`);

            // 싱글샷 LLM 분석 실행
            const result = await window.extractLineListings.analyzeWithLLMSingleShot(
                allAeData,
                allCausData,
                options,
                (progress) => {
                    if (onProgress) {
                        onProgress({
                            step: 'linelisting',
                            message: `Line Listing 분석: ${progress.status}`,
                            progress: progress.current
                        });
                    }
                }
            );

            if (result.success) {
                console.log(`[PSURGenerator] Line Listing 분석 완료: ${result.processedCount}건 처리됨`);
                this.lineListingAnalysis = result;

                // localStorage에 저장
                try {
                    localStorage.setItem('lineListingAnalysis', JSON.stringify({
                        cs59Summary: result.cs59Summary,
                        reportMarkdown: result.reportMarkdown,
                        statistics: result.statistics,
                        analyzedAt: new Date().toISOString()
                    }));
                } catch (e) {
                    console.warn('[PSURGenerator] Line Listing 분석 결과 저장 실패:', e);
                }

                return result;
            }

            return null;

        } catch (error) {
            console.error('[PSURGenerator] Line Listing 분석 오류:', error);
            return null;
        }
    },

    /**
     * Line Listing 분석 결과를 프롬프트에 추가
     * @param {string} combinedMarkdown - 통합된 마크다운
     * @returns {string} Line Listing 분석 결과가 추가된 마크다운
     */
    appendLineListingToMarkdown(combinedMarkdown) {
        if (!this.lineListingAnalysis || !this.lineListingAnalysis.reportMarkdown) {
            return combinedMarkdown;
        }

        const llSection = `

---

## [Line Listing 분석 결과]

### 통계 요약
- 총 건수: ${this.lineListingAnalysis.statistics.total}건
- 중대한 이상사례: ${this.lineListingAnalysis.statistics.seriousYes}건
- 중대하지 않은 이상사례: ${this.lineListingAnalysis.statistics.seriousNo}건
- Certain/Probable 인과성: ${this.lineListingAnalysis.statistics.certainProbable}건

### CS59 별첨1 요약 테이블 (개별증례 Line Listing)
${this.lineListingAnalysis.reportMarkdown}

---

`;
        return combinedMarkdown + llSection;
    },

    /**
     * 전체 PSUR 보고서 생성 (단일 API 호출)
     * @param {Object} options - 생성 옵션
     * @param {Array} options.convertedMarkdowns - 변환된 마크다운 배열
     * @param {string} options.userInputData - 사용자 입력 데이터
     * @param {boolean} options.useTestData - 테스트 데이터 사용 여부
     * @param {boolean} options.skipLineListingAnalysis - Line Listing 분석 스킵 여부
     * @param {Function} options.onProgress - 진행 콜백
     */
    async generateFullReport(options = {}) {
        const {
            convertedMarkdowns = [],
            userInputData = '',
            useTestData = false,
            skipLineListingAnalysis = false,
            onProgress = null
        } = options;

        console.log('[PSURGenerator] Starting full report generation...');

        // API 키 확인
        if (!this.apiKey) {
            const storedKey = localStorage.getItem('GOOGLE_API_KEY');
            if (storedKey) {
                this.apiKey = storedKey;
            } else {
                return { success: false, error: 'API 키가 설정되지 않았습니다.' };
            }
        }

        // UserPrompt 템플릿 먼저 로드 (성공 시 다른 로드 스킵)
        if (!this.userPromptTemplateLoaded) {
            if (onProgress) onProgress({ step: 'userPrompt', message: 'UserPrompt 템플릿 로드 중...' });
            await this.loadUserPromptTemplate();
        }

        // === Line Listing 분석 (먼저 실행) ===
        if (!skipLineListingAnalysis) {
            const lineListingFiles = this.detectLineListingFiles(convertedMarkdowns);
            if (lineListingFiles.length > 0) {
                console.log(`[PSURGenerator] ${lineListingFiles.length}개 Line Listing 파일 감지됨`);
                if (onProgress) onProgress({ step: 'linelisting', message: 'Line Listing 분석 시작...' });

                await this.runLineListingAnalysis(lineListingFiles, {
                    provider: 'google',
                    model: 'gemini-3-flash-preview'
                }, onProgress);

                if (this.lineListingAnalysis) {
                    console.log('[PSURGenerator] Line Listing 분석 완료, 본문 생성 진행');
                }
            }
        }

        // 마크다운 통합 (항상 필요)
        if (onProgress) onProgress({ step: 'combine', message: '마크다운 통합 중...' });
        let combinedMarkdown = this.combineAllMarkdowns(convertedMarkdowns);

        // Line Listing 분석 결과 추가
        combinedMarkdown = this.appendLineListingToMarkdown(combinedMarkdown);

        let prompt;

        // UserPrompt 로드 성공 시: 불필요한 로드 스킵
        if (this.userPromptTemplate) {
            console.log('[PSURGenerator] UserPrompt_2_260115.md 사용 - 추가 로드 스킵');
            if (onProgress) onProgress({ step: 'prompt', message: '프롬프트 생성 중 (UserPrompt 모드)...' });

            // UserPrompt_2_260115.md에 모든 정보가 포함되어 있으므로 추가 로드 불필요
            prompt = this.buildFullReportPrompt(combinedMarkdown, '', '', '');
        } else {
            // Fallback: 모든 리소스 로드
            console.warn('[PSURGenerator] UserPrompt_2_260115.md 로드 실패 - Fallback 모드');

            // 템플릿 로드
            if (!this.templatesLoaded || Object.keys(this.templates).length === 0) {
                if (onProgress) onProgress({ step: 'templates', message: '템플릿 로드 중...' });
                await this.loadTemplates();
                this.templatesLoaded = true;
            }

            // 예시 파일 로드
            if (!this.examplesLoaded || Object.keys(this.examples).length === 0) {
                if (onProgress) onProgress({ step: 'examples', message: '예시 파일 로드 중...' });
                await this.loadExamples();
            }

            // 사용자 입력 데이터 결정
            let inputData = userInputData;
            if (useTestData || !inputData) {
                if (onProgress) onProgress({ step: 'testdata', message: '테스트 데이터 로드 중...' });
                inputData = await this.loadTestRawData();
            }

            if (!inputData) {
                return { success: false, error: '데이터 정의서(RawData_Definition)가 없습니다.' };
            }

            // 템플릿 통합
            const templatesText = this.combineTemplates();

            // 예시 통합
            const examplesText = this.combineExamples();

            // 프롬프트 생성
            if (onProgress) onProgress({ step: 'prompt', message: '프롬프트 생성 중 (Fallback 모드)...' });
            prompt = this.buildFullReportPrompt(combinedMarkdown, inputData, templatesText, examplesText);
        }
        console.log(`[PSURGenerator] Prompt length: ${prompt.length} chars`);

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
                console.warn('[PSURGenerator] Failed to save to localStorage:', e);
            }

            if (onProgress) onProgress({ step: 'complete', message: `생성 완료 (${elapsed}초)` });

            return {
                success: true,
                report: this.generatedFullReport
            };

        } catch (error) {
            console.error('[PSURGenerator] API call failed:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * 전체 보고서 생성용 프롬프트
     * UserPrompt_2_260115.md 템플릿을 사용하고 {{RAW_DATA_PLACEHOLDER}}를 교체
     */
    buildFullReportPrompt(combinedMarkdown, userInputData, templatesText, examplesText = '') {
        // UserPrompt_2_260115.md 템플릿이 로드되어 있으면 사용
        if (this.userPromptTemplate) {
            console.log('[PSURGenerator] Using UserPrompt_2_260115.md template with placeholder replacement');

            // 플레이스홀더를 실제 원시자료로 교체
            const prompt = this.userPromptTemplate.replace(
                '{{RAW_DATA_PLACEHOLDER}}',
                combinedMarkdown
            );

            console.log(`[PSURGenerator] Placeholder replaced. Prompt length: ${prompt.length} chars`);
            return prompt;
        }

        // Fallback: 템플릿이 없으면 기존 하드코딩된 프롬프트 사용
        console.warn('[PSURGenerator] UserPrompt template not loaded, using fallback prompt');
        return `# PSUR 전체 보고서 생성 요청

## 역할
당신은 **제약사 약물감시팀 팀장**입니다. 한국 식약처에 제출하는 PSUR(Periodic Safety Update Report) 문서를 작성하는 전문가입니다.

## 데이터 정의서 (변수 정의)
${userInputData.substring(0, 50000)}

## 원시자료 (Raw Data)
${combinedMarkdown.substring(0, 40000)}

## 템플릿
${templatesText.substring(0, 25000)}

## 섹션별 예시 (참고용)
아래는 각 섹션의 예시입니다. 이 형식과 스타일을 참고하여 작성하세요.
${examplesText.substring(0, 35000)}

---

## 실행 지시

위 데이터 정의서, 원시자료, 템플릿을 참조하여 **전체 15개 섹션**의 PSUR 보고서를 작성하세요.

### 작성 순서
1. **00_표지** - 기본 정보
2. **03_서론** - CS 변수 치환
3. **04_전세계판매허가현황** - 허가 현황 표
4. **05_안전성조치** - 안전성 조치 내역
5. **06_안전성정보참고정보변경** - 정보 변경 내역
6. **07_환자노출** - 판매량 및 환자 노출 데이터
7. **08_개별증례병력** - 이상사례 LineListing 요약
8. **09_시험** - 임상시험 정보
9. **10_기타정보** - 문헌 검토 등
10. **11_종합적인안전성평가** - 전체 안전성 종합 평가
11. **12_결론** - 유익성-위해성 결론
12. **02_약어설명** - 사용된 약어 목록
13. **13_참고문헌** - 인용 문헌
14. **01_목차** - 완성된 섹션 기반 목차
15. **14_별첨** - 별첨 자료

### 출력 형식
각 섹션은 다음 형식으로 작성:

\`\`\`markdown
---
## [섹션번호]. [섹션명]

[완성된 내용]

---
\`\`\`

### 중요 규칙
1. **정확성**: 모든 변수는 데이터 정의서에 따라 정확히 치환
2. **일관성**: 동일 변수는 문서 전체에서 동일 값 사용
3. **완전성**: 모든 15개 섹션 포함
4. **형식 준수**: 마크다운 형식으로 작성
5. **한국어**: 본문은 한국어로 작성, 전문용어는 영어 병기 가능
6. **데이터 없음**: 원시자료에 없는 데이터는 '[데이터 필요]' 표시

---

지금 전체 PSUR 보고서를 작성해 주세요. 모든 섹션을 포함하여 완전한 보고서를 출력하세요.`;
    },

    /**
     * 보고서 다운로드
     */
    downloadReport(filename = null) {
        if (!this.generatedFullReport) {
            console.warn('[PSURGenerator] No report to download');
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

        console.log(`[PSURGenerator] Report downloaded: ${finalFilename}`);
        return true;
    },

    /**
     * 생성된 전체 보고서 가져오기
     */
    getFullReport() {
        return this.generatedFullReport;
    },

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
    },

    /**
     * 단일 섹션 생성
     */
    async generateSection(sectionId, sectionName, sectionDesc, combinedData, userInput, previousSections = null) {
        const template = this.templates[sectionId] || '';

        let prompt = this.SYSTEM_CONTEXT + "\n\n";
        prompt += "---\n\n";
        prompt += `## 작업 지시\n`;
        prompt += `다음 섹션을 생성해주세요: **${sectionId}. ${sectionName}**\n`;
        prompt += `설명: ${sectionDesc}\n\n`;

        // 사용자 입력 (변수 정의)
        if (userInput) {
            prompt += "## 사용자 입력 (변수 정의)\n";
            prompt += userInput.substring(0, 30000) + "\n\n";
        }

        // 템플릿
        if (template) {
            prompt += "## 템플릿\n";
            prompt += "```markdown\n" + template + "\n```\n\n";
        }

        // RAW 데이터
        prompt += "## RAW 데이터 (마크다운 변환됨)\n";
        prompt += combinedData.substring(0, 50000) + "\n\n";

        // Phase 3의 경우 이전 섹션 참조
        if (previousSections) {
            prompt += "## 이전에 생성된 섹션들 (참조용)\n";
            prompt += previousSections.substring(0, 30000) + "\n\n";
        }

        prompt += "---\n";
        prompt += `**출력**: ${sectionId}. ${sectionName} 섹션의 마크다운 내용만 출력하세요.\n`;

        return await this.callGeminiAPI(prompt, 4096);
    },

    /**
     * 전체 PSUR 보고서 생성 (2-Pass 방식)
     */
    async generateFullPSUR(combinedMarkdown, userInput, progressCallback) {
        this.generatedSections = {};
        let totalSections = this.PHASE2_SECTIONS.length + this.PHASE3_SECTIONS.length;
        let currentSection = 0;

        // Phase 2: 메인 컨텐츠 섹션
        if (progressCallback) {
            progressCallback({ phase: 2, message: 'Phase 2: 메인 컨텐츠 섹션 생성 중...' });
        }

        for (const section of this.PHASE2_SECTIONS) {
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
                this.generatedSections[section.id] = {
                    name: section.name,
                    content: content
                };
                console.log(`생성 완료: ${section.id}_${section.name}`);

                // API 레이트 리밋 방지
                await this.delay(1000);
            } catch (error) {
                console.error(`섹션 생성 실패: ${section.id}`, error);
                this.generatedSections[section.id] = {
                    name: section.name,
                    content: `# ${section.id}. ${section.name}\n\n[생성 오류: ${error.message}]`
                };
            }
        }

        // Phase 3: 문서 전체 참조 섹션
        if (progressCallback) {
            progressCallback({ phase: 3, message: 'Phase 3: 종합 섹션 생성 중...' });
        }

        // 이전 섹션들 문자열화
        let previousSectionsText = "";
        for (const [id, section] of Object.entries(this.generatedSections)) {
            previousSectionsText += `### ${id}. ${section.name}\n${section.content}\n\n---\n\n`;
        }

        for (const section of this.PHASE3_SECTIONS) {
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
                this.generatedSections[section.id] = {
                    name: section.name,
                    content: content
                };
                console.log(`생성 완료: ${section.id}_${section.name}`);

                await this.delay(1000);
            } catch (error) {
                console.error(`섹션 생성 실패: ${section.id}`, error);
                this.generatedSections[section.id] = {
                    name: section.name,
                    content: `# ${section.id}. ${section.name}\n\n[생성 오류: ${error.message}]`
                };
            }
        }

        return this.generatedSections;
    },

    /**
     * 최종 보고서 결합
     */
    getFinalReport() {
        // 섹션 번호순 정렬
        const sortedIds = Object.keys(this.generatedSections).sort((a, b) => {
            return parseInt(a) - parseInt(b);
        });

        let finalReport = "# PSUR 최종 보고서\n\n";
        finalReport += `생성일시: ${new Date().toLocaleString('ko-KR')}\n\n`;
        finalReport += "---\n\n";

        for (const id of sortedIds) {
            const section = this.generatedSections[id];
            finalReport += section.content + "\n\n---\n\n";
        }

        return finalReport;
    },

    /**
     * 지연 함수
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 생성된 섹션 가져오기
     */
    getSections() {
        return this.generatedSections;
    },

    /**
     * LLM 응답을 15개 섹션으로 파싱
     * @param {string} responseText - LLM에서 반환된 전체 보고서 텍스트
     * @returns {Object} - 섹션 ID를 키로 하는 객체 { '00': {...}, '01': {...}, ... }
     */
    parseSectionsFromResponse(responseText) {
        const sections = {};

        if (!responseText) {
            console.warn('[PSURGenerator] 파싱할 응답이 없습니다.');
            return sections;
        }

        // 섹션 정의
        const sectionNames = {
            '00': '표지',
            '01': '목차',
            '02': '약어설명',
            '03': '서론',
            '04': '전세계판매허가현황',
            '05': '안전성조치',
            '06': '안전성정보참고정보변경',
            '07': '환자노출',
            '08': '개별증례병력',
            '09': '시험',
            '10': '기타정보',
            '11': '종합적인안전성평가',
            '12': '결론',
            '13': '참고문헌',
            '14': '별첨'
        };

        // === JSON 응답 처리 (UserPrompt_2_260115.md 형식) ===
        try {
            // markdown code block 제거
            let cleanText = responseText.trim();
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            // JSON 파싱 시도
            if (cleanText.startsWith('{')) {
                let jsonData = JSON.parse(cleanText);

                // wrapper 객체 처리 (content 키 안에 실제 JSON이 있는 경우)
                if (jsonData.content && typeof jsonData.content === 'string' && !jsonData.sections) {
                    console.log('[PSURGenerator] Wrapper 객체 감지 - content 추출');
                    let innerContent = jsonData.content.trim();
                    // content 안의 markdown code block 제거
                    if (innerContent.startsWith('```json')) {
                        innerContent = innerContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
                    } else if (innerContent.startsWith('```')) {
                        innerContent = innerContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
                    }
                    // 다시 파싱
                    if (innerContent.startsWith('{')) {
                        jsonData = JSON.parse(innerContent);
                        console.log('[PSURGenerator] Inner JSON 파싱 성공');
                    }
                }

                // sections 객체가 있는 경우 처리
                if (jsonData.sections && typeof jsonData.sections === 'object') {
                    console.log('[PSURGenerator] JSON 형식 응답 감지 - sections 객체 파싱');

                    for (const [key, value] of Object.entries(jsonData.sections)) {
                        // key: "00_표지" 또는 "00" 형식
                        const sectionId = key.substring(0, 2);
                        const sectionName = value.sectionName || sectionNames[sectionId] || `섹션 ${sectionId}`;
                        const content = value.content || `## ${sectionId}. ${sectionName}\n\n[내용 없음]`;

                        sections[sectionId] = {
                            id: sectionId,
                            name: sectionName,
                            content: content,
                            generatedAt: new Date().toISOString(),
                            isEdited: false
                        };
                    }

                    // extractedData도 저장 (나중에 사용 가능)
                    if (jsonData.extractedData) {
                        try {
                            localStorage.setItem('extractedData', JSON.stringify(jsonData.extractedData));
                            console.log('[PSURGenerator] extractedData 저장 완료');
                        } catch (e) {
                            console.warn('[PSURGenerator] extractedData 저장 실패:', e);
                        }
                    }

                    // fullReport도 저장
                    if (jsonData.fullReport) {
                        try {
                            localStorage.setItem('fullReportContent', JSON.stringify(jsonData.fullReport));
                            console.log('[PSURGenerator] fullReport 저장 완료');
                        } catch (e) {
                            console.warn('[PSURGenerator] fullReport 저장 실패:', e);
                        }
                    }

                    const parsedCount = Object.keys(sections).length;
                    console.log(`[PSURGenerator] JSON에서 ${parsedCount}개 섹션 파싱 완료`);

                    if (parsedCount > 0) {
                        // 누락된 섹션 빈 내용으로 채우기
                        for (const id of Object.keys(sectionNames)) {
                            if (!sections[id]) {
                                sections[id] = {
                                    id: id,
                                    name: sectionNames[id],
                                    content: `## ${id}. ${sectionNames[id]}\n\n[이 섹션은 생성되지 않았습니다]`,
                                    generatedAt: null,
                                    isEdited: false
                                };
                            }
                        }

                        // 섹션 13 (참고문헌) 후처리 검증
                        // RAW 파일 목록이 참고문헌으로 잘못 출력되는 문제 수정
                        if (sections['13']) {
                            // 패턴: RAW 파일명 형식 (RAW1.1_한글, RAW1.1: 한글, RAW1.1 한글 등)
                            const rawPattern = /RAW\d+(\.\d+)?[_：:\s]/g;
                            if (rawPattern.test(sections['13'].content)) {
                                console.warn('[PSURGenerator] 섹션 13에서 RAW 파일 목록 감지 → "해당사항 없음"으로 대체');
                                sections['13'].content = '## 13. 참고문헌\n\n해당사항 없음';
                            }
                        }

                        // localStorage에 저장
                        try {
                            localStorage.setItem('generatedSections', JSON.stringify(sections));
                        } catch (e) {
                            console.warn('[PSURGenerator] 섹션 저장 실패:', e);
                        }

                        // DB에도 저장
                        this.saveSectionsToDB(sections).catch(err => {
                            console.warn('[PSURGenerator] DB 저장 중 오류 (무시됨):', err);
                        });

                        return sections;
                    }
                }
            }
        } catch (e) {
            console.log('[PSURGenerator] JSON 파싱 실패, 마크다운 파싱으로 진행:', e.message);
        }

        // === 기존 마크다운 패턴 파싱 (fallback) ===
        // 다양한 섹션 패턴 매칭
        // 패턴 1: ## 00. 표지 또는 ## 00_표지
        // 패턴 2: # 00. 표지
        // 패턴 3: ---\n## 00. 표지
        const patterns = [
            /(?:^|\n)(?:---\s*\n)?##?\s*(\d{2})[._\s]+([^\n]+)\n([\s\S]*?)(?=(?:\n---\s*\n)?##?\s*\d{2}[._\s]|$)/g,
            /(?:^|\n)##?\s*(\d{2})[._\s]*([^\n]*)\n([\s\S]*?)(?=\n##?\s*\d{2}|$)/g
        ];

        let matched = false;

        for (const pattern of patterns) {
            let match;
            const tempSections = {};

            while ((match = pattern.exec(responseText)) !== null) {
                const sectionId = match[1];
                let sectionName = match[2].trim();
                let sectionContent = match[3].trim();

                // 섹션 이름이 비어있으면 기본 이름 사용
                if (!sectionName && sectionNames[sectionId]) {
                    sectionName = sectionNames[sectionId];
                }

                // --- 구분자 제거
                sectionContent = sectionContent.replace(/^---\s*$/gm, '').trim();

                tempSections[sectionId] = {
                    id: sectionId,
                    name: sectionName || sectionNames[sectionId] || `섹션 ${sectionId}`,
                    content: `## ${sectionId}. ${sectionName || sectionNames[sectionId]}\n\n${sectionContent}`,
                    generatedAt: new Date().toISOString(),
                    isEdited: false
                };

                matched = true;
            }

            if (matched && Object.keys(tempSections).length > 0) {
                Object.assign(sections, tempSections);
                break;
            }

            // 패턴 리셋
            pattern.lastIndex = 0;
        }

        // 파싱된 섹션 수 확인
        const parsedCount = Object.keys(sections).length;
        console.log(`[PSURGenerator] ${parsedCount}개 섹션 파싱 완료`);

        // 누락된 섹션 빈 내용으로 채우기
        for (const id of Object.keys(sectionNames)) {
            if (!sections[id]) {
                sections[id] = {
                    id: id,
                    name: sectionNames[id],
                    content: `## ${id}. ${sectionNames[id]}\n\n[이 섹션은 생성되지 않았습니다]`,
                    generatedAt: null,
                    isEdited: false
                };
            }
        }

        // 섹션 13 (참고문헌) 후처리 검증
        // RAW 파일 목록이 참고문헌으로 잘못 출력되는 문제 수정
        if (sections['13']) {
            // 패턴: RAW 파일명 형식 (RAW1.1_한글, RAW1.1: 한글, RAW1.1 한글 등)
            const rawPattern = /RAW\d+(\.\d+)?[_：:\s]/g;
            if (rawPattern.test(sections['13'].content)) {
                console.warn('[PSURGenerator] 섹션 13에서 RAW 파일 목록 감지 → "해당사항 없음"으로 대체');
                sections['13'].content = '## 13. 참고문헌\n\n해당사항 없음';
            }
        }

        // localStorage에 저장
        try {
            localStorage.setItem('generatedSections', JSON.stringify(sections));
        } catch (e) {
            console.warn('[PSURGenerator] 섹션 저장 실패:', e);
        }

        // DB에도 저장 (비동기, fire-and-forget)
        this.saveSectionsToDB(sections).catch(err => {
            console.warn('[PSURGenerator] DB 저장 중 오류 (무시됨):', err);
        });

        return sections;
    },

    /**
     * DB에서 섹션들 로드
     * @returns {Promise<Object>} - 섹션 객체 { '00': {...}, '01': {...}, ... }
     */
    async loadSectionsFromDB() {
        if (!this.reportId) {
            console.warn('[PSURGenerator] Report ID not set, cannot load from DB');
            return null;
        }

        try {
            const result = await supabaseClient.getSections(this.reportId);

            if (!result.success || !result.sections || result.sections.length === 0) {
                console.log('[PSURGenerator] No sections found in DB');
                return null;
            }

            // DB 형식을 로컬 형식으로 변환
            const sections = {};
            for (const dbSection of result.sections) {
                sections[dbSection.section_number] = {
                    id: dbSection.section_number,
                    name: dbSection.section_name,
                    content: dbSection.content_markdown,
                    generatedAt: dbSection.created_at,
                    isEdited: false,
                    dbId: dbSection.id,
                    version: dbSection.version
                };
            }

            console.log(`[PSURGenerator] ✅ ${Object.keys(sections).length} sections loaded from DB`);
            return sections;

        } catch (error) {
            console.error('[PSURGenerator] DB load error:', error);
            return null;
        }
    }
};

// 전역으로 노출
if (typeof window !== 'undefined') {
    window.PSURGenerator = PSURGenerator;
}

// ES6 export (조건부 - 모듈로 로드될 때만 사용)
// export default PSURGenerator;

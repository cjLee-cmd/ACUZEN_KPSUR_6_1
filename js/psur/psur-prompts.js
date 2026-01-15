/**
 * PSUR Prompts - LLM 프롬프트 및 시스템 컨텍스트
 * js/psur/psur-prompts.js
 *
 * 프롬프트 빌더 및 섹션 정의
 */

(function() {
    'use strict';

    // 2-Pass 섹션 정의
    const PHASE2_SECTIONS = [
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
    ];

    const PHASE3_SECTIONS = [
        { id: "11", name: "종합적인안전성평가", desc: "전체 안전성 데이터 종합 평가" },
        { id: "12", name: "결론", desc: "유익성-위해성 최종 결론" },
        { id: "02", name: "약어및정의", desc: "사용된 약어 정리" },
        { id: "13", name: "참고문헌", desc: "인용 문헌 목록 (⚠️ RAW 파일 목록 아님! 학술 논문만 기재, 없으면 '해당사항 없음')" },
        { id: "01", name: "목차", desc: "전체 문서 목차" }
    ];

    // 섹션명 정의
    const SECTION_NAMES = {
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

    // 시스템 컨텍스트
    const SYSTEM_CONTEXT = `# PSUR(정기적 안전성 갱신 보고서) 생성 AI 어시스턴트

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
- 설명 문구 없이 본문만 출력`;

    /**
     * PSURPrompts - 프롬프트 빌더 클래스
     */
    class PSURPrompts {
        constructor() {
            this.templates = window.psurTemplates;
        }

        /**
         * 전체 보고서 생성용 프롬프트
         */
        buildFullReportPrompt(combinedMarkdown, userInputData, templatesText, examplesText = '') {
            // UserPrompt_2_260115.md 템플릿이 로드되어 있으면 사용
            if (this.templates && this.templates.userPromptTemplate) {
                console.log('[PSURPrompts] Using UserPrompt_2_260115.md template with placeholder replacement');

                const prompt = this.templates.userPromptTemplate.replace(
                    '{{RAW_DATA_PLACEHOLDER}}',
                    combinedMarkdown
                );

                console.log(`[PSURPrompts] Placeholder replaced. Prompt length: ${prompt.length} chars`);
                return prompt;
            }

            // Fallback: 템플릿이 없으면 기본 프롬프트 사용
            console.warn('[PSURPrompts] UserPrompt template not loaded, using fallback prompt');
            return this.buildFallbackPrompt(combinedMarkdown, userInputData, templatesText, examplesText);
        }

        /**
         * Fallback 프롬프트
         */
        buildFallbackPrompt(combinedMarkdown, userInputData, templatesText, examplesText) {
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
        }

        /**
         * 단일 섹션 생성용 프롬프트
         */
        buildSectionPrompt(sectionId, sectionName, sectionDesc, combinedData, userInput, template, previousSections = null) {
            let prompt = SYSTEM_CONTEXT + "\n\n";
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

            return prompt;
        }

        /**
         * 시스템 컨텍스트 가져오기
         */
        getSystemContext() {
            return SYSTEM_CONTEXT;
        }

        /**
         * Phase 2 섹션 목록 가져오기
         */
        getPhase2Sections() {
            return PHASE2_SECTIONS;
        }

        /**
         * Phase 3 섹션 목록 가져오기
         */
        getPhase3Sections() {
            return PHASE3_SECTIONS;
        }

        /**
         * 섹션명 가져오기
         */
        getSectionName(sectionId) {
            return SECTION_NAMES[sectionId] || `섹션 ${sectionId}`;
        }

        /**
         * 모든 섹션명 가져오기
         */
        getAllSectionNames() {
            return SECTION_NAMES;
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.PSURPrompts = PSURPrompts;
        window.psurPrompts = new PSURPrompts();
        window.PSUR_PHASE2_SECTIONS = PHASE2_SECTIONS;
        window.PSUR_PHASE3_SECTIONS = PHASE3_SECTIONS;
        window.PSUR_SECTION_NAMES = SECTION_NAMES;
        window.PSUR_SYSTEM_CONTEXT = SYSTEM_CONTEXT;
    }

})();

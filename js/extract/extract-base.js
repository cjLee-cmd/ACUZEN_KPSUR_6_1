/**
 * Extract Base - 핵심 추출 로직
 * js/extract/extract-base.js
 *
 * 데이터 추출, 병합, 충돌 관리, 유틸리티
 */

(function() {
    'use strict';

    // DateHelper fallback
    const DateHelper = window.DateHelper || {
        formatISO: () => new Date().toISOString(),
        formatYYMMDD_hhmmss: () => {
            const d = new Date();
            return `${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
        }
    };

    /**
     * ExtractBase - 핵심 추출 클래스
     */
    class ExtractBase {
        constructor() {
            this.extractedData = {
                CS: {},
                PH: {},
                Table: {}
            };
            this.extractionHistory = [];
            this.conflicts = [];
        }

        /**
         * 마크다운에서 데이터 추출 (LLM 사용)
         */
        async extractFromMarkdown(markdownContent, rawId, dataDefinitions) {
            console.log(`[ExtractBase] Extracting data from RAW ID: ${rawId}`);

            // LLM 클라이언트 확인
            const llmClient = window.llmClient || window.multiLLMClient;
            if (!llmClient) {
                console.warn('[ExtractBase] LLM client not available');
                return { success: false, error: 'LLM client not available' };
            }

            try {
                // LLM을 사용한 데이터 추출
                let result;
                if (llmClient.extractData) {
                    result = await llmClient.extractData(markdownContent, dataDefinitions, rawId);
                } else if (llmClient.generate) {
                    // Fallback: generate 메서드 사용
                    const prompt = this.buildExtractionPrompt(markdownContent, dataDefinitions, rawId);
                    result = await llmClient.generate(prompt, { provider: 'google' });
                } else {
                    throw new Error('No suitable LLM method available');
                }

                if (result.success) {
                    // JSON 파싱
                    const extractedData = this.parseJSONFromResponse(result.text);

                    if (!extractedData) {
                        throw new Error('JSON 형식을 찾을 수 없습니다.');
                    }

                    // 추출 이력 저장
                    this.extractionHistory.push({
                        rawId: rawId,
                        extractedAt: DateHelper.formatISO(),
                        duration: result.duration,
                        model: result.model,
                        data: extractedData,
                        success: true
                    });

                    console.log(`[ExtractBase] Data extracted from ${rawId} (${result.duration}s)`);

                    return {
                        success: true,
                        data: extractedData
                    };
                }

                throw new Error(result.error || '추출 실패');

            } catch (error) {
                console.error(`[ExtractBase] Extraction failed (${rawId}):`, error.message);

                this.extractionHistory.push({
                    rawId: rawId,
                    extractedAt: DateHelper.formatISO(),
                    error: error.message,
                    success: false
                });

                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * LLM 응답에서 JSON 파싱
         */
        parseJSONFromResponse(text) {
            if (!text) return null;

            // JSON 코드블록 찾기
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[1]);
                } catch (e) {
                    console.warn('[ExtractBase] JSON parse error from code block');
                }
            }

            // 직접 JSON 파싱 시도
            try {
                const cleanText = text.trim();
                if (cleanText.startsWith('{')) {
                    return JSON.parse(cleanText);
                }
            } catch (e) {
                console.warn('[ExtractBase] Direct JSON parse failed');
            }

            return null;
        }

        /**
         * 추출 프롬프트 빌드
         */
        buildExtractionPrompt(markdownContent, dataDefinitions, rawId) {
            return `마크다운 문서에서 지정된 데이터를 추출하세요.

## 원본 문서 (${rawId})
${markdownContent.substring(0, 30000)}

## 추출할 데이터 정의
${JSON.stringify(dataDefinitions, null, 2)}

## 출력 형식
JSON 형식으로 추출된 데이터를 반환하세요. 데이터가 없는 경우 "DATA_NOT_FOUND"를 사용하세요.

\`\`\`json
{
  "변수명1": "추출된 값",
  "변수명2": "추출된 값"
}
\`\`\``;
        }

        /**
         * 예시를 포함한 추출 프롬프트 빌드
         * @param {string} markdownContent - 원본 마크다운 콘텐츠
         * @param {object} dataDefinitions - 추출할 데이터 정의
         * @param {string} rawId - 원본 문서 ID
         * @param {string} exampleContent - 예시 콘텐츠 (formatExamplesForPrompt 결과)
         */
        buildExtractionPromptWithExamples(markdownContent, dataDefinitions, rawId, exampleContent = '') {
            let prompt = `마크다운 문서에서 지정된 데이터를 추출하세요.

## 원본 문서 (${rawId})
${markdownContent.substring(0, 25000)}

## 추출할 데이터 정의
${JSON.stringify(dataDefinitions, null, 2)}
`;

            // 예시가 있으면 추가
            if (exampleContent && exampleContent.trim()) {
                prompt += `
${exampleContent}

## 중요: 출력 형식 지침
- 위의 예시 형식을 **정확히** 따르세요.
- 표인 경우: 마크다운 테이블 형식을 유지하고, 헤더와 열 구조를 예시와 동일하게 작성하세요.
- 서술문인 경우: 예시의 문체, 불릿 포인트, 번호 목록 구조를 따르세요.
`;
            }

            prompt += `
## 출력 형식
JSON 형식으로 추출된 데이터를 반환하세요. 데이터가 없는 경우 "DATA_NOT_FOUND"를 사용하세요.

\`\`\`json
{
  "변수명1": "추출된 값",
  "변수명2": "추출된 값"
}
\`\`\``;

            return prompt;
        }

        /**
         * 예시를 참고하여 마크다운에서 데이터 추출
         * @param {string} markdownContent - 원본 마크다운 콘텐츠
         * @param {string} rawId - 원본 문서 ID
         * @param {object} dataDefinitions - 추출할 데이터 정의
         * @param {string[]} variableIds - 예시를 로드할 변수 ID 목록 (선택)
         */
        async extractFromMarkdownWithExamples(markdownContent, rawId, dataDefinitions, variableIds = []) {
            console.log(`[ExtractBase] Extracting data with examples from RAW ID: ${rawId}`);

            const llmClient = window.llmClient || window.multiLLMClient;
            if (!llmClient) {
                console.warn('[ExtractBase] LLM client not available');
                return { success: false, error: 'LLM client not available' };
            }

            try {
                // 예시 콘텐츠 로드
                let exampleContent = '';
                const exampleLoader = window.exampleLoader;

                if (exampleLoader && variableIds.length > 0) {
                    // 변수 ID별로 예시 로드
                    const exampleParts = [];
                    for (const varId of variableIds.slice(0, 3)) { // 최대 3개 변수
                        const formatted = await exampleLoader.formatExamplesForPrompt(varId, 1);
                        if (formatted) {
                            exampleParts.push(formatted);
                        }
                    }
                    exampleContent = exampleParts.join('\n');
                }

                // 프롬프트 생성
                const prompt = this.buildExtractionPromptWithExamples(
                    markdownContent,
                    dataDefinitions,
                    rawId,
                    exampleContent
                );

                // LLM 호출
                let result;
                if (llmClient.generate) {
                    result = await llmClient.generate(prompt, { provider: 'google' });
                } else {
                    throw new Error('No suitable LLM method available');
                }

                if (result.success) {
                    const extractedData = this.parseJSONFromResponse(result.text);

                    if (!extractedData) {
                        throw new Error('JSON 형식을 찾을 수 없습니다.');
                    }

                    // 추출 이력 저장
                    this.extractionHistory.push({
                        rawId: rawId,
                        extractedAt: DateHelper.formatISO(),
                        duration: result.duration,
                        model: result.model,
                        data: extractedData,
                        success: true,
                        withExamples: variableIds.length > 0
                    });

                    console.log(`[ExtractBase] Data extracted with examples from ${rawId} (${result.duration}s)`);

                    return {
                        success: true,
                        data: extractedData
                    };
                }

                throw new Error(result.error || '추출 실패');

            } catch (error) {
                console.error(`[ExtractBase] Extraction with examples failed (${rawId}):`, error.message);

                this.extractionHistory.push({
                    rawId: rawId,
                    extractedAt: DateHelper.formatISO(),
                    error: error.message,
                    success: false
                });

                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * 추출된 데이터 병합
         */
        mergeExtractedData(newData, dataType = 'CS') {
            if (!newData || typeof newData !== 'object') {
                console.warn('[ExtractBase] Invalid data to merge');
                return;
            }

            Object.entries(newData).forEach(([key, value]) => {
                // "DATA_NOT_FOUND" 무시
                if (value === 'DATA_NOT_FOUND') {
                    console.warn(`[ExtractBase] ${key}: 데이터를 찾을 수 없음`);
                    return;
                }

                // 기존 데이터와 충돌 확인
                if (this.extractedData[dataType][key]) {
                    const existingValue = this.extractedData[dataType][key];

                    if (existingValue !== value) {
                        console.warn(`[ExtractBase] Conflict detected for ${key}`);

                        this.conflicts.push({
                            key: key,
                            dataType: dataType,
                            existingValue: existingValue,
                            newValue: value,
                            detectedAt: DateHelper.formatISO()
                        });

                        // 충돌 데이터는 배열로 저장
                        this.extractedData[dataType][key] = [existingValue, value];
                    }
                } else {
                    // 신규 데이터 저장
                    this.extractedData[dataType][key] = value;
                }
            });
        }

        /**
         * 충돌 해결
         */
        resolveConflict(key, selectedValue) {
            const conflict = this.conflicts.find(c => c.key === key);

            if (!conflict) {
                console.warn(`[ExtractBase] Conflict not found for key: ${key}`);
                return false;
            }

            // 선택된 값으로 업데이트
            this.extractedData[conflict.dataType][key] = selectedValue;

            // 충돌 목록에서 제거
            this.conflicts = this.conflicts.filter(c => c.key !== key);

            console.log(`[ExtractBase] Conflict resolved for ${key}: ${selectedValue}`);
            return true;
        }

        /**
         * 충돌 목록 가져오기
         */
        getConflicts() {
            return this.conflicts;
        }

        /**
         * 누락된 데이터 확인
         */
        findMissingData(requiredFields) {
            const missing = {
                CS: [],
                PH: [],
                Table: []
            };

            requiredFields.CS?.forEach(field => {
                if (!this.extractedData.CS[field]) {
                    missing.CS.push(field);
                }
            });

            requiredFields.PH?.forEach(field => {
                if (!this.extractedData.PH[field]) {
                    missing.PH.push(field);
                }
            });

            requiredFields.Table?.forEach(field => {
                if (!this.extractedData.Table[field]) {
                    missing.Table.push(field);
                }
            });

            return missing;
        }

        /**
         * 추출 요약 생성
         */
        generateExtractionSummary(reportName) {
            const timestamp = DateHelper.formatYYMMDD_hhmmss();
            const filename = `${reportName}_데이터추출요약_${timestamp}.md`;

            let markdown = `# 데이터 추출 요약: ${reportName}\n\n`;
            markdown += `**생성 시간**: ${DateHelper.formatISO()}\n\n`;

            markdown += `## 통계\n\n`;
            markdown += `- CS 데이터: ${Object.keys(this.extractedData.CS).length}개\n`;
            markdown += `- PH 데이터: ${Object.keys(this.extractedData.PH).length}개\n`;
            markdown += `- Table 데이터: ${Object.keys(this.extractedData.Table).length}개\n`;
            markdown += `- 충돌: ${this.conflicts.length}개\n\n`;

            if (this.conflicts.length > 0) {
                markdown += `## 충돌 발생\n\n`;
                markdown += `| 변수명 | 기존 값 | 새 값 |\n`;
                markdown += `|--------|---------|-------|\n`;

                this.conflicts.forEach(conflict => {
                    markdown += `| ${conflict.key} | ${conflict.existingValue} | ${conflict.newValue} |\n`;
                });

                markdown += `\n`;
            }

            markdown += `## CS 데이터\n\n`;
            markdown += `\`\`\`json\n${JSON.stringify(this.extractedData.CS, null, 2)}\n\`\`\`\n\n`;

            markdown += `## PH 데이터\n\n`;
            markdown += `\`\`\`json\n${JSON.stringify(this.extractedData.PH, null, 2)}\n\`\`\`\n\n`;

            markdown += `## Table 데이터\n\n`;
            markdown += `\`\`\`json\n${JSON.stringify(this.extractedData.Table, null, 2)}\n\`\`\`\n\n`;

            markdown += `## 추출 이력\n\n`;
            markdown += `| RAW ID | 상태 | 소요 시간 | 추출 시간 |\n`;
            markdown += `|--------|------|-----------|----------|\n`;

            this.extractionHistory.forEach(item => {
                const status = item.success ? 'Success' : 'Failed';
                const duration = item.duration ? `${item.duration}s` : '-';
                markdown += `| ${item.rawId} | ${status} | ${duration} | ${item.extractedAt} |\n`;
            });

            return {
                filename: filename,
                content: markdown
            };
        }

        /**
         * 추출된 데이터 가져오기
         */
        getExtractedData() {
            return this.extractedData;
        }

        /**
         * 특정 타입의 데이터 가져오기
         */
        getData(dataType) {
            return this.extractedData[dataType] || {};
        }

        /**
         * 추출 이력 가져오기
         */
        getExtractionHistory() {
            return this.extractionHistory;
        }

        /**
         * 추출 초기화
         */
        clearExtractions() {
            this.extractedData = {
                CS: {},
                PH: {},
                Table: {}
            };
            this.extractionHistory = [];
            this.conflicts = [];
            console.log('[ExtractBase] Extractions cleared');
        }

        /**
         * JSON 파일로 내보내기
         */
        exportToJSON(reportName) {
            const timestamp = DateHelper.formatYYMMDD_hhmmss();
            const filename = `${reportName}_extracted_data_${timestamp}.json`;

            const data = {
                reportName: reportName,
                extractedAt: DateHelper.formatISO(),
                data: this.extractedData,
                conflicts: this.conflicts,
                history: this.extractionHistory
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);

            console.log(`[ExtractBase] Exported to JSON: ${filename}`);
            return filename;
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.ExtractBase = ExtractBase;
        window.extractBase = new ExtractBase();
    }

})();

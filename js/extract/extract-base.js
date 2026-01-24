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
     * Placeholder 패턴 정의 (재발 방지용 중앙 관리)
     */
    const PLACEHOLDER_PATTERNS = [
        'LLM 추출 필요',
        '사용자 입력 필요',
        '계산 필요',
        '자동 생성',
        'DATA_NOT_FOUND',
        '필요 RAW:',
        'PSUR 생성 시',
        'PLACEHOLDER'
    ];

    /**
     * Placeholder 여부 판단 (중앙화된 함수)
     */
    function isPlaceholderValue(value) {
        if (!value || typeof value !== 'string') return true;
        if (value.length <= 2) return true;
        if (value.startsWith('[') && value.includes(']') && value.includes('-')) return true;
        return PLACEHOLDER_PATTERNS.some(pattern => value.includes(pattern));
    }

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
            this.failedExtractions = []; // 실패한 추출 추적
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
                const startTime = Date.now();

                if (llmClient.extractData) {
                    result = await llmClient.extractData(markdownContent, dataDefinitions, rawId);
                } else if (llmClient.generate) {
                    // Fallback: generate 메서드 사용
                    const prompt = this.buildExtractionPrompt(markdownContent, dataDefinitions, rawId);
                    result = await llmClient.generate(prompt, {
                        provider: 'google',
                        model: 'gemini-2.0-flash',
                        temperature: 0.2,
                        maxTokens: 8192
                    });
                } else {
                    throw new Error('No suitable LLM method available');
                }

                const duration = ((Date.now() - startTime) / 1000).toFixed(2);

                // multiLLMClient.generate()는 { text: string } 형식 반환
                // result.success가 없으면 result.text 존재 여부로 성공 판단
                const isSuccess = result.success !== undefined ? result.success : !!result?.text;
                const responseText = result.text || result;

                if (isSuccess && responseText) {
                    // JSON 파싱
                    const extractedData = this.parseJSONFromResponse(responseText);

                    if (!extractedData) {
                        throw new Error('JSON 형식을 찾을 수 없습니다.');
                    }

                    // 추출 이력 저장
                    this.extractionHistory.push({
                        rawId: rawId,
                        extractedAt: DateHelper.formatISO(),
                        duration: duration,
                        model: result.model || 'gemini-2.0-flash',
                        data: extractedData,
                        success: true
                    });

                    console.log(`[ExtractBase] Data extracted from ${rawId} (${duration}s)`);

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
         * 재시도 로직이 포함된 마크다운 추출 (재발 방지 핵심 메서드)
         * @param {string} markdownContent - 마크다운 콘텐츠
         * @param {string} rawId - RAW ID
         * @param {object} dataDefinitions - 추출할 데이터 정의
         * @param {object} options - 옵션 { maxRetries: 2, retryDelay: 1000, splitOnFailure: true }
         */
        async extractFromMarkdownWithRetry(markdownContent, rawId, dataDefinitions, options = {}) {
            const {
                maxRetries = 2,
                retryDelay = 1000,
                splitOnFailure = true,
                validatePlaceholders = true
            } = options;

            console.log(`[ExtractBase] Extracting with retry (max: ${maxRetries}) from ${rawId}`);

            let lastError = null;
            let extractedData = {};
            const failedVars = [];

            // 1차 시도: 전체 추출
            for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
                console.log(`[ExtractBase] Attempt ${attempt}/${maxRetries + 1} for ${rawId}`);

                const result = await this.extractFromMarkdown(markdownContent, rawId, dataDefinitions);

                if (result.success && result.data) {
                    // Placeholder 검증
                    if (validatePlaceholders) {
                        Object.entries(result.data).forEach(([varId, value]) => {
                            if (!isPlaceholderValue(value)) {
                                extractedData[varId] = value;
                            } else if (value !== 'DATA_NOT_FOUND') {
                                failedVars.push(varId);
                                console.warn(`[ExtractBase] ${varId}: placeholder 값 반환됨`);
                            }
                        });
                    } else {
                        extractedData = { ...extractedData, ...result.data };
                    }

                    // 모든 변수 추출 성공 시 종료
                    const defKeys = Object.keys(dataDefinitions);
                    const extractedKeys = Object.keys(extractedData);
                    const missingKeys = defKeys.filter(k => !extractedKeys.includes(k));

                    if (missingKeys.length === 0) {
                        console.log(`[ExtractBase] All ${defKeys.length} variables extracted successfully`);
                        return { success: true, data: extractedData, failedVars: [] };
                    }

                    // 일부 성공 시 다음 시도에서 누락분만 추출
                    if (attempt <= maxRetries) {
                        console.log(`[ExtractBase] ${missingKeys.length} variables missing, retrying...`);
                        await this.delay(retryDelay);
                    }
                } else {
                    lastError = result.error;
                    if (attempt <= maxRetries) {
                        console.warn(`[ExtractBase] Attempt ${attempt} failed: ${lastError}, retrying...`);
                        await this.delay(retryDelay * attempt); // 점진적 대기
                    }
                }
            }

            // 2차 시도: 실패한 변수만 개별 추출 (splitOnFailure 옵션)
            if (splitOnFailure && failedVars.length > 0) {
                console.log(`[ExtractBase] Attempting individual extraction for ${failedVars.length} failed vars`);

                for (const varId of failedVars) {
                    const singleDef = { [varId]: dataDefinitions[varId] };
                    const singleResult = await this.extractSingleVariable(markdownContent, rawId, singleDef);

                    if (singleResult.success && singleResult.data && !isPlaceholderValue(singleResult.data[varId])) {
                        extractedData[varId] = singleResult.data[varId];
                        console.log(`[ExtractBase] ✅ Individual extraction success: ${varId}`);
                    } else {
                        // 최종 실패 기록
                        this.failedExtractions.push({
                            varId,
                            rawId,
                            error: singleResult.error || 'Placeholder returned',
                            timestamp: DateHelper.formatISO()
                        });
                        console.error(`[ExtractBase] ❌ Final failure: ${varId}`);
                    }
                }
            }

            const finalFailedVars = Object.keys(dataDefinitions).filter(k => !extractedData[k]);

            return {
                success: Object.keys(extractedData).length > 0,
                data: extractedData,
                failedVars: finalFailedVars,
                error: finalFailedVars.length > 0 ? `${finalFailedVars.length} variables failed` : null
            };
        }

        /**
         * 단일 변수 추출 (집중 프롬프트 사용)
         */
        async extractSingleVariable(markdownContent, rawId, singleDefinition) {
            const varId = Object.keys(singleDefinition)[0];
            const def = singleDefinition[varId];

            console.log(`[ExtractBase] Single variable extraction: ${varId}`);

            const llmClient = window.llmClient || window.multiLLMClient;
            if (!llmClient?.generate) {
                return { success: false, error: 'LLM client not available' };
            }

            // 집중 프롬프트 생성
            const prompt = `## 작업: 단일 변수 추출

**변수 ID**: ${varId}
**설명**: ${def.description || ''}
**가이드라인**: ${def.guideline || ''}

## 원본 문서 (${rawId})
${markdownContent.substring(0, 20000)}

## 지침
1. 위 문서에서 "${varId}" 변수의 값을 추출하세요.
2. 반드시 실제 데이터만 추출하세요.
3. 찾을 수 없으면 "DATA_NOT_FOUND"를 반환하세요.
4. "[설명] - LLM 추출 필요" 같은 플레이스홀더는 절대 반환하지 마세요.

## 출력 형식
\`\`\`json
{
  "${varId}": "추출된 실제 값"
}
\`\`\``;

            try {
                const result = await llmClient.generate(prompt, {
                    provider: 'google',
                    model: 'gemini-2.0-flash',
                    temperature: 0.1,
                    maxTokens: 4096
                });

                if (result.text) {
                    const parsed = this.parseJSONFromResponse(result.text);
                    if (parsed && parsed[varId]) {
                        return { success: true, data: parsed };
                    }
                }

                return { success: false, error: 'Extraction failed' };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }

        /**
         * LLM 프롬프트 기반 추출 (useLLM: true 변수용)
         * @param {string} markdownContent - 마크다운 원본
         * @param {string} varId - 변수 ID
         * @param {object} definition - 변수 정의 (llmPrompt 포함)
         * @returns {Promise<{success: boolean, value?: string, error?: string}>}
         */
        async extractWithLLMPrompt(markdownContent, varId, definition) {
            console.log(`[ExtractBase] LLM prompt extraction: ${varId}`);

            const llmClient = window.llmClient || window.multiLLMClient;
            if (!llmClient?.generate) {
                return { success: false, error: 'LLM client not available' };
            }

            const llmPrompt = definition.llmPrompt || '';
            if (!llmPrompt) {
                return { success: false, error: 'No LLM prompt defined' };
            }

            // 프롬프트 구성
            const fullPrompt = `## 작업: ${varId} 추출

${llmPrompt}

## 원본 문서
${markdownContent.substring(0, 30000)}

## 출력 규칙
- 반드시 숫자만 반환하세요 (단위, 쉼표, 설명 없이)
- 계산이 필요하면 직접 계산 후 최종 숫자만 반환
- 데이터를 찾을 수 없으면 "0" 반환
- 예시: 323102 (O), 323,102 (X), 323102 Vials/년 (X)`;

            try {
                const result = await llmClient.generate(fullPrompt, {
                    provider: 'google',
                    model: 'gemini-2.0-flash',
                    temperature: 0.1,
                    maxTokens: 2048
                });

                if (result.text) {
                    // 숫자만 추출
                    const numericValue = result.text.trim().replace(/[^0-9.-]/g, '');
                    const parsed = parseFloat(numericValue);

                    if (!isNaN(parsed)) {
                        console.log(`[ExtractBase] ✅ LLM extracted ${varId}: ${parsed}`);
                        return { success: true, value: String(Math.round(parsed)) };
                    }

                    // 숫자가 아니면 원본 텍스트 반환 (클린업 후)
                    const cleanValue = result.text.trim().split('\n')[0].trim();
                    console.log(`[ExtractBase] ✅ LLM extracted ${varId}: ${cleanValue}`);
                    return { success: true, value: cleanValue };
                }

                return { success: false, error: 'Empty LLM response' };
            } catch (err) {
                console.error(`[ExtractBase] LLM extraction failed for ${varId}:`, err.message);
                return { success: false, error: err.message };
            }
        }

        /**
         * LLM 기반 변수들 일괄 추출 (useLLM: true 변수들)
         * @param {object} markdownsByRawId - { RAW_ID: markdownContent } 형태
         * @param {object} definitions - CS/PH 정의 전체
         * @returns {Promise<object>} 추출된 데이터
         */
        async extractLLMVariables(markdownsByRawId, definitions) {
            console.log('[ExtractBase] Extracting LLM-based variables');

            const results = {};

            // useLLM: true인 변수들 필터링
            const llmVariables = Object.entries(definitions).filter(([_, def]) => def.useLLM === true);

            for (const [varId, def] of llmVariables) {
                const rawIds = def.rawIds || [];
                const legacyRawIds = def.legacyRawIds || [];
                const allRawIds = [...rawIds, ...legacyRawIds];

                // 해당 RAW ID의 마크다운 찾기
                let markdownContent = null;
                for (const rawId of allRawIds) {
                    if (markdownsByRawId[rawId]) {
                        markdownContent = markdownsByRawId[rawId];
                        break;
                    }
                }

                if (!markdownContent) {
                    console.warn(`[ExtractBase] No markdown found for ${varId} (RAW IDs: ${allRawIds.join(', ')})`);
                    continue;
                }

                // LLM 추출 실행
                const result = await this.extractWithLLMPrompt(markdownContent, varId, def);
                if (result.success && result.value) {
                    results[varId] = result.value;
                }
            }

            console.log(`[ExtractBase] LLM extraction complete:`, Object.keys(results));
            return results;
        }

        /**
         * 의존성 순서에 따른 추출 (CALCULATED 변수용)
         * @param {object} extractedData - 이미 추출된 데이터
         * @param {object} calculatedDefinitions - 계산이 필요한 변수 정의
         */
        async extractWithDependencies(extractedData, calculatedDefinitions) {
            console.log('[ExtractBase] Extracting calculated variables with dependencies');

            const results = {};
            const dependencies = {
                // CS21, CS22는 이제 LLM 추출 (useLLM: true)
                // CS23 = CS22 / CS21 (LLM 추출된 숫자값 사용)
                'CS23_연평균환자노출': ['CS22_연평균판매량', 'CS21_환자1명당사용량']
                // CS32-CS37은 이제 LLM 추출 (useLLM: true) - 계산 의존성 제거
                // 각 변수가 RAW19에서 직접 LLM으로 추출됨
            };

            // 의존성 순서대로 계산
            const sortedVars = this.topologicalSort(dependencies, Object.keys(calculatedDefinitions));

            for (const varId of sortedVars) {
                const deps = dependencies[varId] || [];
                const missingDeps = deps.filter(d => {
                    const val = extractedData[d] || results[d];
                    return !val || isPlaceholderValue(val);
                });

                if (missingDeps.length > 0) {
                    console.warn(`[ExtractBase] ${varId}: 의존 변수 누락 - ${missingDeps.join(', ')}`);
                    this.failedExtractions.push({
                        varId,
                        error: `Missing dependencies: ${missingDeps.join(', ')}`,
                        timestamp: DateHelper.formatISO()
                    });
                    continue;
                }

                // 계산 수행
                const calculated = this.calculateVariable(varId, { ...extractedData, ...results });
                if (calculated !== null) {
                    results[varId] = calculated;
                    console.log(`[ExtractBase] ✅ Calculated: ${varId} = ${calculated}`);
                }
            }

            return results;
        }

        /**
         * 변수 계산 (수식 기반)
         */
        calculateVariable(varId, data) {
            try {
                switch (varId) {
                    // CS22는 이제 LLM 추출 (useLLM: true) - 이 case는 폴백용
                    case 'CS22_연평균판매량': {
                        // LLM 추출값이 이미 있으면 그것 사용
                        const llmValue = parseFloat(data['CS22_연평균판매량']);
                        if (!isNaN(llmValue) && llmValue > 0) {
                            return llmValue;
                        }
                        // 폴백: 기존 계산 방식
                        const total = parseFloat(data['CS19.3_시판후판매량합계']);
                        const startDate = new Date(data['CS19_시판후노출count시작날짜']);
                        const endDate = new Date(data['CS19.1_시판후노출count종료날짜']);
                        const days = (endDate - startDate) / (1000 * 60 * 60 * 24);
                        if (days > 0 && !isNaN(total)) {
                            return Math.round((total / days) * 365);
                        }
                        break;
                    }
                    case 'CS23_연평균환자노출': {
                        // CS21, CS22 모두 숫자로 추출됨 (LLM useLLM: true)
                        const annual = parseFloat(data['CS22_연평균판매량']);
                        const perPatient = parseFloat(data['CS21_환자1명당사용량']);
                        console.log(`[ExtractBase] CS23 계산: annual=${annual}, perPatient=${perPatient}`);
                        if (!isNaN(annual) && !isNaN(perPatient) && perPatient > 0) {
                            const result = Math.round(annual / perPatient);
                            console.log(`[ExtractBase] CS23 결과: ${result}`);
                            return result;
                        }
                        break;
                    }
                    // CS32, CS35, CS37은 이제 LLM 추출 (useLLM: true)
                    // 더 이상 계산하지 않음 - RAW19에서 직접 LLM으로 추출
                }
            } catch (e) {
                console.error(`[ExtractBase] Calculation error for ${varId}:`, e.message);
            }
            return null;
        }

        /**
         * 위상 정렬 (의존성 순서 결정)
         */
        topologicalSort(dependencies, nodes) {
            const sorted = [];
            const visited = new Set();
            const visiting = new Set();

            const visit = (node) => {
                if (visited.has(node)) return;
                if (visiting.has(node)) {
                    console.warn(`[ExtractBase] Circular dependency detected: ${node}`);
                    return;
                }
                visiting.add(node);
                const deps = dependencies[node] || [];
                deps.forEach(dep => {
                    if (nodes.includes(dep)) visit(dep);
                });
                visiting.delete(node);
                visited.add(node);
                sorted.push(node);
            };

            nodes.forEach(visit);
            return sorted;
        }

        /**
         * 실패한 추출 목록 반환
         */
        getFailedExtractions() {
            return this.failedExtractions;
        }

        /**
         * 실패한 추출 초기화
         */
        clearFailedExtractions() {
            this.failedExtractions = [];
        }

        /**
         * 지연 함수 (재시도 간격용)
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Placeholder 검증 유틸리티 (외부 노출)
         */
        isPlaceholder(value) {
            return isPlaceholderValue(value);
        }

        /**
         * LLM 응답에서 JSON 파싱 (다양한 형식 지원)
         */
        parseJSONFromResponse(text) {
            if (!text) return null;

            let jsonContent = null;

            // 패턴 1: ```json ... ```
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonContent = jsonMatch[1];
            }

            // 패턴 2: ``` ... ``` (언어 지정 없음)
            if (!jsonContent) {
                const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
                if (codeMatch && codeMatch[1].trim().startsWith('{')) {
                    jsonContent = codeMatch[1];
                }
            }

            // 패턴 3: 순수 JSON 객체 찾기
            if (!jsonContent) {
                const pureJsonMatch = text.match(/(\{[\s\S]*\})/);
                if (pureJsonMatch) {
                    jsonContent = pureJsonMatch[1];
                }
            }

            if (!jsonContent) {
                console.warn('[ExtractBase] JSON content not found in response');
                return null;
            }

            // JSON 정제
            jsonContent = jsonContent
                .trim()
                .replace(/^\uFEFF/, '')  // BOM 제거
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');  // 제어 문자 제거

            try {
                return JSON.parse(jsonContent);
            } catch (e) {
                console.warn('[ExtractBase] JSON parse error:', e.message);
                console.log('[ExtractBase] Failed JSON (first 200 chars):', jsonContent.substring(0, 200));
                return null;
            }
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
         * ========================================
         * Full LLM 추출 (Hybrid 방식 대체)
         * ========================================
         * 모든 데이터를 LLM에 위임하여 추출
         *
         * @param {Object} convertedMarkdowns - { filename: markdownContent }
         * @param {Object} filenameToRawId - { filename: rawId }
         * @param {Object} options - { CS_DEFINITIONS, PH_DEFINITIONS, TABLE_DEFINITIONS, onProgress }
         * @returns {Promise<Object>} - { success, data: { CS: {}, PH: {}, Table: {} }, stats }
         */
        async extractAllWithLLM(convertedMarkdowns, filenameToRawId, options = {}) {
            console.log('[ExtractBase] ========== Full LLM Extraction Start ==========');

            const {
                CS_DEFINITIONS = window.CS_DEFINITIONS || {},
                PH_DEFINITIONS = window.PH_DEFINITIONS || {},
                TABLE_DEFINITIONS = window.TABLE_DEFINITIONS || {},
                onProgress = null,
                maxRetries = 2
            } = options;

            const results = { CS: {}, PH: {}, Table: {} };
            const stats = {
                totalVars: 0,
                extracted: 0,
                failed: 0,
                calculated: 0,
                byRawId: {}
            };

            // 1. RAW ID별로 마크다운 그룹화
            const rawIdToMarkdown = {};
            Object.entries(filenameToRawId).forEach(([filename, rawId]) => {
                if (convertedMarkdowns[filename]) {
                    if (!rawIdToMarkdown[rawId]) rawIdToMarkdown[rawId] = [];
                    rawIdToMarkdown[rawId].push({
                        filename,
                        content: convertedMarkdowns[filename]
                    });
                }
            });

            console.log('[FullLLM] RAW ID별 마크다운:', Object.keys(rawIdToMarkdown));

            // 2. 모든 정의에서 RAW ID별 변수 그룹화
            const rawIdToVars = this._groupVariablesByRawId(
                CS_DEFINITIONS, PH_DEFINITIONS, TABLE_DEFINITIONS
            );

            // 3. 계산 필드와 RAW 추출 필드 분리
            const calculatedVars = {};
            const specialSources = ['USER_INPUT', 'CALCULATED', 'GENERATED'];

            Object.entries(CS_DEFINITIONS).forEach(([varId, def]) => {
                if (def.source === 'calculated' ||
                    (def.rawIds && def.rawIds.every(id => specialSources.includes(id)))) {
                    calculatedVars[varId] = def;
                }
            });

            // 4. RAW ID별 LLM 추출 실행
            const rawIdList = Object.keys(rawIdToVars);
            let processedCount = 0;

            for (const rawId of rawIdList) {
                const varsForRaw = rawIdToVars[rawId];
                const markdownFiles = rawIdToMarkdown[rawId] || [];

                if (markdownFiles.length === 0) {
                    console.log(`[FullLLM] ${rawId}: 마크다운 없음, 건너뜀`);
                    continue;
                }

                // 마크다운 병합 (같은 RAW ID의 여러 파일)
                const combinedMarkdown = markdownFiles
                    .map(f => `## 파일: ${f.filename}\n\n${f.content}`)
                    .join('\n\n---\n\n');

                // 변수 정의 구성
                const defsForPrompt = {};
                varsForRaw.forEach(({ varId, type, def }) => {
                    defsForPrompt[varId] = {
                        description: def.description,
                        type: def.type || type,
                        guideline: def.guideline
                    };
                });

                if (Object.keys(defsForPrompt).length === 0) continue;

                // 진행 상황 콜백
                if (onProgress) {
                    onProgress({
                        phase: 'extracting',
                        rawId,
                        current: processedCount + 1,
                        total: rawIdList.length,
                        message: `${rawId}에서 ${Object.keys(defsForPrompt).length}개 변수 추출 중...`
                    });
                }

                console.log(`[FullLLM] ${rawId}: ${Object.keys(defsForPrompt).length}개 변수 추출 시작`);

                // LLM 호출
                try {
                    const extractResult = await this._extractFromRawWithLLM(
                        combinedMarkdown,
                        rawId,
                        defsForPrompt,
                        maxRetries
                    );

                    if (extractResult.success && extractResult.data) {
                        // 결과 분류 (CS/PH/Table)
                        Object.entries(extractResult.data).forEach(([varId, value]) => {
                            if (isPlaceholderValue(value)) {
                                stats.failed++;
                                return;
                            }

                            if (varId.startsWith('CS')) {
                                results.CS[varId] = value;
                            } else if (varId.startsWith('PH')) {
                                results.PH[varId] = value;
                            } else if (varId.startsWith('표')) {
                                results.Table[varId] = value;
                            }
                            stats.extracted++;
                        });

                        stats.byRawId[rawId] = {
                            requested: Object.keys(defsForPrompt).length,
                            extracted: Object.keys(extractResult.data).filter(
                                k => !isPlaceholderValue(extractResult.data[k])
                            ).length
                        };
                    }
                } catch (err) {
                    console.error(`[FullLLM] ${rawId} 추출 실패:`, err.message);
                    stats.byRawId[rawId] = { requested: Object.keys(defsForPrompt).length, extracted: 0, error: err.message };
                }

                processedCount++;
            }

            // 4.5. useLLM: true 변수 전용 LLM 추출 (커스텀 llmPrompt 사용)
            const llmVars = Object.entries(CS_DEFINITIONS).filter(([_, def]) => def.useLLM === true);
            if (llmVars.length > 0) {
                console.log(`[FullLLM] useLLM 변수 ${llmVars.length}개 처리: ${llmVars.map(([k]) => k).join(', ')}`);

                if (onProgress) {
                    onProgress({
                        phase: 'llm_extraction',
                        message: `${llmVars.length}개 LLM 계산 변수 추출 중...`
                    });
                }

                // RAW ID -> 마크다운 콘텐츠 맵 생성 (extractLLMVariables 형식)
                const markdownsByRawId = {};
                Object.entries(rawIdToMarkdown).forEach(([rawId, files]) => {
                    markdownsByRawId[rawId] = files.map(f => f.content).join('\n\n---\n\n');
                });

                try {
                    const llmVarResults = await this.extractLLMVariables(markdownsByRawId, CS_DEFINITIONS);
                    Object.entries(llmVarResults).forEach(([varId, value]) => {
                        if (value && !isPlaceholderValue(String(value))) {
                            results.CS[varId] = value;
                            stats.extracted++;
                            console.log(`[FullLLM] useLLM 추출 성공: ${varId} = ${String(value).substring(0, 50)}...`);
                        }
                    });
                } catch (llmErr) {
                    console.error('[FullLLM] useLLM 변수 추출 오류:', llmErr.message);
                }
            }

            // 5. 계산 필드 처리
            if (Object.keys(calculatedVars).length > 0) {
                if (onProgress) {
                    onProgress({
                        phase: 'calculating',
                        message: `${Object.keys(calculatedVars).length}개 계산 필드 처리 중...`
                    });
                }

                const calculatedResults = await this.extractWithDependencies(results.CS, calculatedVars);
                Object.entries(calculatedResults).forEach(([varId, value]) => {
                    if (value !== null && !isPlaceholderValue(String(value))) {
                        results.CS[varId] = value;
                        stats.calculated++;
                    }
                });
            }

            // 6. GENERATED 변수 처리 (PH11_총괄평가문, PH12_결론)
            // 전체 추출 데이터를 종합하여 LLM이 생성
            try {
                const generatedResults = await this._generateDerivedContent(results, PH_DEFINITIONS, onProgress);
                Object.entries(generatedResults).forEach(([varId, value]) => {
                    if (value && !isPlaceholderValue(String(value))) {
                        results.PH[varId] = value;
                        stats.extracted++;
                        console.log(`[FullLLM] GENERATED → results.PH: ${varId}`);
                    }
                });
                stats.generated = Object.keys(generatedResults).length;
            } catch (genErr) {
                console.error('[FullLLM] GENERATED 처리 오류:', genErr.message);
                stats.generated = 0;
            }

            // 7. 통계 집계
            stats.totalVars = Object.keys(CS_DEFINITIONS).length +
                             Object.keys(PH_DEFINITIONS).length +
                             Object.keys(TABLE_DEFINITIONS).length;

            console.log('[FullLLM] ========== Full LLM Extraction Complete ==========');
            console.log(`[FullLLM] 결과: 추출 ${stats.extracted}, 계산 ${stats.calculated}, GENERATED ${stats.generated || 0}, 실패 ${stats.failed}`);

            return {
                success: stats.extracted > 0,
                data: results,
                stats
            };
        }

        /**
         * RAW ID별 변수 그룹화 (내부 헬퍼)
         */
        _groupVariablesByRawId(CS_DEFINITIONS, PH_DEFINITIONS, TABLE_DEFINITIONS) {
            const rawIdToVars = {};
            const specialSources = ['USER_INPUT', 'CALCULATED', 'GENERATED'];

            // CS 변수
            Object.entries(CS_DEFINITIONS).forEach(([varId, def]) => {
                if (!def.rawIds) return;
                const actualRawIds = def.rawIds.filter(id => !specialSources.includes(id));
                actualRawIds.forEach(rawId => {
                    if (!rawIdToVars[rawId]) rawIdToVars[rawId] = [];
                    rawIdToVars[rawId].push({ varId, type: 'CS', def });
                });
            });

            // PH 변수
            Object.entries(PH_DEFINITIONS).forEach(([varId, def]) => {
                if (!def.rawIds) return;
                const actualRawIds = def.rawIds.filter(id => !specialSources.includes(id));
                actualRawIds.forEach(rawId => {
                    if (!rawIdToVars[rawId]) rawIdToVars[rawId] = [];
                    rawIdToVars[rawId].push({ varId, type: 'PH', def });
                });
            });

            // Table 변수
            Object.entries(TABLE_DEFINITIONS).forEach(([varId, def]) => {
                if (!def.rawIds) return;
                const actualRawIds = def.rawIds.filter(id => !specialSources.includes(id));
                actualRawIds.forEach(rawId => {
                    if (!rawIdToVars[rawId]) rawIdToVars[rawId] = [];
                    rawIdToVars[rawId].push({ varId, type: 'Table', def });
                });
            });

            return rawIdToVars;
        }

        /**
         * 단일 RAW ID에서 LLM 추출 (내부 헬퍼)
         */
        async _extractFromRawWithLLM(markdownContent, rawId, definitions, maxRetries = 2) {
            const llmClient = window.multiLLMClient;
            if (!llmClient?.generate) {
                return { success: false, error: 'LLM client not available' };
            }

            // 프롬프트 구성
            const varList = Object.entries(definitions)
                .map(([varId, def]) => `- **${varId}**: ${def.description} (${def.type || 'text'})`)
                .join('\n');

            const prompt = `## 작업: 문서에서 데이터 추출

## 원본 문서 (${rawId})
${markdownContent.substring(0, 50000)}

## 추출할 변수 목록
${varList}

## 지침
1. 위 문서에서 각 변수에 해당하는 실제 데이터를 추출하세요.
2. 표 형식 데이터는 마크다운 테이블로 반환하세요.
3. 찾을 수 없는 데이터는 "DATA_NOT_FOUND"로 표시하세요.
4. "[설명] - 필요" 같은 플레이스홀더는 절대 반환하지 마세요.
5. 날짜는 YYYY-MM-DD 형식으로 통일하세요.

## 출력 형식 (JSON만, 마크다운 코드블록 없이)
${JSON.stringify(Object.fromEntries(Object.keys(definitions).map(k => [k, "추출된 값"])), null, 2)}`;

            let lastError = null;

            for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
                try {
                    const response = await llmClient.generate(prompt, {
                        provider: 'google',
                        model: 'gemini-3-flash-preview',
                        temperature: 0.1,
                        maxTokens: 16000
                    });

                    if (response?.text) {
                        const parsed = this.parseJSONFromResponse(response.text);
                        if (parsed && Object.keys(parsed).length > 0) {
                            return { success: true, data: parsed };
                        }
                    }

                    lastError = 'JSON 파싱 실패';
                } catch (err) {
                    lastError = err.message;
                    console.warn(`[FullLLM] ${rawId} 시도 ${attempt} 실패:`, lastError);
                }

                if (attempt <= maxRetries) {
                    await this.delay(1000 * attempt);
                }
            }

            return { success: false, error: lastError };
        }

        /**
         * GENERATED 변수 생성 (전체 추출 데이터 기반)
         * PH11_총괄평가문, PH12_결론 등 전체 문서를 종합해서 LLM이 생성하는 변수
         *
         * @param {Object} extractedResults - { CS: {}, PH: {}, Table: {} }
         * @param {Object} PH_DEFINITIONS - PH 정의 객체
         * @param {Function} onProgress - 진행 콜백
         * @returns {Promise<Object>} - { PH11: "...", PH12: "..." }
         */
        async _generateDerivedContent(extractedResults, PH_DEFINITIONS, onProgress = null) {
            console.log('[FullLLM] ========== GENERATED 변수 생성 시작 ==========');

            const generatedResults = {};

            // GENERATED 변수 식별
            const generatedVars = {};
            Object.entries(PH_DEFINITIONS).forEach(([varId, def]) => {
                if (def.rawIds && def.rawIds.includes('GENERATED')) {
                    generatedVars[varId] = def;
                }
                // source: 'generated'도 체크
                if (def.source === 'generated') {
                    generatedVars[varId] = def;
                }
            });

            const generatedVarIds = Object.keys(generatedVars);
            if (generatedVarIds.length === 0) {
                console.log('[FullLLM] GENERATED 변수 없음, 건너뜀');
                return generatedResults;
            }

            console.log(`[FullLLM] GENERATED 변수 ${generatedVarIds.length}개 발견:`, generatedVarIds);

            if (onProgress) {
                onProgress({
                    phase: 'generating',
                    message: `GENERATED 변수 ${generatedVarIds.length}개 생성 중 (PH11, PH12)...`
                });
            }

            // 추출된 데이터 요약 생성 (컨텍스트용)
            const contextSummary = this._buildContextSummary(extractedResults);

            // LLM 프롬프트 구성
            const varDescriptions = generatedVarIds.map(varId => {
                const def = generatedVars[varId];
                return `- **${varId}**: ${def.description}
  지침: ${def.guideline || '전체 추출 데이터를 종합하여 작성'}
  예시: ${def.examples?.[0]?.substring(0, 200) || '없음'}...`;
            }).join('\n\n');

            const prompt = `## 작업: PSUR 종합 서술문 생성

## 역할
당신은 한국 MFDS PSUR(정기안전성보고서) 전문가입니다.
아래 추출된 데이터를 종합하여 PH11(총괄평가문)과 PH12(결론)를 작성하세요.

## 추출된 데이터 요약
${contextSummary}

## 생성해야 하는 변수
${varDescriptions}

## 작성 지침

### PH11_총괄평가문 작성 요령
1. 보고기간 동안 수집된 안전성 정보 평가결과를 종합합니다.
2. 다음 항목을 포함하세요:
   - 중대한 이상사례 검토 결과
   - 중대하지 않은 이상사례 검토 결과
   - 문헌 검토 결과
   - 신호 탐지 활동 결과 (해당 시)
3. 위해성 프로파일 변경 필요 여부를 명시하세요.

### PH12_결론 작성 요령
1. 보고기간([CS3_보고시작날짜] ~ [CS4_보고종료날짜])을 명시합니다.
2. 유익성-위해성 균형 평가 결론을 작성합니다.
3. 허가사항 변경 필요 여부 및 후속 조치 계획을 포함합니다.
4. 형식: "유익성이 위해성을 상회한다" 또는 적절한 결론

## 출력 형식 (JSON만, 코드블록 없이)
{
  "PH11_총괄평가문": "보고기간 동안 수집된 안전성 정보 평가결과는 다음과 같다. ...",
  "PH12_결론": "본 보고기간(YYYY-MM-DD ~ YYYY-MM-DD) 동안 수집된 ... 안전성 정보를 분석 평가한 결과, ..."
}

## 중요
- [CSxx_변수명] 형태의 참조는 그대로 유지하세요 (나중에 실제 값으로 치환됩니다).
- PLACEHOLDER나 "LLM 추출 필요" 같은 텍스트는 절대 포함하지 마세요.
- 실제 데이터가 없는 항목은 "해당 없음" 또는 "확인되지 않았다"로 작성하세요.`;

            try {
                const llmClient = window.multiLLMClient;
                if (!llmClient?.generate) {
                    console.error('[FullLLM] LLM client not available for GENERATED');
                    return generatedResults;
                }

                const response = await llmClient.generate(prompt, {
                    provider: 'google',
                    model: 'gemini-2.5-flash-preview-05-20',
                    temperature: 0.3,
                    maxTokens: 8000
                });

                if (response?.text) {
                    const parsed = this.parseJSONFromResponse(response.text);
                    if (parsed) {
                        Object.entries(parsed).forEach(([varId, value]) => {
                            if (value && !isPlaceholderValue(value)) {
                                generatedResults[varId] = value;
                                console.log(`[FullLLM] GENERATED 성공: ${varId} (${String(value).length}자)`);
                            }
                        });
                    }
                }
            } catch (err) {
                console.error('[FullLLM] GENERATED 생성 실패:', err.message);
            }

            console.log(`[FullLLM] GENERATED 완료: ${Object.keys(generatedResults).length}개 생성됨`);
            return generatedResults;
        }

        /**
         * 추출 데이터를 컨텍스트 요약으로 변환 (GENERATED용)
         */
        _buildContextSummary(extractedResults) {
            const lines = [];

            // CS 데이터 요약 (주요 항목)
            const keyCSVars = [
                'CS0_성분명', 'CS1_브랜드명', 'CS2_회사명',
                'CS3_보고시작날짜', 'CS4_보고종료날짜',
                'CS28_원시총환자수', 'CS29_원시총이상사례수', 'CS30_원시중대한사례수',
                'CS32_신속정기보고총사례수', 'CS33_신속정기보고중대한사례수',
                'CS35_신속정기원시총사례수', 'CS36_중대한총사례수', 'CS37_중대하지않은총사례수'
            ];

            lines.push('### CS (핵심 변수)');
            keyCSVars.forEach(varId => {
                const value = extractedResults.CS?.[varId];
                if (value && !isPlaceholderValue(String(value))) {
                    lines.push(`- ${varId}: ${value}`);
                }
            });

            // PH 데이터 요약 (GENERATED 제외)
            lines.push('\n### PH (서술문 - 요약)');
            Object.entries(extractedResults.PH || {}).forEach(([varId, value]) => {
                if (varId.startsWith('PH11') || varId.startsWith('PH12')) return; // GENERATED 제외
                if (value && !isPlaceholderValue(String(value))) {
                    const summary = String(value).substring(0, 150) + (String(value).length > 150 ? '...' : '');
                    lines.push(`- ${varId}: ${summary}`);
                }
            });

            // Table 데이터 요약
            lines.push('\n### Table (표 데이터)');
            Object.entries(extractedResults.Table || {}).forEach(([varId, value]) => {
                if (value && !isPlaceholderValue(String(value))) {
                    // 테이블은 행 수만 표시
                    const rowCount = (String(value).match(/\n/g) || []).length;
                    lines.push(`- ${varId}: ${rowCount}행 데이터`);
                }
            });

            return lines.join('\n') || '(추출된 데이터 없음)';
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
        // Placeholder 검증 유틸리티 전역 노출
        window.isPlaceholderValue = isPlaceholderValue;
        window.PLACEHOLDER_PATTERNS = PLACEHOLDER_PATTERNS;
    }

})();

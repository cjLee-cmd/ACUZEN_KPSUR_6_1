/**
 * Example Loader - 예시 파일 동적 로드 및 LLM 분류
 * js/extract/example-loader.js
 *
 * 기능:
 * - 예시 폴더 동적 스캔
 * - LLM을 사용한 파일명 → 변수 ID 분류 (1회, 캐시)
 * - 필요 시 예시 콘텐츠 lazy loading
 * - 토큰 효율적 설계
 */

(function() {
    'use strict';

    /**
     * ExampleLoader - 예시 파일 로더 클래스
     */
    class ExampleLoader {
        constructor() {
            // 캐시 키
            this.CACHE_KEY = 'kpsur_example_index';
            this.CACHE_VERSION_KEY = 'kpsur_example_index_version';

            // 예시 폴더 경로 (상대 경로 - 페이지 위치에 따라 자동 조정)
            // getter로 동적 계산
            this._baseFolderPath = '02_relateDocs/01_Transferred_Data/01_OutputExample_toMD_';

            // 메모리 캐시
            this._index = null;
            this._contentCache = {};
            this._fileList = null;

            // 초기화 상태
            this._initialized = false;
            this._initializing = false;
        }

        /**
         * 현재 페이지 위치에 따라 base path 감지
         * pages/ 폴더에서 실행 시 '../' 반환
         */
        _detectBasePath() {
            if (typeof window === 'undefined') return '';

            const pathname = window.location.pathname;
            // pages/ 폴더에서 실행되는 경우
            if (pathname.includes('/pages/')) {
                return '../';
            }
            return '';
        }

        /**
         * EXAMPLE_FOLDER getter - 동적 경로 계산
         */
        get EXAMPLE_FOLDER() {
            return this._detectBasePath() + this._baseFolderPath;
        }

        /**
         * 초기화 - 인덱스 로드 또는 생성
         */
        async initialize() {
            if (this._initialized) return true;
            if (this._initializing) {
                // 다른 초기화가 진행 중이면 대기
                while (this._initializing) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                return this._initialized;
            }

            this._initializing = true;
            console.log('[ExampleLoader] Initializing...');

            try {
                // 캐시된 인덱스 확인
                const cached = this._loadFromCache();
                if (cached) {
                    this._index = cached;
                    console.log('[ExampleLoader] Loaded index from cache');
                } else {
                    // 신규 인덱스 생성
                    await this.refreshIndex();
                }

                this._initialized = true;
                return true;
            } catch (error) {
                console.error('[ExampleLoader] Initialization failed:', error);
                this._initialized = false;
                return false;
            } finally {
                this._initializing = false;
            }
        }

        /**
         * localStorage에서 캐시 로드
         */
        _loadFromCache() {
            try {
                const cached = localStorage.getItem(this.CACHE_KEY);
                if (cached) {
                    const data = JSON.parse(cached);
                    // 버전 체크 (필요시)
                    return data;
                }
            } catch (e) {
                console.warn('[ExampleLoader] Cache load failed:', e);
            }
            return null;
        }

        /**
         * localStorage에 캐시 저장
         */
        _saveToCache(index) {
            try {
                const data = {
                    ...index,
                    cachedAt: new Date().toISOString()
                };
                localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
                console.log('[ExampleLoader] Index cached');
            } catch (e) {
                console.warn('[ExampleLoader] Cache save failed:', e);
            }
        }

        /**
         * 폴더 스캔하여 파일 목록 가져오기
         * GitHub Pages 환경에서는 직접 디렉토리 리스팅이 불가하므로
         * 대안적 방법 사용
         */
        async scanFolder() {
            console.log('[ExampleLoader] Scanning example folder...');

            // 방법 1: index.json 파일이 있으면 사용
            try {
                const indexResponse = await fetch(`${this.EXAMPLE_FOLDER}/index.json`);
                if (indexResponse.ok) {
                    const indexData = await indexResponse.json();
                    if (indexData.files && Array.isArray(indexData.files)) {
                        console.log(`[ExampleLoader] Found ${indexData.files.length} files from index.json`);
                        this._fileList = indexData.files;
                        return indexData.files;
                    }
                }
            } catch (e) {
                console.log('[ExampleLoader] No index.json, trying alternative methods...');
            }

            // 방법 2: 알려진 파일 패턴으로 탐색 (fallback)
            const knownPatterns = await this._probeKnownPatterns();
            if (knownPatterns.length > 0) {
                this._fileList = knownPatterns;
                return knownPatterns;
            }

            // 방법 3: 하드코딩된 파일 목록 사용 (최후의 fallback)
            console.warn('[ExampleLoader] Using fallback file list');
            const fallbackList = this._getFallbackFileList();
            this._fileList = fallbackList;
            return fallbackList;
        }

        /**
         * 알려진 파일 패턴으로 파일 존재 여부 탐색
         */
        async _probeKnownPatterns() {
            const patterns = [
                // CS 패턴
                'CS12_약어표_예시1.md',
                'CS17_전세계허가현황표_예시1_20251120.md',
                'CS17_전세계허가현황표_예시2_20251120.md',
                'CS18_임상노출_예시2_20251120.md',
                'CS56_별첨2참고정보변경표_예시1_20251122.md',
                'CS56_별첨2참고정보변경표_예시2_20251123.md',
                'CS56_별첨2참고정보변경표_예시3_20251122.md',
                'CS57_참고문헌리스트_예시1.md',
                'CS57_참고문헌리스트_예시2.md',
                'CS58.1._별첨1효능효과_CS58.2_별첨1용법용량_CS58.3_별첨1사용상의주의사항_예시1.md',
                'CS59_별첨3_일람표_예시1.md',
                // PH 패턴
                'PH6_개별증례분석문_예시1.md',
                'PH9_문헌에발표된안전성_예시1.md',
                'PH9_문헌에발표된안전성_예시2.md',
                'PH10_유효성관련정보_예시2.md',
                'PH_유효성.md',
                // Table 패턴
                '표2_연도별판매량및표3_연평균환자노출_예시1_20251123.md',
                '표2_연도별판매량및표3_연평균환자노출_예시2_20251123.md',
                '표5_신속보고내역_예시1.md',
                '표6_정기보고내역_예시1.md',
                '표7_원시자료내역_예시1.md',
                '표8_모든이상사례건수_예시1.md',
                '표9_SOC별건수_예시1.md'
            ];

            const existingFiles = [];

            // 병렬로 파일 존재 여부 확인 (최대 5개씩)
            const chunkSize = 5;
            for (let i = 0; i < patterns.length; i += chunkSize) {
                const chunk = patterns.slice(i, i + chunkSize);
                const results = await Promise.all(
                    chunk.map(async (filename) => {
                        try {
                            const response = await fetch(`${this.EXAMPLE_FOLDER}/${filename}`, { method: 'HEAD' });
                            return response.ok ? filename : null;
                        } catch {
                            return null;
                        }
                    })
                );
                existingFiles.push(...results.filter(f => f !== null));
            }

            console.log(`[ExampleLoader] Probed ${existingFiles.length} existing files`);
            return existingFiles;
        }

        /**
         * Fallback 파일 목록 (최후의 수단)
         */
        _getFallbackFileList() {
            return [
                'CS12_약어표_예시1.md',
                'CS17_전세계허가현황표_예시1_20251120.md',
                'CS17_전세계허가현황표_예시2_20251120.md',
                'CS18_임상노출_예시2_20251120.md',
                'CS56_별첨2참고정보변경표_예시1_20251122.md',
                'CS56_별첨2참고정보변경표_예시2_20251123.md',
                'CS56_별첨2참고정보변경표_예시3_20251122.md',
                'CS57_참고문헌리스트_예시1.md',
                'CS57_참고문헌리스트_예시2.md',
                'CS58.1._별첨1효능효과_CS58.2_별첨1용법용량_CS58.3_별첨1사용상의주의사항_예시1.md',
                'CS59_별첨3_일람표_예시1.md',
                'PH6_개별증례분석문_예시1.md',
                'PH9_문헌에발표된안전성_예시1.md',
                'PH9_문헌에발표된안전성_예시2.md',
                'PH10_유효성관련정보_예시2.md',
                'PH_유효성.md',
                '표2_연도별판매량및표3_연평균환자노출_예시1_20251123.md',
                '표2_연도별판매량및표3_연평균환자노출_예시2_20251123.md',
                '표5_신속보고내역_예시1.md',
                '표6_정기보고내역_예시1.md',
                '표7_원시자료내역_예시1.md',
                '표8_모든이상사례건수_예시1.md',
                '표9_SOC별건수_예시1.md'
            ];
        }

        /**
         * LLM으로 파일명 → 변수 ID 분류
         * 토큰 효율적: 파일명만 전달 (~500 토큰)
         */
        async classifyFilesWithLLM(fileNames) {
            console.log('[ExampleLoader] Classifying files with LLM...');

            const llmClient = window.llmClient || window.multiLLMClient;
            if (!llmClient) {
                console.warn('[ExampleLoader] LLM client not available, using regex fallback');
                return this._classifyWithRegex(fileNames);
            }

            const prompt = this._buildClassificationPrompt(fileNames);

            try {
                const result = await llmClient.generate(prompt, {
                    provider: 'google',
                    model: 'gemini-2.0-flash'
                });

                if (result.success && result.text) {
                    const parsed = this._parseClassificationResponse(result.text);
                    if (parsed && Object.keys(parsed).length > 0) {
                        console.log(`[ExampleLoader] LLM classified ${Object.keys(parsed).length} variable IDs`);
                        return parsed;
                    }
                }

                // LLM 실패 시 regex fallback
                console.warn('[ExampleLoader] LLM classification failed, using regex fallback');
                return this._classifyWithRegex(fileNames);

            } catch (error) {
                console.error('[ExampleLoader] LLM classification error:', error);
                return this._classifyWithRegex(fileNames);
            }
        }

        /**
         * 분류 프롬프트 생성 (토큰 효율적)
         */
        _buildClassificationPrompt(fileNames) {
            return `다음 파일명들을 KPSUR 변수 ID로 분류하세요.

## 파일 목록
${fileNames.map(f => `- ${f}`).join('\n')}

## 분류 규칙
- CS로 시작하는 파일: CS 변수 (예: CS12_약어표 → "CS12_약어표")
- PH로 시작하는 파일: PH 변수 (예: PH6_개별증례분석문 → "PH6_개별증례분석문")
- 표로 시작하는 파일: Table 변수 (예: 표9_SOC별건수 → "표9_SOC별건수")
- 복합 변수 (CS58.1, CS58.2 등): 개별 분리
- _예시N, _YYYYMMDD 등의 접미사는 제거

## 출력 형식
JSON으로 반환 (변수 ID → 파일명 배열):
\`\`\`json
{
  "CS12_약어표": ["CS12_약어표_예시1.md"],
  "표2_연도별판매량": ["표2_연도별판매량및표3_연평균환자노출_예시1_20251123.md", "표2_연도별판매량및표3_연평균환자노출_예시2_20251123.md"],
  "표3_연평균환자노출": ["표2_연도별판매량및표3_연평균환자노출_예시1_20251123.md", "표2_연도별판매량및표3_연평균환자노출_예시2_20251123.md"]
}
\`\`\``;
        }

        /**
         * LLM 응답에서 JSON 파싱
         */
        _parseClassificationResponse(text) {
            if (!text) return null;

            // JSON 코드블록 찾기
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[1]);
                } catch (e) {
                    console.warn('[ExampleLoader] JSON parse error from code block');
                }
            }

            // 직접 JSON 파싱
            try {
                const cleanText = text.trim();
                const jsonStart = cleanText.indexOf('{');
                const jsonEnd = cleanText.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    return JSON.parse(cleanText.substring(jsonStart, jsonEnd + 1));
                }
            } catch (e) {
                console.warn('[ExampleLoader] Direct JSON parse failed');
            }

            return null;
        }

        /**
         * Regex 기반 분류 (LLM 없을 때 fallback)
         */
        _classifyWithRegex(fileNames) {
            console.log('[ExampleLoader] Classifying with regex fallback...');
            const index = {};

            fileNames.forEach(filename => {
                // CS 패턴: CS{N}_{한글}
                const csMatch = filename.match(/^(CS\d+(?:\.\d+)?_[^_]+)/);
                if (csMatch) {
                    const varId = csMatch[1];
                    if (!index[varId]) index[varId] = [];
                    index[varId].push(filename);
                    return;
                }

                // PH 패턴: PH{N}_{한글} 또는 PH_{한글}
                const phMatch = filename.match(/^(PH\d*_?[^_]+)/);
                if (phMatch) {
                    const varId = phMatch[1];
                    if (!index[varId]) index[varId] = [];
                    index[varId].push(filename);
                    return;
                }

                // Table 패턴: 표{N}_{한글}
                const tableMatch = filename.match(/^(표\d+_[^_]+)/);
                if (tableMatch) {
                    const varId = tableMatch[1];
                    if (!index[varId]) index[varId] = [];
                    index[varId].push(filename);

                    // 복합 표 처리 (표2 및 표3 등)
                    if (filename.includes('및')) {
                        const subMatches = filename.match(/표\d+/g);
                        if (subMatches && subMatches.length > 1) {
                            subMatches.forEach(subMatch => {
                                const subVarId = `${subMatch}_연관데이터`;
                                if (!index[subVarId]) index[subVarId] = [];
                                if (!index[subVarId].includes(filename)) {
                                    index[subVarId].push(filename);
                                }
                            });
                        }
                    }
                    return;
                }
            });

            return index;
        }

        /**
         * 인덱스 갱신 (폴더 스캔 + LLM 분류)
         */
        async refreshIndex() {
            console.log('[ExampleLoader] Refreshing index...');

            // 폴더 스캔
            const fileNames = await this.scanFolder();

            if (fileNames.length === 0) {
                console.warn('[ExampleLoader] No files found in example folder');
                this._index = { mapping: {}, files: [], refreshedAt: new Date().toISOString() };
                return this._index;
            }

            // LLM 분류
            const mapping = await this.classifyFilesWithLLM(fileNames);

            // 인덱스 생성
            this._index = {
                mapping: mapping,
                files: fileNames,
                refreshedAt: new Date().toISOString()
            };

            // 캐시 저장
            this._saveToCache(this._index);

            console.log(`[ExampleLoader] Index refreshed: ${Object.keys(mapping).length} variable IDs mapped`);
            return this._index;
        }

        /**
         * 캐시된 인덱스 가져오기
         */
        async getIndex() {
            if (!this._initialized) {
                await this.initialize();
            }
            return this._index;
        }

        /**
         * 특정 변수 ID의 예시 파일 목록 가져오기
         */
        async getExampleFiles(variableId) {
            const index = await this.getIndex();
            if (!index || !index.mapping) return [];

            return index.mapping[variableId] || [];
        }

        /**
         * 특정 변수의 예시 콘텐츠 로드 (lazy loading)
         */
        async loadExamples(variableId) {
            const files = await this.getExampleFiles(variableId);

            if (files.length === 0) {
                console.log(`[ExampleLoader] No examples found for: ${variableId}`);
                return [];
            }

            const examples = [];

            for (const filename of files) {
                // 메모리 캐시 확인
                if (this._contentCache[filename]) {
                    examples.push({
                        filename: filename,
                        content: this._contentCache[filename]
                    });
                    continue;
                }

                // 파일 로드
                try {
                    const response = await fetch(`${this.EXAMPLE_FOLDER}/${filename}`);
                    if (response.ok) {
                        const content = await response.text();
                        this._contentCache[filename] = content;
                        examples.push({
                            filename: filename,
                            content: content
                        });
                    }
                } catch (e) {
                    console.warn(`[ExampleLoader] Failed to load: ${filename}`, e);
                }
            }

            console.log(`[ExampleLoader] Loaded ${examples.length} examples for: ${variableId}`);
            return examples;
        }

        /**
         * 프롬프트용 예시 형식화
         */
        async formatExamplesForPrompt(variableId, maxExamples = 2) {
            const examples = await this.loadExamples(variableId);

            if (examples.length === 0) {
                return '';
            }

            // 최대 예시 수 제한
            const selectedExamples = examples.slice(0, maxExamples);

            let formatted = `\n## 참고 예시 (${variableId})\n`;
            formatted += `다음은 ${variableId}의 올바른 출력 형식 예시입니다. 이 형식을 참고하여 작성하세요.\n\n`;

            selectedExamples.forEach((example, idx) => {
                formatted += `### 예시 ${idx + 1}: ${example.filename}\n`;
                formatted += `\`\`\`markdown\n${example.content}\n\`\`\`\n\n`;
            });

            return formatted;
        }

        /**
         * 변수 ID가 예시를 가지고 있는지 확인
         */
        async hasExamples(variableId) {
            const files = await this.getExampleFiles(variableId);
            return files.length > 0;
        }

        /**
         * 모든 분류된 변수 ID 목록
         */
        async getAvailableVariableIds() {
            const index = await this.getIndex();
            if (!index || !index.mapping) return [];
            return Object.keys(index.mapping);
        }

        /**
         * 캐시 클리어
         */
        clearCache() {
            this._index = null;
            this._contentCache = {};
            this._fileList = null;
            this._initialized = false;
            localStorage.removeItem(this.CACHE_KEY);
            console.log('[ExampleLoader] Cache cleared');
        }

        /**
         * 상태 정보
         */
        getStatus() {
            return {
                initialized: this._initialized,
                indexLoaded: !!this._index,
                variableCount: this._index ? Object.keys(this._index.mapping || {}).length : 0,
                fileCount: this._index ? (this._index.files || []).length : 0,
                contentCacheCount: Object.keys(this._contentCache).length,
                cachedAt: this._index ? this._index.cachedAt : null
            };
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.ExampleLoader = ExampleLoader;
        window.exampleLoader = new ExampleLoader();
        console.log('✅ ExampleLoader module loaded');
    }

})();

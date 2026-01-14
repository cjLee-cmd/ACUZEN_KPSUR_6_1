/**
 * Extract Line Listing - Line Listing 데이터 분석
 * js/extract/extract-linelisting.js
 *
 * RAW12-15 Line Listing 파일 분석 전문 모듈
 * - Seriousness 평가 (WHO 6기준)
 * - Causality 매핑
 * - SOC 추출
 * - 보고서 마크다운 생성
 */

(function() {
    'use strict';

    // Line Listing RAW ID 정의
    const LINE_LISTING_RAW_IDS = {
        RAW12: { name: '국외신속보고LineListing', type: 'expedited', region: 'foreign' },
        RAW13: { name: '국내신속보고LineListing', type: 'expedited', region: 'domestic' },
        RAW14: { name: '원시자료LineListing', type: 'raw', region: 'all' },
        RAW15: { name: '정기보고LineListing', type: 'periodic', region: 'all' }
    };

    // 시트명 정의 (원본 linelisting_SW와 동일)
    const SHEETS = {
        AE: '이상사례',
        CAUS: '인과성평가'
    };

    // WHO Seriousness 기준 6가지
    const SERIOUSNESS_CRITERIA = [
        '사망',
        '생명위협',
        '입원',
        '입원기간연장',
        '영구장애',
        '선천성기형',
        '기타중대한결과'
    ];

    // WHO-UMC Causality 스케일
    const CAUSALITY_SCALE = {
        'Certain': { level: 'HIGH', score: 5 },
        'Probable/Likely': { level: 'HIGH', score: 4 },
        'Possible': { level: 'MEDIUM', score: 3 },
        'Unlikely': { level: 'LOW', score: 2 },
        'Conditional/Unclassified': { level: 'UNKNOWN', score: 1 },
        'Unassessable/Unclassifiable': { level: 'UNKNOWN', score: 0 }
    };

    /**
     * ExtractLineListings - Line Listing 데이터 분석 클래스
     */
    class ExtractLineListings {
        constructor() {
            this.processedData = [];
            this.reportMarkdown = null;
            this.statistics = {
                total: 0,
                seriousYes: 0,
                seriousNo: 0,
                certainProbable: 0,
                processed: 0,
                bySOC: {},
                byCausality: {}
            };
        }

        /**
         * Line Listing RAW ID인지 확인
         */
        isLineListingRawId(rawId) {
            return ['RAW12', 'RAW13', 'RAW14', 'RAW15'].includes(rawId);
        }

        /**
         * RAW ID 정보 가져오기
         */
        getRawIdInfo(rawId) {
            return LINE_LISTING_RAW_IDS[rawId] || null;
        }

        /**
         * localStorage에서 Line Listing 파일 가져오기
         */
        getLineListingFilesFromStorage() {
            const uploadedFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
            const convertedMarkdowns = JSON.parse(localStorage.getItem('convertedMarkdowns') || '{}');

            // Line Listing 파일 필터링 및 변환
            const lineListingFiles = uploadedFiles.filter(file =>
                this.isLineListingRawId(file.assignedRawId || file.rawId)
            ).map(file => {
                // P14에서 fileName으로 저장되므로 fileName 우선 사용
                // 다양한 속성명 fallback 처리
                const rawId = file.assignedRawId || file.rawId;
                let fileName = file.fileName || file.name || file.originalName;

                // 파일명이 없는 경우 마크다운 키에서 찾기 시도
                if (!fileName && rawId) {
                    const markdownKeys = Object.keys(convertedMarkdowns);
                    const matchingKey = markdownKeys.find(key =>
                        key && key.toUpperCase().includes(rawId.toUpperCase())
                    );
                    if (matchingKey) {
                        fileName = matchingKey;
                        console.log(`[LineListingExtractor] 마크다운 키에서 파일명 복원: ${fileName}`);
                    }
                }

                // 그래도 없으면 RAW ID로 임시 파일명 생성
                if (!fileName && rawId) {
                    fileName = `${rawId}_file.xlsx`;
                    console.warn(`[LineListingExtractor] 파일명 누락, 임시 생성: ${fileName}`);
                }

                return {
                    name: fileName,
                    rawId: rawId,
                    hasMarkdown: fileName ? !!convertedMarkdowns[fileName] : false,
                    markdownContent: fileName ? (convertedMarkdowns[fileName] || null) : null,
                    originalFile: file
                };
            });

            // 유효한 파일만 반환 (이름이 있는 파일)
            const validFiles = lineListingFiles.filter(f => f.name);

            if (lineListingFiles.length > validFiles.length) {
                console.warn(`[LineListingExtractor] ${lineListingFiles.length - validFiles.length}개 파일의 이름을 찾을 수 없습니다.`);
            }

            return validFiles;
        }

        /**
         * 마크다운 테이블에서 JSON 데이터 파싱
         * @returns {Object} { aeData: [], causData: [] }
         */
        parseMarkdownTable(markdownContent) {
            if (!markdownContent) {
                return { aeData: [], causData: [] };
            }

            const lines = markdownContent.trim().split('\n');
            const allData = [];
            const tables = [];

            // 여러 테이블을 파싱
            let tableStart = -1;
            let headers = [];
            let currentTable = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // 테이블 행 감지
                if (line.startsWith('|') && line.endsWith('|')) {
                    if (line.includes('---')) {
                        // 구분선 - 헤더 이후 시작
                        continue;
                    }

                    if (tableStart === -1) {
                        // 헤더 행
                        headers = line.split('|')
                            .filter(cell => cell.trim())
                            .map(cell => cell.trim());
                        tableStart = i;
                        currentTable = [];
                    } else {
                        // 데이터 행
                        const cells = line.split('|')
                            .filter(cell => cell.trim())
                            .map(cell => cell.trim());

                        if (cells.length > 0) {
                            const row = {};
                            headers.forEach((header, idx) => {
                                row[header] = cells[idx] || '';
                            });
                            currentTable.push(row);
                        }
                    }
                } else if (tableStart !== -1 && currentTable.length > 0) {
                    // 테이블 종료
                    tables.push({ headers, data: currentTable });
                    tableStart = -1;
                    headers = [];
                    currentTable = [];
                }
            }

            // 마지막 테이블 추가
            if (currentTable.length > 0) {
                tables.push({ headers, data: currentTable });
            }

            // 이상사례/인과성 테이블 구분
            let aeData = [];
            let causData = [];

            for (const table of tables) {
                const headerStr = table.headers.join(' ').toLowerCase();

                // G.k로만 구성된 테이블은 Drug-Reaction linkage 정보이므로 제외
                // (G.k.1, G.k.2.2, G.k.9.i.* 등은 보조 정보)
                const isGkOnlyTable = table.headers.every(h =>
                    h.startsWith('G.k') || h.trim() === ''
                );

                if (isGkOnlyTable) {
                    // G.k 전용 테이블은 건너뜀 (PT/SOC 정보 없음)
                    continue;
                }

                if (headerStr.includes('인과성') || headerStr.includes('causality')) {
                    causData = causData.concat(table.data);
                } else {
                    aeData = aeData.concat(table.data);
                }
            }

            return { aeData, causData };
        }

        /**
         * Excel ArrayBuffer에서 직접 파싱 (XLSX.js 사용)
         */
        parseExcelBuffer(arrayBuffer) {
            if (!window.XLSX) {
                throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');
            }

            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });

            const result = {
                aeData: [],
                causData: [],
                sheetNames: workbook.SheetNames
            };

            // 이상사례 시트 파싱
            if (workbook.SheetNames.includes(SHEETS.AE)) {
                result.aeData = XLSX.utils.sheet_to_json(workbook.Sheets[SHEETS.AE]);
            }

            // 인과성평가 시트 파싱
            if (workbook.SheetNames.includes(SHEETS.CAUS)) {
                result.causData = XLSX.utils.sheet_to_json(workbook.Sheets[SHEETS.CAUS]);
            }

            return result;
        }

        /**
         * LLM을 사용한 데이터 분석 (Seriousness, Causality, SOC 평가)
         * @param {Array} aeData - 이상사례 데이터
         * @param {Array} causData - 인과성평가 데이터
         * @param {Object} options - LLM 옵션
         * @param {Function} onProgress - 진행 상황 콜백 ({ current, total, status })
         */
        async analyzeWithLLM(aeData, causData, options = {}, onProgress = null) {
            if (!window.multiLLMClient) {
                throw new Error('multiLLMClient가 로드되지 않았습니다.');
            }

            const provider = options.provider || 'google';
            const model = options.model || 'gemini-3-flash-preview';
            const temperature = options.temperature || 0.2;
            const BATCH_SIZE = 30; // 배치당 처리할 데이터 수

            // 초기화
            this.statistics.total = aeData.length;
            this.statistics.processed = 0;

            if (onProgress) {
                onProgress({ current: 0, total: aeData.length, status: 'LLM 분석 시작...' });
            }

            // 배치로 분할
            const batches = [];
            for (let i = 0; i < aeData.length; i += BATCH_SIZE) {
                batches.push(aeData.slice(i, i + BATCH_SIZE));
            }

            console.log(`[LineListing] 총 ${aeData.length}건을 ${batches.length}개 배치로 분할 (배치당 ${BATCH_SIZE}건)`);

            // 배치별 처리 결과 저장
            const allProcessedData = [];
            let totalUsage = { inputTokens: 0, outputTokens: 0 };
            let totalCost = 0;

            // 배치별 처리
            for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
                const batch = batches[batchIdx];
                const batchStart = batchIdx * BATCH_SIZE;
                const batchEnd = Math.min(batchStart + batch.length, aeData.length);

                if (onProgress) {
                    onProgress({
                        current: batchStart,
                        total: aeData.length,
                        status: `배치 ${batchIdx + 1}/${batches.length} 처리 중... (${batchStart + 1}-${batchEnd}건)`
                    });
                }

                // 배치용 프롬프트 구성
                const prompt = this.buildBatchAnalysisPrompt(batch, causData, batchIdx + 1, batches.length);

                // LLM 호출
                const result = await window.multiLLMClient.generate(prompt, {
                    provider,
                    model,
                    temperature,
                    maxTokens: 16384
                });

                if (!result.success) {
                    console.error(`[LineListing] 배치 ${batchIdx + 1} 실패:`, result.error);
                    throw new Error(`배치 ${batchIdx + 1} LLM 응답 실패: ` + (result.error || 'Unknown error'));
                }

                // JSON 응답 파싱
                const parsedResult = this.parseJsonResponse(result.text);

                if (!parsedResult.processed_data || !Array.isArray(parsedResult.processed_data)) {
                    console.error(`[LineListing] 배치 ${batchIdx + 1} 응답 형식 오류`);
                    throw new Error(`배치 ${batchIdx + 1} 응답 형식이 올바르지 않습니다.`);
                }

                // 결과 병합
                allProcessedData.push(...parsedResult.processed_data);

                // 사용량 누적
                if (result.usage) {
                    totalUsage.inputTokens += result.usage.inputTokens || 0;
                    totalUsage.outputTokens += result.usage.outputTokens || 0;
                }
                if (result.cost) {
                    totalCost += result.cost;
                }

                console.log(`[LineListing] 배치 ${batchIdx + 1}/${batches.length} 완료 (${parsedResult.processed_data.length}건 처리)`);
            }

            if (onProgress) {
                onProgress({ current: aeData.length, total: aeData.length, status: '보고서 생성 중...' });
            }

            // 최종 보고서 생성 (처리된 전체 데이터 기반)
            this.processedData = allProcessedData;
            this.reportMarkdown = this.generateReportFromProcessedData(allProcessedData);
            this.updateStatistics();

            if (onProgress) {
                onProgress({ current: aeData.length, total: aeData.length, status: '분석 완료!' });
            }

            return {
                success: true,
                processedCount: this.processedData.length,
                processedData: this.processedData,
                reportMarkdown: this.reportMarkdown,
                statistics: this.statistics,
                llmUsage: totalUsage,
                llmCost: totalCost
            };
        }

        /**
         * 배치용 분석 프롬프트 생성
         */
        buildBatchAnalysisPrompt(batchData, causData, batchNum, totalBatches) {
            const aeString = JSON.stringify(batchData, null, 2);
            const causString = JSON.stringify(causData, null, 2);

            return `당신은 제약회사 약물감시팀 팀장입니다. 이상사례 데이터를 분석하여 Seriousness, 인과성평가, SOC를 판정합니다.

[배치 정보] ${batchNum}/${totalBatches} (${batchData.length}건)

[데이터]
1. 이상사례 데이터 (AE): ${aeString}
2. 인과성평가 데이터 (Causality): ${causString}

[처리 규칙]
1. 'Seriousness': 사망, 생명위협, 입원, 입원기간연장, 영구장애, 선천성기형, 기타중대한결과 중 하나라도 해당되면 "Yes", 아니면 "No"
2. '인과성평가': 인과성평가 데이터에서 매칭되는 결과 (Certain, Probable, Possible, Unlikely, Unrelated 등)
3. 'SOC': MedDRA PT에 해당하는 상위 SOC(System Organ Class) 영문 명칭

[출력 형식]
마크다운 코드블럭 없이 순수 JSON만 출력하십시오.
{
  "processed_data": [
    { "원본데이터필드들": "...", "Seriousness": "Yes/No", "인과성평가": "Possible", "SOC": "Nervous system disorders" },
    ...
  ]
}`;
        }

        /**
         * 처리된 데이터로부터 보고서 마크다운 생성
         */
        generateReportFromProcessedData(processedData) {
            // SOC별 통계 집계
            const socStats = {};

            processedData.forEach(item => {
                const soc = item.SOC || 'Unknown';
                const pt = item['E.i.3.2c'] || item['E.i.3.2d'] || item['이상사례·약물이상반응 MedDRA명'] || item['PT'] || 'Unknown';
                const isSerious = item.Seriousness === 'Yes';
                const causality = item['인과성평가'] || '';
                const isADR = ['Certain', 'Probable', 'Possible'].some(c => causality.includes(c));

                if (!socStats[soc]) {
                    socStats[soc] = { pts: {}, totals: { seriousAE: 0, seriousADR: 0, nonSeriousAE: 0, nonSeriousADR: 0 } };
                }
                if (!socStats[soc].pts[pt]) {
                    socStats[soc].pts[pt] = { seriousAE: 0, seriousADR: 0, nonSeriousAE: 0, nonSeriousADR: 0 };
                }

                if (isSerious) {
                    socStats[soc].pts[pt].seriousAE++;
                    socStats[soc].totals.seriousAE++;
                    if (isADR) {
                        socStats[soc].pts[pt].seriousADR++;
                        socStats[soc].totals.seriousADR++;
                    }
                } else {
                    socStats[soc].pts[pt].nonSeriousAE++;
                    socStats[soc].totals.nonSeriousAE++;
                    if (isADR) {
                        socStats[soc].pts[pt].nonSeriousADR++;
                        socStats[soc].totals.nonSeriousADR++;
                    }
                }
            });

            // 마크다운 테이블 생성
            let md = `# [별첨 1] 개별증례 Line Listing\n\n`;
            md += `| 구분 (SOC / PT) | 중대한 이상사례 (건수) | 중대한 약물이상반응 (건수) | 중대하지 않은 이상사례 (건수) | 중대하지 않은 약물이상반응 (건수) | 총-이상사례 (건수) | 총-약물이상반응 (건수) |\n`;
            md += `|---|---|---|---|---|---|---|\n`;

            let grandTotal = { seriousAE: 0, seriousADR: 0, nonSeriousAE: 0, nonSeriousADR: 0 };

            Object.keys(socStats).sort().forEach(soc => {
                const stats = socStats[soc];
                const totalAE = stats.totals.seriousAE + stats.totals.nonSeriousAE;
                const totalADR = stats.totals.seriousADR + stats.totals.nonSeriousADR;

                md += `| **${soc}** | ${stats.totals.seriousAE} | ${stats.totals.seriousADR} | ${stats.totals.nonSeriousAE} | ${stats.totals.nonSeriousADR} | ${totalAE} | ${totalADR} |\n`;

                Object.keys(stats.pts).sort().forEach(pt => {
                    const ptStats = stats.pts[pt];
                    const ptTotalAE = ptStats.seriousAE + ptStats.nonSeriousAE;
                    const ptTotalADR = ptStats.seriousADR + ptStats.nonSeriousADR;
                    md += `| &nbsp;&nbsp; ${pt} | ${ptStats.seriousAE} | ${ptStats.seriousADR} | ${ptStats.nonSeriousAE} | ${ptStats.nonSeriousADR} | ${ptTotalAE} | ${ptTotalADR} |\n`;
                });

                grandTotal.seriousAE += stats.totals.seriousAE;
                grandTotal.seriousADR += stats.totals.seriousADR;
                grandTotal.nonSeriousAE += stats.totals.nonSeriousAE;
                grandTotal.nonSeriousADR += stats.totals.nonSeriousADR;
            });

            const grandTotalAE = grandTotal.seriousAE + grandTotal.nonSeriousAE;
            const grandTotalADR = grandTotal.seriousADR + grandTotal.nonSeriousADR;
            md += `| **총계** | ${grandTotal.seriousAE} | ${grandTotal.seriousADR} | ${grandTotal.nonSeriousAE} | ${grandTotal.nonSeriousADR} | ${grandTotalAE} | ${grandTotalADR} |\n`;

            return md;
        }

        /**
         * 분석 프롬프트 생성
         */
        buildAnalysisPrompt(aeData, causData) {
            const aeString = JSON.stringify(aeData, null, 2);
            const causString = JSON.stringify(causData, null, 2);

            return `당신은 제약회사 약물감시팀 팀장입니다. 주어진 데이터를 바탕으로 **데이터 처리**와 **보고서 작성**을 동시에 수행해야 합니다.

[작업 목표]
제공된 '이상사례'(AE)와 '인과성평가'(Causality) 데이터를 분석하여, 아래 두 가지 결과를 포함한 하나의 JSON 객체를 반환하십시오.

[데이터 설명]
1. 이상사례 데이터 (AE): ${aeString}
2. 인과성평가 데이터 (Causality): ${causString}

[처리 규칙 1: 데이터 변환 (processed_data)]
1. '이상사례' 데이터를 기준으로 'Seriousness', '인과성평가', 'SOC' 3개 컬럼을 추가하십시오.
2. **Seriousness**: 6가지 기준(사망, 생명위협, 입원, 입원기간연장, 영구장애, 선천성기형, 기타중대한결과) 중 하나라도 해당되면 "Yes", 아니면 "No".
3. **인과성평가**: '인과성평가' 데이터에서 매칭되는 결과를 찾아 입력. (Certain, Probable, Possible, Unlikely, Unrelated 등)
4. **SOC**: '이상사례·약물이상반응 MedDRA명'의 PT에 해당하는 상위 SOC(System Organ Class) 영문 명칭을 기재.

[처리 규칙 2: 보고서 작성 (report_md)]
1. 처리된 데이터를 바탕으로 아래 **[보고서 양식 예시]**와 똑같은 구조의 마크다운 보고서를 작성하십시오.
2. **[보고서 양식 예시]**:
   # [별첨 1] 개별증례 Line Listing
   | 구분 (SOC / PT) | 중대한 이상사례 (환자수/건수) | 중대한 약물이상반응 (환자수/건수) | 중대하지 않은 이상사례 (환자수/건수) | 중대하지 않은 약물이상반응 (환자수/건수) | 총-이상사례 (환자수/건수) | 총-약물이상반응 (환자수/건수) |
   |---|---|---|---|---|---|---|
   | **Blood and lymphatic system disorders** | 14/22 | 11/19 | 14/14 | 11/11 | 28/36 | 22/30 |
   | &nbsp;&nbsp; Anaemia | 3/5 | 2/4 | 3/3 | 2/2 | 6/8 | 4/6 |
   | **Cardiac disorders** | 24/28 | 21/25 | 24/24 | 21/21 | 48/52 | 42/46 |
   | &nbsp;&nbsp; Atrial fibrillation | 7/11 | 6/10 | 7/7 | 6/6 | 14/18 | 12/16 |
   | ... (데이터 나열) ... | ... | ... | ... | ... | ... | ... |
   | **총계** | 40/40 | 30/30 | 40/40 | 30/30 | 80/80 | 60/60 |

3. **필수 규칙**:
   - 마지막 행에 모든 SOC 데이터를 합산한 **'총계'** 행을 반드시 포함하십시오.
   - SOC 행은 **굵게**, PT 행은 '&nbsp;&nbsp;'로 들여쓰기하십시오.
   - 모든 셀은 '환자수/건수' (예: '2/3') 형식으로 기재하십시오.

[출력 형식]
반드시 아래 JSON 구조를 엄수하십시오. 마크다운 코드블럭 없이 순수 JSON만 출력하십시오.
{
  "report_md": "위 양식에 맞춘 마크다운 문자열...",
  "processed_data": [ ... 처리된 데이터 객체 배열 ... ]
}`;
        }

        /**
         * JSON 응답 파싱 (마크다운 코드블럭 제거 + 불완전한 JSON 복구)
         */
        parseJsonResponse(responseText) {
            // 마크다운 코드블럭 제거
            let cleanText = responseText
                .replace(/```json/gi, '')
                .replace(/```/g, '')
                .trim();

            // JSON 범위 찾기
            const startIdx = cleanText.indexOf('{');
            let endIdx = cleanText.lastIndexOf('}');

            if (startIdx === -1) {
                throw new Error('JSON 형식을 찾을 수 없습니다.');
            }

            // } 가 없으면 불완전한 JSON - 복구 시도
            if (endIdx === -1 || endIdx < startIdx) {
                console.warn('[parseJsonResponse] 불완전한 JSON 감지, 복구 시도...');
                cleanText = cleanText.substring(startIdx);
                cleanText = this.repairIncompleteJson(cleanText);
            } else {
                cleanText = cleanText.substring(startIdx, endIdx + 1);
            }

            // 1차 파싱 시도
            try {
                return JSON.parse(cleanText);
            } catch (e) {
                console.warn('[parseJsonResponse] 1차 파싱 실패, 복구 시도...', e.message);
            }

            // 2차: 불완전한 JSON 복구 시도
            try {
                const repairedJson = this.repairIncompleteJson(cleanText);
                return JSON.parse(repairedJson);
            } catch (e) {
                console.warn('[parseJsonResponse] 2차 파싱 실패, processed_data 추출 시도...', e.message);
            }

            // 3차: processed_data 배열만 추출 시도
            try {
                const processedData = this.extractProcessedDataArray(cleanText);
                if (processedData && processedData.length > 0) {
                    console.log(`[parseJsonResponse] processed_data ${processedData.length}건 추출 성공`);
                    return { processed_data: processedData };
                }
            } catch (e) {
                console.error('[parseJsonResponse] processed_data 추출 실패:', e.message);
            }

            throw new Error('JSON 파싱 실패: 복구할 수 없는 형식입니다.');
        }

        /**
         * 불완전한 JSON 복구
         */
        repairIncompleteJson(jsonStr) {
            let repaired = jsonStr;

            // 트레일링 콤마 제거
            repaired = repaired.replace(/,\s*([}\]])/g, '$1');

            // 불완전한 문자열 닫기 (열린 따옴표 찾기)
            const lastQuoteIdx = repaired.lastIndexOf('"');
            if (lastQuoteIdx > 0) {
                const beforeQuote = repaired.substring(0, lastQuoteIdx);
                const quoteCount = (beforeQuote.match(/(?<!\\)"/g) || []).length;
                if (quoteCount % 2 === 0) {
                    // 짝수 = 마지막 따옴표가 문자열 시작, 닫아야 함
                    // 불완전한 객체일 가능성 - 해당 객체 제거
                    const lastCompleteObjEnd = repaired.lastIndexOf('},');
                    if (lastCompleteObjEnd > 0) {
                        repaired = repaired.substring(0, lastCompleteObjEnd + 1);
                    }
                }
            }

            // 괄호 균형 맞추기
            const openBraces = (repaired.match(/{/g) || []).length;
            const closeBraces = (repaired.match(/}/g) || []).length;
            const openBrackets = (repaired.match(/\[/g) || []).length;
            const closeBrackets = (repaired.match(/]/g) || []).length;

            // 트레일링 콤마 다시 제거 (객체 제거 후)
            repaired = repaired.replace(/,\s*$/g, '');

            // 닫는 괄호 추가
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
                repaired += ']';
            }
            for (let i = 0; i < openBraces - closeBraces; i++) {
                repaired += '}';
            }

            return repaired;
        }

        /**
         * processed_data 배열만 추출
         */
        extractProcessedDataArray(jsonStr) {
            // "processed_data": [ ... ] 패턴 찾기
            const match = jsonStr.match(/"processed_data"\s*:\s*\[/);
            if (!match) {
                return null;
            }

            const startIdx = match.index + match[0].length - 1; // '[' 위치
            let depth = 0;
            let endIdx = -1;

            for (let i = startIdx; i < jsonStr.length; i++) {
                if (jsonStr[i] === '[') depth++;
                else if (jsonStr[i] === ']') {
                    depth--;
                    if (depth === 0) {
                        endIdx = i;
                        break;
                    }
                }
            }

            let arrayStr;
            if (endIdx === -1) {
                // 배열이 완전하지 않음 - 마지막 완전한 객체까지 추출
                arrayStr = jsonStr.substring(startIdx);
                const lastCompleteObj = arrayStr.lastIndexOf('},');
                if (lastCompleteObj > 0) {
                    arrayStr = arrayStr.substring(0, lastCompleteObj + 1) + ']';
                } else {
                    // 단일 객체도 없으면 실패
                    return null;
                }
            } else {
                arrayStr = jsonStr.substring(startIdx, endIdx + 1);
            }

            // 트레일링 콤마 제거 후 파싱
            arrayStr = arrayStr.replace(/,\s*]/g, ']');
            return JSON.parse(arrayStr);
        }

        /**
         * 통계 업데이트
         */
        updateStatistics() {
            if (!this.processedData || !Array.isArray(this.processedData)) {
                return;
            }

            this.statistics = {
                total: this.processedData.length,
                seriousYes: 0,
                seriousNo: 0,
                certainProbable: 0,
                processed: this.processedData.length,
                bySOC: {},
                byCausality: {}
            };

            this.processedData.forEach(row => {
                // Seriousness 카운트
                if (row.Seriousness === 'Yes') {
                    this.statistics.seriousYes++;
                } else {
                    this.statistics.seriousNo++;
                }

                // SOC 카운트
                const soc = row.SOC || 'Unknown';
                if (!this.statistics.bySOC[soc]) {
                    this.statistics.bySOC[soc] = { total: 0, serious: 0, nonSerious: 0 };
                }
                this.statistics.bySOC[soc].total++;
                if (row.Seriousness === 'Yes') {
                    this.statistics.bySOC[soc].serious++;
                } else {
                    this.statistics.bySOC[soc].nonSerious++;
                }

                // Causality 카운트
                const causality = row['인과성평가'] || row.Causality || 'Unknown';
                if (!this.statistics.byCausality[causality]) {
                    this.statistics.byCausality[causality] = 0;
                }
                this.statistics.byCausality[causality]++;

                // Certain/Probable 카운트
                const causalityLower = causality.toLowerCase();
                if (causalityLower.includes('certain') || causalityLower.includes('probable')) {
                    this.statistics.certainProbable++;
                }
            });
        }

        /**
         * 결과를 Excel 워크북으로 변환 (CS59_별첨1_일람표.xlsx 형식)
         * ExcelJS 라이브러리를 사용하여 스타일 적용
         * @returns {Promise<ExcelJS.Workbook>} ExcelJS 워크북
         */
        async toExcelWorkbook() {
            if (!this.processedData) {
                throw new Error('데이터가 없습니다.');
            }

            // ExcelJS 사용 가능 여부 확인
            if (!window.ExcelJS) {
                console.warn('ExcelJS 라이브러리가 없습니다. 기본 XLSX로 폴백합니다.');
                return this.toExcelWorkbookLegacy();
            }

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'KPSUR Agent';
            workbook.created = new Date();

            const ws = workbook.addWorksheet('별첨1_개별증례');

            // SOC/PT별 데이터 집계
            const aggregatedData = this.aggregateBySOCAndPT();
            const { wsData, socRows, totalRow } = this.buildCS59WorksheetDataWithMetadata(aggregatedData);

            // 열 너비 설정
            ws.columns = [
                { width: 5 },   // A - No
                { width: 40 },  // B - SOC
                { width: 30 },  // C - PT
                { width: 7 }, { width: 7 }, { width: 7 },  // D-F 중대한 이상사례
                { width: 7 }, { width: 7 }, { width: 7 },  // G-I 중대한 약물이상반응
                { width: 7 }, { width: 7 }, { width: 7 },  // J-L 비중대 이상사례
                { width: 7 }, { width: 7 }, { width: 7 },  // M-O 비중대 약물이상반응
                { width: 7 }, { width: 7 }, { width: 7 },  // P-R 총 이상사례
                { width: 7 }, { width: 7 }, { width: 7 },  // S-U 총 약물이상반응
                { width: 7 }, { width: 7 }, { width: 7 },  // V-X 시판후연구
            ];

            // 스타일 정의
            const styles = {
                titleFont: { name: '맑은 고딕', size: 12, bold: true },
                headerFont: { name: '맑은 고딕', size: 9, bold: true },
                dataFont: { name: '맑은 고딕', size: 9, bold: false },
                socFont: { name: '맑은 고딕', size: 9, bold: true },
                totalFont: { name: '맑은 고딕', size: 10, bold: true },
                headerFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
                subHeaderFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } },
                socFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } },
                totalFill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } },
                thinBorder: {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                },
                mediumBorder: {
                    top: { style: 'medium' },
                    left: { style: 'medium' },
                    bottom: { style: 'medium' },
                    right: { style: 'medium' }
                }
            };

            // 데이터 추가
            wsData.forEach((rowData, rowIndex) => {
                const row = ws.addRow(rowData);
                const rowNum = rowIndex + 1;

                // Row 1: 제목
                if (rowNum === 1) {
                    row.height = 25;
                    row.eachCell((cell, colNum) => {
                        cell.font = styles.titleFont;
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    });
                }

                // Row 4: 헤더 1단계 (중대한/비중대/총누적)
                if (rowNum === 4) {
                    row.height = 22;
                    row.eachCell((cell, colNum) => {
                        cell.font = { ...styles.headerFont, color: { argb: 'FFFFFFFF' } };
                        cell.fill = styles.headerFill;
                        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                        cell.border = styles.thinBorder;
                    });
                }

                // Row 5: 헤더 2단계 (이상사례/약물이상반응)
                if (rowNum === 5) {
                    row.height = 20;
                    row.eachCell((cell, colNum) => {
                        cell.font = styles.headerFont;
                        cell.fill = styles.subHeaderFill;
                        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                        cell.border = styles.thinBorder;
                    });
                }

                // Row 6: 헤더 3단계 (수/%/건)
                if (rowNum === 6) {
                    row.height = 18;
                    row.eachCell((cell, colNum) => {
                        cell.font = styles.headerFont;
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.border = styles.thinBorder;
                    });
                }

                // SOC 행 (볼드 + 회색 배경)
                if (socRows.includes(rowNum)) {
                    row.eachCell((cell, colNum) => {
                        cell.font = styles.socFont;
                        cell.fill = styles.socFill;
                        cell.border = styles.thinBorder;
                        if (colNum > 3) {
                            cell.alignment = { horizontal: 'right', vertical: 'middle' };
                        } else {
                            cell.alignment = { horizontal: 'left', vertical: 'middle' };
                        }
                    });
                }

                // 합계 행 (볼드 + 노란 배경)
                if (rowNum === totalRow) {
                    row.height = 22;
                    row.eachCell((cell, colNum) => {
                        cell.font = styles.totalFont;
                        cell.fill = styles.totalFill;
                        cell.border = styles.mediumBorder;
                        if (colNum > 3) {
                            cell.alignment = { horizontal: 'right', vertical: 'middle' };
                        } else {
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        }
                    });
                }

                // PT 행 (일반 데이터)
                if (rowNum >= 7 && !socRows.includes(rowNum) && rowNum !== totalRow) {
                    row.eachCell((cell, colNum) => {
                        cell.font = styles.dataFont;
                        cell.border = styles.thinBorder;
                        if (colNum > 3) {
                            cell.alignment = { horizontal: 'right', vertical: 'middle' };
                        } else {
                            cell.alignment = { horizontal: 'left', vertical: 'middle' };
                        }
                    });
                }
            });

            // 셀 병합
            ws.mergeCells('B4:C4');   // 이상사례 종류
            ws.mergeCells('D4:I4');   // 중대한
            ws.mergeCells('J4:O4');   // 중대하지 않은
            ws.mergeCells('P4:U4');   // 총 누적
            ws.mergeCells('V4:X4');   // 시판후 비중재 연구

            ws.mergeCells('B5:C5');   // 구분
            ws.mergeCells('D5:F5');   // 이상사례
            ws.mergeCells('G5:I5');   // 약물이상반응
            ws.mergeCells('J5:L5');   // 이상사례
            ws.mergeCells('M5:O5');   // 약물이상반응
            ws.mergeCells('P5:R5');   // 이상사례
            ws.mergeCells('S5:U5');   // 약물이상반응
            ws.mergeCells('V5:X5');   // 중대한 이상사례

            return workbook;
        }

        /**
         * Legacy XLSX 라이브러리용 폴백 (스타일 없음)
         */
        toExcelWorkbookLegacy() {
            if (!window.XLSX) {
                throw new Error('XLSX 라이브러리가 없습니다.');
            }

            const wb = XLSX.utils.book_new();
            const aggregatedData = this.aggregateBySOCAndPT();
            const { wsData } = this.buildCS59WorksheetDataWithMetadata(aggregatedData);
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            ws['!cols'] = [
                { wch: 5 }, { wch: 40 }, { wch: 30 },
                { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 },
                { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 },
                { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 },
                { wch: 7 }, { wch: 7 }, { wch: 7 },
            ];

            XLSX.utils.book_append_sheet(wb, ws, '별첨1_개별증례');
            return wb;
        }

        /**
         * CS59 워크시트 데이터 생성 (메타데이터 포함)
         * @param {Object} aggregatedData - 집계된 SOC/PT 데이터
         * @returns {Object} { wsData, socRows, totalRow, dataStartRow, dataEndRow }
         */
        buildCS59WorksheetDataWithMetadata(aggregatedData) {
            const data = [];
            const socRows = [];  // SOC 행 번호 (1부터 시작)
            let currentRow = 1;

            // 총계 계산
            let grandTotal = {
                seriousAE: { patients: 0, cases: 0 },
                seriousADR: { patients: 0, cases: 0 },
                nonSeriousAE: { patients: 0, cases: 0 },
                nonSeriousADR: { patients: 0, cases: 0 }
            };

            Object.values(aggregatedData).forEach(socData => {
                grandTotal.seriousAE.patients += socData.totals.seriousAE.patients;
                grandTotal.seriousAE.cases += socData.totals.seriousAE.cases;
                grandTotal.seriousADR.patients += socData.totals.seriousADR.patients;
                grandTotal.seriousADR.cases += socData.totals.seriousADR.cases;
                grandTotal.nonSeriousAE.patients += socData.totals.nonSeriousAE.patients;
                grandTotal.nonSeriousAE.cases += socData.totals.nonSeriousAE.cases;
                grandTotal.nonSeriousADR.patients += socData.totals.nonSeriousADR.patients;
                grandTotal.nonSeriousADR.cases += socData.totals.nonSeriousADR.cases;
            });

            const totalPatients = grandTotal.seriousAE.patients + grandTotal.nonSeriousAE.patients;

            // Row 1: 제목
            data.push([null, null, '[별첨 1] 개별증례 Line Listing']);
            currentRow++;

            // Row 2: 빈 행
            data.push([]);
            currentRow++;

            // Row 3: 빈 행
            data.push([]);
            currentRow++;

            // Row 4: 헤더 1단계
            data.push([
                null, '이상사례 종류', null,
                '중대한', null, null, null, null, null,
                '중대하지 않은', null, null, null, null, null,
                '총 누적', null, null, null, null, null,
                '시판후 비중재 연구', null, null
            ]);
            currentRow++;

            // Row 5: 헤더 2단계
            data.push([
                null, '구분', null,
                '이상사례', null, null, '약물이상반응', null, null,
                '이상사례', null, null, '약물이상반응', null, null,
                '이상사례', null, null, '약물이상반응', null, null,
                '중대한 이상사례', null, null
            ]);
            currentRow++;

            // Row 6: 헤더 3단계
            data.push([
                'No.', 'SOC (기관계분류)', 'PT (이상사례명)',
                '수', '%', '건', '수', '%', '건',
                '수', '%', '건', '수', '%', '건',
                '수', '%', '건', '수', '%', '건',
                '수', '%', '건'
            ]);
            currentRow++;

            const dataStartRow = currentRow;
            let rowNum = 1;

            // SOC/PT 데이터 행
            Object.keys(aggregatedData).sort().forEach(soc => {
                const socData = aggregatedData[soc];

                // SOC 행 (볼드)
                socRows.push(currentRow);
                const socTotalPatients = socData.totals.seriousAE.patients + socData.totals.nonSeriousAE.patients;
                const socTotalCases = socData.totals.seriousAE.cases + socData.totals.nonSeriousAE.cases;
                const socTotalADRPatients = socData.totals.seriousADR.patients + socData.totals.nonSeriousADR.patients;
                const socTotalADRCases = socData.totals.seriousADR.cases + socData.totals.nonSeriousADR.cases;

                data.push([
                    rowNum++,
                    soc,
                    '',  // PT 열은 비움
                    socData.totals.seriousAE.patients,
                    totalPatients > 0 ? ((socData.totals.seriousAE.patients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                    socData.totals.seriousAE.cases,
                    socData.totals.seriousADR.patients,
                    totalPatients > 0 ? ((socData.totals.seriousADR.patients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                    socData.totals.seriousADR.cases,
                    socData.totals.nonSeriousAE.patients,
                    totalPatients > 0 ? ((socData.totals.nonSeriousAE.patients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                    socData.totals.nonSeriousAE.cases,
                    socData.totals.nonSeriousADR.patients,
                    totalPatients > 0 ? ((socData.totals.nonSeriousADR.patients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                    socData.totals.nonSeriousADR.cases,
                    socTotalPatients,
                    totalPatients > 0 ? ((socTotalPatients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                    socTotalCases,
                    socTotalADRPatients,
                    totalPatients > 0 ? ((socTotalADRPatients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                    socTotalADRCases,
                    0, '0%', 0  // 시판후 비중재 연구 (추후 구현)
                ]);
                currentRow++;

                // PT 행들
                Object.keys(socData.pts).sort().forEach(pt => {
                    const ptData = socData.pts[pt];
                    const ptTotalPatients = ptData.seriousAE.patients + ptData.nonSeriousAE.patients;
                    const ptTotalCases = ptData.seriousAE.cases + ptData.nonSeriousAE.cases;
                    const ptTotalADRPatients = ptData.seriousADR.patients + ptData.nonSeriousADR.patients;
                    const ptTotalADRCases = ptData.seriousADR.cases + ptData.nonSeriousADR.cases;

                    data.push([
                        '',
                        '',  // SOC 열은 비움
                        '  ' + pt,  // PT (들여쓰기)
                        ptData.seriousAE.patients,
                        totalPatients > 0 ? ((ptData.seriousAE.patients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                        ptData.seriousAE.cases,
                        ptData.seriousADR.patients,
                        totalPatients > 0 ? ((ptData.seriousADR.patients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                        ptData.seriousADR.cases,
                        ptData.nonSeriousAE.patients,
                        totalPatients > 0 ? ((ptData.nonSeriousAE.patients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                        ptData.nonSeriousAE.cases,
                        ptData.nonSeriousADR.patients,
                        totalPatients > 0 ? ((ptData.nonSeriousADR.patients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                        ptData.nonSeriousADR.cases,
                        ptTotalPatients,
                        totalPatients > 0 ? ((ptTotalPatients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                        ptTotalCases,
                        ptTotalADRPatients,
                        totalPatients > 0 ? ((ptTotalADRPatients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                        ptTotalADRCases,
                        0, '0%', 0  // 시판후 비중재 연구
                    ]);
                    currentRow++;
                });
            });

            const dataEndRow = currentRow - 1;

            // 합계 행
            const totalAEPatients = grandTotal.seriousAE.patients + grandTotal.nonSeriousAE.patients;
            const totalAECases = grandTotal.seriousAE.cases + grandTotal.nonSeriousAE.cases;
            const totalADRPatients = grandTotal.seriousADR.patients + grandTotal.nonSeriousADR.patients;
            const totalADRCases = grandTotal.seriousADR.cases + grandTotal.nonSeriousADR.cases;

            data.push([
                '',
                '합계',
                '',
                grandTotal.seriousAE.patients,
                '100%',
                grandTotal.seriousAE.cases,
                grandTotal.seriousADR.patients,
                totalPatients > 0 ? ((grandTotal.seriousADR.patients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                grandTotal.seriousADR.cases,
                grandTotal.nonSeriousAE.patients,
                '100%',
                grandTotal.nonSeriousAE.cases,
                grandTotal.nonSeriousADR.patients,
                totalPatients > 0 ? ((grandTotal.nonSeriousADR.patients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                grandTotal.nonSeriousADR.cases,
                totalAEPatients,
                '100%',
                totalAECases,
                totalADRPatients,
                totalPatients > 0 ? ((totalADRPatients / totalPatients) * 100).toFixed(1) + '%' : '0%',
                totalADRCases,
                0, '0%', 0
            ]);
            const totalRow = currentRow;

            return {
                wsData: data,
                socRows,
                totalRow,
                dataStartRow,
                dataEndRow
            };
        }

        /**
         * SOC/PT별 데이터 집계
         */
        aggregateBySOCAndPT() {
            const result = {};

            this.processedData.forEach(row => {
                const soc = row.SOC || 'Unknown';
                const pt = row['E.i.3.2c'] || row['E.i.3.2d'] || row['__EMPTY_2'] ||
                           row['이상사례·약물이상반응 MedDRA명(영문)'] || row['PT'] || row['MedDRA명(영문)'] || 'Unknown PT';
                const isSerious = row.Seriousness === 'Yes';
                const causality = row['인과성평가'] || row.Causality || '';
                const causalityLower = causality.toLowerCase();
                const isADR = causalityLower.includes('certain') ||
                              causalityLower.includes('probable') ||
                              causalityLower.includes('possible');

                if (!result[soc]) {
                    result[soc] = {
                        pts: {},
                        totals: {
                            seriousAE: { patients: 0, cases: 0 },
                            seriousADR: { patients: 0, cases: 0 },
                            nonSeriousAE: { patients: 0, cases: 0 },
                            nonSeriousADR: { patients: 0, cases: 0 }
                        }
                    };
                }

                if (!result[soc].pts[pt]) {
                    result[soc].pts[pt] = {
                        seriousAE: { patients: 0, cases: 0 },
                        seriousADR: { patients: 0, cases: 0 },
                        nonSeriousAE: { patients: 0, cases: 0 },
                        nonSeriousADR: { patients: 0, cases: 0 }
                    };
                }

                // PT 레벨 카운트
                const ptData = result[soc].pts[pt];
                if (isSerious) {
                    ptData.seriousAE.patients++;
                    ptData.seriousAE.cases++;
                    if (isADR) {
                        ptData.seriousADR.patients++;
                        ptData.seriousADR.cases++;
                    }
                } else {
                    ptData.nonSeriousAE.patients++;
                    ptData.nonSeriousAE.cases++;
                    if (isADR) {
                        ptData.nonSeriousADR.patients++;
                        ptData.nonSeriousADR.cases++;
                    }
                }
            });

            // SOC 합계 계산
            Object.keys(result).forEach(soc => {
                const socData = result[soc];
                Object.values(socData.pts).forEach(ptData => {
                    socData.totals.seriousAE.patients += ptData.seriousAE.patients;
                    socData.totals.seriousAE.cases += ptData.seriousAE.cases;
                    socData.totals.seriousADR.patients += ptData.seriousADR.patients;
                    socData.totals.seriousADR.cases += ptData.seriousADR.cases;
                    socData.totals.nonSeriousAE.patients += ptData.nonSeriousAE.patients;
                    socData.totals.nonSeriousAE.cases += ptData.nonSeriousAE.cases;
                    socData.totals.nonSeriousADR.patients += ptData.nonSeriousADR.patients;
                    socData.totals.nonSeriousADR.cases += ptData.nonSeriousADR.cases;
                });
            });

            return result;
        }

        /**
         * CS59_별첨1_일람표.xlsx 형식의 워크시트 데이터 생성
         */
        buildCS59WorksheetData(aggregatedData) {
            const data = [];

            // 총계 계산
            let grandTotals = {
                seriousAE: { patients: 0, cases: 0 },
                seriousADR: { patients: 0, cases: 0 },
                nonSeriousAE: { patients: 0, cases: 0 },
                nonSeriousADR: { patients: 0, cases: 0 }
            };

            Object.values(aggregatedData).forEach(socData => {
                grandTotals.seriousAE.patients += socData.totals.seriousAE.patients;
                grandTotals.seriousAE.cases += socData.totals.seriousAE.cases;
                grandTotals.seriousADR.patients += socData.totals.seriousADR.patients;
                grandTotals.seriousADR.cases += socData.totals.seriousADR.cases;
                grandTotals.nonSeriousAE.patients += socData.totals.nonSeriousAE.patients;
                grandTotals.nonSeriousAE.cases += socData.totals.nonSeriousAE.cases;
                grandTotals.nonSeriousADR.patients += socData.totals.nonSeriousADR.patients;
                grandTotals.nonSeriousADR.cases += socData.totals.nonSeriousADR.cases;
            });

            const totalPatients = grandTotals.seriousAE.patients + grandTotals.nonSeriousAE.patients;

            // Row 1: Title
            data.push([null, null, '[별첨 1] 개별증례 Line Listing']);

            // Row 2-3: Empty
            data.push([]);
            data.push([]);

            // Row 4: Header Level 1
            data.push([
                null,
                '이상 사례 종류', null,
                '중대한', null, null, null, null, null,
                '중대하지 않은', null, null, null, null, null,
                '총 누적', null, null, null, null, null,
                '시판후 비중재 연구와 다른 요청된 출처'
            ]);

            // Row 5: Header Level 2
            data.push([
                null,
                '구분', null,
                '이상사례 발현조사 대상자수', null, null,
                '약물 이상 반응, 발현조사 대상자수 ', null, null,
                '이상사례 발현조사 대상자수', null, null,
                '약물 이상 반응, 발현조사 대상자수 ', null, null,
                '이상사례 발현조사 대상자수 ', null, null,
                '약물 이상 반응, 발현조사 대상자수', null, null,
                '중대한 이상사례 발현 대상자수'
            ]);

            // Row 6: Header Level 3
            data.push([
                null, null, null,
                '수', '(%),', '[건]',
                '(%),', '(%),', '[건]',
                '(%),', '(%),', '[건]',
                '(%),', '(%),', '[건]',
                '수', '(%),', '[건]',
                '수', '(%),', '[건]',
                '수', '(%),', '[건]'
            ]);

            // Data rows
            const socs = Object.keys(aggregatedData).sort();

            socs.forEach(soc => {
                const socData = aggregatedData[soc];
                const t = socData.totals;

                // SOC Row (값 계산)
                const socRow = this.buildDataRow(
                    soc, null, t, totalPatients
                );
                data.push(socRow);

                // PT Rows
                const pts = Object.keys(socData.pts).sort();
                pts.forEach(pt => {
                    const ptData = socData.pts[pt];
                    const ptRow = this.buildDataRow(
                        null, pt, ptData, totalPatients
                    );
                    data.push(ptRow);
                });
            });

            // 총계 Row
            const totalRow = this.buildDataRow(
                '총계', null, grandTotals, totalPatients, true
            );
            data.push(totalRow);

            return data;
        }

        /**
         * 데이터 행 생성 헬퍼
         */
        buildDataRow(soc, pt, counts, totalPatients, isTotal = false) {
            const calcPercent = (value) => {
                if (!totalPatients || totalPatients === 0) return 0;
                return value / totalPatients;
            };

            // 총 누적
            const totalAE = {
                patients: counts.seriousAE.patients + counts.nonSeriousAE.patients,
                cases: counts.seriousAE.cases + counts.nonSeriousAE.cases
            };
            const totalADR = {
                patients: counts.seriousADR.patients + counts.nonSeriousADR.patients,
                cases: counts.seriousADR.cases + counts.nonSeriousADR.cases
            };

            return [
                null,
                soc || null,  // B: SOC
                pt || null,   // C: PT
                // D-F: 중대한 이상사례
                counts.seriousAE.patients,
                calcPercent(counts.seriousAE.patients),
                counts.seriousAE.cases,
                // G-I: 중대한 약물이상반응
                calcPercent(counts.seriousADR.patients),
                calcPercent(counts.seriousADR.patients),
                counts.seriousADR.cases,
                // J-L: 중대하지 않은 이상사례
                calcPercent(counts.nonSeriousAE.patients),
                calcPercent(counts.nonSeriousAE.patients),
                counts.nonSeriousAE.cases,
                // M-O: 중대하지 않은 약물이상반응
                calcPercent(counts.nonSeriousADR.patients),
                calcPercent(counts.nonSeriousADR.patients),
                counts.nonSeriousADR.cases,
                // P-R: 총 누적 이상사례
                totalAE.patients,
                calcPercent(totalAE.patients),
                totalAE.cases,
                // S-U: 총 누적 약물이상반응
                totalADR.patients,
                calcPercent(totalADR.patients),
                totalADR.cases,
                // V-X: 시판후 비중재 연구 (기본 0)
                0,
                0,
                0
            ];
        }

        /**
         * Excel 파일 다운로드 (CS59_별첨1_일람표 형식)
         * ExcelJS 사용 시 스타일 포함
         */
        async downloadExcel(filename = 'CS59_별첨1_일람표.xlsx') {
            const workbook = await this.toExcelWorkbook();

            // ExcelJS 워크북인지 확인
            if (workbook.xlsx && typeof workbook.xlsx.writeBuffer === 'function') {
                // ExcelJS - 스타일 포함 다운로드
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                // Legacy XLSX 라이브러리 폴백
                XLSX.writeFile(workbook, filename);
            }
        }

        /**
         * 마크다운 보고서 다운로드
         */
        downloadMarkdown(filename = 'Result.md') {
            if (!this.reportMarkdown) {
                throw new Error('보고서가 생성되지 않았습니다.');
            }

            const blob = new Blob([this.reportMarkdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        /**
         * HTML 테이블 렌더링
         */
        renderTable(data = null, maxRows = 100) {
            const tableData = data || this.processedData;
            if (!tableData || tableData.length === 0) {
                return `<div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-text">데이터가 없습니다</div>
                </div>`;
            }

            const headers = Object.keys(tableData[0]);
            const previewData = tableData.slice(0, maxRows);

            let html = '<table class="results-table">';

            // 헤더
            html += '<thead><tr>';
            headers.forEach(h => {
                html += `<th>${h}</th>`;
            });
            html += '</tr></thead>';

            // 바디
            html += '<tbody>';
            previewData.forEach(row => {
                const isSerious = row.Seriousness === 'Yes';
                const rowClass = isSerious ? 'serious-yes' : '';
                html += `<tr class="${rowClass}">`;
                headers.forEach(key => {
                    const value = row[key] !== null && row[key] !== undefined ? row[key] : '';

                    // Seriousness 컬럼 배지 처리
                    if (key === 'Seriousness') {
                        const badgeClass = value === 'Yes' ? 'badge-yes' : 'badge-no';
                        html += `<td><span class="badge ${badgeClass}">${value}</span></td>`;
                    }
                    // 인과성 컬럼 배지 처리
                    else if (key === '인과성평가' || key === 'Causality') {
                        const causalityLower = (value || '').toLowerCase();
                        let badgeClass = 'badge-unknown';
                        if (causalityLower.includes('certain')) badgeClass = 'badge-certain';
                        else if (causalityLower.includes('probable')) badgeClass = 'badge-probable';
                        else if (causalityLower.includes('possible')) badgeClass = 'badge-possible';
                        else if (causalityLower.includes('unlikely')) badgeClass = 'badge-unlikely';
                        html += `<td><span class="badge ${badgeClass}">${value}</span></td>`;
                    }
                    else {
                        html += `<td>${value}</td>`;
                    }
                });
                html += '</tr>';
            });
            html += '</tbody>';

            html += '</table>';

            if (tableData.length > maxRows) {
                html += `<p style="margin-top: 0.5rem; font-size: 0.8125rem; color: var(--text-secondary);">총 ${tableData.length}행 중 ${maxRows}행만 표시됨</p>`;
            }

            return html;
        }

        /**
         * 결과 가져오기
         */
        getResults() {
            return {
                processedData: this.processedData,
                reportMarkdown: this.reportMarkdown,
                statistics: this.statistics
            };
        }

        /**
         * localStorage에 결과 저장
         */
        saveToStorage(reportId = null) {
            const key = reportId ? `lineListingAnalysis_${reportId}` : 'lineListingAnalysis';
            const data = {
                processedData: this.processedData,
                reportMarkdown: this.reportMarkdown,
                statistics: this.statistics,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(key, JSON.stringify(data));
        }

        /**
         * localStorage에서 결과 로드
         */
        loadFromStorage(reportId = null) {
            const key = reportId ? `lineListingAnalysis_${reportId}` : 'lineListingAnalysis';
            const data = localStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                this.processedData = parsed.processedData;
                // reportMarkdown은 processedData에서 새로 생성 (PT 필드 매핑 최신화)
                this.reportMarkdown = this.generateReportFromProcessedData(this.processedData);
                this.statistics = parsed.statistics;
                return true;
            }
            return false;
        }

        /**
         * 초기화
         */
        reset() {
            this.processedData = [];
            this.reportMarkdown = null;
            this.statistics = {
                total: 0,
                seriousYes: 0,
                seriousNo: 0,
                certainProbable: 0,
                processed: 0,
                bySOC: {},
                byCausality: {}
            };
        }

        /**
         * 싱글샷 LLM 분석 (구조화 출력 - CS59_별첨1_일람표 형식)
         * @param {Array} aeData - 이상사례 데이터
         * @param {Array} causData - 인과성평가 데이터
         * @param {Object} options - LLM 옵션
         * @param {Function} onProgress - 진행 상황 콜백
         * @returns {Object} { processedData, cs59Summary, reportMarkdown, statistics }
         */
        async analyzeWithLLMSingleShot(aeData, causData, options = {}, onProgress = null) {
            if (!window.multiLLMClient) {
                throw new Error('multiLLMClient가 로드되지 않았습니다.');
            }

            const provider = options.provider || 'google';
            const model = options.model || 'gemini-3-flash-preview';
            const temperature = options.temperature || 0.1;

            if (onProgress) {
                onProgress({ current: 0, total: 100, status: 'Line Listing 싱글샷 분석 시작...' });
            }

            // 구조화 출력 JSON 스키마 정의
            const jsonSchema = {
                type: "object",
                properties: {
                    processedData: {
                        type: "array",
                        description: "원본 데이터에 Seriousness, 인과성평가, SOC 컬럼이 추가된 배열",
                        items: {
                            type: "object",
                            properties: {
                                Seriousness: { type: "string", enum: ["Yes", "No"] },
                                "인과성평가": { type: "string" },
                                SOC: { type: "string" }
                            }
                        }
                    },
                    cs59Summary: {
                        type: "array",
                        description: "CS59_별첨1_일람표 형식의 SOC/PT별 요약 (구분, 중대한 이상사례, 중대한 약물이상반응, 중대하지 않은 이상사례, 중대하지 않은 약물이상반응, 총-이상사례, 총-약물이상반응)",
                        items: {
                            type: "object",
                            properties: {
                                level: { type: "string", enum: ["SOC", "PT", "TOTAL"] },
                                name: { type: "string" },
                                seriousAE: { type: "string", description: "환자수/건수 (예: 14/22)" },
                                seriousADR: { type: "string", description: "환자수/건수" },
                                nonSeriousAE: { type: "string", description: "환자수/건수" },
                                nonSeriousADR: { type: "string", description: "환자수/건수" },
                                totalAE: { type: "string", description: "환자수/건수" },
                                totalADR: { type: "string", description: "환자수/건수" }
                            },
                            required: ["level", "name", "seriousAE", "seriousADR", "nonSeriousAE", "nonSeriousADR", "totalAE", "totalADR"]
                        }
                    },
                    statistics: {
                        type: "object",
                        properties: {
                            total: { type: "number" },
                            seriousYes: { type: "number" },
                            seriousNo: { type: "number" },
                            certainProbable: { type: "number" }
                        }
                    }
                },
                required: ["processedData", "cs59Summary", "statistics"]
            };

            // 싱글샷 프롬프트 생성
            const prompt = this.buildSingleShotPrompt(aeData, causData);

            if (onProgress) {
                onProgress({ current: 20, total: 100, status: 'LLM에 데이터 전송 중...' });
            }

            // LLM 호출 (structured output)
            const result = await window.multiLLMClient.generate(prompt, {
                provider,
                model,
                temperature,
                maxTokens: 65536,
                responseFormat: { type: "json_object" }
            });

            if (!result.success) {
                throw new Error('LLM 응답 실패: ' + (result.error || 'Unknown error'));
            }

            if (onProgress) {
                onProgress({ current: 80, total: 100, status: '응답 파싱 중...' });
            }

            // JSON 응답 파싱
            const parsedResult = this.parseJsonResponse(result.text);

            // 결과 저장
            this.processedData = parsedResult.processedData || [];
            this.statistics = parsedResult.statistics || this.calculateStatistics(this.processedData);

            // CS59 마크다운 보고서 생성
            this.reportMarkdown = this.buildCS59ReportMarkdown(parsedResult.cs59Summary);

            if (onProgress) {
                onProgress({ current: 100, total: 100, status: '분석 완료' });
            }

            return {
                success: true,
                processedCount: this.processedData.length,
                processedData: this.processedData,
                cs59Summary: parsedResult.cs59Summary,
                reportMarkdown: this.reportMarkdown,
                statistics: this.statistics,
                llmUsage: result.usage,
                llmCost: result.cost
            };
        }

        /**
         * 싱글샷 프롬프트 생성
         */
        buildSingleShotPrompt(aeData, causData) {
            const aeString = JSON.stringify(aeData, null, 2);
            const causString = JSON.stringify(causData, null, 2);

            return `당신은 제약회사 약물감시팀 팀장입니다. 주어진 Line Listing 데이터를 분석하여 **단일 JSON 응답**으로 모든 결과를 반환하십시오.

[입력 데이터]
1. 이상사례 데이터 (AE):
${aeString}

2. 인과성평가 데이터 (Causality):
${causString}

[처리 규칙]

1. **processedData**: 원본 이상사례 데이터에 다음 3개 컬럼을 추가하여 반환
   - **Seriousness**: WHO 6기준(사망, 생명위협, 입원, 입원기간연장, 영구장애, 선천성기형, 기타중대한결과) 중 하나라도 해당 → "Yes", 아니면 → "No"
   - **인과성평가**: 인과성평가 데이터에서 매칭되는 결과 (Certain, Probable, Possible, Unlikely, Unrelated 등)
   - **SOC**: 이상사례 MedDRA PT에 해당하는 상위 SOC(System Organ Class) 영문 명칭

2. **cs59Summary**: CS59_별첨1_일람표 형식의 SOC/PT별 요약 테이블 데이터
   - level: "SOC" | "PT" | "TOTAL"
   - name: SOC명 또는 PT명 (TOTAL일 경우 "총계")
   - 각 카테고리별 "환자수/건수" 형식 (예: "14/22")
   - **약물이상반응(ADR)**: 인과성이 Certain, Probable, Possible인 경우만 해당
   - **SOC 행**은 해당 SOC 내 모든 PT 합계
   - 마지막에 **TOTAL** 행으로 전체 합계 포함

3. **statistics**: 통계 요약
   - total: 전체 건수
   - seriousYes: 중대한 이상사례 건수
   - seriousNo: 중대하지 않은 이상사례 건수
   - certainProbable: Certain 또는 Probable 인과성 건수

[출력 형식]
반드시 아래 JSON 구조로만 출력하십시오. 마크다운 코드블럭 없이 순수 JSON만:
{
  "processedData": [
    { ... 원본 필드들 ..., "Seriousness": "Yes", "인과성평가": "Possible", "SOC": "Cardiac disorders" },
    ...
  ],
  "cs59Summary": [
    { "level": "SOC", "name": "Blood and lymphatic system disorders", "seriousAE": "14/22", "seriousADR": "11/19", "nonSeriousAE": "14/14", "nonSeriousADR": "11/11", "totalAE": "28/36", "totalADR": "22/30" },
    { "level": "PT", "name": "Anaemia", "seriousAE": "3/5", "seriousADR": "2/4", "nonSeriousAE": "3/3", "nonSeriousADR": "2/2", "totalAE": "6/8", "totalADR": "4/6" },
    { "level": "SOC", "name": "Cardiac disorders", "seriousAE": "24/28", "seriousADR": "21/25", "nonSeriousAE": "24/24", "nonSeriousADR": "21/21", "totalAE": "48/52", "totalADR": "42/46" },
    ...
    { "level": "TOTAL", "name": "총계", "seriousAE": "40/40", "seriousADR": "30/30", "nonSeriousAE": "40/40", "nonSeriousADR": "30/30", "totalAE": "80/80", "totalADR": "60/60" }
  ],
  "statistics": {
    "total": 80,
    "seriousYes": 40,
    "seriousNo": 40,
    "certainProbable": 30
  }
}`;
        }

        /**
         * CS59 마크다운 보고서 생성
         */
        buildCS59ReportMarkdown(cs59Summary) {
            if (!cs59Summary || !Array.isArray(cs59Summary) || cs59Summary.length === 0) {
                return '# [별첨 1] 개별증례 Line Listing\n\n데이터가 없습니다.';
            }

            let md = `# [별첨 1] 개별증례 Line Listing\n\n`;
            md += `| 구분 (SOC / PT) | 중대한 이상사례 (환자수/건수) | 중대한 약물이상반응 (환자수/건수) | 중대하지 않은 이상사례 (환자수/건수) | 중대하지 않은 약물이상반응 (환자수/건수) | 총-이상사례 (환자수/건수) | 총-약물이상반응 (환자수/건수) |\n`;
            md += `|---|---|---|---|---|---|---|\n`;

            for (const row of cs59Summary) {
                const prefix = row.level === 'SOC' ? '**' : (row.level === 'PT' ? '&nbsp;&nbsp; ' : '**');
                const suffix = row.level === 'SOC' || row.level === 'TOTAL' ? '**' : '';
                const name = `${prefix}${row.name}${suffix}`;

                md += `| ${name} | ${row.seriousAE} | ${row.seriousADR} | ${row.nonSeriousAE} | ${row.nonSeriousADR} | ${row.totalAE} | ${row.totalADR} |\n`;
            }

            return md;
        }

        /**
         * 통계 계산 (fallback)
         */
        calculateStatistics(processedData) {
            if (!processedData || !Array.isArray(processedData)) {
                return { total: 0, seriousYes: 0, seriousNo: 0, certainProbable: 0 };
            }

            let seriousYes = 0, seriousNo = 0, certainProbable = 0;

            for (const row of processedData) {
                if (row.Seriousness === 'Yes') seriousYes++;
                else seriousNo++;

                const causality = (row['인과성평가'] || row.Causality || '').toLowerCase();
                if (causality.includes('certain') || causality.includes('probable')) {
                    certainProbable++;
                }
            }

            return {
                total: processedData.length,
                seriousYes,
                seriousNo,
                certainProbable
            };
        }

        /**
         * 채팅용 데이터 컨텍스트 생성
         */
        buildChatContext() {
            if (!this.processedData || this.processedData.length === 0) {
                return '데이터가 아직 분석되지 않았습니다.';
            }

            const summary = `
## Line Listing 데이터 요약

- **총 건수**: ${this.statistics.total}건
- **중대한 이상사례**: ${this.statistics.seriousYes}건
- **중대하지 않은 이상사례**: ${this.statistics.seriousNo}건
- **Certain/Probable 인과성**: ${this.statistics.certainProbable}건

### SOC별 분포
${Object.entries(this.statistics.bySOC).map(([soc, counts]) =>
    `- ${soc}: ${counts.total}건 (중대: ${counts.serious}, 비중대: ${counts.nonSerious})`
).join('\n')}

### 인과성 분포
${Object.entries(this.statistics.byCausality).map(([caus, count]) =>
    `- ${caus}: ${count}건`
).join('\n')}

### 샘플 데이터 (처음 10건)
\`\`\`json
${JSON.stringify(this.processedData.slice(0, 10), null, 2)}
\`\`\`
`;
            return summary;
        }

        /**
         * 마크다운 보고서 생성
         */
        generateReportMarkdown() {
            return this.reportMarkdown || '보고서가 아직 생성되지 않았습니다.';
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.ExtractLineListings = ExtractLineListings;
        window.extractLineListings = new ExtractLineListings();
        window.LINE_LISTING_RAW_IDS = LINE_LISTING_RAW_IDS;
        window.SERIOUSNESS_CRITERIA = SERIOUSNESS_CRITERIA;
        window.CAUSALITY_SCALE = CAUSALITY_SCALE;
    }

})();

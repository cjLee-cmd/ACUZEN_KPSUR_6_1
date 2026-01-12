/**
 * Extract Tables - 표 데이터 추출
 * js/extract/extract-tables.js
 *
 * Table 데이터 추출 전문 모듈
 */

(function() {
    'use strict';

    // Table 정의 (표1-표15)
    const TABLE_DEFINITIONS = {
        '표1_전세계허가현황': { rawIds: ['RAW4'], description: '국가별 허가 현황 표' },
        '표2_연도별판매량': { rawIds: ['RAW3'], description: '연도별 판매량/매출 표' },
        '표3_환자노출추정': { rawIds: ['RAW3'], description: '환자 노출 추정치 표' },
        '표4_허가사항변경내역': { rawIds: ['RAW7'], description: '허가사항 변경 내역 표' },
        '표5_신속보고내역': { rawIds: ['RAW12', 'RAW13'], description: '신속보고 이상사례 요약 표' },
        '표6_정기보고내역': { rawIds: ['RAW15'], description: '정기보고 이상사례 요약 표' },
        '표7_원시자료요약': { rawIds: ['RAW14'], description: '원시자료 이상사례 요약 표' },
        '표8_문헌검토결과': { rawIds: ['RAW9'], description: '문헌 검토 결과 표' },
        '표9_임상시험현황': { rawIds: ['RAW8', 'RAW17'], description: '진행중/완료 임상시험 표' },
        '표10_SOC별이상사례': { rawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'], description: 'SOC별 이상사례 분류 표' },
        '표11_중대한이상사례': { rawIds: ['RAW12', 'RAW13'], description: '중대한 이상사례 상세 표' },
        '표12_안전성조치내역': { rawIds: ['RAW5', 'RAW6'], description: '안전성 조치 내역 표' },
        '표13_MedDRA_SMQ': { rawIds: ['RAW16'], description: 'MedDRA SMQ 분석 표' },
        '표14_IIT_NIS현황': { rawIds: ['RAW17'], description: 'IIT/NIS 트래커 현황 표' },
        '표15_약어목록': { rawIds: ['RAW2.1'], description: '약어 및 정의 목록 표' }
    };

    /**
     * ExtractTables - Table 데이터 추출 클래스
     */
    class ExtractTables {
        constructor(base) {
            this.base = base || window.extractBase;
        }

        /**
         * Table 데이터 추출
         */
        async extract(markdownFiles, tableDefinitions = null) {
            console.log('[ExtractTables] Extracting Table Data...');

            const definitions = tableDefinitions || TABLE_DEFINITIONS;

            for (const file of markdownFiles) {
                // 관련 RAW ID인지 확인
                const relevantDefs = this.getRelevantDefinitions(file.rawId, definitions);

                if (Object.keys(relevantDefs).length === 0) {
                    console.log(`[ExtractTables] Skipping ${file.rawId} - no Table definitions`);
                    continue;
                }

                const result = await this.base.extractFromMarkdown(
                    file.markdownContent || file.markdown || file.content,
                    file.rawId,
                    relevantDefs
                );

                if (result.success) {
                    this.base.mergeExtractedData(result.data, 'Table');
                }
            }

            const tableData = this.base.getData('Table');
            console.log(`[ExtractTables] Table Data extraction complete (${Object.keys(tableData).length} tables)`);
            return tableData;
        }

        /**
         * 마크다운에서 표 직접 파싱
         */
        parseTablesFromMarkdown(markdownContent) {
            const tables = [];
            const tableRegex = /\|[^\n]+\|\n\|[-:\s|]+\|\n((\|[^\n]+\|\n)+)/g;

            let match;
            while ((match = tableRegex.exec(markdownContent)) !== null) {
                const tableText = match[0];
                const parsedTable = this.parseMarkdownTable(tableText);
                if (parsedTable) {
                    tables.push(parsedTable);
                }
            }

            return tables;
        }

        /**
         * 마크다운 테이블 파싱
         */
        parseMarkdownTable(tableText) {
            const lines = tableText.trim().split('\n');
            if (lines.length < 3) return null;

            // 헤더 파싱
            const headerLine = lines[0];
            const headers = headerLine.split('|').filter(cell => cell.trim()).map(cell => cell.trim());

            // 데이터 행 파싱 (구분선 제외)
            const rows = [];
            for (let i = 2; i < lines.length; i++) {
                const cells = lines[i].split('|').filter(cell => cell.trim()).map(cell => cell.trim());
                if (cells.length > 0) {
                    const row = {};
                    headers.forEach((header, idx) => {
                        row[header] = cells[idx] || '';
                    });
                    rows.push(row);
                }
            }

            return {
                headers: headers,
                rows: rows,
                rowCount: rows.length
            };
        }

        /**
         * 해당 RAW ID와 관련된 정의만 필터링
         */
        getRelevantDefinitions(rawId, definitions) {
            const relevant = {};

            Object.entries(definitions).forEach(([key, def]) => {
                if (def.rawIds && def.rawIds.includes(rawId)) {
                    relevant[key] = def;
                }
            });

            return relevant;
        }

        /**
         * Table 정의 가져오기
         */
        getDefinitions() {
            return TABLE_DEFINITIONS;
        }

        /**
         * 특정 Table 데이터 가져오기
         */
        getValue(tableId) {
            return this.base.getData('Table')[tableId];
        }

        /**
         * Table 데이터 전체 가져오기
         */
        getData() {
            return this.base.getData('Table');
        }

        /**
         * 필수 Table 확인
         */
        validateRequired(requiredFields) {
            const tableData = this.base.getData('Table');
            const missing = [];

            requiredFields.forEach(field => {
                if (!tableData[field]) {
                    missing.push(field);
                }
            });

            return {
                valid: missing.length === 0,
                missing: missing
            };
        }

        /**
         * Table 추출 프롬프트 생성
         */
        buildPrompt(markdownContent, rawId) {
            const definitions = this.getRelevantDefinitions(rawId, TABLE_DEFINITIONS);

            return `다음 문서에서 표(Table) 데이터를 추출하세요.

## 문서 (${rawId})
${markdownContent.substring(0, 25000)}

## 추출 대상 표
${Object.entries(definitions).map(([k, v]) => `- ${k}: ${v.description}`).join('\n')}

## 출력 형식
\`\`\`json
{
  "표1_전세계허가현황": {
    "headers": ["국가", "허가일자", "제품명"],
    "rows": [
      {"국가": "한국", "허가일자": "2020-01-01", "제품명": "XXX"}
    ]
  }
}
\`\`\`

표가 없는 경우 해당 키에 DATA_NOT_FOUND를 반환하세요.`;
        }

        /**
         * 표를 마크다운 형식으로 변환
         */
        toMarkdown(tableData) {
            if (!tableData || !tableData.headers || !tableData.rows) {
                return '';
            }

            let markdown = '| ' + tableData.headers.join(' | ') + ' |\n';
            markdown += '| ' + tableData.headers.map(() => '---').join(' | ') + ' |\n';

            tableData.rows.forEach(row => {
                const cells = tableData.headers.map(h => row[h] || '');
                markdown += '| ' + cells.join(' | ') + ' |\n';
            });

            return markdown;
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.ExtractTables = ExtractTables;
        window.extractTables = new ExtractTables();
        window.TABLE_DEFINITIONS = TABLE_DEFINITIONS;
    }

})();

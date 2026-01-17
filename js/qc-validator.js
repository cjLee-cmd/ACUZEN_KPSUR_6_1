/**
 * QC Validator
 * 품질 검증 및 오류 확인
 * GitHub Pages 배포용 - 전역 window 객체 사용
 */

// IIFE로 감싸서 const 선언이 전역 스코프와 충돌하지 않도록 함
(function () {
    'use strict';

    // 전역 의존성 fallback (config.js에서 이미 선언된 경우 재선언하지 않음)
    if (!window.DateHelper) {
        window.DateHelper = {
            formatYYMMDD_hhmmss: (date = new Date()) => {
                const yy = String(date.getFullYear()).slice(-2);
                const MM = String(date.getMonth() + 1).padStart(2, '0');
                const DD = String(date.getDate()).padStart(2, '0');
                const hh = String(date.getHours()).padStart(2, '0');
                const mm = String(date.getMinutes()).padStart(2, '0');
                const ss = String(date.getSeconds()).padStart(2, '0');
                return `${yy}${MM}${DD}_${hh}${mm}${ss}`;
            },
            formatISO: (date = new Date()) => date.toISOString()
        };
    }

    // llmClient fallback (llm-client.js에서 이미 선언된 경우 재선언하지 않음)
    if (!window.llmClient && !window.multiLLMClient) {
        window.llmClient = {
            sendMessage: async (prompt) => ({ content: 'Mock response', usage: {} })
        };
    }

    // 로컬 참조 (기존 코드 호환성 유지)
    const DateHelper = window.DateHelper;
    const llmClient = window.llmClient || window.multiLLMClient;

    class QCValidator {
        constructor() {
            this.validationResults = [];
            this.issues = [];
            this.validationRules = null; // 동적으로 로드된 규칙
            this.rulesLoaded = false;
        }

        /**
         * 마크다운 규칙 파일 로드
         * @param {string} markdownPath - 규칙 파일 경로 (기본: 04_QC/01_Context/01_QC_CheckRule_v1.md)
         */
        async loadRulesFromMarkdown(markdownPath = '04_QC/01_Context/01_QC_CheckRule_v1.md') {
            try {
                // 상대 경로 조정 (pages/ 폴더에서 실행 시)
                const basePath = window.location.pathname.includes('/pages/') ? '../' : '';
                const response = await fetch(basePath + markdownPath);

                if (!response.ok) {
                    console.warn(`[QC] 규칙 파일 로드 실패: ${markdownPath}, 기본 규칙 사용`);
                    this.validationRules = this.getDefaultRules();
                    return;
                }

                const markdown = await response.text();
                this.validationRules = this.parseRulesFromMarkdown(markdown);
                this.rulesLoaded = true;
                console.log(`✅ [QC] 규칙 파일 로드 완료: ${Object.keys(this.validationRules.categories).length}개 카테고리`);
            } catch (error) {
                console.error('[QC] 규칙 파일 로드 오류:', error);
                this.validationRules = this.getDefaultRules();
            }
        }

        /**
         * 마크다운에서 규칙 파싱
         */
        parseRulesFromMarkdown(markdown) {
            const rules = {
                categories: {},
                requiredSections: [],
                severityLevels: {}
            };

            // 카테고리별 규칙 파싱 (표 형식)
            const categoryRegex = /### \d+\. ([^\(]+) \((\w+)\)\n\n\|[^\n]+\n\|[^\n]+\n([\s\S]*?)(?=\n---|\n### |\n## |$)/g;
            let match;

            while ((match = categoryRegex.exec(markdown)) !== null) {
                const categoryName = match[1].trim();
                const categoryId = match[2].trim();
                const tableContent = match[3];

                const items = [];
                const rowRegex = /\|\s*(\S+)\s*\|\s*([^|]+)\s*\|\s*(\w+)\s*\|\s*([^|]+)\s*\|/g;
                let rowMatch;

                while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
                    items.push({
                        id: rowMatch[1].trim(),
                        name: rowMatch[2].trim(),
                        method: rowMatch[3].trim().toUpperCase(), // LLM or REGEX
                        description: rowMatch[4].trim()
                    });
                }

                rules.categories[categoryId] = {
                    name: categoryName,
                    items: items
                };
            }

            // 필수 섹션 파싱
            const requiredSectionsMatch = markdown.match(/## 필수 섹션 목록\n\n```\n([\s\S]*?)```/);
            if (requiredSectionsMatch) {
                rules.requiredSections = requiredSectionsMatch[1]
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);
            }

            // 심각도 수준 파싱
            const severityMatch = markdown.match(/## 심각도 수준\n\n\|[^\n]+\n\|[^\n]+\n([\s\S]*?)(?=\n---|\n## |$)/);
            if (severityMatch) {
                const severityRows = severityMatch[1];
                const severityRegex = /\|\s*([^|]+)\s*\|\s*(\w+)\s*\|\s*([^|]+)\s*\|/g;
                let sevMatch;
                while ((sevMatch = severityRegex.exec(severityRows)) !== null) {
                    rules.severityLevels[sevMatch[2].trim()] = {
                        label: sevMatch[1].trim(),
                        description: sevMatch[3].trim()
                    };
                }
            }

            return rules;
        }

        /**
         * 기본 규칙 (폴백)
         */
        getDefaultRules() {
            return {
                categories: {
                    data: {
                        name: '데이터 추출 검증',
                        items: [
                            { id: 'data-1', name: 'CS 데이터 완전성', method: 'LLM', description: 'CS 데이터 일치 확인' },
                            { id: 'data-2', name: 'PH 데이터 완전성', method: 'LLM', description: 'PH 데이터 일치 확인' },
                            { id: 'data-3', name: '표 데이터 완전성', method: 'LLM', description: '표 데이터 일치 확인' },
                            { id: 'data-4', name: '소스 문서 대조', method: 'LLM', description: '소스 문서 대조 확인' }
                        ]
                    },
                    conflict: {
                        name: '데이터 충돌 검증',
                        items: [
                            { id: 'conflict-1', name: '섹션 간 데이터 일치성', method: 'LLM', description: '섹션 간 데이터 일치 확인' },
                            { id: 'conflict-2', name: '날짜 정보 일관성', method: 'LLM', description: '날짜 정보 일관성 확인' },
                            { id: 'conflict-3', name: '수치 데이터 일치성', method: 'LLM', description: '수치 데이터 일치 확인' }
                        ]
                    },
                    structure: {
                        name: '구조 검증',
                        items: [
                            { id: 'structure-1', name: '표 번호 순서', method: 'REGEX', description: '표 번호 순서 확인' },
                            { id: 'structure-2', name: '섹션 번호 순서', method: 'REGEX', description: '섹션 번호 순서 확인' },
                            { id: 'structure-3', name: '참조 문헌 일치성', method: 'LLM', description: '참조 문헌 일치 확인' }
                        ]
                    },
                    content: {
                        name: '내용 검증',
                        items: [
                            { id: 'content-1', name: '서술문 소스 대조', method: 'LLM', description: '서술문 소스 대조 확인' },
                            { id: 'content-2', name: '템플릿 구조 준수', method: 'REGEX', description: '템플릿 구조 준수 확인' },
                            { id: 'content-3', name: '리뷰 변경사항 반영', method: 'LLM', description: '리뷰 변경사항 반영 확인' }
                        ]
                    },
                    regulatory: {
                        name: '규제 준수 검증',
                        items: [
                            { id: 'regulatory-1', name: 'MFDS 가이드라인 준수', method: 'LLM', description: 'MFDS 가이드라인 준수 확인' },
                            { id: 'regulatory-2', name: '필수 항목 포함 여부', method: 'REGEX', description: '필수 항목 포함 확인' },
                            { id: 'regulatory-3', name: '용어 정확성', method: 'LLM', description: '용어 정확성 확인' }
                        ]
                    }
                },
                requiredSections: [
                    '1. 서론',
                    '2. 전세계 판매 승인 현황',
                    '3. 시판 후 사용 현황',
                    '4. 안전성 정보의 변경',
                    '5. 약물이상반응 정보 현황'
                ],
                severityLevels: {
                    critical: { label: '중대', description: '보고서 제출 전 반드시 해결 필요' },
                    warning: { label: '경고', description: '권장 수정 사항' },
                    info: { label: '정보', description: '참고 정보' }
                }
            };
        }

        /**
         * 로드된 규칙 가져오기
         */
        getRules() {
            return this.validationRules || this.getDefaultRules();
        }

        /**
         * 카테고리별 검증 항목 가져오기
         */
        getValidationItems(categoryId) {
            const rules = this.getRules();
            return rules.categories[categoryId]?.items || [];
        }

        /**
         * 필수 섹션 목록 가져오기
         */
        getRequiredSections() {
            const rules = this.getRules();
            return rules.requiredSections || [];
        }

        /**
         * 전체 QC 검증 실행
         */
        async runFullQC(draftReport, sourceDocuments, extractedData) {
            console.log('🔍 Starting full QC validation...');

            // 규칙 파일 로드 (아직 로드되지 않은 경우)
            if (!this.rulesLoaded) {
                await this.loadRulesFromMarkdown();
            }

            this.issues = [];

            // 1. 데이터 일관성 검증
            await this.validateDataConsistency(draftReport, extractedData);

            // 2. 소스 문서 vs Draft 대조 검증
            await this.validateAgainstSources(draftReport, sourceDocuments);

            // 3. 표 번호 순서 검증
            this.validateTableNumbering(draftReport);

            // 4. 섹션 완성도 검증
            this.validateSectionCompleteness(draftReport);

            // 5. 서술문 검증
            await this.validateNarratives(draftReport, sourceDocuments);

            const issueCount = this.issues.length;

            console.log(`✅ QC validation complete: ${issueCount} issue(s) found`);

            return {
                success: true,
                issueCount: issueCount,
                issues: this.issues
            };
        }

        /**
         * 데이터 일관성 검증
         */
        async validateDataConsistency(draftReport, extractedData) {
            console.log('🔍 Validating data consistency...');

            const prompt = `당신은 제약 보고서 품질 검증 전문가입니다.

아래 Draft 보고서와 추출된 데이터를 비교하여 일관성을 검증하세요.

**Draft 보고서**:
${draftReport.substring(0, 5000)}

**추출된 데이터**:
${JSON.stringify(extractedData, null, 2)}

**검증 사항**:
1. Draft 보고서의 CS 데이터가 추출된 데이터와 일치하는지 확인
2. 날짜, 숫자, 성분명 등의 정확성 확인
3. 불일치하거나 누락된 데이터 확인

**Think step by step. Take your time.**

**응답 형식**:
\`\`\`json
{
  "issues": [
    {
      "type": "data_inconsistency",
      "severity": "high|medium|low",
      "field": "CS0_성분명",
      "expected": "예상값",
      "actual": "실제값",
      "description": "상세 설명"
    }
  ]
}
\`\`\``;

            const result = await llmClient.generateContent(prompt, {
                temperature: 0.1,
                maxOutputTokens: 4096
            });

            if (result.success) {
                try {
                    const responseText = result.text || result.content || '';
                    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
                    if (jsonMatch) {
                        const validation = JSON.parse(jsonMatch[1]);
                        const normalizedIssues = (validation.issues || []).map(issue => ({
                            ...issue,
                            location: issue.location || issue.field || '데이터 일관성 검증',
                            source: issue.source || 'extractedData',
                            timestamp: issue.timestamp || new Date().toISOString()
                        }));
                        this.issues.push(...normalizedIssues);
                    }
                } catch (error) {
                    console.error('❌ Failed to parse QC validation result:', error.message);
                }
            }
        }

        /**
         * 소스 문서 대조 검증
         */
        async validateAgainstSources(draftReport, sourceDocuments) {
            console.log('🔍 Validating against source documents...');

            const prompt = `당신은 제약 보고서 품질 검증 전문가입니다.

아래 Draft 보고서와 소스 문서를 비교하여 내용이 일치하는지 확인하세요.

**Draft 보고서 (일부)**:
${draftReport.substring(0, 3000)}

**소스 문서 (일부)**:
${sourceDocuments.substring(0, 3000)}

**검증 사항**:
1. Draft의 내용이 소스 문서의 내용과 상충되는 부분이 없는지 확인
2. 임의로 추가되거나 변형된 내용이 없는지 확인
3. 중요 데이터가 누락되지 않았는지 확인

**Ultrathink. Think hard. Think step by step. Take your time.**

**응답 형식**:
\`\`\`json
{
  "issues": [
    {
      "type": "source_conflict",
      "severity": "high|medium|low",
      "section": "섹션명",
      "sourceContent": "소스 문서 내용",
      "draftContent": "Draft 내용",
      "description": "상세 설명"
    }
  ]
}
\`\`\``;

            const result = await llmClient.generateContent(prompt, {
                temperature: 0.1,
                maxOutputTokens: 4096
            });

            if (result.success) {
                try {
                    const responseText = result.text || result.content || '';
                    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
                    if (jsonMatch) {
                        const validation = JSON.parse(jsonMatch[1]);
                        const normalizedIssues = (validation.issues || []).map(issue => ({
                            ...issue,
                            location: issue.location || issue.section || '소스 문서 대조',
                            source: issue.source || 'sourceDocuments',
                            timestamp: issue.timestamp || new Date().toISOString()
                        }));
                        this.issues.push(...normalizedIssues);
                    }
                } catch (error) {
                    console.error('❌ Failed to parse source validation result:', error.message);
                }
            }
        }

        /**
         * 표 번호 순서 검증
         */
        validateTableNumbering(draftReport) {
            console.log('🔍 Validating table numbering...');

            // 표 번호 추출: "표1", "표2", "표3"...
            const tableRegex = /표(\d+)[_:：\s]/g;
            const matches = [...draftReport.matchAll(tableRegex)];

            if (matches.length === 0) {
                return; // 표가 없음
            }

            const tableNumbers = matches.map(m => parseInt(m[1]));
            const uniqueNumbers = [...new Set(tableNumbers)].sort((a, b) => a - b);

            // 순차적인지 확인
            for (let i = 0; i < uniqueNumbers.length; i++) {
                const expected = i + 1;
                const actual = uniqueNumbers[i];

                if (actual !== expected) {
                    this.issues.push({
                        type: 'table_numbering',
                        severity: 'medium',
                        expected: expected,
                        actual: actual,
                        description: `표 번호 순서 오류: 표${expected}이 예상되지만 표${actual}이 발견됨`,
                        location: `표${actual}`,
                        source: 'draftReport',
                        timestamp: new Date().toISOString()
                    });
                }
            }

            // 중복 확인
            const duplicates = tableNumbers.filter((num, index) =>
                tableNumbers.indexOf(num) !== index
            );

            if (duplicates.length > 0) {
                const uniqueDuplicates = [...new Set(duplicates)];

                uniqueDuplicates.forEach(num => {
                    this.issues.push({
                        type: 'table_duplicate',
                        severity: 'high',
                        tableNumber: num,
                        description: `중복된 표 번호: 표${num}`,
                        location: `표${num}`,
                        source: 'draftReport',
                        timestamp: new Date().toISOString()
                    });
                });
            }

            console.log(`✅ Table numbering validated: ${matches.length} tables found`);
        }

        /**
         * 섹션 완성도 검증
         */
        validateSectionCompleteness(draftReport) {
            console.log('🔍 Validating section completeness...');

            // 동적으로 로드된 필수 섹션 목록 사용
            const requiredSections = this.getRequiredSections();

            requiredSections.forEach(section => {
                if (!draftReport.includes(section)) {
                    this.issues.push({
                        type: 'missing_section',
                        severity: 'high',
                        section: section,
                        description: `필수 섹션 누락: ${section}`,
                        location: section,
                        source: 'draftReport',
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // 빈 섹션 확인
            const emptySectionRegex = /##\s+([^\n]+)\n\n\s*##/g;
            const emptyMatches = [...draftReport.matchAll(emptySectionRegex)];

            emptyMatches.forEach(match => {
                this.issues.push({
                    type: 'empty_section',
                    severity: 'medium',
                    section: match[1],
                    description: `빈 섹션: ${match[1]}`,
                    location: match[1],
                    source: 'draftReport',
                    timestamp: new Date().toISOString()
                });
            });

            console.log(`✅ Section completeness validated`);
        }

        /**
         * 서술문 검증
         */
        async validateNarratives(draftReport, sourceDocuments) {
            console.log('🔍 Validating narrative content...');

            const prompt = `당신은 제약 보고서 품질 검증 전문가입니다.

아래 Draft 보고서의 서술문이 소스 문서의 내용과 일치하는지 확인하세요.

**Draft 보고서 서술문 (일부)**:
${draftReport.substring(0, 2000)}

**소스 문서 (일부)**:
${sourceDocuments.substring(0, 2000)}

**검증 사항**:
1. 서술문의 내용이 소스 문서의 사실과 부합하는지 확인
2. 과장되거나 왜곡된 표현이 없는지 확인
3. 누락된 중요 정보가 없는지 확인

**Think step by step. Take your time.**

**응답 형식**:
\`\`\`json
{
  "issues": [
    {
      "type": "narrative_mismatch",
      "severity": "high|medium|low",
      "section": "섹션명",
      "narrative": "서술문 내용",
      "issue": "문제점 설명"
    }
  ]
}
\`\`\``;

            const result = await llmClient.generateContent(prompt, {
                temperature: 0.1,
                maxOutputTokens: 2048
            });

            if (result.success) {
                try {
                    const responseText = result.text || result.content || '';
                    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
                    if (jsonMatch) {
                        const validation = JSON.parse(jsonMatch[1]);
                        const normalizedIssues = (validation.issues || []).map(issue => ({
                            ...issue,
                            location: issue.location || issue.section || '서술문 검증',
                            source: issue.source || 'draftReport',
                            timestamp: issue.timestamp || new Date().toISOString()
                        }));
                        this.issues.push(...normalizedIssues);
                    }
                } catch (error) {
                    console.error('❌ Failed to parse narrative validation result:', error.message);
                }
            }
        }

        /**
         * 이슈 필터링
         */
        filterIssues(severity = null, type = null) {
            let filtered = this.issues;

            if (severity) {
                filtered = filtered.filter(issue => issue.severity === severity);
            }

            if (type) {
                filtered = filtered.filter(issue => issue.type === type);
            }

            return filtered;
        }

        /**
         * 이슈 통계
         */
        getStatistics() {
            const stats = {
                total: this.issues.length,
                high: this.filterIssues('high').length,
                medium: this.filterIssues('medium').length,
                low: this.filterIssues('low').length,
                byType: {}
            };

            // 타입별 카운트
            this.issues.forEach(issue => {
                if (!stats.byType[issue.type]) {
                    stats.byType[issue.type] = 0;
                }
                stats.byType[issue.type]++;
            });

            return stats;
        }

        /**
         * QC 보고서 생성
         */
        generateQCReport(reportName) {
            const timestamp = DateHelper.formatYYMMDD_hhmmss();
            const filename = `${reportName}_QC보고서_${timestamp}.md`;

            const stats = this.getStatistics();

            let markdown = `# QC 검증 보고서: ${reportName}\n\n`;
            markdown += `**검증 시간**: ${DateHelper.formatISO()}\n\n`;

            markdown += `## 통계\n\n`;
            markdown += `- 총 이슈: ${stats.total}건\n`;
            markdown += `- 🔴 High: ${stats.high}건\n`;
            markdown += `- 🟡 Medium: ${stats.medium}건\n`;
            markdown += `- 🟢 Low: ${stats.low}건\n\n`;

            markdown += `### 타입별 이슈\n\n`;
            Object.entries(stats.byType).forEach(([type, count]) => {
                markdown += `- ${type}: ${count}건\n`;
            });

            markdown += `\n---\n\n`;

            if (this.issues.length === 0) {
                markdown += `## ✅ 모든 검증 통과\n\n`;
                markdown += `발견된 이슈가 없습니다. 보고서 품질이 우수합니다.\n\n`;
            } else {
                markdown += `## 발견된 이슈\n\n`;

                // High 이슈
                const highIssues = this.filterIssues('high');
                if (highIssues.length > 0) {
                    markdown += `### 🔴 High Severity (${highIssues.length}건)\n\n`;

                    highIssues.forEach((issue, index) => {
                        markdown += `#### ${index + 1}. ${issue.type}\n\n`;
                        markdown += `**설명**: ${issue.description}\n\n`;

                        if (issue.field) markdown += `- **필드**: ${issue.field}\n`;
                        if (issue.expected) markdown += `- **예상값**: ${issue.expected}\n`;
                        if (issue.actual) markdown += `- **실제값**: ${issue.actual}\n`;

                        markdown += `\n`;
                    });

                    markdown += `---\n\n`;
                }

                // Medium 이슈
                const mediumIssues = this.filterIssues('medium');
                if (mediumIssues.length > 0) {
                    markdown += `### 🟡 Medium Severity (${mediumIssues.length}건)\n\n`;

                    mediumIssues.forEach((issue, index) => {
                        markdown += `#### ${index + 1}. ${issue.type}\n\n`;
                        markdown += `**설명**: ${issue.description}\n\n`;
                    });

                    markdown += `---\n\n`;
                }

                // Low 이슈
                const lowIssues = this.filterIssues('low');
                if (lowIssues.length > 0) {
                    markdown += `### 🟢 Low Severity (${lowIssues.length}건)\n\n`;

                    lowIssues.forEach((issue, index) => {
                        markdown += `- ${issue.description}\n`;
                    });

                    markdown += `\n`;
                }
            }

            return {
                filename: filename,
                content: markdown,
                statistics: stats
            };
        }

        /**
         * QC 보고서 다운로드
         */
        downloadQCReport(reportName) {
            const report = this.generateQCReport(reportName);

            const blob = new Blob([report.content], {
                type: 'text/markdown;charset=utf-8'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = report.filename;
            link.click();
            URL.revokeObjectURL(url);

            console.log(`✅ Downloaded QC report: ${report.filename}`);
            return true;
        }

        /**
         * 이슈 목록 가져오기
         */
        getIssues() {
            return this.issues;
        }

        /**
         * QC 통과 여부
         */
        isPassed() {
            const highIssues = this.filterIssues('high');
            return highIssues.length === 0;
        }

        /**
         * 검증 초기화
         */
        clearValidation() {
            this.issues = [];
            this.validationResults = [];
            console.log('✅ QC validation cleared');
        }
    }

    // Singleton instance
    const qcValidator = new QCValidator();

    // 전역으로 내보내기 (ES6 모듈 대신 window 객체 사용)
    if (typeof window !== 'undefined') {
        window.qcValidator = qcValidator;
        window.QCValidator = QCValidator;
    }

})(); // IIFE 종료

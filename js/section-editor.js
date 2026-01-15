/**
 * Section Editor Module
 * PSUR 보고서의 15개 섹션을 개별적으로 편집 관리
 *
 * 기능:
 * - 섹션 로드/저장 (DB + localStorage 캐시)
 * - 변경 이력 추적
 * - 전체 병합
 * - Word 내보내기
 */

// ES6 import 대신 window 객체에서 가져오기 (브라우저 스크립트 호환성)
// window._sectionEditorSupabase를 직접 사용하여 변수명 충돌 방지
const _sectionEditorSupabase = (typeof window !== 'undefined' && window._sectionEditorSupabase)
    ? window._sectionEditorSupabase
    : null;

class SectionEditor {
    constructor() {
        this.sections = {};
        this.currentSectionId = null;
        this.changeHistory = [];
        this.isModified = false;
        this.reportId = null;  // DB 연동용 보고서 UUID

        // 섹션 정의 (순서대로)
        this.sectionDefinitions = [
            { id: '00', name: '표지', description: '기본 정보를 포함한 표지' },
            { id: '01', name: '목차', description: '전체 문서 목차' },
            { id: '02', name: '약어설명', description: '사용된 약어 정리' },
            { id: '03', name: '서론', description: '보고서 목적 및 제품 소개' },
            { id: '04', name: '전세계판매허가현황', description: '국가별 허가 현황' },
            { id: '05', name: '안전성조치', description: '안전성 조치 내역' },
            { id: '06', name: '안전성정보참고정보변경', description: '참조 정보 변경 내역' },
            { id: '07', name: '환자노출', description: '판매량 및 환자 노출 데이터' },
            { id: '08', name: '개별증례병력', description: '이상사례 분석' },
            { id: '09', name: '시험', description: '임상시험 정보' },
            { id: '10', name: '기타정보', description: '문헌 검토 등' },
            { id: '11', name: '종합적인안전성평가', description: '전체 안전성 종합 평가' },
            { id: '12', name: '결론', description: '유익성-위해성 결론' },
            { id: '13', name: '참고문헌', description: '인용 문헌 목록' },
            { id: '14', name: '별첨', description: '별첨 자료' }
        ];
    }

    /**
     * 보고서 ID 설정 (DB 연동용)
     * @param {string} reportId - 보고서 UUID
     */
    setReportId(reportId) {
        this.reportId = reportId;
        console.log(`[SectionEditor] Report ID set: ${reportId}`);
    }

    /**
     * 보고서 ID 가져오기
     */
    getReportId() {
        return this.reportId;
    }

    /**
     * 섹션 로드 (DB 우선, localStorage 폴백)
     * @param {string} reportId - 보고서 UUID (옵션)
     */
    async loadSections(reportId = null) {
        // reportId 설정
        if (reportId) {
            this.reportId = reportId;
        }

        // 1. DB에서 로드 시도 (reportId가 있는 경우)
        if (this.reportId) {
            try {
                const result = await _sectionEditorSupabase.getSections(this.reportId);

                if (result.success && result.sections.length > 0) {
                    // DB 데이터를 로컬 포맷으로 변환
                    this.sections = {};
                    for (const dbSection of result.sections) {
                        this.sections[dbSection.section_number] = {
                            id: dbSection.section_number,
                            dbId: dbSection.id,  // DB UUID 저장
                            name: dbSection.section_name,
                            content: dbSection.content_markdown || '',
                            generatedAt: dbSection.created_at,
                            editedAt: dbSection.updated_at,
                            isEdited: dbSection.updated_at !== dbSection.created_at,
                            version: dbSection.version || 1
                        };
                    }

                    // localStorage 캐시 업데이트
                    this.updateLocalCache();

                    console.log(`[SectionEditor] ${result.sections.length}개 섹션 DB에서 로드됨`);
                    return true;
                }
            } catch (e) {
                console.warn('[SectionEditor] DB 로드 실패, localStorage 시도:', e);
            }
        }

        // 2. localStorage 폴백
        try {
            const stored = localStorage.getItem('generatedSections');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.sections = parsed;
                console.log(`[SectionEditor] ${Object.keys(this.sections).length}개 섹션 localStorage에서 로드됨`);

                // 2.0 섹션 13 (참고문헌) RAW 파일 목록 검증 및 자동 수정
                // RAW 파일 목록이 참고문헌으로 잘못 출력되는 문제 수정
                if (this.sections['13']) {
                    // 패턴: RAW 파일명 형식 (RAW1.1_한글, RAW1.1: 한글, RAW1.1 한글 등)
                    const rawPattern = /RAW\d+(\.\d+)?[_：:\s]/g;
                    if (rawPattern.test(this.sections['13'].content)) {
                        console.warn('[SectionEditor] 섹션 13에서 RAW 파일 목록 감지 → "해당사항 없음"으로 자동 수정');
                        this.sections['13'].content = '## 13. 참고문헌\n\n해당사항 없음';
                        // 수정된 내용 저장
                        localStorage.setItem('generatedSections', JSON.stringify(this.sections));
                    }
                }

                // 2.1 placeholder 확인 및 generatedPSURReport에서 재파싱
                const hasOnlyPlaceholders = this._checkPlaceholderContent();
                if (hasOnlyPlaceholders) {
                    console.log('[SectionEditor] Placeholder 콘텐츠 감지 - generatedPSURReport에서 재파싱 시도');
                    const reparsed = this._reparseFromGeneratedReport();
                    if (reparsed) {
                        this.updateLocalCache();
                        console.log('[SectionEditor] generatedPSURReport에서 재파싱 성공');
                    }
                }
                return true;
            }
        } catch (e) {
            console.error('[SectionEditor] localStorage 로드 실패:', e);
        }

        // 2.2 generatedSections가 없지만 generatedPSURReport가 있는 경우 재파싱 시도
        const reportData = localStorage.getItem('generatedPSURReport');
        if (reportData) {
            console.log('[SectionEditor] generatedSections 없음 - generatedPSURReport에서 파싱 시도');
            this.initEmptySections(); // 먼저 빈 섹션 초기화
            const reparsed = this._reparseFromGeneratedReport();
            if (reparsed) {
                this.updateLocalCache();
                console.log('[SectionEditor] generatedPSURReport에서 파싱 성공');
                return true;
            }
        }

        // 3. 빈 섹션 초기화
        this.initEmptySections();
        return false;
    }

    /**
     * placeholder 콘텐츠 확인
     * @returns {boolean} 모든 섹션이 placeholder인 경우 true
     */
    _checkPlaceholderContent() {
        const placeholderPattern = /\[이 섹션은 생성되지 않았습니다\]/;
        let placeholderCount = 0;
        let totalCount = 0;

        for (const section of Object.values(this.sections)) {
            totalCount++;
            if (section.content && placeholderPattern.test(section.content)) {
                placeholderCount++;
            }
        }

        // 80% 이상이 placeholder면 true
        return totalCount > 0 && (placeholderCount / totalCount) >= 0.8;
    }

    /**
     * generatedPSURReport에서 섹션 재파싱
     * @returns {boolean} 성공 여부
     */
    _reparseFromGeneratedReport() {
        try {
            const reportData = localStorage.getItem('generatedPSURReport');
            if (!reportData) return false;

            // localStorage에서 올바른 CS 데이터 가져오기 (사용자 입력 우선)
            const correctCSData = this._getCorrectCSData();

            const parsed = JSON.parse(reportData);
            let content = parsed.content || reportData;

            // markdown code block 제거
            if (typeof content === 'string') {
                content = content.trim();
                if (content.startsWith('```json')) {
                    content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
                } else if (content.startsWith('```')) {
                    content = content.replace(/^```\n?/, '').replace(/\n?```$/, '');
                }

                if (content.startsWith('{')) {
                    const jsonData = JSON.parse(content);

                    // LLM 응답의 잘못된 CS 데이터 추출 (대체용)
                    const wrongCSData = jsonData.extractedData?.CS || {};

                    if (jsonData.sections && typeof jsonData.sections === 'object') {
                        const sectionNames = {
                            '00': '표지', '01': '목차', '02': '약어설명', '03': '서론',
                            '04': '전세계판매허가현황', '05': '안전성조치', '06': '안전성정보참고정보변경',
                            '07': '환자노출', '08': '개별증례병력', '09': '시험',
                            '10': '기타정보', '11': '종합적인안전성평가', '12': '결론',
                            '13': '참고문헌', '14': '별첨'
                        };

                        for (const [key, value] of Object.entries(jsonData.sections)) {
                            const sectionId = key.substring(0, 2);
                            const sectionName = value.sectionName || sectionNames[sectionId] || `섹션 ${sectionId}`;
                            let sectionContent = value.content || `## ${sectionId}. ${sectionName}\n\n[내용 없음]`;

                            // LLM hallucination 수정: 잘못된 값을 올바른 값으로 대체
                            sectionContent = this._correctHallucination(sectionContent, wrongCSData, correctCSData);

                            this.sections[sectionId] = {
                                ...this.sections[sectionId],
                                id: sectionId,
                                name: sectionName,
                                content: sectionContent,
                                generatedAt: new Date().toISOString(),
                                isEdited: false
                            };
                        }

                        console.log(`[SectionEditor] ${Object.keys(jsonData.sections).length}개 섹션 재파싱 완료 (hallucination 수정됨)`);
                        return true;
                    }
                }
            }
        } catch (e) {
            console.error('[SectionEditor] generatedPSURReport 재파싱 실패:', e);
        }
        return false;
    }

    /**
     * localStorage에서 올바른 CS 데이터 가져오기
     * @returns {Object} CS 데이터
     */
    _getCorrectCSData() {
        try {
            const extractedData = localStorage.getItem('extractedData');
            if (extractedData) {
                const parsed = JSON.parse(extractedData);
                return parsed.CS || parsed;
            }
        } catch (e) {
            console.warn('[SectionEditor] extractedData 로드 실패:', e);
        }
        return {};
    }

    /**
     * LLM hallucination 수정 - 잘못된 값을 올바른 값으로 대체
     * @param {string} content - 섹션 콘텐츠
     * @param {Object} wrongData - LLM이 생성한 잘못된 데이터
     * @param {Object} correctData - localStorage의 올바른 데이터
     * @returns {string} 수정된 콘텐츠
     */
    _correctHallucination(content, wrongData, correctData) {
        if (!content || !correctData) return content;

        // 주요 CS 필드 매핑
        const fieldMappings = [
            { key: 'CS0_성분명', label: '성분명' },
            { key: 'CS1_브랜드명', label: '브랜드명' },
            { key: 'CS2_회사명', label: '회사명' },
            { key: 'CS3_보고시작날짜', label: '보고시작날짜' },
            { key: 'CS4_보고종료날짜', label: '보고종료날짜' },
            { key: 'CS5_국내허가일자', label: '국내허가일자' },
            { key: 'CS6_보고서제출일', label: '보고서제출일' },
            { key: 'CS15_효능효과', label: '효능효과' },
            { key: 'CS16_용법용량', label: '용법용량' }
        ];

        let correctedContent = content;

        for (const field of fieldMappings) {
            const wrongValue = wrongData[field.key];
            const correctValue = correctData[field.key];

            if (wrongValue && correctValue && wrongValue !== correctValue) {
                // 잘못된 값을 올바른 값으로 전역 대체
                const escapedWrong = wrongValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedWrong, 'g');
                correctedContent = correctedContent.replace(regex, correctValue);
                console.log(`[SectionEditor] Hallucination 수정: "${wrongValue}" → "${correctValue}"`);
            }
        }

        return correctedContent;
    }

    /**
     * 동기 로드 (기존 호환성용)
     * @deprecated Use async loadSections() instead
     */
    loadSectionsSync() {
        try {
            const stored = localStorage.getItem('generatedSections');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.sections = parsed;
                console.log(`[SectionEditor] ${Object.keys(this.sections).length}개 섹션 로드됨 (sync)`);
                return true;
            }
        } catch (e) {
            console.error('[SectionEditor] 섹션 로드 실패:', e);
        }

        this.initEmptySections();
        return false;
    }

    /**
     * localStorage 캐시 업데이트
     */
    updateLocalCache() {
        try {
            localStorage.setItem('generatedSections', JSON.stringify(this.sections));
        } catch (e) {
            console.warn('[SectionEditor] 캐시 업데이트 실패:', e);
        }
    }

    /**
     * 빈 섹션 초기화
     */
    initEmptySections() {
        this.sections = {};
        for (const def of this.sectionDefinitions) {
            this.sections[def.id] = {
                id: def.id,
                name: def.name,
                content: `## ${def.id}. ${def.name}\n\n[내용이 생성되지 않았습니다]`,
                generatedAt: null,
                editedAt: null,
                isEdited: false
            };
        }
    }

    /**
     * 특정 섹션 가져오기
     */
    getSection(sectionId) {
        return this.sections[sectionId] || null;
    }

    /**
     * 모든 섹션 가져오기
     */
    getAllSections() {
        return this.sections;
    }

    /**
     * 섹션 정의 목록 가져오기
     */
    getSectionDefinitions() {
        return this.sectionDefinitions;
    }

    /**
     * 현재 섹션 설정
     */
    setCurrentSection(sectionId) {
        if (this.sections[sectionId]) {
            this.currentSectionId = sectionId;
            return true;
        }
        return false;
    }

    /**
     * 현재 섹션 가져오기
     */
    getCurrentSection() {
        if (this.currentSectionId) {
            return this.sections[this.currentSectionId];
        }
        return null;
    }

    /**
     * 섹션 내용 수정
     */
    updateSection(sectionId, content) {
        if (!this.sections[sectionId]) {
            return false;
        }

        const section = this.sections[sectionId];
        const beforeContent = section.content;

        // 변경 이력 기록
        this.changeHistory.push({
            sectionId: sectionId,
            sectionName: section.name,
            before: beforeContent,
            after: content,
            timestamp: new Date().toISOString(),
            editor: this.getEditorName()
        });

        // 섹션 업데이트
        section.content = content;
        section.editedAt = new Date().toISOString();
        section.isEdited = true;
        this.isModified = true;

        return true;
    }

    /**
     * 섹션 저장 (DB + localStorage)
     * @param {string} sectionId - 섹션 번호 (예: "00", "01")
     */
    async saveSection(sectionId) {
        const section = this.sections[sectionId];
        if (!section) {
            return false;
        }

        try {
            // 1. DB에 저장 (reportId가 있는 경우)
            if (this.reportId) {
                const result = await _sectionEditorSupabase.upsertSection(this.reportId, sectionId, {
                    name: section.name,
                    content: section.content,
                    version: (section.version || 0) + 1
                });

                if (result.success) {
                    // DB UUID 업데이트
                    section.dbId = result.section.id;
                    section.version = result.section.version;
                    console.log(`[SectionEditor] 섹션 ${sectionId} DB 저장 완료`);
                } else {
                    console.warn(`[SectionEditor] DB 저장 실패, localStorage만 저장:`, result.error);
                }
            }

            // 2. localStorage에도 저장
            localStorage.setItem('generatedSections', JSON.stringify(this.sections));
            localStorage.setItem('sectionEditHistory', JSON.stringify(this.changeHistory));
            console.log(`[SectionEditor] 섹션 ${sectionId} 저장 완료`);
            return true;

        } catch (e) {
            console.error('[SectionEditor] 섹션 저장 실패:', e);

            // 오프라인 저장
            try {
                localStorage.setItem('generatedSections', JSON.stringify(this.sections));
                console.warn('[SectionEditor] 오프라인 저장 완료');
            } catch (localError) {
                console.error('[SectionEditor] localStorage 저장도 실패:', localError);
            }

            return false;
        }
    }

    /**
     * 동기 저장 (기존 호환성용)
     * @deprecated Use async saveSection() instead
     */
    saveSectionSync(sectionId) {
        if (!this.sections[sectionId]) {
            return false;
        }

        try {
            localStorage.setItem('generatedSections', JSON.stringify(this.sections));
            localStorage.setItem('sectionEditHistory', JSON.stringify(this.changeHistory));
            console.log(`[SectionEditor] 섹션 ${sectionId} 저장 완료 (sync)`);
            return true;
        } catch (e) {
            console.error('[SectionEditor] 섹션 저장 실패:', e);
            return false;
        }
    }

    /**
     * 모든 섹션 저장 (DB + localStorage)
     */
    async saveAllSections() {
        try {
            // 1. DB에 일괄 저장 (reportId가 있는 경우)
            if (this.reportId) {
                const sectionsToSave = Object.values(this.sections).map(sec => ({
                    number: sec.id,
                    name: sec.name,
                    content: sec.content,
                    version: (sec.version || 0) + 1
                }));

                const result = await _sectionEditorSupabase.bulkUpsertSections(this.reportId, sectionsToSave);

                if (result.success) {
                    // DB UUID 업데이트
                    for (const dbSection of result.sections) {
                        if (this.sections[dbSection.section_number]) {
                            this.sections[dbSection.section_number].dbId = dbSection.id;
                            this.sections[dbSection.section_number].version = dbSection.version;
                        }
                    }
                    console.log(`[SectionEditor] ${result.sections.length}개 섹션 DB 저장 완료`);
                } else {
                    console.warn('[SectionEditor] DB 일괄 저장 실패:', result.error);
                }
            }

            // 2. localStorage에도 저장
            localStorage.setItem('generatedSections', JSON.stringify(this.sections));
            localStorage.setItem('sectionEditHistory', JSON.stringify(this.changeHistory));
            this.isModified = false;
            console.log('[SectionEditor] 모든 섹션 저장 완료');
            return true;

        } catch (e) {
            console.error('[SectionEditor] 전체 저장 실패:', e);

            // 오프라인 저장
            try {
                localStorage.setItem('generatedSections', JSON.stringify(this.sections));
                console.warn('[SectionEditor] 오프라인 저장 완료');
            } catch (localError) {
                console.error('[SectionEditor] localStorage 저장도 실패:', localError);
            }

            return false;
        }
    }

    /**
     * 동기 전체 저장 (기존 호환성용)
     * @deprecated Use async saveAllSections() instead
     */
    saveAllSectionsSync() {
        try {
            localStorage.setItem('generatedSections', JSON.stringify(this.sections));
            localStorage.setItem('sectionEditHistory', JSON.stringify(this.changeHistory));
            this.isModified = false;
            console.log('[SectionEditor] 모든 섹션 저장 완료 (sync)');
            return true;
        } catch (e) {
            console.error('[SectionEditor] 전체 저장 실패:', e);
            return false;
        }
    }

    /**
     * 섹션 초기화 (원본으로 복원)
     */
    resetSection(sectionId) {
        try {
            const stored = localStorage.getItem('generatedSections');
            if (stored) {
                const original = JSON.parse(stored);
                if (original[sectionId]) {
                    this.sections[sectionId] = { ...original[sectionId] };
                    return true;
                }
            }
        } catch (e) {
            console.error('[SectionEditor] 섹션 초기화 실패:', e);
        }
        return false;
    }

    /**
     * 전체 섹션 병합
     */
    mergeAllSections() {
        const orderedIds = this.sectionDefinitions.map(d => d.id);
        let merged = `# PSUR 최종 보고서\n\n`;
        merged += `**생성일시**: ${new Date().toLocaleString('ko-KR')}\n\n`;
        merged += `---\n\n`;

        for (const id of orderedIds) {
            const section = this.sections[id];
            if (section && section.content) {
                merged += section.content + '\n\n---\n\n';
            }
        }

        // 병합 결과 저장
        try {
            localStorage.setItem('mergedReport', JSON.stringify({
                content: merged,
                mergedAt: new Date().toISOString(),
                sectionCount: orderedIds.length
            }));
        } catch (e) {
            console.warn('[SectionEditor] 병합 결과 저장 실패:', e);
        }

        return merged;
    }

    /**
     * Word 문서 내보내기 (기본 구현)
     */
    async exportToWord(filename = null) {
        const merged = this.mergeAllSections();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '').substring(0, 15);
        const finalFilename = filename || `PSUR_Report_${timestamp}.md`;

        // Blob 생성 및 다운로드
        const blob = new Blob([merged], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = finalFilename;
        link.click();
        URL.revokeObjectURL(url);

        console.log(`[SectionEditor] 파일 다운로드: ${finalFilename}`);
        return true;
    }

    /**
     * 변경 이력 가져오기
     */
    getChangeHistory() {
        return this.changeHistory;
    }

    /**
     * 변경 이력 초기화
     */
    clearChangeHistory() {
        this.changeHistory = [];
        try {
            localStorage.removeItem('sectionEditHistory');
        } catch (e) {
            console.warn('[SectionEditor] 이력 삭제 실패:', e);
        }
    }

    /**
     * 섹션 상태 요약
     */
    getSummary() {
        const total = this.sectionDefinitions.length;
        let generated = 0;
        let edited = 0;

        for (const id of Object.keys(this.sections)) {
            const section = this.sections[id];
            if (section.generatedAt) generated++;
            if (section.isEdited) edited++;
        }

        return {
            total,
            generated,
            edited,
            pending: total - generated,
            isComplete: generated === total
        };
    }

    /**
     * 섹션 상태 (완료/진행중/대기)
     */
    getSectionStatus(sectionId) {
        const section = this.sections[sectionId];
        if (!section) return 'unknown';

        if (section.isEdited) return 'edited';
        if (section.generatedAt) return 'generated';
        return 'pending';
    }

    /**
     * 편집자 이름 가져오기
     */
    getEditorName() {
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                const parsed = JSON.parse(userData);
                return parsed.name || parsed.email || 'Unknown';
            }
        } catch (e) {
            // 무시
        }
        return 'Unknown';
    }

    /**
     * 수정 여부 확인
     */
    hasUnsavedChanges() {
        return this.isModified;
    }

    /**
     * 마크다운을 HTML로 변환 (기본 구현)
     */
    markdownToHtml(markdown) {
        if (!markdown) return '';

        // 테이블 변환 먼저 처리
        let html = this.convertTables(markdown);

        // 간단한 마크다운 → HTML 변환
        html = html
            // 헤더
            .replace(/^### (.*)$/gm, '<h3>$1</h3>')
            .replace(/^## (.*)$/gm, '<h2>$1</h2>')
            .replace(/^# (.*)$/gm, '<h1>$1</h1>')
            // 굵게/이탤릭
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // 줄바꿈
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        return `<p>${html}</p>`;
    }

    /**
     * 마크다운 테이블을 HTML 테이블로 변환
     */
    convertTables(markdown) {
        // 테이블 패턴: | col1 | col2 | 형식의 연속된 줄
        const tableRegex = /(?:^|\n)((?:\|[^\n]+\|\n?)+)/g;

        return markdown.replace(tableRegex, (match, tableBlock) => {
            const lines = tableBlock.trim().split('\n').filter(line => line.trim());
            if (lines.length < 2) return match;

            // 구분선 확인 (|---|---|---| 형태)
            const separatorIndex = lines.findIndex(line => /^\|[\s\-:|]+\|$/.test(line.trim()) && line.includes('---'));
            if (separatorIndex === -1) return match;

            let tableHtml = '<table class="md-table">';

            // 헤더 행
            if (separatorIndex > 0) {
                tableHtml += '<thead><tr>';
                const headerCells = lines[0].split('|').filter(cell => cell.trim() !== '');
                headerCells.forEach(cell => {
                    tableHtml += `<th>${cell.trim()}</th>`;
                });
                tableHtml += '</tr></thead>';
            }

            // 바디 행
            tableHtml += '<tbody>';
            for (let i = separatorIndex + 1; i < lines.length; i++) {
                const cells = lines[i].split('|').filter(cell => cell.trim() !== '');
                if (cells.length > 0) {
                    tableHtml += '<tr>';
                    cells.forEach(cell => {
                        tableHtml += `<td>${cell.trim()}</td>`;
                    });
                    tableHtml += '</tr>';
                }
            }
            tableHtml += '</tbody></table>';

            return '\n' + tableHtml + '\n';
        });
    }

    /**
     * HTML을 마크다운으로 변환 (기본 구현)
     */
    htmlToMarkdown(html) {
        if (!html) return '';

        // 간단한 HTML → 마크다운 변환
        let markdown = html
            .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n')
            .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n')
            .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<em>(.*?)<\/em>/gi, '*$1*')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p><p>/gi, '\n\n')
            .replace(/<\/?p>/gi, '')
            .replace(/<[^>]+>/g, ''); // 나머지 태그 제거

        return markdown.trim();
    }
}

// Singleton instance
const sectionEditor = new SectionEditor();

// 전역으로 노출 (기존 호환성)
if (typeof window !== 'undefined') {
    window.SectionEditor = SectionEditor;
    window.sectionEditor = sectionEditor;
}

// ES6 Module export (조건부 - 모듈로 로드될 때만 사용)
// export default sectionEditor;
// export { SectionEditor };

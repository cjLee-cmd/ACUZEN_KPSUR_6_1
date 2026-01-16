/**
 * Output Generator
 * 최종 Word 문서 출력
 * docx.js 라이브러리를 사용한 실제 Word 문서 생성
 * DB 연동: Supabase report_sections 테이블에서 섹션 조회
 *
 * 참조 문서 포맷: 품목갱신+안전성_draft9_20251230.docx
 * - A4 페이지 (21cm x 29.7cm)
 * - 여백: 상 3cm, 하/좌/우 2.54cm
 * - 폰트: Malgun Gothic
 */

// IIFE로 감싸서 const 선언이 전역 스코프와 충돌하지 않도록 함
(function() {
'use strict';

// DateHelper fallback
const DateHelper = window.DateHelper || {
    formatYYMMDD_hhmmss: () => {
        const now = new Date();
        return now.toISOString().replace(/[-:T]/g, '').substring(0, 14);
    },
    formatISO: () => new Date().toISOString()
};

// DOCX 스타일 설정 참조 (docx-styles-config.js에서 로드)
const getStyleConfig = () => window.DOCX_STYLES_CONFIG || null;
const getStyleHelpers = () => window.DOCX_STYLE_HELPERS || null;

class OutputGenerator {
    constructor() {
        this.outputHistory = this.loadHistory();
        this.reportId = null; // DB 연동용 보고서 ID
        // docx 라이브러리는 비동기로 로드 (생성자에서 에러 방지)
        this.docxLoaded = false;
        this.loadDocxLibrary().then(() => {
            this.docxLoaded = true;
        }).catch(() => {
            console.warn('docx library not available, using HTML fallback');
        });
    }

    /**
     * 보고서 ID 설정 (DB 연동용)
     * @param {string} reportId - 보고서 UUID
     */
    setReportId(reportId) {
        this.reportId = reportId;
        console.log(`[OutputGenerator] Report ID set: ${reportId}`);
    }

    /**
     * 보고서 ID 가져오기
     */
    getReportId() {
        return this.reportId;
    }

    /**
     * DB에서 섹션들 로드
     * @returns {Promise<Object>} - 섹션 객체 또는 null
     */
    async loadSectionsFromDB() {
        if (!this.reportId) {
            console.warn('[OutputGenerator] Report ID not set, cannot load from DB');
            return null;
        }

        try {
            // supabaseClient 동적 참조 (전역 또는 window에서)
            const supabaseClient = window.supabaseClient ||
                (typeof require !== 'undefined' ? require('./supabase-client.js').default : null);

            if (!supabaseClient) {
                console.warn('[OutputGenerator] supabaseClient not available');
                return null;
            }

            const result = await supabaseClient.getSections(this.reportId);

            if (!result.success || !result.sections || result.sections.length === 0) {
                console.log('[OutputGenerator] No sections found in DB');
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
                    dbId: dbSection.id,
                    version: dbSection.version
                };
            }

            console.log(`[OutputGenerator] ✅ ${Object.keys(sections).length} sections loaded from DB`);
            return sections;

        } catch (error) {
            console.error('[OutputGenerator] DB load error:', error);
            return null;
        }
    }

    /**
     * 섹션 데이터 가져오기 (DB 우선, localStorage 폴백)
     * @returns {Promise<Object>} - 섹션 객체
     */
    async getSectionsForOutput() {
        // 1. DB에서 로드 시도
        if (this.reportId) {
            const dbSections = await this.loadSectionsFromDB();
            if (dbSections && Object.keys(dbSections).length > 0) {
                return dbSections;
            }
        }

        // 2. localStorage 폴백
        try {
            const stored = localStorage.getItem('generatedSections');
            if (stored) {
                const sections = JSON.parse(stored);
                console.log(`[OutputGenerator] Loaded ${Object.keys(sections).length} sections from localStorage`);
                return sections;
            }
        } catch (e) {
            console.warn('[OutputGenerator] Failed to load from localStorage:', e);
        }

        return {};
    }

    /**
     * 섹션들을 마크다운으로 결합
     * @param {Object} sections - 섹션 객체
     * @returns {string} - 결합된 마크다운
     */
    combineSectionsToMarkdown(sections) {
        if (!sections || Object.keys(sections).length === 0) {
            return '';
        }

        // 섹션 번호순 정렬
        const sortedIds = Object.keys(sections).sort((a, b) => {
            return parseInt(a) - parseInt(b);
        });

        let combined = '';
        for (const id of sortedIds) {
            const section = sections[id];
            if (section && section.content) {
                combined += section.content + '\n\n---\n\n';
            }
        }

        return combined.trim();
    }

    /**
     * docx.js 라이브러리 로드 (로컬 우선, CDN fallback)
     */
    async loadDocxLibrary() {
        if (typeof docx !== 'undefined') return;

        // 로드 시도할 소스 목록 (우선순위 순)
        const sources = [
            '../lib/docx.min.js',  // 로컬 라이브러리 (우선)
            'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.min.js',  // jsdelivr CDN
            'https://unpkg.com/docx@8.5.0/build/index.umd.min.js'  // unpkg CDN (fallback)
        ];

        for (const src of sources) {
            try {
                const script = document.createElement('script');
                script.src = src;
                document.head.appendChild(script);
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
                console.log(`docx.js library loaded from: ${src}`);
                return; // 성공하면 종료
            } catch (e) {
                console.warn(`Failed to load docx.js from ${src}, trying next source...`);
                // 실패한 스크립트 태그 제거
                const failedScript = document.querySelector(`script[src="${src}"]`);
                if (failedScript) failedScript.remove();
            }
        }

        console.warn('Failed to load docx.js from all sources, will use HTML fallback');
    }

    /**
     * 저장된 히스토리 로드
     */
    loadHistory() {
        try {
            return JSON.parse(localStorage.getItem('outputHistory')) || [];
        } catch (e) {
            return [];
        }
    }

    /**
     * 히스토리 저장
     */
    saveHistory() {
        try {
            localStorage.setItem('outputHistory', JSON.stringify(this.outputHistory.slice(0, 10)));
        } catch (e) {
            console.warn('Failed to save history');
        }
    }

    /**
     * 마크다운을 Word 문서로 변환
     * docx.js 라이브러리 사용
     */
    async generateWordDocument(reportName, markdownContent, isDraft = false) {
        console.log(`📄 Generating Word document: ${reportName}`);

        const suffix = isDraft ? '_Draft' : '';
        const timestamp = DateHelper.formatYYMMDD_hhmmss();
        const filename = `${reportName}${suffix}_${timestamp}.docx`;

        try {
            // docx.js가 로드되었는지 확인
            if (typeof docx !== 'undefined') {
                const blob = await this.createDocxBlob(markdownContent, reportName, isDraft);
                this.downloadBlob(blob, filename);

                // 출력 이력 기록
                this.outputHistory.unshift({
                    id: Date.now(),
                    name: filename,
                    format: 'docx',
                    timestamp: new Date().toLocaleString('ko-KR'),
                    size: this.formatFileSize(blob.size),
                    reportName: reportName,
                    isDraft: isDraft,
                    generatedAt: DateHelper.formatISO()
                });
                this.saveHistory();

                console.log(`✅ Word document generated: ${filename}`);
                return { success: true, filename: filename, size: blob.size };
            }
        } catch (error) {
            console.warn('docx generation failed, falling back to HTML:', error);
        }

        // Fallback: HTML로 다운로드
        return this.downloadHTML(reportName, markdownContent, isDraft);
    }

    /**
     * docx Blob 생성 (MFDS 포맷 준수)
     * @param {string} markdownContent - 마크다운 콘텐츠
     * @param {string} reportName - 보고서 이름
     * @param {boolean} isDraft - 초안 여부
     * @param {Object} options - 추가 옵션 (sectionMetadata 등)
     */
    async createDocxBlob(markdownContent, reportName, isDraft, options = {}) {
        const { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
                WidthType, AlignmentType, Packer, BorderStyle, convertInchesToTwip,
                PageOrientation, Header, Footer, PageNumber } = docx;

        // 스타일 설정 가져오기
        const styleConfig = getStyleConfig();
        const styleHelpers = getStyleHelpers();

        // 마크다운 파싱
        const sections = this.parseMarkdownToSections(markdownContent);

        // 문서 자식 요소 생성
        const children = [];

        // Draft 워터마크
        if (isDraft) {
            const draftStyle = styleConfig?.SPECIAL_STYLES?.DRAFT_WATERMARK || {};
            children.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                    children: [
                        new TextRun({
                            text: draftStyle.text || '[ DRAFT - 초안 ]',
                            bold: draftStyle.bold !== false,
                            color: draftStyle.color || 'FF0000',
                            size: draftStyle.size || 32,
                            font: draftStyle.font || 'Malgun Gothic'
                        })
                    ]
                })
            );
        }

        // 현재 처리 중인 표 번호 추적
        let currentTableNumber = 0;

        // 섹션별 콘텐츠 추가
        for (const section of sections) {
            // 섹션 ID 추출 (00, 01, 02, ... 14)
            const sectionId = this.extractSectionId(section.heading?.text);

            // 표지 페이지 특별 처리
            if (sectionId === '00' || this.isCoverPageContent(section)) {
                const coverElements = this.createCoverPageElements(section, styleConfig);
                children.push(...coverElements);
                continue;
            }

            // 헤딩
            if (section.heading) {
                const headingStyle = styleConfig?.HEADING_STYLES?.[`H${section.heading.level}`] || {};
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: section.heading.text,
                                bold: headingStyle.bold !== false,
                                size: headingStyle.size || (section.heading.level === 1 ? 28 : 24),
                                font: headingStyle.font || 'Malgun Gothic'
                            })
                        ],
                        heading: section.heading.level === 1 ? HeadingLevel.HEADING_1 :
                                 section.heading.level === 2 ? HeadingLevel.HEADING_2 :
                                 HeadingLevel.HEADING_3,
                        spacing: headingStyle.spacing || { before: 240, after: 120 }
                    })
                );
            }

            // 문단 (인라인 마크다운 파싱 적용)
            const bodyStyle = styleConfig?.BODY_STYLES?.NORMAL || {};
            const baseTextStyle = {
                size: bodyStyle.size || 22,
                font: bodyStyle.font || 'Malgun Gothic'
            };

            for (const para of section.paragraphs || []) {
                const textRuns = this.parseInlineMarkdown(para, baseTextStyle);
                children.push(
                    new Paragraph({
                        children: textRuns,
                        spacing: bodyStyle.spacing || { after: 120 }
                    })
                );
            }

            // 리스트 렌더링
            for (const list of section.lists || []) {
                for (const item of list.items) {
                    const textRuns = this.parseInlineMarkdown(item.text, baseTextStyle);

                    if (list.type === 'bullet') {
                        // 불릿 리스트
                        children.push(
                            new Paragraph({
                                children: textRuns,
                                bullet: {
                                    level: item.level || 0
                                },
                                spacing: { after: 60 }
                            })
                        );
                    } else {
                        // 숫자 리스트
                        children.push(
                            new Paragraph({
                                children: textRuns,
                                numbering: {
                                    reference: 'default-numbering',
                                    level: item.level || 0
                                },
                                spacing: { after: 60 }
                            })
                        );
                    }
                }
            }

            // 테이블
            if (section.table && section.table.length > 0) {
                currentTableNumber++;
                const tableId = `표${currentTableNumber}`;
                children.push(this.createDocxTable(section.table, tableId, styleConfig));
            }
        }

        // 페이지 설정 (A4, MFDS 여백)
        const pageSettings = styleConfig?.PAGE_SETTINGS || {
            size: { width: 11906, height: 16838 },
            margins: { top: 1701, bottom: 1440, left: 1440, right: 1440 }
        };

        // 문서 생성
        const doc = new Document({
            creator: 'KPSUR AGENT',
            title: reportName,
            description: 'PSUR 자동 생성 보고서 - MFDS 규정 준수',
            styles: this.getDocumentStyles(styleConfig),
            sections: [{
                properties: {
                    page: {
                        size: {
                            width: pageSettings.size.width,
                            height: pageSettings.size.height,
                            orientation: PageOrientation.PORTRAIT
                        },
                        margin: {
                            top: pageSettings.margins.top,
                            bottom: pageSettings.margins.bottom,
                            left: pageSettings.margins.left,
                            right: pageSettings.margins.right
                        }
                    }
                },
                children: children
            }]
        });

        return await Packer.toBlob(doc);
    }

    /**
     * 문서 스타일 정의 생성
     * @param {Object} styleConfig - 스타일 설정
     * @returns {Object} docx.js styles 객체
     */
    getDocumentStyles(styleConfig) {
        const fonts = styleConfig?.FONTS || { PRIMARY: 'Malgun Gothic' };
        const headingStyles = styleConfig?.HEADING_STYLES || {};

        return {
            default: {
                document: {
                    run: {
                        font: fonts.PRIMARY,
                        size: 22  // 11pt
                    },
                    paragraph: {
                        spacing: { after: 120 }
                    }
                },
                heading1: {
                    run: {
                        font: fonts.PRIMARY,
                        size: headingStyles.H1?.size || 28,
                        bold: true
                    },
                    paragraph: {
                        spacing: headingStyles.H1?.spacing || { before: 240, after: 120 }
                    }
                },
                heading2: {
                    run: {
                        font: fonts.PRIMARY,
                        size: headingStyles.H2?.size || 24,
                        bold: true
                    },
                    paragraph: {
                        spacing: headingStyles.H2?.spacing || { before: 200, after: 100 }
                    }
                },
                heading3: {
                    run: {
                        font: fonts.PRIMARY,
                        size: headingStyles.H3?.size || 22,
                        bold: true
                    },
                    paragraph: {
                        spacing: headingStyles.H3?.spacing || { before: 160, after: 80 }
                    }
                }
            }
        };
    }

    /**
     * 섹션 ID 추출 (헤딩 텍스트에서)
     * @param {string} headingText - 헤딩 텍스트
     * @returns {string|null} 섹션 ID (00-14) 또는 null
     */
    extractSectionId(headingText) {
        if (!headingText) return null;

        // "00. 표지", "1. 서론", "## 03. 서론" 등의 패턴 매칭
        const patterns = [
            /^(\d{1,2})\.\s/,           // "1. " or "01. "
            /^##?\s*(\d{1,2})\.\s/,     // "# 1. " or "## 01. "
            /^섹션\s*(\d{1,2})/          // "섹션 1" or "섹션 01"
        ];

        for (const pattern of patterns) {
            const match = headingText.match(pattern);
            if (match) {
                const num = parseInt(match[1]);
                return num.toString().padStart(2, '0');
            }
        }

        // 특정 키워드로 섹션 식별
        const sectionKeywords = {
            '표지': '00',
            '목차': '01',
            '약어': '02',
            '서론': '03',
            '전세계': '04',
            '안전성 이유': '05',
            '안전성 정보': '06',
            '환자노출': '07',
            '개별 증례': '08',
            '시험': '09',
            '기타': '10',
            '종합적인': '11',
            '결론': '12',
            '참고문헌': '13',
            '별첨': '14'
        };

        for (const [keyword, id] of Object.entries(sectionKeywords)) {
            if (headingText.includes(keyword)) {
                return id;
            }
        }

        return null;
    }

    /**
     * 표지 콘텐츠 여부 확인
     * @param {Object} section - 섹션 객체
     * @returns {boolean}
     */
    isCoverPageContent(section) {
        if (!section.heading) return false;
        const text = section.heading.text.toLowerCase();
        return text.includes('표지') || text.includes('cover');
    }

    /**
     * 표지 페이지 요소 생성
     * @param {Object} section - 섹션 객체
     * @param {Object} styleConfig - 스타일 설정
     * @returns {Array} Paragraph 배열
     */
    createCoverPageElements(section, styleConfig) {
        const { Paragraph, TextRun, AlignmentType } = docx;
        const elements = [];
        const coverStyle = styleConfig?.SECTION_STYLES?.['00'] || {};

        // 빈 줄 추가 (상단 여백)
        for (let i = 0; i < 3; i++) {
            elements.push(new Paragraph({ text: '' }));
        }

        // 제목 (브랜드명/성분명)
        if (section.heading) {
            const titleStyle = coverStyle.title || {};
            elements.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: titleStyle.spacing || { before: 1440, after: 240 },
                    children: [
                        new TextRun({
                            text: section.heading.text.replace(/^#+\s*\d*\.?\s*/, ''),
                            bold: titleStyle.bold !== false,
                            size: titleStyle.size || 48,
                            font: titleStyle.font || 'Malgun Gothic'
                        })
                    ]
                })
            );
        }

        // 본문 내용 (정보 라인들)
        const infoStyle = coverStyle.infoLine || {};
        for (const para of section.paragraphs || []) {
            // 라벨:값 패턴 감지 (예: "보고기간: 2024-01-01 ~ 2024-12-31")
            const colonIndex = para.indexOf(':');
            if (colonIndex > 0 && colonIndex < 20) {
                const label = para.substring(0, colonIndex + 1);
                const value = para.substring(colonIndex + 1).trim();

                elements.push(
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: infoStyle.spacing || { after: 80 },
                        children: [
                            new TextRun({
                                text: label,
                                bold: infoStyle.labelBold !== false,
                                size: infoStyle.size || 22,
                                font: infoStyle.font || 'Malgun Gothic'
                            }),
                            new TextRun({
                                text: ' ' + value,
                                bold: false,
                                size: infoStyle.size || 22,
                                font: infoStyle.font || 'Malgun Gothic'
                            })
                        ]
                    })
                );
            } else {
                elements.push(
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 80 },
                        children: [
                            new TextRun({
                                text: para,
                                size: infoStyle.size || 22,
                                font: infoStyle.font || 'Malgun Gothic'
                            })
                        ]
                    })
                );
            }
        }

        // 페이지 구분
        elements.push(
            new Paragraph({
                spacing: { after: 0 },
                pageBreakBefore: true
            })
        );

        return elements;
    }

    /**
     * 마크다운 인라인 포맷팅을 TextRun 배열로 변환
     * @param {string} text - 마크다운 텍스트
     * @param {Object} baseStyle - 기본 스타일
     * @returns {Array} TextRun 객체 배열
     */
    parseInlineMarkdown(text, baseStyle = {}) {
        const { TextRun } = docx;
        const runs = [];

        // 링크 제거 [text](#anchor) -> text
        text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

        // 볼드+이탤릭 (***text*** 또는 ___text___)
        // 볼드 (**text** 또는 __text__)
        // 이탤릭 (*text* 또는 _text_)
        const patterns = [
            { regex: /\*\*\*([^*]+)\*\*\*/g, bold: true, italics: true },
            { regex: /___([^_]+)___/g, bold: true, italics: true },
            { regex: /\*\*([^*]+)\*\*/g, bold: true, italics: false },
            { regex: /__([^_]+)__/g, bold: true, italics: false },
            { regex: /\*([^*]+)\*/g, bold: false, italics: true },
            { regex: /_([^_]+)_/g, bold: false, italics: true }
        ];

        // 마크다운 포맷팅 파싱
        let remaining = text;
        let lastIndex = 0;
        const segments = [];

        // 모든 마크다운 패턴 찾기
        const allMatches = [];
        for (const pattern of patterns) {
            let match;
            const tempText = text;
            pattern.regex.lastIndex = 0;
            while ((match = pattern.regex.exec(tempText)) !== null) {
                allMatches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[1],
                    bold: pattern.bold,
                    italics: pattern.italics,
                    fullMatch: match[0]
                });
            }
        }

        // 위치순 정렬
        allMatches.sort((a, b) => a.start - b.start);

        // 겹치는 매치 제거 (먼저 나온 것 우선)
        const filteredMatches = [];
        let lastEnd = 0;
        for (const match of allMatches) {
            if (match.start >= lastEnd) {
                filteredMatches.push(match);
                lastEnd = match.end;
            }
        }

        // 세그먼트 생성
        let currentPos = 0;
        for (const match of filteredMatches) {
            // 매치 이전의 일반 텍스트
            if (match.start > currentPos) {
                const normalText = text.substring(currentPos, match.start);
                if (normalText) {
                    runs.push(new TextRun({
                        text: normalText,
                        ...baseStyle
                    }));
                }
            }
            // 포맷된 텍스트
            runs.push(new TextRun({
                text: match.text,
                bold: match.bold || baseStyle.bold,
                italics: match.italics || baseStyle.italics,
                size: baseStyle.size,
                font: baseStyle.font
            }));
            currentPos = match.end;
        }

        // 남은 텍스트
        if (currentPos < text.length) {
            const normalText = text.substring(currentPos);
            if (normalText) {
                runs.push(new TextRun({
                    text: normalText,
                    ...baseStyle
                }));
            }
        }

        // 매치가 없으면 전체 텍스트를 일반 TextRun으로
        if (runs.length === 0) {
            runs.push(new TextRun({
                text: text,
                ...baseStyle
            }));
        }

        return runs;
    }

    /**
     * 리스트 아이템 여부 확인 및 파싱
     * @param {string} line - 라인 텍스트
     * @returns {Object|null} { type: 'bullet'|'number', level: number, text: string } 또는 null
     */
    parseListItem(line) {
        // 불릿 리스트: - item, * item, + item
        const bulletMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
        if (bulletMatch) {
            const indent = bulletMatch[1].length;
            const level = Math.floor(indent / 2);
            return {
                type: 'bullet',
                level: level,
                text: bulletMatch[3]
            };
        }

        // 숫자 리스트: 1. item, 1) item
        const numberMatch = line.match(/^(\s*)(\d+)[.)]\s+(.+)$/);
        if (numberMatch) {
            const indent = numberMatch[1].length;
            const level = Math.floor(indent / 2);
            return {
                type: 'number',
                level: level,
                number: parseInt(numberMatch[2]),
                text: numberMatch[3]
            };
        }

        return null;
    }

    /**
     * 마크다운을 섹션으로 파싱
     */
    parseMarkdownToSections(markdown) {
        const sections = [];
        const lines = markdown.split('\n');
        let currentSection = { paragraphs: [], lists: [] };
        let inTable = false;
        let tableLines = [];
        let currentList = null;

        for (const line of lines) {
            // 헤딩 파싱
            if (line.startsWith('# ')) {
                // 현재 리스트 저장
                if (currentList && currentList.items.length > 0) {
                    currentSection.lists.push(currentList);
                    currentList = null;
                }
                if (currentSection.heading || currentSection.paragraphs.length > 0 || currentSection.lists.length > 0) {
                    sections.push(currentSection);
                }
                currentSection = {
                    heading: { level: 1, text: line.substring(2).trim() },
                    paragraphs: [],
                    lists: [],
                    table: null
                };
            } else if (line.startsWith('## ')) {
                if (currentList && currentList.items.length > 0) {
                    currentSection.lists.push(currentList);
                    currentList = null;
                }
                if (currentSection.heading || currentSection.paragraphs.length > 0 || currentSection.lists.length > 0) {
                    sections.push(currentSection);
                }
                currentSection = {
                    heading: { level: 2, text: line.substring(3).trim() },
                    paragraphs: [],
                    lists: [],
                    table: null
                };
            } else if (line.startsWith('### ')) {
                if (currentList && currentList.items.length > 0) {
                    currentSection.lists.push(currentList);
                    currentList = null;
                }
                if (currentSection.heading || currentSection.paragraphs.length > 0 || currentSection.lists.length > 0) {
                    sections.push(currentSection);
                }
                currentSection = {
                    heading: { level: 3, text: line.substring(4).trim() },
                    paragraphs: [],
                    lists: [],
                    table: null
                };
            } else if (line.startsWith('|')) {
                // 테이블 시작 또는 계속
                if (currentList && currentList.items.length > 0) {
                    currentSection.lists.push(currentList);
                    currentList = null;
                }
                inTable = true;
                if (!line.includes('---')) {
                    tableLines.push(line);
                }
            } else if (inTable && !line.startsWith('|')) {
                // 테이블 종료
                if (tableLines.length > 0) {
                    currentSection.table = this.parseTableLines(tableLines);
                    tableLines = [];
                }
                inTable = false;
                if (line.trim()) {
                    // 리스트 아이템 체크
                    const listItem = this.parseListItem(line);
                    if (listItem) {
                        if (!currentList || currentList.type !== listItem.type) {
                            if (currentList && currentList.items.length > 0) {
                                currentSection.lists.push(currentList);
                            }
                            currentList = { type: listItem.type, items: [] };
                        }
                        currentList.items.push(listItem);
                    } else {
                        if (currentList && currentList.items.length > 0) {
                            currentSection.lists.push(currentList);
                            currentList = null;
                        }
                        currentSection.paragraphs.push(line.trim());
                    }
                }
            } else if (line.trim()) {
                // 리스트 아이템 체크
                const listItem = this.parseListItem(line);
                if (listItem) {
                    if (!currentList || currentList.type !== listItem.type) {
                        if (currentList && currentList.items.length > 0) {
                            currentSection.lists.push(currentList);
                        }
                        currentList = { type: listItem.type, items: [] };
                    }
                    currentList.items.push(listItem);
                } else {
                    if (currentList && currentList.items.length > 0) {
                        currentSection.lists.push(currentList);
                        currentList = null;
                    }
                    currentSection.paragraphs.push(line.trim());
                }
            }
        }

        // 마지막 리스트 저장
        if (currentList && currentList.items.length > 0) {
            currentSection.lists.push(currentList);
        }

        // 마지막 테이블 처리
        if (tableLines.length > 0) {
            currentSection.table = this.parseTableLines(tableLines);
        }

        if (currentSection.heading || currentSection.paragraphs.length > 0 || currentSection.lists.length > 0 || currentSection.table) {
            sections.push(currentSection);
        }

        return sections;
    }

    /**
     * 테이블 라인 파싱
     */
    parseTableLines(lines) {
        return lines.map(line => {
            return line.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
        });
    }

    /**
     * docx 테이블 생성 (스타일 적용)
     * @param {Array} tableData - 테이블 데이터 (2D 배열)
     * @param {string} tableId - 표 ID (예: "표1")
     * @param {Object} styleConfig - 스타일 설정
     */
    createDocxTable(tableData, tableId = null, styleConfig = null) {
        const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType,
                BorderStyle, VerticalAlign, AlignmentType } = docx;

        // 표별 스타일 가져오기
        let tableStyle;
        if (styleConfig && tableId) {
            const mapping = styleConfig.TABLE_MAPPING?.[tableId];
            const styleName = mapping?.style || 'DEFAULT';
            tableStyle = styleConfig.TABLE_STYLES?.[styleName] || styleConfig.TABLE_STYLES?.DEFAULT;
        }

        // 기본 스타일
        const defaultHeaderStyle = {
            font: 'Malgun Gothic',
            size: 20,
            bold: true,
            color: 'FFFFFF',
            shading: '25739B',
            alignment: AlignmentType.CENTER,
            margins: { top: 50, bottom: 50, left: 75, right: 75 }
        };

        const defaultBodyStyle = {
            font: 'Malgun Gothic',
            size: 20,
            bold: false,
            color: '000000',
            alignment: AlignmentType.LEFT,
            margins: { top: 50, bottom: 50, left: 75, right: 75 }
        };

        const headerStyle = tableStyle?.header || defaultHeaderStyle;
        const bodyStyle = tableStyle?.body || defaultBodyStyle;
        const borderConfig = tableStyle?.borders ?? {
            style: BorderStyle.SINGLE,
            size: 4,
            color: '000000'
        };

        const rows = tableData.map((rowData, rowIndex) => {
            const isHeader = rowIndex === 0;
            const currentStyle = isHeader ? headerStyle : bodyStyle;

            return new TableRow({
                tableHeader: isHeader,
                children: rowData.map(cellText => {
                    const cellChildren = [
                        new Paragraph({
                            alignment: currentStyle.alignment || AlignmentType.LEFT,
                            children: [
                                new TextRun({
                                    text: cellText || '',
                                    bold: currentStyle.bold || false,
                                    size: currentStyle.size || 20,
                                    color: currentStyle.color || '000000',
                                    font: currentStyle.font || 'Malgun Gothic'
                                })
                            ]
                        })
                    ];

                    const cellOptions = {
                        children: cellChildren,
                        verticalAlign: VerticalAlign.CENTER,
                        margins: currentStyle.margins || { top: 50, bottom: 50, left: 75, right: 75 }
                    };

                    // 헤더 행 음영 처리
                    if (isHeader && currentStyle.shading) {
                        cellOptions.shading = { fill: currentStyle.shading };
                    }

                    // 테두리 설정
                    if (borderConfig) {
                        cellOptions.borders = {
                            top: { style: BorderStyle.SINGLE, size: borderConfig.size || 4, color: borderConfig.color || '000000' },
                            bottom: { style: BorderStyle.SINGLE, size: borderConfig.size || 4, color: borderConfig.color || '000000' },
                            left: { style: BorderStyle.SINGLE, size: borderConfig.size || 4, color: borderConfig.color || '000000' },
                            right: { style: BorderStyle.SINGLE, size: borderConfig.size || 4, color: borderConfig.color || '000000' }
                        };
                    }

                    return new TableCell(cellOptions);
                })
            });
        });

        const tableOptions = {
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: rows
        };

        // 표 전체 테두리 (없는 경우)
        if (!borderConfig) {
            tableOptions.borders = {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE }
            };
        }

        return new Table(tableOptions);
    }

    /**
     * 파일 크기 포맷
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    /**
     * 마크다운을 HTML로 변환
     */
    markdownToHTML(markdown) {
        // marked.js 라이브러리 사용 권장
        // 간단한 변환
        let html = markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        html = `<p>${html}</p>`;

        return html;
    }

    /**
     * HTML 문서 다운로드
     */
    downloadHTML(reportName, markdownContent, isDraft = false) {
        const html = this.markdownToHTML(markdownContent);

        const fullHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportName}</title>
    <style>
        body {
            font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.8;
        }
        h1 {
            font-size: 24px;
            color: #1a1a1a;
            border-bottom: 2px solid #25739B;
            padding-bottom: 10px;
        }
        h2 {
            font-size: 20px;
            color: #333;
            margin-top: 30px;
        }
        h3 {
            font-size: 16px;
            color: #555;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        ${isDraft ? `
        body::before {
            content: 'DRAFT';
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: rgba(255, 0, 0, 0.1);
            font-weight: bold;
            pointer-events: none;
            z-index: -1;
        }
        ` : ''}
    </style>
</head>
<body>
${html}
</body>
</html>`;

        const suffix = isDraft ? '_Draft' : '';
        const timestamp = DateHelper.formatYYMMDD_hhmmss();
        const filename = `${reportName}${suffix}_${timestamp}.html`;

        const blob = new Blob([fullHTML], {
            type: 'text/html;charset=utf-8'
        });

        this.downloadBlob(blob, filename);

        console.log(`✅ HTML generated: ${filename}`);

        return {
            success: true,
            filename: filename
        };
    }

    /**
     * PDF 다운로드 (브라우저 인쇄 기능 사용)
     */
    printToPDF(reportName, markdownContent, isDraft = false) {
        // HTML 생성
        const html = this.markdownToHTML(markdownContent);

        // 새 창 열기
        const printWindow = window.open('', '_blank');

        const fullHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>${reportName}</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        body {
            font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
        }
        h1 {
            font-size: 18pt;
            color: #1a1a1a;
            border-bottom: 2px solid #25739B;
            padding-bottom: 10px;
        }
        h2 {
            font-size: 14pt;
            color: #333;
            margin-top: 20pt;
        }
        h3 {
            font-size: 12pt;
            color: #555;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10pt 0;
            font-size: 10pt;
        }
        th, td {
            border: 1px solid #000;
            padding: 5pt;
        }
        th {
            background-color: #f0f0f0;
        }
        ${isDraft ? `
        body::before {
            content: 'DRAFT';
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120pt;
            color: rgba(255, 0, 0, 0.1);
            font-weight: bold;
        }
        ` : ''}
    </style>
</head>
<body>
${html}
<script>
    window.print();
</script>
</body>
</html>`;

        printWindow.document.write(fullHTML);
        printWindow.document.close();

        console.log(`✅ PDF print dialog opened`);

        return {
            success: true,
            message: 'PDF 인쇄 대화상자가 열렸습니다.'
        };
    }

    /**
     * 보고서 포맷 검증
     */
    validateReportFormat(markdownContent) {
        const issues = [];

        // 빈 내용 확인
        if (!markdownContent || markdownContent.trim().length === 0) {
            issues.push('보고서 내용이 비어있습니다.');
        }

        // 최소 길이 확인
        if (markdownContent.length < 1000) {
            issues.push('보고서 내용이 너무 짧습니다. (최소 1000자)');
        }

        // 섹션 확인
        const sectionHeaders = (markdownContent.match(/^##\s+/gm) || []).length;
        if (sectionHeaders < 5) {
            issues.push(`섹션이 너무 적습니다. (현재: ${sectionHeaders}개, 최소: 5개)`);
        }

        // 표 확인
        const tables = (markdownContent.match(/\|.*\|/g) || []).length;
        if (tables === 0) {
            issues.push('표가 없습니다. 최소 1개 이상의 표가 필요합니다.');
        }

        if (issues.length > 0) {
            return {
                valid: false,
                issues: issues
            };
        }

        return { valid: true };
    }

    /**
     * 메타데이터 추가
     */
    addMetadata(markdownContent, metadata) {
        const metadataSection = `---
title: ${metadata.reportName || '제목 없음'}
version: ${metadata.version || '1.0'}
date: ${metadata.date || DateHelper.formatISO()}
author: ${metadata.author || '작성자 미상'}
status: ${metadata.isDraft ? 'DRAFT' : 'FINAL'}
---

`;

        return metadataSection + markdownContent;
    }

    /**
     * 출력 이력 가져오기
     */
    getOutputHistory() {
        return this.outputHistory;
    }

    /**
     * 통계
     */
    getStatistics() {
        return {
            totalOutputs: this.outputHistory.length,
            draftOutputs: this.outputHistory.filter(item => item.isDraft).length,
            finalOutputs: this.outputHistory.filter(item => !item.isDraft).length
        };
    }

    /**
     * Blob 다운로드 헬퍼
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * 출력 초기화
     */
    clearHistory() {
        this.outputHistory = [];
        console.log('✅ Output history cleared');
    }
}

// Singleton instance
const outputGenerator = new OutputGenerator();
console.log('✅ OutputGenerator instance created');

// 전역으로 내보내기 (ES6 모듈 대신)
if (typeof window !== 'undefined') {
    window.outputGenerator = outputGenerator;
    window.OutputGenerator = OutputGenerator;
    console.log('✅ window.outputGenerator set to OutputGenerator instance');
}

})(); // IIFE 종료

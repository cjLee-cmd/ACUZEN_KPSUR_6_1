/**
 * Markdown Converter
 * 소스 문서를 마크다운으로 변환
 *
 * NOTE: 핵심 변환 로직은 js/core/markdown-transform-core.js에 캡슐화되어 있습니다.
 *       변환 로직 수정이 필요한 경우 해당 core 모듈을 확인하세요.
 *
 * @requires MarkdownTransformCore - Core transformation module (sealed)
 */

// DateHelper fallback (config.js에서 이미 선언된 경우 재선언하지 않음)
if (!window.DateHelper) {
    window.DateHelper = {
        formatISO: () => new Date().toISOString(),
        formatYYMMDD_hhmmss: () => {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        }
    };
}

// Core 모듈 의존성 확인
(function checkCoreDependency() {
    const checkInterval = setInterval(() => {
        if (typeof window.MarkdownTransformCore !== 'undefined') {
            clearInterval(checkInterval);
            if (window.MarkdownTransformCore.verifyIntegrity()) {
                console.log('✅ MarkdownTransformCore integrity verified');
            } else {
                console.error('⚠️ MarkdownTransformCore integrity check failed!');
            }
        }
    }, 100);

    // 5초 후 타임아웃
    setTimeout(() => {
        clearInterval(checkInterval);
        if (typeof window.MarkdownTransformCore === 'undefined') {
            console.warn('⚠️ MarkdownTransformCore not loaded. Using fallback methods.');
        }
    }, 5000);
})();

class MarkdownConverter {
    constructor() {
        this.convertedFiles = [];
        this.conversionHistory = [];
    }

    /**
     * 파일을 마크다운으로 변환
     */
    async convertFile(file, rawId, options = {}) {
        console.log(`📝 Converting to markdown: ${file.name}`);

        // 전역 모듈 참조
        const handler = window.fileHandler;
        const llm = window.llmClient || window.multiLLMClient;

        try {
            // 파일 내용 읽기
            let fileData;
            if (handler && typeof handler.readFile === 'function') {
                fileData = await handler.readFile(file);
            } else {
                // Fallback: 직접 파일 읽기
                fileData = await this.fallbackReadFile(file);
            }

            // LLM을 사용한 마크다운 변환
            let result;
            if (llm && typeof llm.convertToMarkdown === 'function') {
                result = await llm.convertToMarkdown(
                    fileData.text,
                    file.name,
                    rawId
                );
            } else {
                // LLM이 없으면 원본 텍스트를 그대로 마크다운으로 반환
                result = {
                    success: true,
                    text: this.textToBasicMarkdown(fileData.text, file.name),
                    duration: 0,
                    model: 'none (direct conversion)'
                };
            }

            if (result.success) {
                const converted = {
                    originalFileName: file.name,
                    rawId: rawId,
                    markdownFileName: `${rawId}_${file.name}.md`,
                    markdownContent: result.text,
                    convertedAt: DateHelper.formatISO(),
                    duration: result.duration,
                    model: result.model
                };

                this.convertedFiles.push(converted);
                this.conversionHistory.push({
                    ...converted,
                    success: true
                });

                console.log(`✅ Conversion complete: ${file.name} (${result.duration}s)`);

                return {
                    success: true,
                    data: converted
                };
            }

            throw new Error(result.error || '변환 실패');

        } catch (error) {
            console.error(`❌ Conversion failed (${file.name}):`, error.message);

            this.conversionHistory.push({
                originalFileName: file.name,
                rawId: rawId,
                error: error.message,
                success: false,
                convertedAt: DateHelper.formatISO()
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 여러 파일 일괄 변환
     */
    async convertFiles(classifiedFiles, options = {}) {
        const results = [];

        for (const item of classifiedFiles) {
            if (!item.rawId || item.rawId === 'UNKNOWN') {
                console.warn(`⚠️ Skipping file without RAW ID: ${item.fileName}`);
                results.push({
                    success: false,
                    fileName: item.fileName,
                    error: 'RAW ID가 지정되지 않음'
                });
                continue;
            }

            const result = await this.convertFile(item.file, item.rawId, options);
            results.push({
                ...result,
                fileName: item.fileName,
                rawId: item.rawId
            });

            // API 호출 간격 (Rate limit 방지)
            if (options.delay) {
                await new Promise(resolve => setTimeout(resolve, options.delay));
            }
        }

        return results;
    }

    /**
     * 변환된 마크다운 파일 다운로드 (Blob)
     */
    downloadMarkdown(markdownFileName, markdownContent) {
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = markdownFileName;
        link.click();
        URL.revokeObjectURL(url);

        console.log(`✅ Downloaded: ${markdownFileName}`);
    }

    /**
     * 모든 변환된 마크다운 파일 ZIP으로 다운로드
     * Note: JSZip 라이브러리 필요
     */
    async downloadAllAsZip(reportName) {
        console.warn('⚠️ ZIP download requires JSZip library');

        // JSZip을 사용한 ZIP 생성 (실제 구현 필요)
        // const zip = new JSZip();
        //
        // this.convertedFiles.forEach(item => {
        //     zip.file(item.markdownFileName, item.markdownContent);
        // });
        //
        // const blob = await zip.generateAsync({ type: 'blob' });
        // this.downloadBlob(blob, `${reportName}_마크다운변환_${DateHelper.formatYYMMDD_hhmmss()}.zip`);

        console.log('ZIP 다운로드 기능은 JSZip 라이브러리가 필요합니다.');
    }

    /**
     * 변환 요약 생성
     */
    generateConversionSummary(reportName) {
        const timestamp = DateHelper.formatYYMMDD_hhmmss();
        const filename = `${reportName}_변환요약_${timestamp}.md`;

        const successCount = this.conversionHistory.filter(item => item.success).length;
        const failCount = this.conversionHistory.filter(item => !item.success).length;

        let markdown = `# 마크다운 변환 요약: ${reportName}\n\n`;
        markdown += `**생성 시간**: ${DateHelper.formatISO()}\n\n`;
        markdown += `## 통계\n\n`;
        markdown += `- 총 파일 수: ${this.conversionHistory.length}\n`;
        markdown += `- 성공: ${successCount} ✅\n`;
        markdown += `- 실패: ${failCount} ❌\n\n`;

        markdown += `## 변환 결과\n\n`;
        markdown += `| 원본 파일명 | RAW ID | 상태 | 소요 시간 | 비고 |\n`;
        markdown += `|------------|--------|------|-----------|------|\n`;

        this.conversionHistory.forEach(item => {
            const status = item.success ? '✅' : '❌';
            const duration = item.duration ? `${item.duration}s` : '-';
            const note = item.error || '-';

            markdown += `| ${item.originalFileName} | ${item.rawId} | ${status} | ${duration} | ${note} |\n`;
        });

        markdown += `\n## 상세 정보\n\n`;

        this.convertedFiles.forEach((item, index) => {
            markdown += `### ${index + 1}. ${item.originalFileName}\n\n`;
            markdown += `- **RAW ID**: ${item.rawId}\n`;
            markdown += `- **변환 파일명**: ${item.markdownFileName}\n`;
            markdown += `- **변환 시간**: ${item.convertedAt}\n`;
            markdown += `- **소요 시간**: ${item.duration}s\n`;
            markdown += `- **모델**: ${item.model}\n\n`;
            markdown += `---\n\n`;
        });

        return {
            filename: filename,
            content: markdown
        };
    }

    /**
     * 변환된 파일 목록 가져오기
     */
    getConvertedFiles() {
        return this.convertedFiles;
    }

    /**
     * 특정 RAW ID의 변환된 파일 가져오기
     */
    getConvertedFileByRawId(rawId) {
        return this.convertedFiles.find(item => item.rawId === rawId);
    }

    /**
     * 변환 이력 가져오기
     */
    getConversionHistory() {
        return this.conversionHistory;
    }

    /**
     * 변환 초기화
     */
    clearConversions() {
        this.convertedFiles = [];
        this.conversionHistory = [];
        console.log('✅ Conversions cleared');
    }

    /**
     * 마크다운 검증
     */
    validateMarkdown(markdown) {
        // 기본 마크다운 구조 검증
        if (!markdown || markdown.trim().length === 0) {
            return {
                valid: false,
                error: '마크다운 내용이 비어있습니다.'
            };
        }

        // 최소 길이 확인
        if (markdown.length < 100) {
            return {
                valid: false,
                error: '마크다운 내용이 너무 짧습니다. (최소 100자)'
            };
        }

        return { valid: true };
    }

    /**
     * 마크다운 미리보기 생성 (HTML)
     */
    generatePreview(markdown) {
        // 간단한 마크다운 → HTML 변환
        // 실제 구현 시 marked.js 등의 라이브러리 사용 권장

        let html = markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/\n/g, '<br>');

        return html;
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
     * Fallback 파일 읽기 (fileHandler 없을 때)
     *
     * ⚠️ NOTE: 핵심 변환 로직은 MarkdownTransformCore 모듈에 캡슐화되어 있습니다.
     *         변환 로직 수정이 필요하면 js/core/markdown-transform-core.js를 확인하세요.
     *
     * @param {File} file - 읽을 파일
     * @returns {Promise<Object>} 추출된 텍스트와 메타데이터
     */
    async fallbackReadFile(file) {
        // Core 모듈이 로드되어 있으면 Core 모듈 사용 (권장)
        if (typeof window.MarkdownTransformCore !== 'undefined') {
            return await window.MarkdownTransformCore.readFile(file);
        }

        // Core 모듈이 없으면 레거시 fallback (deprecated)
        console.warn('⚠️ MarkdownTransformCore not available. Using legacy fallback.');
        return await this._legacyReadFile(file);
    }

    /**
     * 레거시 파일 읽기 (Core 모듈 미사용 시 fallback)
     * @deprecated Core 모듈 사용 권장
     * @private
     */
    async _legacyReadFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();

        // PDF - 텍스트 추출 후 품질 검증, 필요시 OCR
        if (ext === 'pdf' && typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const arrayBuffer = await file.arrayBuffer();

            // CMap 설정 (한글 폰트 지원)
            const pdf = await pdfjsLib.getDocument({
                data: arrayBuffer,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true
            }).promise;

            // 텍스트 추출
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + '\n\n';
            }

            // 텍스트 품질 검증 (한글 비율 기준)
            const koreanChars = (text.match(/[가-힣]/g) || []).length;
            const totalChars = text.trim().length;
            const koreanRatio = totalChars > 0 ? (koreanChars / totalChars) * 100 : 0;
            const hasEnoughText = totalChars >= 100 && (koreanRatio >= 10 || text.match(/[a-zA-Z]/g)?.length > 50);

            // 품질 충분하면 텍스트 반환
            if (hasEnoughText) {
                console.log(`✅ PDF text extraction: ${file.name} (${totalChars} chars, ${koreanRatio.toFixed(1)}% Korean)`);
                return { text, type: 'pdf', pages: pdf.numPages, method: 'text' };
            }

            // 품질 부족 + Tesseract 사용 가능하면 OCR
            if (typeof Tesseract !== 'undefined') {
                console.log(`⚠️ Text quality low, trying OCR: ${file.name}`);
                let ocrText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    await page.render({ canvasContext: context, viewport: viewport }).promise;

                    const result = await Tesseract.recognize(canvas, 'kor+eng');
                    ocrText += result.data.text.trim() + '\n\n';

                    canvas.width = 0;
                    canvas.height = 0;
                }

                // OCR 결과가 더 좋으면 사용
                const ocrKorean = (ocrText.match(/[가-힣]/g) || []).length;
                if (ocrKorean > koreanChars || ocrText.trim().length > totalChars) {
                    console.log(`✅ OCR complete: ${file.name}`);
                    return { text: ocrText, type: 'pdf', pages: pdf.numPages, method: 'ocr' };
                }
            }

            // 최선의 결과 반환
            return { text, type: 'pdf', pages: pdf.numPages, method: totalChars > 0 ? 'text-lowquality' : 'failed' };
        }

        // Excel
        if ((ext === 'xlsx' || ext === 'xls') && typeof XLSX !== 'undefined') {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            let text = '';
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                text += `## ${sheetName}\n\n`;
                text += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
            });
            return { text, type: 'excel', sheets: workbook.SheetNames.length };
        }

        // Word
        if (ext === 'docx' && typeof mammoth !== 'undefined') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return { text: result.value, type: 'word' };
        }

        // Text files
        if (ext === 'txt' || ext === 'md') {
            const text = await file.text();
            return { text, type: 'text' };
        }

        throw new Error(`지원하지 않는 파일 형식: ${ext}`);
    }

    /**
     * 텍스트를 기본 마크다운으로 변환 (LLM 없을 때)
     *
     * ⚠️ NOTE: 핵심 변환 로직은 MarkdownTransformCore 모듈에 캡슐화되어 있습니다.
     *         변환 로직 수정이 필요하면 js/core/markdown-transform-core.js를 확인하세요.
     *
     * @param {string} text - 변환할 텍스트
     * @param {string} fileName - 원본 파일명
     * @returns {string} 마크다운 형식의 텍스트
     */
    textToBasicMarkdown(text, fileName) {
        // Core 모듈이 로드되어 있으면 Core 모듈 사용 (권장)
        if (typeof window.MarkdownTransformCore !== 'undefined') {
            return window.MarkdownTransformCore.convertToBasicMarkdown(text, fileName);
        }

        // Core 모듈이 없으면 레거시 fallback (deprecated)
        console.warn('⚠️ MarkdownTransformCore not available. Using legacy conversion.');
        return this._legacyTextToMarkdown(text, fileName);
    }

    /**
     * 레거시 텍스트 → 마크다운 변환 (Core 모듈 미사용 시 fallback)
     * @deprecated Core 모듈 사용 권장
     * @private
     */
    _legacyTextToMarkdown(text, fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        let markdown = `# ${fileName}\n\n`;
        markdown += `> 자동 변환됨 (${new Date().toISOString()})\n\n`;

        if (ext === 'xlsx' || ext === 'xls') {
            // CSV를 마크다운 테이블로 변환
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length > 0) {
                lines.forEach((line, index) => {
                    const cells = line.split(',').map(cell => cell.trim());
                    markdown += '| ' + cells.join(' | ') + ' |\n';
                    if (index === 0) {
                        markdown += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
                    }
                });
            }
        } else {
            markdown += text;
        }

        return markdown;
    }
}

// Singleton instance
const markdownConverter = new MarkdownConverter();

// 전역으로 내보내기 (ES6 모듈 대신 window 객체 사용)
if (typeof window !== 'undefined') {
    window.markdownConverter = markdownConverter;
    window.MarkdownConverter = MarkdownConverter;
}

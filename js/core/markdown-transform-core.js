/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║   ██████╗ ██████╗ ██████╗ ███████╗    ███╗   ███╗ ██████╗ ██████╗ ██╗   ██╗██╗     ███████╗ ║
 * ║  ██╔════╝██╔═══██╗██╔══██╗██╔════╝    ████╗ ████║██╔═══██╗██╔══██╗██║   ██║██║     ██╔════╝ ║
 * ║  ██║     ██║   ██║██████╔╝█████╗      ██╔████╔██║██║   ██║██║  ██║██║   ██║██║     █████╗   ║
 * ║  ██║     ██║   ██║██╔══██╗██╔══╝      ██║╚██╔╝██║██║   ██║██║  ██║██║   ██║██║     ██╔══╝   ║
 * ║  ╚██████╗╚██████╔╝██║  ██║███████╗    ██║ ╚═╝ ██║╚██████╔╝██████╔╝╚██████╔╝███████╗███████╗ ║
 * ║   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚═╝     ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝ ╚══════╝╚══════╝ ║
 * ║                                                                            ║
 * ║  MARKDOWN TRANSFORM CORE MODULE                                            ║
 * ║  Version: 1.0.0                                                            ║
 * ║  Last Modified: 2026-01-07                                                 ║
 * ║                                                                            ║
 * ╠════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                            ║
 * ║  ⚠️  WARNING: DO NOT MODIFY THIS FILE                                      ║
 * ║                                                                            ║
 * ║  This is a LOCKED CORE MODULE containing critical markdown transformation ║
 * ║  logic. Any modifications require explicit approval and documentation.    ║
 * ║                                                                            ║
 * ║  이 파일은 핵심 마크다운 변환 로직을 포함한 잠긴 코어 모듈입니다.          ║
 * ║  수정 시 반드시 명시적인 승인과 문서화가 필요합니다.                        ║
 * ║                                                                            ║
 * ║  MODIFICATION HISTORY:                                                     ║
 * ║  - 2026-01-07: Initial creation (v1.0.0)                                   ║
 * ║  - 2026-01-08: Add arrayBuffer validation in readFile (v1.0.1)            ║
 * ║  - 2026-01-08: Fix detached ArrayBuffer in PDF processing (v1.0.2)        ║
 * ║  - 2026-01-13: Add Excel formula calculation support (v1.0.3)             ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * @fileoverview Core Markdown Transformation Module
 *
 * This module is intentionally sealed and frozen to prevent accidental modifications.
 * All transformation logic is encapsulated within an IIFE and exposed through a
 * frozen interface.
 *
 * DO NOT MODIFY without explicit authorization.
 *
 * @module MarkdownTransformCore
 * @version 1.0.0
 * @readonly
 * @sealed
 */

'use strict';

(function(global) {
    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE INTEGRITY CHECK
    // ═══════════════════════════════════════════════════════════════════════════

    const MODULE_VERSION = '1.0.3';
    const MODULE_SIGNATURE = 'KPSUR_MD_CORE_2026';
    const LOCKED = true;

    // Prevent re-initialization
    if (global.MarkdownTransformCore && global.MarkdownTransformCore._sealed) {
        console.warn('⚠️ MarkdownTransformCore is already initialized and sealed.');
        return;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE CONSTANTS (Not accessible from outside)
    // ═══════════════════════════════════════════════════════════════════════════

    const SUPPORTED_EXTENSIONS = Object.freeze({
        PDF: ['pdf'],
        EXCEL: ['xlsx', 'xls'],
        WORD: ['docx'],
        TEXT: ['txt', 'md']
    });

    const QUALITY_THRESHOLDS = Object.freeze({
        MIN_CHARS: 100,
        MIN_KOREAN_RATIO: 10,
        MIN_ENGLISH_CHARS: 50
    });

    const PDF_CONFIG = Object.freeze({
        WORKER_SRC: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
        CMAP_URL: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        OCR_SCALE: 2.0
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Extract file extension
     * @private
     */
    function _getExtension(fileName) {
        return (fileName || '').split('.').pop().toLowerCase();
    }

    /**
     * Calculate Korean character ratio
     * @private
     */
    function _calculateKoreanRatio(text) {
        const koreanChars = (text.match(/[가-힣]/g) || []).length;
        const totalChars = text.trim().length;
        return totalChars > 0 ? (koreanChars / totalChars) * 100 : 0;
    }

    /**
     * Parse CSV line handling quoted fields
     * @private
     */
    function _parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    /**
     * Evaluate =SUM() formula in CSV content
     * Handles row-wise and column-wise sum formulas
     * @private
     */
    function _evaluateExcelFormulas(csvContent) {
        const lines = csvContent.split('\n');
        const data = lines.map(line => _parseCSVLine(line));

        // Process each cell and evaluate SUM formulas
        for (let row = 0; row < data.length; row++) {
            for (let col = 0; col < data[row].length; col++) {
                const cell = data[row][col];
                if (typeof cell === 'string' && /^=\s*sum\s*\(/i.test(cell.trim())) {
                    const calculated = _calculateSumFormula(cell, data, row, col);
                    if (calculated !== null) {
                        data[row][col] = calculated.toString();
                    }
                }
            }
        }

        // Convert back to CSV
        return data.map(row => row.map(cell => {
            // Escape commas and quotes in cells
            if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
                return '"' + cell.replace(/"/g, '""') + '"';
            }
            return cell;
        }).join(',')).join('\n');
    }

    /**
     * Calculate SUM formula value
     * @private
     */
    function _calculateSumFormula(formula, data, currentRow, currentCol) {
        try {
            // Extract range from formula: =SUM(A1:A10) or =sum(B2:D2)
            const match = formula.match(/=\s*sum\s*\(\s*([A-Z]+)(\d+)\s*:\s*([A-Z]+)(\d+)\s*\)/i);
            if (!match) {
                // Try to sum all numeric values in the same row (left of current cell)
                // This handles cases like =SUM() without explicit range in Total columns
                let sum = 0;
                for (let c = 0; c < currentCol; c++) {
                    const val = parseFloat(data[currentRow][c]);
                    if (!isNaN(val)) {
                        sum += val;
                    }
                }
                return sum;
            }

            const startCol = _colLetterToIndex(match[1]);
            const startRow = parseInt(match[2], 10) - 1; // 0-indexed
            const endCol = _colLetterToIndex(match[3]);
            const endRow = parseInt(match[4], 10) - 1;

            let sum = 0;
            for (let r = startRow; r <= endRow && r < data.length; r++) {
                for (let c = startCol; c <= endCol && c < (data[r] || []).length; c++) {
                    const val = parseFloat(data[r][c]);
                    if (!isNaN(val)) {
                        sum += val;
                    }
                }
            }
            return sum;
        } catch (e) {
            console.warn(`⚠️ Formula calculation failed: ${formula}`, e);
            return null;
        }
    }

    /**
     * Convert column letter to index (A=0, B=1, ..., Z=25, AA=26, ...)
     * @private
     */
    function _colLetterToIndex(letters) {
        let index = 0;
        for (let i = 0; i < letters.length; i++) {
            index = index * 26 + (letters.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
        }
        return index - 1;
    }

    /**
     * Check text quality
     * @private
     */
    function _isTextQualitySufficient(text) {
        const koreanRatio = _calculateKoreanRatio(text);
        const totalChars = text.trim().length;
        const englishChars = (text.match(/[a-zA-Z]/g) || []).length;

        return totalChars >= QUALITY_THRESHOLDS.MIN_CHARS &&
               (koreanRatio >= QUALITY_THRESHOLDS.MIN_KOREAN_RATIO ||
                englishChars > QUALITY_THRESHOLDS.MIN_ENGLISH_CHARS);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CORE TRANSFORMATION FUNCTIONS (SEALED)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Read PDF file and extract text with OCR fallback
     * @sealed
     * @param {File} file - PDF file to read
     * @returns {Promise<Object>} Extracted text and metadata
     */
    async function _readPDF(file) {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js library is not loaded');
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_CONFIG.WORKER_SRC;

        // Read ArrayBuffer and create a copy to prevent "detached ArrayBuffer" error
        // pdf.js internally transfers the ArrayBuffer, which detaches the original
        const originalBuffer = await file.arrayBuffer();
        const arrayBufferCopy = originalBuffer.slice(0);

        // Use Uint8Array for more reliable handling across browsers
        const data = new Uint8Array(arrayBufferCopy);

        let pdf;
        try {
            pdf = await pdfjsLib.getDocument({
                data: data,
                cMapUrl: PDF_CONFIG.CMAP_URL,
                cMapPacked: true
            }).promise;
        } catch (pdfError) {
            // Handle detached ArrayBuffer error with retry using fresh copy
            if (pdfError.message && pdfError.message.includes('detached')) {
                console.warn(`⚠️ Retrying PDF load with fresh buffer: ${file.name}`);
                const retryBuffer = await file.arrayBuffer();
                const retryData = new Uint8Array(retryBuffer.slice(0));
                pdf = await pdfjsLib.getDocument({
                    data: retryData,
                    cMapUrl: PDF_CONFIG.CMAP_URL,
                    cMapPacked: true
                }).promise;
            } else {
                throw pdfError;
            }
        }

        // Text extraction
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n\n';
        }

        // Quality check
        if (_isTextQualitySufficient(text)) {
            const koreanRatio = _calculateKoreanRatio(text);
            console.log(`✅ PDF text extraction: ${file.name} (${text.trim().length} chars, ${koreanRatio.toFixed(1)}% Korean)`);
            return {
                text,
                type: 'pdf',
                pages: pdf.numPages,
                method: 'text',
                quality: 'good'
            };
        }

        // OCR fallback
        if (typeof Tesseract !== 'undefined') {
            console.log(`⚠️ Text quality low, trying OCR: ${file.name}`);
            let ocrText = '';
            const koreanCharsOriginal = (text.match(/[가-힣]/g) || []).length;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: PDF_CONFIG.OCR_SCALE });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                const result = await Tesseract.recognize(canvas, 'kor+eng');
                ocrText += result.data.text.trim() + '\n\n';

                // Cleanup
                canvas.width = 0;
                canvas.height = 0;
            }

            const ocrKorean = (ocrText.match(/[가-힣]/g) || []).length;
            if (ocrKorean > koreanCharsOriginal || ocrText.trim().length > text.trim().length) {
                console.log(`✅ OCR complete: ${file.name}`);
                return {
                    text: ocrText,
                    type: 'pdf',
                    pages: pdf.numPages,
                    method: 'ocr',
                    quality: 'ocr'
                };
            }
        }

        // Return best available
        return {
            text,
            type: 'pdf',
            pages: pdf.numPages,
            method: text.trim().length > 0 ? 'text-lowquality' : 'failed',
            quality: 'low'
        };
    }

    /**
     * Read Excel file and convert to text
     * @sealed
     * @param {File} file - Excel file to read
     * @returns {Promise<Object>} Extracted text and metadata
     */
    async function _readExcel(file) {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library is not loaded');
        }

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
            type: 'array',
            cellFormula: true,  // Preserve formula information
            sheetStubs: true    // Include stub cells (cells with formulas but no cached value)
        });
        let text = '';
        let formulasCalculated = 0;

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];

            // Calculate formulas before converting to CSV
            formulasCalculated += _calculateSheetFormulas(sheet);

            text += `## ${sheetName}\n\n`;

            // Convert to CSV (now with calculated values)
            let csvContent = XLSX.utils.sheet_to_csv(sheet);

            // Also check for any formula text patterns in CSV (fallback)
            csvContent = _evaluateExcelFormulas(csvContent);

            text += csvContent + '\n\n';
        });

        console.log(`✅ Excel processed: ${file.name} (${formulasCalculated} formulas calculated)`);

        return {
            text,
            type: 'excel',
            sheets: workbook.SheetNames.length,
            sheetNames: workbook.SheetNames
        };
    }

    /**
     * Calculate formulas in a sheet (modifies sheet in place)
     * Supports: SUM, AVERAGE, COUNT, MIN, MAX
     * @private
     */
    function _calculateSheetFormulas(sheet) {
        let count = 0;
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

        // First pass: collect all cell values
        const cellValues = {};
        for (let r = range.s.r; r <= range.e.r; r++) {
            for (let c = range.s.c; c <= range.e.c; c++) {
                const addr = XLSX.utils.encode_cell({ r, c });
                const cell = sheet[addr];
                if (cell && cell.v !== undefined && cell.t === 'n') {
                    cellValues[addr] = cell.v;
                }
            }
        }

        // Second pass: calculate formulas
        for (let r = range.s.r; r <= range.e.r; r++) {
            for (let c = range.s.c; c <= range.e.c; c++) {
                const addr = XLSX.utils.encode_cell({ r, c });
                const cell = sheet[addr];

                // Check if cell has a formula
                if (cell && cell.f) {
                    const formula = cell.f.toUpperCase();
                    let result = null;

                    // Parse SUM formula
                    if (formula.startsWith('SUM(')) {
                        result = _calculateRangeFormula(formula, 'SUM', cellValues, sheet);
                    }
                    // Parse AVERAGE formula
                    else if (formula.startsWith('AVERAGE(')) {
                        result = _calculateRangeFormula(formula, 'AVERAGE', cellValues, sheet);
                    }
                    // Parse COUNT formula
                    else if (formula.startsWith('COUNT(')) {
                        result = _calculateRangeFormula(formula, 'COUNT', cellValues, sheet);
                    }
                    // Parse MIN formula
                    else if (formula.startsWith('MIN(')) {
                        result = _calculateRangeFormula(formula, 'MIN', cellValues, sheet);
                    }
                    // Parse MAX formula
                    else if (formula.startsWith('MAX(')) {
                        result = _calculateRangeFormula(formula, 'MAX', cellValues, sheet);
                    }

                    if (result !== null) {
                        cell.v = result;
                        cell.t = 'n';  // Set type to number
                        count++;
                    }
                }
            }
        }

        return count;
    }

    /**
     * Calculate range-based formula (SUM, AVERAGE, etc.)
     * @private
     */
    function _calculateRangeFormula(formula, funcName, cellValues, sheet) {
        try {
            // Extract range: SUM(A1:A10) or SUM(A1:B10)
            const rangeMatch = formula.match(new RegExp(funcName + '\\(([A-Z]+\\d+):([A-Z]+\\d+)\\)'));
            if (!rangeMatch) return null;

            const startCell = XLSX.utils.decode_cell(rangeMatch[1]);
            const endCell = XLSX.utils.decode_cell(rangeMatch[2]);

            const values = [];
            for (let r = startCell.r; r <= endCell.r; r++) {
                for (let c = startCell.c; c <= endCell.c; c++) {
                    const addr = XLSX.utils.encode_cell({ r, c });
                    const cell = sheet[addr];
                    if (cell && cell.t === 'n' && typeof cell.v === 'number') {
                        values.push(cell.v);
                    } else if (cellValues[addr] !== undefined) {
                        values.push(cellValues[addr]);
                    }
                }
            }

            if (values.length === 0) return 0;

            switch (funcName) {
                case 'SUM':
                    return values.reduce((a, b) => a + b, 0);
                case 'AVERAGE':
                    return values.reduce((a, b) => a + b, 0) / values.length;
                case 'COUNT':
                    return values.length;
                case 'MIN':
                    return Math.min(...values);
                case 'MAX':
                    return Math.max(...values);
                default:
                    return null;
            }
        } catch (e) {
            console.warn(`⚠️ Formula calculation error: ${formula}`, e);
            return null;
        }
    }

    /**
     * Read Word document and extract text
     * @sealed
     * @param {File} file - Word file to read
     * @returns {Promise<Object>} Extracted text and metadata
     */
    async function _readWord(file) {
        if (typeof mammoth === 'undefined') {
            throw new Error('Mammoth library is not loaded');
        }

        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });

        return {
            text: result.value,
            type: 'word',
            messages: result.messages
        };
    }

    /**
     * Read plain text file
     * @sealed
     * @param {File} file - Text file to read
     * @returns {Promise<Object>} File content and metadata
     */
    async function _readText(file) {
        const text = await file.text();
        return {
            text,
            type: 'text'
        };
    }

    /**
     * Convert CSV text to Markdown table
     * @sealed
     * @param {string} csvText - CSV formatted text
     * @returns {string} Markdown table
     */
    function _csvToMarkdownTable(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return '';

        let markdown = '';
        lines.forEach((line, index) => {
            const cells = line.split(',').map(cell => cell.trim());
            markdown += '| ' + cells.join(' | ') + ' |\n';
            if (index === 0) {
                markdown += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
            }
        });
        return markdown;
    }

    /**
     * Convert plain text to basic Markdown
     * @sealed
     * @param {string} text - Source text
     * @param {string} fileName - Original file name
     * @returns {string} Markdown formatted text
     */
    function _textToBasicMarkdown(text, fileName) {
        const ext = _getExtension(fileName);
        let markdown = `# ${fileName}\n\n`;
        markdown += `> 자동 변환됨 (${new Date().toISOString()})\n\n`;

        if (ext === 'xlsx' || ext === 'xls') {
            markdown += _csvToMarkdownTable(text);
        } else {
            markdown += text;
        }

        return markdown;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API (FROZEN)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @typedef {Object} FileReadResult
     * @property {string} text - Extracted text content
     * @property {string} type - File type (pdf, excel, word, text)
     * @property {string} [method] - Extraction method used
     * @property {number} [pages] - Number of pages (PDF)
     * @property {number} [sheets] - Number of sheets (Excel)
     */

    /**
     * Public API for MarkdownTransformCore
     * @namespace MarkdownTransformCore
     * @sealed
     * @frozen
     */
    const MarkdownTransformCore = {
        /**
         * Module version
         * @readonly
         */
        get version() {
            return MODULE_VERSION;
        },

        /**
         * Module signature for integrity verification
         * @readonly
         */
        get signature() {
            return MODULE_SIGNATURE;
        },

        /**
         * Check if module is locked
         * @readonly
         */
        get isLocked() {
            return LOCKED;
        },

        /**
         * Supported file extensions
         * @readonly
         */
        get supportedExtensions() {
            return { ...SUPPORTED_EXTENSIONS };
        },

        /**
         * Read file content based on file type
         * @param {File} file - File to read
         * @returns {Promise<FileReadResult>} Extracted content and metadata
         * @throws {Error} If file type is not supported
         */
        async readFile(file) {
            if (!file || !file.name) {
                throw new Error('Invalid file provided');
            }

            // Validate arrayBuffer method exists (detect restored file objects)
            if (typeof file.arrayBuffer !== 'function') {
                throw new Error(`파일 변환 실패: "${file.name}" - 복원된 파일은 변환할 수 없습니다. 파일을 다시 업로드해주세요.`);
            }

            const ext = _getExtension(file.name);

            if (SUPPORTED_EXTENSIONS.PDF.includes(ext)) {
                return await _readPDF(file);
            }
            if (SUPPORTED_EXTENSIONS.EXCEL.includes(ext)) {
                return await _readExcel(file);
            }
            if (SUPPORTED_EXTENSIONS.WORD.includes(ext)) {
                return await _readWord(file);
            }
            if (SUPPORTED_EXTENSIONS.TEXT.includes(ext)) {
                return await _readText(file);
            }

            throw new Error(`지원하지 않는 파일 형식: ${ext}`);
        },

        /**
         * Convert text to basic Markdown format
         * @param {string} text - Source text
         * @param {string} fileName - Original file name
         * @returns {string} Markdown formatted text
         */
        convertToBasicMarkdown(text, fileName) {
            if (typeof text !== 'string') {
                throw new Error('Text must be a string');
            }
            return _textToBasicMarkdown(text, fileName || 'untitled');
        },

        /**
         * Check if file extension is supported
         * @param {string} fileName - File name to check
         * @returns {boolean} True if supported
         */
        isSupported(fileName) {
            const ext = _getExtension(fileName);
            return Object.values(SUPPORTED_EXTENSIONS)
                .flat()
                .includes(ext);
        },

        /**
         * Get file type from extension
         * @param {string} fileName - File name
         * @returns {string|null} File type or null
         */
        getFileType(fileName) {
            const ext = _getExtension(fileName);
            for (const [type, extensions] of Object.entries(SUPPORTED_EXTENSIONS)) {
                if (extensions.includes(ext)) {
                    return type.toLowerCase();
                }
            }
            return null;
        },

        /**
         * Verify module integrity
         * @returns {boolean} True if module is intact
         */
        verifyIntegrity() {
            return this.signature === MODULE_SIGNATURE &&
                   this.isLocked === true &&
                   Object.isFrozen(this);
        },

        /**
         * Internal marker - DO NOT MODIFY
         * @private
         */
        _sealed: true
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // FREEZE AND SEAL THE MODULE
    // ═══════════════════════════════════════════════════════════════════════════

    // Freeze the API object to prevent modifications
    Object.freeze(MarkdownTransformCore);

    // Define as non-configurable, non-writable property on global
    Object.defineProperty(global, 'MarkdownTransformCore', {
        value: MarkdownTransformCore,
        writable: false,
        configurable: false,
        enumerable: true
    });

    // Also freeze the property descriptor
    Object.freeze(Object.getOwnPropertyDescriptor(global, 'MarkdownTransformCore'));

    // Log initialization
    console.log(`🔒 MarkdownTransformCore v${MODULE_VERSION} initialized and sealed.`);

})(typeof window !== 'undefined' ? window : this);

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                         END OF CORE MODULE                                 ║
 * ║                                                                            ║
 * ║  This module is SEALED. Do not attempt to modify without authorization.   ║
 * ║  이 모듈은 봉인되어 있습니다. 승인 없이 수정하지 마세요.                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

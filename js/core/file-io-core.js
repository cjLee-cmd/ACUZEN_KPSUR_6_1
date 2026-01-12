/**
 * ============================================================================
 * FILE I/O CORE MODULE
 * ============================================================================
 *
 * @sealed DO NOT MODIFY WITHOUT EXPLICIT AUTHORIZATION
 *
 * This module contains core file handling operations for
 * File/Blob processing, Base64 encoding, and MIME type detection.
 * Changes to this module require explicit user approval and version tracking.
 *
 * MODIFICATION HISTORY:
 * --------------------------------
 * v1.0.0 (2026-01-07) - Initial sealed version
 *
 * ============================================================================
 */

(function() {
    'use strict';

    const MODULE_VERSION = '1.0.0';
    const MODULE_NAME = 'FileIOCore';
    const CREATED_AT = '2026-01-07';

    /**
     * Supported MIME types (immutable)
     */
    const MIME_TYPES = Object.freeze({
        // Documents
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        xls: 'application/vnd.ms-excel',
        txt: 'text/plain',
        md: 'text/markdown',
        csv: 'text/csv',

        // Images
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',

        // Data
        json: 'application/json',
        xml: 'application/xml'
    });

    /**
     * File signature magic bytes for type detection
     */
    const FILE_SIGNATURES = Object.freeze({
        pdf: [0x25, 0x50, 0x44, 0x46],       // %PDF
        png: [0x89, 0x50, 0x4E, 0x47],       // .PNG
        jpg: [0xFF, 0xD8, 0xFF],             // JPEG
        gif: [0x47, 0x49, 0x46],             // GIF
        zip: [0x50, 0x4B, 0x03, 0x04],       // PK (ZIP, DOCX, XLSX)
        xml: [0x3C, 0x3F, 0x78, 0x6D]        // <?xm
    });

    /**
     * Core file I/O operations
     */
    const FileIOCore = {
        /**
         * Module metadata
         */
        VERSION: MODULE_VERSION,
        NAME: MODULE_NAME,
        MIME_TYPES: MIME_TYPES,

        /**
         * Get MIME type from file extension
         * @param {string} filename - File name
         * @returns {string} MIME type
         */
        getMimeType: function(filename) {
            if (!filename || typeof filename !== 'string') {
                return 'application/octet-stream';
            }

            const ext = filename.split('.').pop().toLowerCase();
            return MIME_TYPES[ext] || 'application/octet-stream';
        },

        /**
         * Get file extension from MIME type
         * @param {string} mimeType - MIME type
         * @returns {string|null} File extension
         */
        getExtension: function(mimeType) {
            for (const [ext, mime] of Object.entries(MIME_TYPES)) {
                if (mime === mimeType) {
                    return ext;
                }
            }
            return null;
        },

        /**
         * Detect file type from content (magic bytes)
         * @param {ArrayBuffer} buffer - File content
         * @returns {string|null} Detected file type
         */
        detectFileType: function(buffer) {
            if (!buffer || buffer.byteLength < 4) {
                return null;
            }

            const bytes = new Uint8Array(buffer.slice(0, 8));

            for (const [type, signature] of Object.entries(FILE_SIGNATURES)) {
                let match = true;
                for (let i = 0; i < signature.length; i++) {
                    if (bytes[i] !== signature[i]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    // ZIP can be DOCX or XLSX - need further detection
                    if (type === 'zip') {
                        return this.detectZipType(buffer);
                    }
                    return type;
                }
            }

            return null;
        },

        /**
         * Detect specific type of ZIP-based file (DOCX, XLSX)
         * @param {ArrayBuffer} buffer - File content
         * @returns {string} Detected type ('docx', 'xlsx', or 'zip')
         */
        detectZipType: function(buffer) {
            // This is a simplified check
            // Full implementation would parse ZIP and check content_types.xml
            const decoder = new TextDecoder('utf-8', { fatal: false });
            const text = decoder.decode(buffer.slice(0, 2000));

            if (text.includes('word/') || text.includes('document.xml')) {
                return 'docx';
            }
            if (text.includes('xl/') || text.includes('workbook.xml')) {
                return 'xlsx';
            }

            return 'zip';
        },

        /**
         * Convert ArrayBuffer to Base64
         * @param {ArrayBuffer} buffer - Input buffer
         * @returns {string} Base64 encoded string
         */
        arrayBufferToBase64: function(buffer) {
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        },

        /**
         * Convert Base64 to ArrayBuffer
         * @param {string} base64 - Base64 encoded string
         * @returns {ArrayBuffer} Decoded buffer
         */
        base64ToArrayBuffer: function(base64) {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes.buffer;
        },

        /**
         * Convert File to Base64 data URL
         * @param {File} file - File object
         * @returns {Promise<string>} Data URL
         */
        fileToDataURL: function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('File read failed'));
                reader.readAsDataURL(file);
            });
        },

        /**
         * Convert File to ArrayBuffer
         * @param {File} file - File object
         * @returns {Promise<ArrayBuffer>} Array buffer
         */
        fileToArrayBuffer: function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('File read failed'));
                reader.readAsArrayBuffer(file);
            });
        },

        /**
         * Convert File to text
         * @param {File} file - File object
         * @param {string} encoding - Text encoding (default: UTF-8)
         * @returns {Promise<string>} Text content
         */
        fileToText: function(file, encoding = 'UTF-8') {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('File read failed'));
                reader.readAsText(file, encoding);
            });
        },

        /**
         * Create Blob from text
         * @param {string} text - Text content
         * @param {string} mimeType - MIME type
         * @returns {Blob} Blob object
         */
        textToBlob: function(text, mimeType = 'text/plain') {
            return new Blob([text], { type: mimeType });
        },

        /**
         * Create Blob from ArrayBuffer
         * @param {ArrayBuffer} buffer - Buffer content
         * @param {string} mimeType - MIME type
         * @returns {Blob} Blob object
         */
        bufferToBlob: function(buffer, mimeType = 'application/octet-stream') {
            return new Blob([buffer], { type: mimeType });
        },

        /**
         * Format file size for display
         * @param {number} bytes - Size in bytes
         * @returns {string} Formatted size string
         */
        formatFileSize: function(bytes) {
            if (bytes === 0) return '0 B';

            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            const k = 1024;
            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
        },

        /**
         * Validate file against constraints
         * @param {File} file - File to validate
         * @param {Object} constraints - Validation constraints
         * @returns {Object} Validation result
         */
        validateFile: function(file, constraints = {}) {
            const result = {
                valid: true,
                errors: []
            };

            // Check file size
            if (constraints.maxSize && file.size > constraints.maxSize) {
                result.valid = false;
                result.errors.push({
                    type: 'size',
                    message: `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed (${this.formatFileSize(constraints.maxSize)})`
                });
            }

            // Check file type by extension
            if (constraints.allowedExtensions) {
                const ext = file.name.split('.').pop().toLowerCase();
                if (!constraints.allowedExtensions.includes(ext)) {
                    result.valid = false;
                    result.errors.push({
                        type: 'extension',
                        message: `File extension .${ext} is not allowed. Allowed: ${constraints.allowedExtensions.join(', ')}`
                    });
                }
            }

            // Check file type by MIME
            if (constraints.allowedMimeTypes) {
                if (!constraints.allowedMimeTypes.includes(file.type)) {
                    result.valid = false;
                    result.errors.push({
                        type: 'mimeType',
                        message: `File type ${file.type} is not allowed`
                    });
                }
            }

            return result;
        },

        /**
         * Download content as file
         * @param {string|Blob} content - Content to download
         * @param {string} filename - File name
         * @param {string} mimeType - MIME type (for string content)
         */
        downloadFile: function(content, filename, mimeType = 'text/plain') {
            let blob;

            if (content instanceof Blob) {
                blob = content;
            } else {
                blob = new Blob([content], { type: mimeType });
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },

        /**
         * Verify module integrity
         * @returns {Object} Integrity verification result
         */
        verifyIntegrity: function() {
            const requiredMethods = [
                'getMimeType',
                'getExtension',
                'detectFileType',
                'arrayBufferToBase64',
                'base64ToArrayBuffer',
                'fileToDataURL',
                'fileToArrayBuffer',
                'fileToText',
                'textToBlob',
                'bufferToBlob',
                'formatFileSize',
                'validateFile',
                'downloadFile'
            ];

            const missingMethods = requiredMethods.filter(
                method => typeof this[method] !== 'function'
            );

            return {
                valid: missingMethods.length === 0,
                version: MODULE_VERSION,
                name: MODULE_NAME,
                missingMethods: missingMethods,
                frozen: Object.isFrozen(this)
            };
        }
    };

    // Freeze the module to prevent modifications
    Object.freeze(FileIOCore);

    // Register globally
    if (typeof window !== 'undefined') {
        if (window.FileIOCore) {
            console.warn(`[${MODULE_NAME}] Already registered. Skipping re-registration.`);
        } else {
            window.FileIOCore = FileIOCore;
            console.log(`[${MODULE_NAME}] v${MODULE_VERSION} loaded and sealed`);
        }
    }

    // Export for module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FileIOCore;
    }

})();

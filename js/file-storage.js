/**
 * File Storage - IndexedDB 기반 파일 저장/로드
 * P14 -> P15 페이지 간 File 객체 전달 문제 해결
 */

const DB_NAME = 'KPSUR_FileStorage';
const DB_VERSION = 1;
const STORE_NAME = 'files';

class FileStorage {
    constructor() {
        this.db = null;
        this.initPromise = null;
    }

    /**
     * IndexedDB 초기화
     */
    async init() {
        if (this.db) return this.db;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('❌ IndexedDB open failed:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // files 스토어 생성
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('rawId', 'rawId', { unique: false });
                    console.log('✅ IndexedDB store created');
                }
            };
        });

        return this.initPromise;
    }

    /**
     * 파일 저장 (File 객체 -> ArrayBuffer로 저장)
     */
    async saveFile(fileData) {
        await this.init();

        return new Promise(async (resolve, reject) => {
            try {
                // File 객체를 ArrayBuffer로 변환
                const arrayBuffer = await fileData.file.arrayBuffer();

                const record = {
                    id: fileData.id || `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: fileData.name || fileData.file.name,
                    size: fileData.size || fileData.file.size,
                    type: fileData.type || fileData.file.type,
                    rawId: fileData.rawId,
                    zoneId: fileData.zoneId,  // Zone ID 추가
                    arrayBuffer: arrayBuffer,
                    savedAt: new Date().toISOString()
                };

                const transaction = this.db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(record);

                request.onsuccess = () => {
                    console.log(`✅ File saved to IndexedDB: ${record.name}`);
                    resolve({
                        success: true,
                        id: record.id,
                        name: record.name
                    });
                };

                request.onerror = () => {
                    console.error('❌ Failed to save file:', request.error);
                    reject(request.error);
                };
            } catch (error) {
                console.error('❌ Error saving file:', error);
                reject(error);
            }
        });
    }

    /**
     * 여러 파일 저장
     */
    async saveFiles(filesData) {
        const results = [];
        for (const fileData of filesData) {
            try {
                const result = await this.saveFile(fileData);
                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    name: fileData.name,
                    error: error.message
                });
            }
        }
        return results;
    }

    /**
     * 파일 로드 (ArrayBuffer -> File 객체로 변환)
     */
    async loadFile(fileId) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(fileId);

            request.onsuccess = () => {
                const record = request.result;
                if (record) {
                    // ArrayBuffer -> Blob -> File 변환
                    const blob = new Blob([record.arrayBuffer], { type: record.type });
                    const file = new File([blob], record.name, { type: record.type });

                    console.log(`✅ File loaded from IndexedDB: ${record.name}`);
                    resolve({
                        success: true,
                        file: file,
                        id: record.id,
                        name: record.name,
                        rawId: record.rawId,
                        savedAt: record.savedAt
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'File not found'
                    });
                }
            };

            request.onerror = () => {
                console.error('❌ Failed to load file:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 파일명으로 로드
     */
    async loadFileByName(fileName) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('name');
            const request = index.get(fileName);

            request.onsuccess = () => {
                const record = request.result;
                if (record) {
                    const blob = new Blob([record.arrayBuffer], { type: record.type });
                    const file = new File([blob], record.name, { type: record.type });

                    resolve({
                        success: true,
                        file: file,
                        id: record.id,
                        name: record.name,
                        rawId: record.rawId,
                        savedAt: record.savedAt
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'File not found'
                    });
                }
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 모든 파일 로드
     */
    async loadAllFiles() {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const records = request.result;
                const files = records.map(record => {
                    const blob = new Blob([record.arrayBuffer], { type: record.type });
                    const file = new File([blob], record.name, { type: record.type });

                    return {
                        file: file,
                        id: record.id,
                        name: record.name,
                        size: record.size,
                        type: record.type,
                        rawId: record.rawId,
                        zoneId: record.zoneId,  // Zone ID 추가
                        savedAt: record.savedAt
                    };
                });

                console.log(`✅ Loaded ${files.length} files from IndexedDB`);
                resolve(files);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 파일 삭제
     */
    async deleteFile(fileId) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(fileId);

            request.onsuccess = () => {
                console.log(`✅ File deleted from IndexedDB: ${fileId}`);
                resolve({ success: true });
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 모든 파일 삭제
     */
    async clearAll() {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('✅ All files cleared from IndexedDB');
                resolve({ success: true });
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 파일 개수 조회
     */
    async getFileCount() {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.count();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }
}

// Singleton instance
const fileStorage = new FileStorage();

// 전역으로 내보내기 (ES6 모듈 대신 window 객체 사용)
if (typeof window !== 'undefined') {
    window.fileStorage = fileStorage;
    window.FileStorage = FileStorage;
}

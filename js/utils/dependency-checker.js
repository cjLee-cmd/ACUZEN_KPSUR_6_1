/**
 * Dependency Checker
 * js/utils/dependency-checker.js
 *
 * 모듈 의존성 검증 도구
 * 스크립트 로드 순서 및 필수 모듈 존재 여부 확인
 */

(function() {
    'use strict';

    /**
     * DependencyChecker - 의존성 검증 클래스
     */
    class DependencyChecker {
        constructor() {
            this.loadedModules = new Set();
            this.missingModules = [];
            this.loadErrors = [];
            this.moduleVersions = {};
        }

        /**
         * 필수 모듈 검증
         * @param {string[]} required - 필수 모듈 이름 배열
         * @returns {boolean} 모든 모듈 존재 여부
         */
        verify(required) {
            this.missingModules = [];

            required.forEach(dep => {
                if (typeof window[dep] === 'undefined') {
                    this.missingModules.push(dep);
                } else {
                    this.loadedModules.add(dep);
                }
            });

            if (this.missingModules.length > 0) {
                console.error('[DependencyChecker] Missing dependencies:', this.missingModules);
                return false;
            }

            console.log('[DependencyChecker] All dependencies verified:', required);
            return true;
        }

        /**
         * 선택적 모듈 확인 (경고만)
         * @param {string[]} optional - 선택적 모듈 이름 배열
         * @returns {string[]} 누락된 모듈 목록
         */
        checkOptional(optional) {
            const missing = [];

            optional.forEach(dep => {
                if (typeof window[dep] === 'undefined') {
                    missing.push(dep);
                } else {
                    this.loadedModules.add(dep);
                }
            });

            if (missing.length > 0) {
                console.warn('[DependencyChecker] Optional modules not loaded:', missing);
            }

            return missing;
        }

        /**
         * 모듈 로드 등록
         * @param {string} moduleName - 모듈 이름
         * @param {string} version - 버전 (선택)
         */
        register(moduleName, version = null) {
            this.loadedModules.add(moduleName);
            if (version) {
                this.moduleVersions[moduleName] = version;
            }
            console.log(`[DependencyChecker] Registered: ${moduleName}${version ? ` v${version}` : ''}`);
        }

        /**
         * 모듈 로드 상태 확인
         * @param {string} moduleName - 모듈 이름
         * @returns {boolean}
         */
        isLoaded(moduleName) {
            return this.loadedModules.has(moduleName) || typeof window[moduleName] !== 'undefined';
        }

        /**
         * 로드 순서 검증
         * @param {string[][]} loadOrder - 로드 순서 배열 [[layer0], [layer1], ...]
         * @returns {Object} 검증 결과
         */
        verifyLoadOrder(loadOrder) {
            const result = {
                valid: true,
                errors: [],
                warnings: []
            };

            for (let i = 0; i < loadOrder.length; i++) {
                const layer = loadOrder[i];
                const layerName = `Layer ${i}`;

                layer.forEach(module => {
                    if (typeof window[module] === 'undefined') {
                        result.errors.push(`${layerName}: ${module} not loaded`);
                        result.valid = false;
                    }
                });
            }

            if (!result.valid) {
                console.error('[DependencyChecker] Load order verification failed:', result.errors);
            }

            return result;
        }

        /**
         * 의존성 체인 검증
         * @param {Object} dependencyGraph - { moduleName: [dependencies] }
         * @returns {boolean}
         */
        verifyDependencyChain(dependencyGraph) {
            let valid = true;

            for (const [module, deps] of Object.entries(dependencyGraph)) {
                if (typeof window[module] !== 'undefined') {
                    deps.forEach(dep => {
                        if (typeof window[dep] === 'undefined') {
                            console.error(`[DependencyChecker] ${module} requires ${dep}, but ${dep} is not loaded`);
                            valid = false;
                        }
                    });
                }
            }

            return valid;
        }

        /**
         * 진단 보고서 생성
         * @returns {Object}
         */
        diagnose() {
            return {
                loaded: Array.from(this.loadedModules),
                missing: this.missingModules,
                errors: this.loadErrors,
                versions: this.moduleVersions,
                timestamp: new Date().toISOString()
            };
        }

        /**
         * 콘솔에 진단 결과 출력
         */
        printDiagnostics() {
            const report = this.diagnose();
            console.group('[DependencyChecker] Diagnostics');
            console.log('Loaded modules:', report.loaded);
            if (report.missing.length > 0) {
                console.warn('Missing modules:', report.missing);
            }
            if (report.errors.length > 0) {
                console.error('Load errors:', report.errors);
            }
            if (Object.keys(report.versions).length > 0) {
                console.log('Module versions:', report.versions);
            }
            console.groupEnd();
        }

        /**
         * 모든 모듈 초기화 (리셋)
         */
        reset() {
            this.loadedModules.clear();
            this.missingModules = [];
            this.loadErrors = [];
            this.moduleVersions = {};
        }
    }

    // ==========================================
    // KPSUR 표준 의존성 정의
    // ==========================================

    const KPSUR_DEPENDENCIES = {
        // Layer 0: Sealed Core
        L0_CORE: [
            'markdownTransformCore',
            'supabaseQueryCore',
            'llmProviderCore',
            'dataExtractCore',
            'fileIOCore'
        ],

        // Layer 1: Config
        L1_CONFIG: ['CONFIG', 'DateHelper'],

        // Layer 2: Auth
        L2_AUTH: ['authManager', 'permissions', 'pageGuard'],

        // Layer 3: Database
        L3_DATABASE: ['supabaseClient', 'supabaseCore', 'supabaseAuth', 'supabaseReports'],

        // Layer 4: LLM
        L4_LLM: ['multiLLMClient', 'llmBase', 'llmGemini'],

        // Layer 5: File Processing
        L5_FILE: ['fileHandler', 'fileStorage', 'markdownConverter'],

        // Layer 6: PSUR Processing
        L6_PSUR: ['psurGenerator', 'psurCore', 'psurSections'],

        // Layer 7: Data Extraction
        L7_EXTRACT: ['dataExtractor', 'extractBase', 'extractCS'],

        // 페이지별 필수 의존성
        PAGES: {
            'P01_Login': ['CONFIG', 'supabaseClient', 'authManager'],
            'P10_Dashboard': ['CONFIG', 'supabaseClient', 'authManager', 'permissions'],
            'P14_UnifiedProcessing': ['CONFIG', 'supabaseClient', 'multiLLMClient', 'fileHandler', 'markdownConverter'],
            'P15_SectionEditor': ['CONFIG', 'supabaseClient', 'multiLLMClient', 'psurGenerator'],
            'P18_Review': ['CONFIG', 'supabaseClient', 'psurGenerator'],
            'P19_QC': ['CONFIG', 'supabaseClient', 'psurGenerator'],
            'P20_Output': ['CONFIG', 'supabaseClient', 'psurGenerator']
        }
    };

    // Singleton 인스턴스 생성
    const dependencyChecker = new DependencyChecker();

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.DependencyChecker = DependencyChecker;
        window.dependencyChecker = dependencyChecker;
        window.KPSUR_DEPENDENCIES = KPSUR_DEPENDENCIES;

        // KPSUR 네임스페이스
        window.KPSUR = window.KPSUR || {};
        window.KPSUR.dependencies = {
            checker: dependencyChecker,
            definitions: KPSUR_DEPENDENCIES
        };

        console.log('✅ DependencyChecker loaded');
    }

})();

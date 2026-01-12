# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**KPSUR AGENT** - Korean pharmaceutical PSUR (Periodic Safety Update Report) automation system for MFDS (식품의약품안전처) regulatory compliance.

**Tech Stack**: Vanilla JS (ES6 modules) + Supabase (Auth/DB/Storage) + Multi-LLM (Claude/OpenAI/Gemini)

**Deployment**: GitHub Pages (static hosting, no server-side code)

## Development Commands

```bash
# Local server (REQUIRED - ES6 modules need HTTP server)
python3 -m http.server 8000
# Access: http://localhost:8000

# Database migrations (run via Supabase SQL editor)
# Files in: migrations/*.sql

# Test data location
# 02_relateDocs/00_fromKSJ/학습데이터세트_output예시+raw데이터예시_20260102/raw데이터예시__20260102/
```

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Master | `main@main.com` | `1111` |
| Master | `master@kpsur.test` | `master123` |
| Author | `author@kpsur.test` | `test1234` |
| Reviewer | `reviewer@kpsur.test` | `test1234` |
| Viewer | `viewer@kpsur.test` | `test1234` |

## Architecture

### 5-Stage Workflow (defined in js/config.js)
```
Stage 1: P13_NewReport         → User inputs (CS0-CS24 data)
Stage 2: P14_UnifiedProcessing → File upload + MD convert + Data extraction (3-step wizard)
Stage 3: P18_Review            → Section editing (15 sections)
Stage 4: P19_QC                → Quality validation
Stage 5: P20_Output            → Word document generation
```

### Stage 2 File Upload Wizard (3 Steps)
```
Step 1: 제품정보 문서 (RAW1.x, RAW2.x, RAW7)
Step 2: 임상 자료 (RAW8, RAW17)
Step 3: 기타 자료 (RAW3-6, RAW9, RAW12-16)
```

### JS Module Architecture (Modular Structure)

```
js/
├── core/                    # Layer 0: Sealed Core (DO NOT MODIFY)
│   ├── markdown-transform-core.js
│   ├── supabase-query-core.js
│   ├── llm-provider-core.js
│   ├── data-extract-core.js
│   └── file-io-core.js
│
├── db/                      # Layer 3: Database (Modularized)
│   ├── supabase-core.js     # 초기화, 연결
│   ├── supabase-auth.js     # 인증 관련
│   ├── supabase-reports.js  # 보고서 CRUD
│   ├── supabase-documents.js # 문서/마크다운
│   ├── supabase-llm.js      # LLM 다이얼로그
│   └── index.js             # 통합 export
│
├── llm/                     # Layer 4: LLM (Modularized)
│   ├── llm-base.js          # 공통 인터페이스
│   ├── llm-gemini.js        # Gemini 구현
│   ├── llm-claude.js        # Claude 구현
│   ├── llm-openai.js        # OpenAI 구현
│   └── index.js             # 팩토리 패턴
│
├── psur/                    # Layer 6: PSUR Processing (Modularized)
│   ├── psur-core.js         # 생성 엔진
│   ├── psur-sections.js     # 섹션별 로직
│   ├── psur-templates.js    # 템플릿 처리
│   ├── psur-prompts.js      # LLM 프롬프트
│   └── index.js             # 통합 facade
│
├── extract/                 # Layer 7: Data Extraction (Modularized)
│   ├── extract-base.js      # 추출 기본 로직
│   ├── extract-cs.js        # CS 데이터 추출
│   ├── extract-ph.js        # PH 데이터 추출
│   ├── extract-tables.js    # 표 데이터 추출
│   └── index.js             # 통합 DataExtractor
│
├── utils/                   # Utilities
│   └── dependency-checker.js # 모듈 의존성 검증
│
└── [기존 파일들]             # Legacy 호환
    ├── config.js            # Layer 1: Config
    ├── auth.js              # Layer 2: Auth
    ├── permissions.js
    ├── page-guard.js
    └── ...

pages/js/                    # Page Scripts (분리된 인라인 스크립트)
├── common/
│   └── page-init.js         # 공통 초기화 유틸
├── login.js                 # P01_Login 스크립트
├── dashboard.js             # P10_Dashboard 스크립트
└── ...                      # 기타 페이지 스크립트
```

### Module Layers Summary

| Layer | Directory | Modules | Purpose |
|-------|-----------|---------|---------|
| **L0 Core** | `js/core/` | 5 sealed modules | 핵심 변환/쿼리 로직 (변경 금지) |
| **L1 Config** | `js/` | `config.js`, `env.js` | Constants, routes, RAW_IDs |
| **L2 Auth** | `js/` | `auth.js`, `permissions.js`, `page-guard.js` | Session, RBAC |
| **L3 Database** | `js/db/` | 6 modules | PostgreSQL, Storage, Auth |
| **L4 LLM** | `js/llm/` | 5 modules | Claude/OpenAI/Gemini API |
| **L5 File** | `js/` | `file-handler.js`, `file-storage.js`, `markdown-converter.js` | File I/O |
| **L6 PSUR** | `js/psur/` | 5 modules | PSUR 생성 파이프라인 |
| **L7 Extract** | `js/extract/` | 5 modules | CS/PH/Table 추출 |
| **L8 Output** | `js/` | `output-generator.js`, `qc-validator.js` | Word export, QC |

### Global Object Pattern (GitHub Pages Constraint)

All JS modules export to `window` object instead of ES6 exports for GitHub Pages compatibility:
```javascript
// Pattern used throughout codebase
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.multiLLMClient = multiLLMClient;
    window.supabaseClient = supabaseClient;
}
```

### KPSUR Namespace

모듈화된 구조는 `window.KPSUR` 네임스페이스로도 접근 가능:
```javascript
// KPSUR 네임스페이스 구조
window.KPSUR = {
    db: {
        client: supabaseClient,
        core, auth, reports, documents, llm
    },
    llm: {
        client: multiLLMClient,
        base, gemini, claude, openai
    },
    psur: {
        generator: psurGenerator,
        core, sections, templates, prompts
    },
    extract: {
        extractor: dataExtractor,
        base, cs, ph, tables
    },
    dependencies: {
        checker: dependencyChecker,
        definitions: KPSUR_DEPENDENCIES
    }
};
```

### Standard Script Load Order

HTML 페이지에서 스크립트 로드 순서:
```html
<!-- Layer 0: Sealed Core -->
<script src="../js/core/markdown-transform-core.js"></script>
<script src="../js/core/supabase-query-core.js"></script>
<script src="../js/core/llm-provider-core.js"></script>
<script src="../js/core/data-extract-core.js"></script>
<script src="../js/core/file-io-core.js"></script>

<!-- Layer 1: Config -->
<script src="../js/config.js"></script>
<script src="../js/env.js"></script>

<!-- Layer 2: Auth -->
<script src="../js/auth.js"></script>
<script src="../js/permissions.js"></script>
<script src="../js/page-guard.js"></script>

<!-- Layer 3: Database -->
<script src="../js/db/supabase-core.js"></script>
<script src="../js/db/supabase-auth.js"></script>
<script src="../js/db/supabase-reports.js"></script>
<script src="../js/db/supabase-documents.js"></script>
<script src="../js/db/supabase-llm.js"></script>
<script src="../js/db/index.js"></script>

<!-- Layer 4: LLM -->
<script src="../js/llm/llm-base.js"></script>
<script src="../js/llm/llm-gemini.js"></script>
<script src="../js/llm/llm-claude.js"></script>
<script src="../js/llm/llm-openai.js"></script>
<script src="../js/llm/index.js"></script>

<!-- Utils -->
<script src="../js/utils/dependency-checker.js"></script>

<!-- Page-specific -->
<script src="js/[page-name].js"></script>
```

### Dependency Verification

```javascript
// 의존성 검증 예시
if (window.dependencyChecker) {
    // 필수 모듈 검증
    const valid = dependencyChecker.verify(['CONFIG', 'supabaseClient', 'authManager']);

    // 페이지별 의존성 검증
    const pageValid = dependencyChecker.verify(KPSUR_DEPENDENCIES.PAGES['P14_UnifiedProcessing']);

    // 진단 출력
    dependencyChecker.printDiagnostics();
}
```

### Database Tables (Supabase PostgreSQL)

| Table | Purpose |
|-------|---------|
| `users` | Auth + roles (Master/Author/Reviewer/Viewer) |
| `products` | Drug master data |
| `reports` | Workflow state, user_inputs (jsonb), qc_model |
| `source_documents` | Uploaded files with raw_id classification |
| `markdown_documents` | Converted markdown content |
| `extracted_data` | CS/PH/Table data with source tracking |
| `report_sections` | 15 report sections (00-14) |
| `llm_dialogs` | LLM usage logging and cost tracking |
| `llm_sessions` | LLM conversation session management |

### RBAC System (js/permissions.js)

```
Master (4)   → Full access, user management
Author (3)   → Create/edit reports, output
Reviewer (2) → Review, QC approval
Viewer (1)   → Read-only access
```

### localStorage Keys
```
kpsur_session       → User session data (id, email, name, role, position)
current_report      → Active report UUID
last_stage          → Last visited stage number
uploadedFiles       → File metadata + RAW IDs
convertedMarkdowns  → Markdown content per file
extractedData       → CS/PH/Table JSON
generatedSections   → 15 report sections
llmSessionCache_*   → LLM session cache per report
GOOGLE_API_KEY      → User's Gemini API key
ANTHROPIC_API_KEY   → User's Claude API key
OPENAI_API_KEY      → User's OpenAI API key
```

### LLM Session Management (js/llm-session-manager.js)
- **Session persistence**: DB-first, localStorage cache fallback
- **Context window**: 80% threshold management per model
- **Token limits**: Claude 200K, GPT-4o 128K, Gemini 1M
- **History**: Conversation history preserved across page navigation

## Locked Core Modules

**⚠️ DO NOT MODIFY** - The following modules are sealed and require explicit authorization to modify:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔒 SEALED CORE MODULES (js/core/)                                  │
│                                                                      │
│  1. markdown-transform-core.js                                      │
│     - 마크다운 변환 핵심 로직 (PDF, Excel, Word, Text 파일 처리)   │
│     - Object.freeze()로 런타임 수정 방지                            │
│                                                                      │
│  2. supabase-query-core.js                                          │
│     - CRUD 기본 연산, 트랜잭션, 에러 핸들링                         │
│     - 데이터베이스 쿼리 핵심 로직                                   │
│                                                                      │
│  3. llm-provider-core.js                                            │
│     - Provider 추상화, API 호출 (Gemini/Claude/OpenAI)              │
│     - 토큰 계산, 응답 파싱 핵심 로직                                │
│                                                                      │
│  4. data-extract-core.js                                            │
│     - CS/PH/Table 데이터 파싱 핵심 로직                             │
│     - 정규식 패턴, 데이터 검증                                      │
│                                                                      │
│  5. file-io-core.js                                                 │
│     - File/Blob 처리, Base64 인코딩/디코딩                          │
│     - MIME 타입 감지 핵심 로직                                      │
│                                                                      │
│  ────────────────────────────────────────────────────────────────   │
│  수정이 필요한 경우:                                                 │
│  1. 사용자에게 명시적으로 "core 모듈 수정" 승인 요청                │
│  2. MODIFICATION HISTORY에 변경 사항 기록                           │
│  3. MODULE_VERSION 업데이트                                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Critical Data Rules

**ABSOLUTE RULES** - These override all other considerations:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🚫 NEVER GENERATE MISSING DATA                                      │
│     ✅ If data not found → Ask user                                  │
│     ❌ NEVER make up, estimate, or infer missing values              │
│                                                                       │
│  ⚠️ NEVER ARBITRARILY SELECT CONFLICTING DATA                        │
│     ✅ Present all versions with source/date → Ask user to choose    │
│     ❌ NEVER select "latest" or "best" without user approval         │
└─────────────────────────────────────────────────────────────────────┘
```

## Critical E2E Test Rules

**ABSOLUTE RULES** - E2E/테스트 요청 시 반드시 준수:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🚫 E2E 테스트 직접 실행 금지                                         │
│                                                                       │
│  사용자가 "E2E 테스트", "테스트 진행", "전체 테스트" 등 요청 시:      │
│                                                                       │
│  ✅ 반드시 /e2e-test command 실행                                     │
│     → .claude/commands/e2e-test.md 참조                              │
│                                                                       │
│  ✅ 사양 문서 먼저 읽기                                               │
│     → 03_Test/01_Context/TestSequence_Login_to_Stage2.md             │
│     → "🚨 AI/Claude 에이전트 필수 준수 사항" 섹션 확인                │
│                                                                       │
│  ✅ 파일 수 요구사항 100% 충족 확인                                   │
│     → Step 1: 8개, Step 2: 2개, Step 3: 20개, 총합: 30개             │
│     → 미달 시 절대 진행 금지                                          │
│                                                                       │
│  ❌ command 없이 직접 브라우저 조작 시작 금지                          │
│  ❌ 사양 문서 읽기 전 테스트 시작 금지                                 │
│  ❌ 파일 수 "충분히" 등 임의 판단 금지                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Classification

### RAW IDs (Source Document Types)

**PDF 문서 (RAW1.x, RAW2.x)**
| RAW ID | 문서 유형 |
|--------|----------|
| RAW1.1 | 최신첨부문서 |
| RAW1.2 | 보고기간시작시점첨부문서 |
| RAW2.1 | 용법용량 |
| RAW2.2 | 효능효과 |
| RAW2.3 | 사용상의주의사항 |
| RAW2.4 | 보고기간시작시점효능효과 |
| RAW2.5 | 보고기간시작시점용법용량 |
| RAW2.6 | 보고시작시점사용상의주의사항 |

**Word 문서 (RAW5-8)**
| RAW ID | 문서 유형 |
|--------|----------|
| RAW5 | 안전성조치허가팀메일 |
| RAW6 | 안전성조치허가팀메일_취합본 |
| RAW7 | 안전성정보변경 |
| RAW8 | 임상노출데이터 |

**Excel 문서 (RAW3-4, RAW9, RAW12-17)**
| RAW ID | 문서 유형 |
|--------|----------|
| RAW3 | 시판후sales데이터 |
| RAW4 | 허가현황 |
| RAW9 | 문헌자료 |
| RAW12 | 국외신속보고LineListing |
| RAW13 | 국내신속보고LineListing |
| RAW14 | 원시자료LineListing |
| RAW15 | 정기보고LineListing |
| RAW16 | MedDRA_SMQ_lack_of_efficacy |
| RAW17 | IIT및NIS트래커 |

### Data Types
| Type | Pattern | Examples |
|------|---------|----------|
| **CS** | `CS{n}_{한글}` | CS0_성분명, CS5_국내허가일자 |
| **PH** | `PH{n}_{한글}` | PH4_원시자료서술문, PH11_총괄평가문 |
| **Table** | `표{n}_{한글}` | 표2_연도별판매량, 표5_신속보고내역 |

### Data Extraction API (js/extract/)

> **모듈화 구조**: `js/extract/` 디렉토리에 분리됨 (기존 `data-extractor.js` 호환 유지)

```javascript
// Legacy API (호환)
await dataExtractor.extractFromMarkdown(markdownContent, rawId, definitions);
dataExtractor.mergeExtractedData(newData, 'CS');

// Modular API
await window.KPSUR.extract.cs.extract(markdownFiles, CS_DEFINITIONS);
await window.KPSUR.extract.ph.extract(markdownFiles, PH_DEFINITIONS);
await window.KPSUR.extract.tables.extract(markdownFiles, TABLE_DEFINITIONS);

// 전체 추출
await dataExtractor.extractAllData(markdownFiles, { CS, PH, Table });

// 충돌 관리
const conflicts = dataExtractor.getConflicts();
dataExtractor.resolveConflict('CS0_성분명', selectedValue);

// 내보내기
dataExtractor.exportToJSON(reportName);
```

## LLM Configuration (js/llm/)

> **모듈화 구조**: `js/llm/` 디렉토리에 분리됨 (기존 `multi-llm-client.js` 호환 유지)

### Available Models
| Provider | Models | Context | Use Case |
|----------|--------|---------|----------|
| **Gemini** | gemini-3-flash-preview, gemini-2.5-pro-preview | 1M tokens | Default provider, Korean text |
| **Claude** | claude-opus-4-5, claude-sonnet-4, claude-sonnet-3-5 | 200K tokens | High quality |
| **OpenAI** | gpt-4o, gpt-4o-mini | 128K tokens | General purpose |

### Hybrid Mode
Sonnet draft → Opus refinement (61% cost reduction)

### API Methods
```javascript
// Single message (Legacy + New)
await multiLLMClient.generate(prompt, { provider: 'gemini', model: 'gemini-3-flash-preview' });

// With conversation history (session-aware)
await multiLLMClient.generateWithHistory(systemPrompt, messages, options);

// Provider-specific (Modular API)
await window.KPSUR.llm.gemini.generate(prompt, options);
await window.KPSUR.llm.claude.generate(prompt, options);
await window.KPSUR.llm.openai.generate(prompt, options);

// Cost tracking
await window.costTracker.logUsage(reportId, { model, inputTokens, outputTokens });
```

### LLM Dialog Logging (Supabase)
```javascript
// All LLM calls are logged to llm_dialogs table
await supabaseClient.createLLMDialog(reportId, {
    stage: 'extract',           // classify, convert, extract, qc
    model_name: 'gemini-3-flash-preview',
    user_message: prompt,
    assistant_message: response,
    input_tokens: 1000,
    output_tokens: 500
});
```

## Key Constraints

1. **GitHub Pages**: No server-side code; all modules use global window exports
2. **Regulatory Accuracy**: Official MFDS submissions - pharmaceutical data accuracy is critical
3. **Korean Language**: All reports follow 식품의약품안전처 guidelines
4. **Content Preservation**: Markdown conversion must preserve all original content
5. **User API Keys**: Keys stored in localStorage, managed via P91_Settings

## Page Structure

**Active Pages**:
- P01-P05: Auth (Login, Signup, Password, SystemCheck)
- P10-P13: Dashboard, ReportList, ReportDetail, NewReport
- P14_UnifiedProcessing: Unified processing (3-step wizard)
- P15_SectionEditor: Section editing interface
- P18_Review, P19_QC, P20_Output: Final stages
- P30_UserManagement, P90_SystemTest, P91_Settings: Admin

## PSUR Report Sections (15개)
| 번호 | 섹션명 | Template File |
|------|--------|---------------|
| 00 | 표지 | 02_Templates/00_표지.md |
| 01 | 목차 | 02_Templates/01_목차.md |
| 02 | 약어설명 | 02_Templates/02_약어설명.md |
| 03 | 서론 | 02_Templates/03_서론.md |
| 04 | 전세계판매허가현황 | 02_Templates/04_전세계판매허가현황.md |
| 05 | 안전성조치 | 02_Templates/05_안전성조치.md |
| 06 | 안전성정보참고정보변경 | 02_Templates/06_안전성정보참고정보변경.md |
| 07 | 환자노출 | 02_Templates/07_환자노출.md |
| 08 | 개별증례병력 | 02_Templates/08_개별증례병력.md |
| 09 | 시험 | 02_Templates/09_시험.md |
| 10 | 기타정보 | 02_Templates/10_기타정보.md |
| 11 | 종합적인안전성평가 | 02_Templates/11_종합적인안전성평가.md |
| 12 | 결론 | 02_Templates/12_결론.md |
| 13 | 참고문헌 | 02_Templates/13_참고문헌.md |
| 14 | 별첨 | 02_Templates/14_별첨.md |

## 많이하는 실수/반복되는 실수

### JavaScript 모듈 관련
1. **ES6 import/export 사용 금지** - GitHub Pages에서 모듈 시스템 제한으로 `window` 객체에 export 필수
2. **supabaseClient 메서드 호출 시 await 누락** - 모든 DB 호출은 async/await 필수
3. **localStorage JSON 파싱** - `JSON.parse()` 없이 직접 사용 시 오류

### LLM API 관련
1. **API 키 하드코딩** - localStorage에서 동적으로 로드해야 함
2. **토큰 한도 초과** - 긴 문서 처리 시 청크 분할 필요
3. **응답 파싱 실패** - LLM 응답에서 JSON 추출 시 마크다운 코드블록 제거 필요

### 데이터 처리 관련
1. **RAW ID 대소문자 불일치** - `RAW1.1` vs `raw1.1` 주의
2. **reportId null 체크 누락** - `localStorage.getItem('current_report')` null 가능
3. **CS/PH/Table 데이터 소스 추적 누락** - 추출 시 `source_raw_id` 필수

### UI/UX 관련
1. **로딩 상태 표시 누락** - LLM 처리 중 사용자 피드백 필요
2. **에러 핸들링 미흡** - try-catch로 사용자 친화적 메시지 표시
3. **페이지 이동 전 데이터 저장 누락** - `beforeunload` 이벤트 처리

## Debugging & Testing

### Browser Console Commands
```javascript
// Check session state
console.log('Session:', JSON.parse(localStorage.getItem('kpsur_session')));
console.log('Report ID:', localStorage.getItem('current_report'));
console.log('Uploaded Files:', JSON.parse(localStorage.getItem('uploadedFiles')));
console.log('Extracted Data:', JSON.parse(localStorage.getItem('extractedData')));

// Reset test state
localStorage.removeItem('current_report');
localStorage.removeItem('uploadedFiles');
localStorage.removeItem('convertedMarkdowns');
localStorage.removeItem('extractedData');

// Set API key manually
localStorage.setItem('GOOGLE_API_KEY', JSON.stringify('YOUR_KEY'));
```

### Supabase SQL Queries
```sql
-- Check recent reports
SELECT id, report_name, status, current_stage, created_at
FROM reports ORDER BY created_at DESC LIMIT 5;

-- Check extracted data for a report
SELECT variable_id, data_value, source_raw_id
FROM extracted_data WHERE report_id = '<UUID>';

-- Check LLM cost for a report
SELECT SUM(input_tokens) as total_input, SUM(output_tokens) as total_output,
       SUM(estimated_cost_usd) as total_cost
FROM llm_dialogs WHERE report_id = '<UUID>';
```

### Test Sequence Reference
- Full E2E test: `03_Test/01_Context/TestSequence_Login_to_Stage2.md`
- RAW ID classification context: `01_Context/02_RAW_ID_ExtractContext.md`

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

| Item | Value |
|------|-------|
| Local server | `python3 -m http.server 8000` |
| Access URL | http://localhost:8000 |
| Master login | `main@main.com` / `1111` |
| E2E test command | `/e2e-test` |
| Test data path | `02_relateDocs/00_fromKSJ/5차테스트/학습데이터세트예시/학습데이터_raw_20260118/` |

---

## Project Overview

**KPSUR AGENT** - Korean pharmaceutical PSUR (Periodic Safety Update Report) automation system for MFDS (식품의약품안전처) regulatory compliance.

- **Tech Stack**: Vanilla JS (ES6 modules) + Supabase (Auth/DB/Storage) + Multi-LLM (Claude/OpenAI/Gemini)
- **Deployment**: GitHub Pages (static hosting, no server-side code)
- **Critical Constraint**: GitHub Pages requires all JS modules export to `window` object (no ES6 import/export)

## Development Commands

```bash
# Local server (REQUIRED - ES6 modules need HTTP server)
python3 -m http.server 8000
# Access: http://localhost:8000

# Database migrations (run via Supabase SQL editor)
# Files in: migrations/*.sql
```

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Master | `main@main.com` | `1111` |
| Author | `author@kpsur.test` | `test1234` |
| Reviewer | `reviewer@kpsur.test` | `test1234` |
| Viewer | `viewer@kpsur.test` | `test1234` |

---

## Critical Rules (MUST READ)

### 🚫 Data Rules - Pharmaceutical Accuracy Required
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

### 🚫 Document Reading Rules
```
┌─────────────────────────────────────────────────────────────────────┐
│  🚫🚫🚫 문서 일부만 읽고 진행하는 것 절대 금지 🚫🚫🚫                    │
│                                                                       │
│  ❌ 토큰 제한 오류 시 임의로 limit 설정하여 일부만 읽기 금지            │
│  ❌ "앞부분만 읽으면 충분하다"고 임의 판단 금지                         │
│                                                                       │
│  ✅ 토큰 제한 오류 시 올바른 대응:                                     │
│     1. Grep으로 핵심 키워드 검색 (필수, 공식, 확정, 테스트 등)          │
│     2. offset/limit으로 분할하여 전체를 다 읽기                        │
│                                                                       │
│  ⚠️  "예시"라고 표기되어 있어도 테스트 사양에서는 필수값일 수 있음      │
└─────────────────────────────────────────────────────────────────────┘
```

### 🚫 E2E Test Rules
```
┌─────────────────────────────────────────────────────────────────────┐
│  🚫 E2E 테스트 직접 실행 금지                                         │
│                                                                       │
│  ✅ 반드시 /e2e-test command 실행                                     │
│  ✅ 사양 문서 먼저 읽기: 03_Test/01_Context/TestSequence_Login_to_Stage3.md │
│  ✅ 파일 수 요구사항: Step1=8, Step2=2, Step3=27, 총합=37개           │
│  ❌ 파일 수 미달 시 진행 금지                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 🚫 Data Extraction Validation Rules (데이터 추출 검증 규칙)
```
┌─────────────────────────────────────────────────────────────────────┐
│  🚫🚫🚫 "정상 추출" 판단 시 반드시 준수 🚫🚫🚫                          │
│                                                                       │
│  ✅ 정상 추출: 실제 유의미한 데이터 값이 있는 경우만                    │
│                                                                       │
│  ❌ 미추출로 분류해야 하는 패턴:                                       │
│     - PLACEHOLDER                                                     │
│     - 빈 값, null, undefined                                          │
│     - "[...] - 필요" 형태의 설명문                                     │
│       예: "[MedDRA 버전] - 사용자 입력 필요"                           │
│       예: "[원시자료 총 환자수] - RAW14에서 LLM 추출 필요"             │
│     - "LLM 추출 필요" 포함 텍스트                                      │
│     - "계산 필요" 포함 텍스트                                          │
│     - "사용자 입력 필요" 포함 텍스트                                   │
│     - N/A, -                                                          │
│                                                                       │
│  ⚠️ "값이 비어있지 않다" ≠ "정상 추출"                                 │
│  ⚠️ 실제 데이터인지 placeholder 설명문인지 반드시 구분할 것            │
│                                                                       │
│  검증 코드 예시:                                                       │
│  const isPlaceholder = (val) => {                                     │
│      if (!val || val === 'PLACEHOLDER') return true;                  │
│      if (/\[.*\].*필요/.test(val)) return true;                       │
│      if (/LLM 추출 필요|계산 필요|사용자 입력 필요/.test(val))         │
│          return true;                                                 │
│      return false;                                                    │
│  };                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 🔒 Sealed Core Modules (js/core/) - DO NOT MODIFY
```
markdown-transform-core.js  - 마크다운 변환 핵심 로직
supabase-query-core.js      - CRUD/트랜잭션 핵심 로직
llm-provider-core.js        - Provider 추상화, 토큰 계산
data-extract-core.js        - CS/PH/Table 파싱 핵심 로직
file-io-core.js             - File/Blob, MIME 타입 감지

수정 필요 시: 사용자에게 명시적 승인 요청 → MODIFICATION HISTORY 기록
```

---

## Architecture

### 5-Stage Workflow (js/config.js)
```
Stage 1: P13_NewReport         → User inputs (CS0-CS24 기본 정보)
Stage 2: P14_UnifiedProcessing → File upload + MD convert + Data extraction (3-step wizard)
Stage 3: P15_SectionEditor     → Section editing (15 sections, CS/PH/Table 뷰어)
Stage 4: P19_QC                → Quality validation
Stage 5: P20_Output            → Word document generation

Note: P18_Review는 Stage 3의 일부로 레거시 지원됨
```

### Stage 2 File Upload Wizard (3 Steps)
```
Step 1: 제품정보 문서 (RAW1.x, RAW2.1-2.2, RAW7) - 8개 파일
Step 2: 임상 자료 (RAW8, RAW17) - 2개 파일
Step 3: 기타 자료 (RAW2.3-2.6, RAW3-6, RAW9-19 등) - 27개 파일
총합: 37개 파일 (테스트 기준)
```

### Module Layers

| Layer | Location | Key Files |
|-------|----------|-----------|
| L0 Core | `js/core/` | 5 sealed modules (변경 금지) |
| L1 Config | `js/` | `config.js`, `env.js` |
| L2 Auth | `js/` | `auth.js`, `permissions.js`, `page-guard.js` |
| L3 Database | `js/db/` | `supabase-*.js`, `index.js` |
| L4 LLM | `js/llm/` | `llm-base.js`, `llm-gemini.js`, `llm-claude.js`, `llm-openai.js` |
| L5 File | `js/` | `file-handler.js`, `markdown-converter.js`, `unified-processor.js` |
| L6 PSUR | `js/psur/` | `psur-core.js`, `psur-sections.js`, `psur-prompts.js` |
| L7 Extract | `js/extract/` | `extract-cs.js`, `extract-ph.js`, `extract-tables.js` |
| L8 Output | `js/` | `output-generator.js`, `qc-validator.js`, `section-editor.js` |

### Global Object Pattern (GitHub Pages Constraint)
```javascript
// All JS modules MUST export to window object
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.multiLLMClient = multiLLMClient;
    window.supabaseClient = supabaseClient;
}
```

### RBAC System (js/permissions.js)
```
Master (4)   → Full access, user management
Author (3)   → Create/edit reports, output
Reviewer (2) → Review, QC approval
Viewer (1)   → Read-only access
```

### localStorage Keys
```
kpsur_session       → User session (id, email, name, role)
current_report      → Active report UUID
GOOGLE_API_KEY      → User's Gemini API key
ANTHROPIC_API_KEY   → User's Claude API key
OPENAI_API_KEY      → User's OpenAI API key
uploadedFiles       → File metadata + RAW IDs
extractedData       → CS/PH/Table JSON
```

---

## Database (Supabase PostgreSQL)

| Table | Purpose |
|-------|---------|
| `users` | Auth + roles (Master/Author/Reviewer/Viewer) |
| `products` | Drug master data |
| `reports` | Workflow state, user_inputs (jsonb) |
| `source_documents` | Uploaded files with raw_id classification |
| `markdown_documents` | Converted markdown content |
| `extracted_data` | CS/PH/Table data with source tracking |
| `report_sections` | 15 report sections (00-14) |
| `llm_dialogs` | LLM usage logging and cost tracking |

Full schema: `02_relateDocs/DATABASE_SCHEMA.md`

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

| Stage | Page | Purpose |
|-------|------|---------|
| Auth | P01-P05 | Login, Signup, Password, SystemCheck |
| Dashboard | P10-P12 | Dashboard, ReportList, ReportDetail |
| Stage 1 | P13_NewReport | User inputs (CS0-CS24 기본 정보) |
| Stage 2 | P14_UnifiedProcessing | File upload + MD convert + Extract (3-step wizard) |
| Stage 2.5 | P16_LineListingAnalysis | Line Listing 분석 (optional) |
| **Stage 3** | **P15_SectionEditor** | **Primary: Section editing, CS/PH/Table viewer, data verification** |
| Stage 3 | P18_Review | Legacy (subset of P15 functionality) |
| Stage 4 | P19_QC | Quality validation |
| Stage 5 | P20_Output | Word document generation |
| Admin | P30, P90-P91 | UserManagement, SystemTest, Settings |

> **Note**: P15_SectionEditor is the primary Stage 3 page for data verification. E2E tests reference this page for CS/PH/Table data validation.

## PSUR Report Sections (15개)

> Templates: `02_relateDocs/02_Templates/{nn}_{섹션명}.md`
> Examples: `02_relateDocs/03_Examples/{nn}_{섹션명}.md`
> Prompts: `01_Context/sectionPrompt/{nn}_{섹션명}.md`

| 번호 | 섹션명 | Required RAW | Optional RAW |
|------|--------|--------------|--------------|
| 00 | 표지 | - | - |
| 01 | 목차 | - | - |
| 02 | 약어설명 | - | - |
| 03 | 서론 | - | RAW1.1, RAW2.1, RAW2.2 |
| 04 | 전세계판매허가현황 | RAW4 | - |
| 05 | 안전성조치 | RAW7 | RAW5, RAW6 |
| 06 | 안전성정보참고정보변경 | - | RAW7, RAW2.3, RAW2.6 |
| 07 | 환자노출 | RAW3 | - |
| 08 | 개별증례병력 | RAW14 | RAW12, RAW13, RAW15 |
| 09 | 시험 | - | RAW8, RAW17 |
| 10 | 기타정보 | - | RAW9 |
| 11 | 종합적인안전성평가 | - | - |
| 12 | 결론 | - | - |
| 13 | 참고문헌 | - | RAW9 |
| 14 | 별첨 | - | - |

> Full section-to-RAW dependencies: See `CONFIG.SECTION_DATA_DEPENDENCIES` in `js/config.js`

---

## 자주 발생하는 실수

### JavaScript 모듈
- **ES6 import/export 사용 금지** - `window` 객체에 export 필수
- **await 누락** - 모든 DB/LLM 호출은 async/await 필수
- **localStorage 파싱** - `JSON.parse()` 없이 직접 사용 시 오류

### 데이터 처리
- **RAW ID 대소문자 불일치** - `RAW1.1` vs `raw1.1` 주의
- **reportId null 체크 누락** - `localStorage.getItem('current_report')` null 가능
- **LLM 응답 파싱** - JSON 추출 시 마크다운 코드블록 제거 필요

---

## 디버깅

### 브라우저 콘솔 명령어
```javascript
// 세션 상태 확인
console.log('Session:', JSON.parse(localStorage.getItem('kpsur_session')));
console.log('Report ID:', localStorage.getItem('current_report'));

// 테스트 상태 초기화
localStorage.removeItem('current_report');
localStorage.removeItem('uploadedFiles');
localStorage.removeItem('extractedData');

// API 키 수동 설정
localStorage.setItem('GOOGLE_API_KEY', JSON.stringify('YOUR_KEY'));
```

### Supabase SQL
```sql
-- 최근 보고서 조회
SELECT id, report_name, status, current_stage FROM reports ORDER BY created_at DESC LIMIT 5;

-- 추출 데이터 조회
SELECT variable_id, data_value, source_raw_id FROM extracted_data WHERE report_id = '<UUID>';
```

---

## 참고 문서

| 문서 | 위치 |
|------|------|
| E2E 테스트 시퀀스 | `03_Test/01_Context/TestSequence_Login_to_Stage3.md` |
| RAW ID 정의 | `01_Context/02_RAW_ID_ExtractContext.md` |
| DB 스키마 | `02_relateDocs/DATABASE_SCHEMA.md` |
| 테스트 데이터 | `02_relateDocs/00_fromKSJ/5차테스트/학습데이터세트예시/학습데이터_raw_20260118/` |
| 섹션별 프롬프트 | `01_Context/sectionPrompt/` (00_표지.md ~ 14_별첨.md) |
| 템플릿 예시 | `02_relateDocs/02_Templates/`, `02_relateDocs/03_Examples/` |

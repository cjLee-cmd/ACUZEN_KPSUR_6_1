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
```

## Test Accounts

- **Master**: `main@main.com` / `1111`
- **Author**: `author@kpsur.test` / `test1234`

## Architecture

### 5-Stage Workflow (defined in js/config.js)
```
Stage 1: P13_NewReport         → User inputs (CS0-CS24 data)
Stage 2: P14_Stage2_Processing → File upload + MD convert + Data extraction
Stage 3: P18_Review            → Section editing (15 sections)
Stage 4: P19_QC                → Quality validation
Stage 5: P20_Output            → Word document generation
```

### JS Module Layers

| Layer | Modules | Purpose |
|-------|---------|---------|
| **Config** | `config.js`, `env.js` | Constants, routes, RAW_IDs, STAGES |
| **Auth** | `auth.js`, `permissions.js`, `page-guard.js` | Session, RBAC (Master/Author/Reviewer/Viewer) |
| **Database** | `supabase-client.js` | PostgreSQL queries, Storage, Auth |
| **LLM** | `multi-llm-client.js`, `llm-session-manager.js`, `chat-modal.js` | Claude/OpenAI/Gemini API, session tracking |
| **Pipeline** | `unified-processor.js`, `psur-generator.js`, `section-editor.js` | End-to-end processing |
| **File I/O** | `file-handler.js`, `file-storage.js`, `markdown-converter.js` | Upload, RAW ID classification, conversion |
| **Data** | `data-extractor.js`, `template-writer.js` | CS/PH/Table extraction |
| **Output** | `output-generator.js`, `qc-validator.js`, `hybrid-generator.js` | Word export, validation |

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
kpsur_session      → User session data
current_report     → Active report UUID
uploadedFiles      → File metadata + RAW IDs
convertedMarkdowns → Markdown content per file
extractedData      → CS/PH/Table JSON
generatedSections  → 15 report sections
GOOGLE_API_KEY     → User's Gemini API key
ANTHROPIC_API_KEY  → User's Claude API key
OPENAI_API_KEY     → User's OpenAI API key
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

## Data Classification

### RAW IDs (Source Document Types)
| RAW ID | 문서 유형 |
|--------|----------|
| RAW1 | 최신첨부문서 |
| RAW2.1-2.3 | 용법용량/효능효과/사용상의주의사항 |
| RAW3 | 시판후sales데이터 |
| RAW4 | 허가현황 |
| RAW5-7 | 안전성조치 메일/변경 |
| RAW12-15 | LineListing (신속보고/정기보고/원시자료) |

### Data Types
| Type | Pattern | Examples |
|------|---------|----------|
| **CS** | `CS{n}_{한글}` | CS0_성분명, CS5_국내허가일자 |
| **PH** | `PH{n}_{한글}` | PH4_원시자료서술문, PH11_총괄평가문 |
| **Table** | `표{n}_{한글}` | 표2_연도별판매량, 표5_신속보고내역 |

## LLM Configuration (js/multi-llm-client.js)

### Available Models
| Provider | Models | Use Case |
|----------|--------|----------|
| **Claude** | Opus 4.5, Sonnet 3.5, Haiku 3.5 | Highest quality, balanced, fast |
| **OpenAI** | GPT-4o, GPT-4o Mini | General purpose |
| **Gemini** | gemini-3-pro-preview, gemini-3-flash-preview | Default provider |

### Hybrid Mode
Sonnet draft → Opus refinement (61% cost reduction)

### API Methods
```javascript
// Single message
await multiLLMClient.generate(prompt, { provider: 'claude', model: 'claude-sonnet-3-5' });

// With conversation history
await multiLLMClient.generateWithHistory(systemPrompt, messages, options);

// Legacy compatibility
await multiLLMClient.sendMessage(prompt, options);
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
- P14_Stage2_Processing: Unified processing (replaces P14-P17)
- P15_SectionEditor: Section editing interface
- P18_Review, P19_QC, P20_Output: Final stages
- P30_UserManagement, P90_SystemTest, P91_Settings: Admin

**Legacy Pages** (prefixed `_OLD_`): P14_OLD_FileUpload, P15_OLD_MarkdownConversion, P16_OLD_DataExtraction, P17_OLD_TemplateWriting

## 많이하는 실수/반복되는 실수

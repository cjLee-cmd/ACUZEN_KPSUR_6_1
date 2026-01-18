# 세션 컨텍스트 - 2026-01-17

## 세션 목적
PSUR_UI_Design_Spec.md에 따른 E2E 테스트 진행 (코드 수정 없이)

---

## 프로젝트 정보
- **프로젝트**: KPSUR AGENT (Korean PSUR 자동화 시스템)
- **기술 스택**: Vanilla JS (ES6) + Supabase (Auth/DB/Storage) + Multi-LLM (Claude/OpenAI/Gemini)
- **배포**: GitHub Pages (정적 호스팅)
- **현재 브랜치**: dev-doc

---

## E2E 테스트 준비 상태

### 테스트 문서
- **UI 설계 사양**: `02_relateDocs/PSUR_UI_Design_Spec.md`
- **테스트 시퀀스**: `03_Test/01_Context/TestSequence_Login_to_Stage3.md`

### 테스트 범위 (9 Stages)
```
Stage 1: 로그인 (P01_Login.html)
Stage 2: 보고서 설정 (P13_NewReport.html)
Stage 3: 파일 업로드 (P14_UnifiedProcessing.html) - 3단계 위자드
Stage 4: 마크다운 변환
Stage 5: 데이터 추출
Stage 6: 템플릿 작성
Stage 7: 리뷰 (P18_Review.html)
Stage 8: QC 검증 (P19_QC.html)
Stage 9: 최종 출력 (P20_Output.html)
```

### 테스트 데이터 (5차테스트 - 총 37개 파일)
```
02_relateDocs/00_fromKSJ/5차테스트/학습데이터세트예시/학습데이터_raw_20260118/
├── 01_PreProcessing_LineListing/ (4개: RAW12-15)
│   ├── Raw12_국외신속보고LineListing_예시1.xlsx
│   ├── Raw13_국내신속보고LineListing_예시1.xlsx
│   ├── Raw14_원시자료LineListing_예시1.xlsx
│   └── Raw15_정기보고LineListing_예시1.xlsx
│
├── 02_Step_1/ (8개: RAW1.x, RAW2.x, RAW7)
│   ├── RAW1.1_최신첨부문서_예시1.pdf
│   ├── RAW1.2_보고기간시작시점첨부문서_예시1.pdf
│   ├── RAW2.1_용법용량_예시1.pdf
│   ├── RAW2.2_효능효과_예시1.pdf
│   ├── RAW7_안전성정보변경_예시1_복수항목.docx
│   ├── RAW7_안전성정보변경_예시2_.docx
│   ├── RAW7_안전성정보변경_예시3_용법용량.docx
│   └── RAW7_안전성정보변경_예시4_표형식복수항목.docx
│
├── 03_Step_2/ (2개: RAW8, RAW17)
│   ├── RAW8_임상노출데이터_예시1.docx
│   └── RAW17_IIT및NIS트래커_예시1.xlsx
│
└── 03_Step_3/ (16개: RAW2.3-2.6, RAW3-6, RAW9, RAW16)
    ├── RAW2.3_사용상의주의사항_예시1.pdf
    ├── RAW2.4_보고기간시작시점효능효과_예시1.pdf
    ├── RAW2.5_보고기간시작시점용법용량_예시1.pdf
    ├── RAW2.6_보고시작시점사용상의주의사항_예시1.pdf
    ├── RAW3_시판후sales데이터_예시1.xlsx
    ├── RAW4_허가현황_예시1.xlsx
    ├── RAW5_안전성조치허가팀메일_예시1~6.docx (6개)
    ├── RAW6_안전성조치허가팀메일_취합본_예시1.docx (2개)
    ├── RAW9_문헌자료_예시1.xlsx
    └── RAW16_MedDRA_SMQ_lack_of_efficacy_예시1.xlsx
```

### 테스트 계정
| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| Master | `main@main.com` | `1111` |
| Author | `author@kpsur.test` | `test1234` |

---

## 절대 규칙 (E2E 테스트)

```
⛔ 파일 수 미달 시 "LLM 분류 시작" 클릭 금지
   - Step 1: 8개 미만 → 진행 금지
   - Step 2: 2개 미만 → 진행 금지
   - Step 3: 20개 미만 → 진행 금지
   - 총합: 30개 미만 → 진행 금지

⛔ UI 제약 발생 시 임의로 파일 삭제/스킵 금지
⛔ 검증 단계 스킵 금지
```

---

## 설정 변경 사항

### Chrome DevTools MCP 설정 추가
`~/.claude/settings.json`에 다음 설정 추가됨:
```json
"chrome-devtools": {
  "command": "npx",
  "args": [
    "-y",
    "@anthropic-ai/chrome-devtools-mcp@latest",
    "--isolated"
  ]
}
```
**목적**: `--isolated` 플래그로 여러 세션에서 독립된 브라우저 인스턴스 사용 가능

---

## 현재 상태
- **Plan 모드**: 활성화
- **로컬 서버**: http://localhost:8000 실행 중 (port 8000)
- **브라우저**: 새 탭 생성됨 (P01_Login.html)

---

## 다음 단계 (세션 재시작 후)

1. **Claude Code 재시작** - MCP 설정 적용
2. **Plan 모드 해제** - 테스트 실행 준비
3. **E2E 테스트 시퀀스 실행**:
   - TC-01: 대시보드 (P10_Dashboard.html)
   - TC-02: Stage 1 - 새 보고서 생성 (P13_NewReport.html)
   - TC-03: Stage 2 - Raw Data 처리 (P14_UnifiedProcessing.html)
   - TC-04: Stage 2.5 - Line Listing 분석 (P16_LineListingAnalysis.html)
   - TC-05: Stage 3 - 섹션 편집 (P15_SectionEditor.html)

---

## 자동화 스크립트 (P13 테스트용)

테스트 시퀀스 문서에 E2E 테스트 자동 입력 스크립트 포함됨:
- 위치: `03_Test/01_Context/TestSequence_Login_to_Stage3.md` (lines 222-356)
- 브라우저 콘솔에서 실행하여 테스트 데이터 자동 입력

---

*저장일시: 2026-01-17*

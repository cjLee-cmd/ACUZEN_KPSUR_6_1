/**
 * Extract CS - CS 데이터 추출
 * js/extract/extract-cs.js
 *
 * Context-Specific (CS) 변수 추출 전문 모듈
 * 데이터명세서_한국PSUR_master_20260114_singleTab.xlsx 기반
 */

(function() {
    'use strict';

    // CS 변수 정의 - 데이터명세서_한국PSUR_master_20260114 기반
    // type: Excel 명세서에 정의된 데이터 타입
    // source: user_input | calculated | generated | raw_data
    // guideline: Excel 명세서의 지침
    // examples: Excel 명세서의 예시
    const CS_DEFINITIONS = {
        // === 기본 정보 (사용자 입력) ===
        'CS0_성분명': {
            rawIds: ['USER_INPUT'],
            description: '의약품 성분명',
            source: 'user_input',
            type: 'text',
            guideline: '기본정보UI/UX에 있는 브랜드명(성분명) 의 드롭다운에서 리스트에서 선택. 선택한 값이 [CS1_브랜드명], [CS0_성분명]이 됨.',
            examples: ['infliximab', '메만틴염산염']
        },
        'CS1_브랜드명': {
            rawIds: ['USER_INPUT'],
            description: '의약품 브랜드명',
            source: 'user_input',
            type: 'text',
            guideline: '기본정보UI/UX에 있는 브랜드명(성분명) 의 드롭다운에서 선택. R마크(®)는 위첨자로 표기.',
            examples: ['Remsima', '글리빅사®']
        },
        'CS2_회사명': {
            rawIds: ['USER_INPUT'],
            description: '품목허가권자 회사명',
            source: 'user_input',
            type: 'text',
            guideline: '기본정보UI/UX에 있는 회사명을 드롭다운에서 선택.',
            examples: ['셀트리온', '대웅제약']
        },
        'CS3_보고시작날짜': {
            rawIds: ['CALCULATED'],
            description: 'PSUR 보고기간 시작일 (CS4로부터 5년 전)',
            source: 'calculated',
            type: 'Date(YYYY연 MM월 DD일)',
            guideline: '[CS4_보고종료날짜]로부터 5년 전 날짜. 가이드라인에 따라 보고종료날짜로부터 5년치 최신 데이터를 문서에 담음.',
            examples: ['2019년 12월 01일']
        },
        'CS4_보고종료날짜': {
            rawIds: ['USER_INPUT'],
            description: 'PSUR 보고기간 종료일 (DLP)',
            source: 'user_input',
            type: 'Date(YYYY연 MM월 DD일)',
            guideline: '일반정보UI/UX에 있는 보고기간종료날짜에 특정 날짜를 선택하면, 이 날짜가 문서내의 [CS4_보고종료날짜]가 됨.',
            examples: ['2024년 11월 30일']
        },
        'CS5_국내허가일자': {
            rawIds: ['USER_INPUT'],
            description: '국내 품목허가일',
            source: 'user_input',
            type: 'Date(YYYY연 MM월 DD일)',
            guideline: '기본정보 입력 UI/UX에 있는 한국 허가일자에 선택된 날짜.',
            examples: ['2018년 11월 02일']
        },
        'CS6_보고서제출일': {
            rawIds: ['USER_INPUT'],
            description: '보고서 제출 예정일',
            source: 'user_input',
            type: 'Date(YYYY연 MM월 DD일)',
            guideline: '일반정보UI/UX에서 보고서 제출일 선택. 필수값 아님. 미지정시 YYYY.MM.DD로 표시.',
            examples: ['2025년 01월 15일']
        },
        'CS7_버전넘버': {
            rawIds: ['USER_INPUT'],
            description: '보고서 버전 번호',
            source: 'user_input',
            type: '소수점한자리숫자(X.X)',
            guideline: '일반정보 입력 UI/UX에 있는 버전넘버 숫자를 선택.',
            examples: ['1.0', '2.0']
        },
        'CS8_버전날짜': {
            rawIds: ['CALCULATED'],
            description: 'CS4_보고종료날짜와 동일',
            source: 'calculated',
            type: 'Date(YYYY.MM.DD)',
            guideline: '[CS4_보고종료날짜]와 같은 값. 자료마감일(DLP)과 동일.',
            examples: ['2024.11.30']
        },

        // === 목차 관련 (고정 템플릿 기반) ===
        'CS9_목차': {
            rawIds: ['CALCULATED'],
            description: '섹션 목차',
            source: 'calculated',
            type: 'text',
            guideline: '고정된 PSUR 섹션 구조에 따라 목차 생성. 1.서론, 2.전세계판매허가현황, 3.안전성조치, 4.안전성정보참고정보변경, 5.환자노출, 6.개별증례병력, 7.시험, 8.기타정보, 9.종합적인안전성평가, 10.결론, 참고문헌, 별첨 순서.',
            defaultValue: '1. 서론\n2. 전세계 판매 허가 현황\n3. 안전성 이유로 인한 보고기간 동안의 조치\n4. 안전성 정보 참고 정보의 변경\n5. 환자노출\n6. 개별 증례 병력(individual case history) 소개\n7. 시험\n8. 기타 정보\n9. 종합적인 안전성 평가\n10. 결론\n참고문헌\n별첨',
            examples: ['1. 서론\n2. 전세계 판매 허가 현황\n...']
        },
        'CS10_표목차': {
            rawIds: ['CALCULATED'],
            description: '표 목차',
            source: 'calculated',
            type: 'text',
            guideline: '고정된 PSUR 표 구조에 따라 표목차 생성. 표1~표9 및 필요시 추가 표 포함.',
            defaultValue: '표 1. 전 세계 판매 허가 현황\n표 2. 연도별 판매량\n표 3. 연평균 환자 노출\n표 4. 각 증례의 병력 소개\n표 5. 신속보고 내역\n표 6. 정기보고 내역\n표 7. KIDS 원시자료 내역\n표 8. 보고기간 동안 보고된 모든 이상사례 건수\n표 9. 보고기간 동안 보고된 모든 이상사례에 대한 기관계분류(SOC)별 건수',
            examples: ['표 1. 전 세계 판매 허가 현황\n표 2. 연도별 판매량\n...']
        },
        'CS11_별첨목차': {
            rawIds: ['CALCULATED'],
            description: '별첨 목차',
            source: 'calculated',
            type: 'text',
            guideline: '고정된 PSUR 별첨 구조에 따라 별첨목차 생성. 별첨1(최신첨부문서), 별첨2(참고정보변경대비표), 별첨3(개별증례일람표) 포함.',
            defaultValue: '별첨 1. 최신 첨부문서\n별첨 2. 참고정보 변경 대비표\n별첨 3. 개별 증례 일람표',
            examples: ['별첨 1. 최신 첨부문서\n별첨 2. 참고정보 변경 대비표\n별첨 3. 개별 증례 일람표']
        },
        'CS12_약어표': {
            rawIds: ['CALCULATED'],
            description: '약어 및 정의 목록',
            source: 'calculated',
            type: 'table',
            guideline: 'PSUR 문서에서 공통적으로 사용되는 표준 약어 목록. CIOMS 약물감시용어집 기반.',
            defaultValue: '| 약어 | 정의 |\n|------|------|\n| AE | Adverse Event (이상사례) |\n| CIOMS | Council for International Organizations of Medical Sciences |\n| DME | Designated Medical Event (지정 의학적 사건) |\n| ICH | International Council for Harmonisation |\n| KIDS | Korea Institute of Drug Safety & Risk Management (한국의약품안전관리원) |\n| MedDRA | Medical Dictionary for Regulatory Activities |\n| MFDS | Ministry of Food and Drug Safety (식품의약품안전처) |\n| PT | Preferred Term (우선용어) |\n| PSUR | Periodic Safety Update Report (정기적안전성업데이트보고서) |\n| SAE | Serious Adverse Event (중대한 이상사례) |\n| SOC | System Organ Class (기관계분류) |\n| SMQ | Standardised MedDRA Queries |',
            examples: ['별도 워드 문서 예시 참고']
        },

        // === 일자 관련 ===
        'CS13_유효기간': {
            rawIds: ['USER_INPUT'],
            description: '의약품 유효기간',
            source: 'user_input',
            type: 'Date(YYYY연 MM월 DD일)',
            guideline: '일반정보UI/UX에서 유효기간을 선택하는 날짜/달력에서 선택.',
            examples: ['2025년 12월 31일']
        },
        'CS14_신청기한': {
            rawIds: ['CALCULATED'],
            description: 'CS13_유효기간 6개월 전',
            source: 'calculated',
            type: 'Date(YYYY연 MM월 DD일)',
            guideline: '[CS13_유효기간]으로부터 달력일 기준 6개월 전으로 자동 지정.',
            examples: ['2025년 06월 30일']
        },

        // === 첨부문서 정보 ===
        'CS15_효능효과': {
            rawIds: ['RAW1.1', 'RAW2.2'],
            description: '최신 효능효과',
            source: 'raw_data',
            type: 'text',
            guideline: '[RAW1.1_최신첨부문서] OR [RAW2.2_효능효과]에서 효능효과 참고. 분량이 너무 길면 중요부분 위주로 요약.',
            examples: []
        },
        'CS16_용법용량': {
            rawIds: ['RAW1.1', 'RAW2.1'],
            description: '최신 용법용량',
            source: 'raw_data',
            type: 'text',
            guideline: '[RAW1.1_최신첨부문서] OR [RAW2.1_용법용량]의 용법용량 부분 참고. 분량이 너무 길면 중요부분 위주로 요약.',
            examples: []
        },

        // === 허가 현황 (RAW4) ===
        'CS17_전세계허가현황표': {
            rawIds: ['RAW4'],
            description: '국가별 허가 현황 표',
            source: 'raw_data',
            type: 'table',
            guideline: '[RAW4_허가Tracker]에서 허가된 국가나 지역 확인하고 표내용(허가일, 품목명, 허가권자, 비고) 채움. 용량추가로 여러번 허가시 순차적 기재, 적응증추가는 가장 먼저 허가난 날짜만 기재, 허가권자 다르면 모두 기재, 국가는 셀병합으로 가독성 향상.',
            examples: ['별도 워드 문서 예시 참고']
        },
        'CS17.6_허가현황서술문': {
            rawIds: ['RAW4'],
            description: '허가현황 서술문',
            source: 'raw_data',
            type: 'text',
            guideline: 'RAW4_허가Tracker에서 허가 국가 정보를 확인하여 서술문 생성. 대한민국 외 허가국가 없으면 예시1, 있으면 예시2/3 사용. 허가국가 5개 초과시 총XX개국으로 요약.',
            examples: [
                '"[CS1_브랜드명]([CS0_성분명])"의 품목허가일은 [CS5_국내허가일자]이고, 대한민국 이외 판매 허가받은 국가는 없다.',
                '"[CS1_브랜드명]([CS0_성분명])"의 품목허가일은 [CS5_국내허가일자]이고, 총XX개국에서 허가를 득하였다. 허가 현황은 다음과 같다.'
            ]
        },
        'CS17.1_허가국가': {
            rawIds: ['RAW4'],
            description: '허가 국가명',
            source: 'raw_data',
            type: 'text',
            guideline: '한국어로 기재.',
            examples: ['대한민국', '미국', '일본']
        },
        'CS17.2_허가일': {
            rawIds: ['RAW4'],
            description: '허가일자',
            source: 'raw_data',
            type: 'Date(YYYY-MM-DD)',
            guideline: '[CS17_전세계허가현황표]의 지침 참고.',
            examples: ['2018-11-02']
        },
        'CS17.3_허가품목명': {
            rawIds: ['RAW4'],
            description: '허가 품목명',
            source: 'raw_data',
            type: 'text',
            guideline: 'RAW데이터에 명시된 명칭으로 기재. 브랜드명의 위첨자 R마크(®)나 TM마크 누락하지 않고 위첨자로 반영.',
            examples: ['글리빅사®정']
        },
        'CS17.4_허가권자': {
            rawIds: ['RAW4'],
            description: '허가권자',
            source: 'raw_data',
            type: 'text',
            guideline: 'RAW데이터에 명시된 명칭으로 기재.',
            examples: ['셀트리온(주)']
        },
        'CS17.5_허가비고': {
            rawIds: ['RAW4'],
            description: '허가 비고',
            source: 'raw_data',
            type: 'text',
            guideline: '비고 내용은 RAW데이터의 전반적인 정보를 훑어보고 맥락 고려. 비고 컬럼만 보면 안됨.',
            examples: ['별도 워드 문서 예시 참고']
        },

        // === 임상 노출 (RAW8) ===
        'CS18_임상노출': {
            rawIds: ['RAW8'],
            description: '임상시험 노출 데이터',
            source: 'raw_data',
            type: 'text_and_table',
            guideline: '보고기간동안 종료된 임상시험, 진행중이지만 중간 CSR 발행된 임상시험 파악. 시험의약품/위약/활성대조의약품 대상자수, 가능시 연령별/성별/인종별 하위그룹 데이터 파악. 임상시험 없으면 예시1 사용. 표 밑 주석은 본문보다 작은 글씨, 윗첨자는 위첨자 양식 사용.',
            examples: [
                '본 보고기간 동안 [CS2_회사명](주)가 의뢰자이거나 지원한 "[CS1_브랜드명]([CS0_성분명])" 임상시험은 없었으며, 임상시험에서 "[CS1_브랜드명]([CS0_성분명])"에 대한 임상시험 대상자 노출은 없었다.'
            ]
        },

        // === 시판후 노출 (RAW3) ===
        'CS19_시판후노출count시작날짜': {
            rawIds: ['RAW3'],
            description: '판매량 집계 시작일',
            source: 'raw_data',
            type: 'Date(YYYY연 MM월 DD일)',
            guideline: '[RAW3_시판후sales데이터]가 월별로 count되어있다면, [CS3_보고시작날짜]와 [CS4_보고종료날짜] 사이에서 [CS3_보고시작날짜]에 가장 가까운 월의 1일. 분기별도 동일 논리.',
            examples: ['2020년 06월 01일']
        },
        'CS19.1_시판후노출count종료날짜': {
            rawIds: ['RAW3'],
            description: '판매량 집계 종료일',
            source: 'raw_data',
            type: 'Date(YYYY연 MM월 DD일)',
            guideline: '[RAW3_시판후sales데이터]가 월별로 count되어있다면, [CS3_보고시작날짜]와 [CS4_보고종료날짜] 사이에서 [CS4_보고종료날짜]에 가장 가까운 월의 말일.',
            examples: ['2025년 04월 30일']
        },
        'CS19.1_시판후판매연도': {
            rawIds: ['RAW3'],
            description: '연도별 컬럼',
            source: 'raw_data',
            type: 'YYYY년(필요시 괄호 안에 포함하는 월)',
            guideline: '[CS19_시판후노출count시작날짜]와 [CS19.1_시판후노출count종료날짜]를 고려해서 표의 맨상단 가로행 연도 결정. 예: 2020년 6월1일~2025년 4월30일이면 2020년(6월~12월), 2021년, 2022년, 2023년, 2024년, 2025년(1월~4월).',
            examples: ['2020년(6월~12월)', '2021년', '2025년(1월~4월)']
        },
        'CS19.2_시판후판매연도별판매량': {
            rawIds: ['RAW3'],
            description: '연도별 판매량',
            source: 'raw_data',
            type: '용법용량단위',
            guideline: '용법용량에 따라 XX정/XX바이알 등으로 표현. [표2_연도별판매량]및[표3_연평균환자노출]_예시1 파일 참고.',
            examples: ['1,234,567정', '5,000바이알']
        },
        'CS19.3_시판후판매량합계': {
            rawIds: ['RAW3'],
            description: '판매량 총합계',
            source: 'calculated',
            type: '용법용량단위',
            guideline: '용법용량에 따라 XX정/XX바이알 등으로 표현.',
            examples: ['30,015,165정']
        },

        // === 용량/환자 계산 ===
        'CS20_1일사용량': {
            rawIds: ['RAW1.1', 'RAW2.1'],
            description: '1일 사용량',
            source: 'raw_data',
            type: '용법용량단위',
            guideline: '[RAW1.1_최신첨부문서] OR [RAW2.1_용법용량]에서 용법용량을 기준으로 1일 사용량 계산. 예: 하루 2회 각 2정이면 1일 사용량은 4정.',
            examples: ['4정', '2바이알']
        },
        'CS21_환자1명당사용량': {
            rawIds: ['RAW2.1'],
            legacyRawIds: ['RAW1.1'],
            description: '환자당 연간 사용량 (Vials/년)',
            source: 'llm_calculated',
            type: '숫자',
            useLLM: true,
            llmPrompt: `용법용량 문서를 분석하여 "환자 1명당 연간 사용량"을 계산하세요.

분석 단계:
1. 1회 투여량 확인 (예: 2mg, 50μL)
2. 투여 빈도 확인 (예: 매월 1회, 2개월마다 1회)
3. 연간 투여 횟수 계산
4. 연간 사용량 = 연간 투여 횟수 (Vials/년)

예시:
- "첫 3개월 매월 1회, 이후 2개월마다 1회" → 첫해: 3 + 5 = 8회/년, 유지기: 6회/년
- 평균 약 6-8회/년으로 추정

출력 형식: 숫자만 반환 (예: 7)
1 Vial = 1회 투여로 계산합니다.`,
            guideline: '용법용량에 따라 환자 1명이 1년간 투여받는 횟수(Vials). 예: 연 6-8회 → 7',
            examples: ['7', '6', '12']
        },
        'CS22_연평균판매량': {
            rawIds: ['RAW3'],
            description: '연 평균 판매량 (Vials/년)',
            source: 'llm_calculated',
            type: '숫자',
            useLLM: true,
            llmPrompt: `Distribution_Tracker에서 Korea 연평균 판매량을 계산하세요.

## 계산 방법
1. 각 연도 시트의 "Year Total" 행에서 Korea 값 추출
2. 2021~2024년 Korea Year Total 합산 (0인 연도 제외)
3. 연평균 = 합계 ÷ 연수

## 데이터 위치
각 연도별 시트 마지막 행 "Year Total | Korea값 | ..."

## 중요
- 설명이나 코드 없이 최종 연평균 숫자만 출력
- 쉼표 없이 정수만 (예: 323102)`,
            guideline: 'RAW3 Distribution_Tracker에서 보고기간 내 Korea 판매량 연평균. 숫자만.',
            examples: ['323102', '500000']
        },
        'CS23_연평균환자노출': {
            rawIds: ['CS22_연평균판매량', 'CS21_환자1명당사용량'],
            description: '연 평균 환자 노출 수',
            source: 'calculated',
            type: '숫자(약 XX명)',
            guideline: '연평균판매량 ÷ 환자1명당연간사용량. 예: 6,104,779 ÷ 730 ≈ 8,363명. "약 XX명"으로 표현.',
            examples: ['약 8,363명']
        },
        'CS24_MedDRA버전넘버': {
            rawIds: ['USER_INPUT'],
            description: 'MedDRA 버전',
            source: 'user_input',
            type: '소수점숫자',
            guideline: '소수점 첫째자리까지 표현. 예: 28.1',
            examples: ['28.1', '27.0']
        },

        // === 신속보고 관련 (RAW19 통합 LineListing - 신속 필터) ===
        'CS25.1_신속보고일자': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13'],
            filterColumn: '원시/신속/정기',
            filterValue: '신속',
            description: '신속보고 보고일자',
            source: 'raw_data',
            type: 'Date',
            guideline: 'RAW19 통합 LineListing에서 신속보고 필터링 후 보고일자(Report_Date) 추출.',
            examples: []
        },
        'CS25.2_신속관리번호': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13'],
            filterColumn: '원시/신속/정기',
            filterValue: '신속',
            description: '신속보고 관리번호',
            source: 'raw_data',
            type: 'text',
            guideline: 'RAW19 통합 LineListing에서 신속보고 필터링 후 관리번호(Report_Number) 추출.',
            examples: []
        },
        'CS25.3_신속이상사례명': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13'],
            filterColumn: '원시/신속/정기',
            filterValue: '신속',
            description: '신속보고 이상사례명',
            source: 'raw_data',
            type: 'text',
            guideline: 'RAW19 통합 LineListing에서 신속보고 필터링 후 이상사례명(k-MedDRA PT_v28.1) 추출.',
            examples: []
        },
        'CS25.4_신속비고': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13'],
            filterColumn: '원시/신속/정기',
            filterValue: '신속',
            description: '신속보고 비고',
            source: 'raw_data',
            type: 'text',
            guideline: 'RAW19 통합 LineListing에서 신속보고 필터링 후 비고 추출.',
            examples: [],
            defaultValue: '해당 없음'  // 비고 컬럼이 없는 경우 기본값
        },

        // === 원시자료 관련 (RAW19 통합 LineListing - 원시 필터) ===
        'CS28_원시총환자수': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW14'],
            filterColumn: '원시/신속/정기',
            filterValue: '원시',
            description: '원시자료 총 환자수',
            source: 'raw_data',
            type: '숫자(정수)',
            guideline: 'RAW19 통합 LineListing에서 원시자료 필터링 후 Case번호 중복제거하여 count. case수 = 환자수.',
            examples: ['20명']
        },
        'CS29_원시총이상사례수': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW14'],
            filterColumn: '원시/신속/정기',
            filterValue: '원시',
            description: '원시자료 총 이상사례 건수',
            source: 'raw_data',
            type: '숫자(정수)',
            guideline: 'RAW19 통합 LineListing에서 원시자료 필터링 후 event 개수 count.',
            examples: ['200건']
        },
        'CS30_원시중대한사례수': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW14'],
            filterColumn: '원시/신속/정기',
            filterValue: '원시',
            description: '원시자료 중대한 이상사례 건수',
            source: 'raw_data',
            type: '숫자(정수)',
            guideline: 'RAW19 통합 LineListing에서 원시자료 필터링 후 Seriousness yes인 event만 count.',
            examples: ['50건']
        },
        'CS31_원시자료신청일': {
            rawIds: ['USER_INPUT'],
            description: '원시자료 신청일',
            source: 'user_input',
            type: 'Date',
            guideline: '일반정보UI/UX에서 원시자료가 없음에 tick되면, 원시자료신청일 선택하는 날짜/달력 나옴.',
            examples: ['2024년 11월 15일']
        },

        // === 보고 건수 합계 (RAW19 통합 LineListing 사용) - LLM 추출 ===
        'CS32_신속정기보고총사례수': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13', 'RAW15'],
            filterColumn: '원시/신속/정기',
            filterValues: ['신속', '정기'],
            description: '신속+정기 총 사례수',
            source: 'llm_calculated',
            type: '숫자(정수)',
            useLLM: true,
            llmPrompt: `RAW19 통합 LineListing 데이터를 분석하여 "신속보고 + 정기보고" 합계 건수를 계산하세요.

## 계산 방법
1. "원시/신속/정기" 컬럼(또는 유사 컬럼: 보고유형, Report_Type, 유형)을 찾습니다.
2. 해당 컬럼 값이 "신속" 또는 "정기"인 행의 개수를 셉니다.
3. 두 값의 합계를 반환합니다.

## 출력 형식
- 숫자만 출력 (예: 27)
- 단위나 텍스트 없이 정수만 반환`,
            guideline: 'RAW19 통합 LineListing에서 신속+정기 필터링 후 이상사례 count.',
            examples: ['27', '30', '0']
        },
        'CS33_신속보고총사례수': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13'],
            filterColumn: '원시/신속/정기',
            filterValue: '신속',
            description: '신속보고 총 사례수',
            source: 'llm_calculated',
            type: '숫자(정수)',
            useLLM: true,
            llmPrompt: `RAW19 통합 LineListing 데이터를 분석하여 "신속보고" 건수를 계산하세요.

## 계산 방법
1. "원시/신속/정기" 컬럼(또는 유사 컬럼: 보고유형, Report_Type, 유형)을 찾습니다.
2. 해당 컬럼 값이 "신속"인 행의 개수를 셉니다.

## 출력 형식
- 숫자만 출력 (예: 3)
- 단위나 텍스트 없이 정수만 반환
- 해당 데이터가 없으면 0 반환`,
            guideline: 'RAW19 통합 LineListing에서 신속보고 필터링 후 event 개수 count.',
            examples: ['3', '10', '0']
        },
        'CS34_정기보고총사례수': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW15'],
            filterColumn: '원시/신속/정기',
            filterValue: '정기',
            description: '정기보고 총 사례수',
            source: 'llm_calculated',
            type: '숫자(정수)',
            useLLM: true,
            llmPrompt: `RAW19 통합 LineListing 데이터를 분석하여 "정기보고" 건수를 계산하세요.

## 계산 방법
1. "원시/신속/정기" 컬럼(또는 유사 컬럼: 보고유형, Report_Type, 유형)을 찾습니다.
2. 해당 컬럼 값이 "정기"인 행의 개수를 셉니다.

## 출력 형식
- 숫자만 출력 (예: 24)
- 단위나 텍스트 없이 정수만 반환
- 해당 데이터가 없으면 0 반환`,
            guideline: 'RAW19 통합 LineListing에서 정기보고 필터링 후 event 개수 count.',
            examples: ['24', '50', '0']
        },
        'CS35_신속정기원시총사례수': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'],
            description: '전체 총 사례수 (신속+정기+원시)',
            source: 'llm_calculated',
            type: '숫자(정수)',
            useLLM: true,
            llmPrompt: `RAW19 통합 LineListing 데이터를 분석하여 전체 이상사례 건수를 계산하세요.

## 계산 방법
1. 테이블의 모든 데이터 행 수를 셉니다 (헤더 제외).
2. 또는 "원시/신속/정기" 컬럼의 "신속", "정기", "원시" 값을 가진 모든 행을 셉니다.

## 출력 형식
- 숫자만 출력 (예: 27)
- 단위나 텍스트 없이 정수만 반환`,
            guideline: 'RAW19 통합 LineListing 전체 이상사례 count (원시+신속+정기 모두 포함).',
            examples: ['27', '60', '0']
        },
        'CS36_중대한총사례수': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'],
            description: '중대한 이상사례 총 건수',
            source: 'llm_calculated',
            type: '숫자(정수)',
            useLLM: true,
            llmPrompt: `RAW19 통합 LineListing 데이터를 분석하여 "중대한 이상사례" 건수를 계산하세요.

## 계산 방법
1. "Seriousness" 또는 "중대성" 컬럼을 찾습니다.
2. 해당 컬럼 값이 다음 중 하나인 행의 개수를 셉니다:
   - "예", "Yes", "Y", "중대함", "Serious", "1", "TRUE"

## 출력 형식
- 숫자만 출력 (예: 3)
- 단위나 텍스트 없이 정수만 반환
- 중대한 이상사례가 없으면 0 반환`,
            guideline: 'RAW19 통합 LineListing에서 Seriousness=Yes인 이상사례만 count.',
            examples: ['3', '10', '0']
        },
        'CS37_중대하지않은총사례수': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'],
            description: '중대하지 않은 이상사례 총 건수',
            source: 'llm_calculated',
            type: '숫자(정수)',
            useLLM: true,
            llmPrompt: `RAW19 통합 LineListing 데이터를 분석하여 "중대하지 않은 이상사례" 건수를 계산하세요.

## 계산 방법
1. "Seriousness" 또는 "중대성" 컬럼을 찾습니다.
2. 해당 컬럼 값이 다음 중 하나인 행의 개수를 셉니다:
   - "아니오", "No", "N", "비중대", "Non-serious", "0", "FALSE", "중대하지 않음"

## 출력 형식
- 숫자만 출력 (예: 24)
- 단위나 텍스트 없이 정수만 반환
- 중대하지 않은 이상사례가 없으면 0 반환`,
            guideline: 'RAW19 통합 LineListing에서 Seriousness=No인 이상사례만 count.',
            examples: ['24', '50', '0']
        },

        // === 문헌 DB (사용자 입력) ===
        'CS53_문헌DB': {
            rawIds: ['USER_INPUT'],
            description: '문헌 검색 DB 목록',
            source: 'user_input',
            type: 'text',
            guideline: '문헌검색을 어디에서 했는지. 단수 또는 복수(여러개) 나열.',
            examples: [
                'Pubmed(www.ncbi.nlm.nih.gov/pubmed), Koreamed(koreamed.org), KMbase(kmbase.medric.or.kr) 및 KISS(kiss.kstudy.com)',
                'MEDLINE, EMBASE, BIOSIS, Derwent Drug File, Science Citation Index 및 Chemical Abstracts'
            ]
        },

        // === 안전성 조치 (RAW5, RAW6) ===
        'CS55_안전성조치서술문': {
            rawIds: ['RAW5', 'RAW6'],
            description: '안전성 조치 서술문',
            source: 'raw_data',
            type: 'text',
            guideline: 'CIOMS 가이드라인에 따른 안전성조치만 포함. 4가지 항목 파악: 1)어떤국가의 어떤규제당국 2)어떤 안전성조치(DHPC 배포, RSI 업데이트, RMP 포함 등) 3)어떤 안전성 문제 4)조치 요청 날짜/시기. 서술 스타일: 어떤국가의 어떤규제당국이 어떤안전성문제에 대해 어떤조치를 요구하였다. 그래서 자사는 어떤 조치를 취하였다.',
            examples: [
                '본 보고기간 동안 "[CS1_브랜드명]([CS0_성분명])"의 국내외에서 안전성의 이유로 취한 조치(판매허가 반려 또는 판매 정지, 허가 갱신 실패, 유통의 제한, 임상시험의 정지, 용량변경, 대상 환자군 또는 적응증의 변경, 제형 변경 등)는 없다.',
                '브라질 보건당국의 명시에 따라 혈소판감소증(면역 혈소판감소증 포함) 관련 출혈의 유무에 대한 Direct Healthcare Professional Communication(DHPC) 편지를 발행하도록 요구되었다.'
            ]
        },

        // === 참고정보 변경 (RAW7) ===
        'CS56_참고정보의변경서술문': {
            rawIds: ['RAW7'],
            description: '참고정보 변경 서술문',
            source: 'raw_data',
            type: 'text',
            guideline: '안전성정보변경이란 용법용량/효능효과/사용상의주의사항의 변경 여부 파악. minor한 것들은 제외. 변경이 있다면 3가지 포함: 1)변경날짜 2)어떤섹션에 변경있는지(제목과 섹션번호) 3)변경내용 요약.',
            examples: [
                '본 보고기간 동안 "[CS1_브랜드명]([CS0_성분명])"의 안전성 정보(금기, 경고, 주의, 약물이상반응, 과다투여, 상호작용 등)와 관련한 참고 정보의 변경은 없었다.',
                '본 보고기간 동안 "[CS1_브랜드명]([CS0_성분명])"의 안전성 정보와 관련한 참고 정보의 변경은 아래와 같다.\n- 2022년 1월 6일에는 "7. 임부, 수유부에 대한 투여" 섹션 내에 임신부 백신 접종에 대한 최신 안전성 데이터를 반영했다.\n자세한 사항은 별첨 2에 정리되어 있다.'
            ]
        },
        'CS56_별첨2참고정보변경표': {
            rawIds: ['RAW7'],
            description: '별첨2 변경 대비표',
            source: 'raw_data',
            type: 'text_and_table',
            guideline: '안전성정보(용법용량/효능효과/사용상의주의사항) 변경 여부 파악. 변경 없으면 "변경 없음"으로 명시. 변경 있으면 분량에 따라: 짧으면 전문 기재, 길면 변경된 부분만 대조 기재(섹션번호/섹션명 포함).',
            examples: ['별도 워드 문서 예시 참고']
        },
        'CS56.1_허가사항변경일': {
            rawIds: ['RAW7'],
            description: '허가사항 변경일',
            source: 'raw_data',
            type: 'Date_or_DateList',
            guideline: '단일: YYYY년 MM월 DD일. 복수: 날짜 list로 표시하고 괄호 안에 변경내용 요약. 예: 2022년1월2일(용법용량 변경), 2024년1월2일(사용상의주의사항 변경).',
            examples: ['2022년 01월 06일', '2022년1월2일(용법용량 변경), 2024년1월2일(사용상의주의사항 변경)']
        },
        'CS56.2_기존효능효과': {
            rawIds: ['RAW2.4', 'RAW1.2', 'RAW7'],  // RAW2.4(시작시점효능효과) 우선, RAW7은 fallback
            description: '보고시작시점 효능효과',
            source: 'raw_data',
            type: 'text',
            guideline: '보고기간 시작시점의 제품정보(Reference Safety information)에 근거한 효능효과. 변경 대비표 안에서 기존효능효과 칸.',
            examples: ['별도 워드 문서 예시 참고']
        },
        'CS56.3_기존용량용법': {
            rawIds: ['RAW2.5', 'RAW1.2', 'RAW7'],  // RAW2.5(시작시점용법용량) 우선, RAW7은 fallback
            description: '보고시작시점 용량용법',
            source: 'raw_data',
            type: 'text',
            guideline: '보고기간 시작시점의 제품정보(Reference Safety information)에 근거한 용법용량. 변경 대비표 안에서 기존용법용량 칸.',
            examples: ['별도 워드 문서 예시 참고']
        },
        'CS56.4_기존사용상의주의사항': {
            rawIds: ['RAW2.6', 'RAW1.2', 'RAW7'],  // RAW2.6(시작시점주의사항) 우선, RAW7은 fallback
            description: '보고시작시점 사용상의주의사항',
            source: 'raw_data',
            type: 'text',
            guideline: '보고기간 시작시점의 제품정보(Reference Safety information)에 근거한 사용상의 주의사항. 변경 대비표 안에서 기존사용상의주의사항 칸.',
            examples: ['별도 워드 문서 예시 참고']
        },
        'CS56.5_최신효능효과': {
            rawIds: ['RAW2.2', 'RAW1.1', 'RAW7'],  // RAW2.2(최신효능효과) 우선, RAW7은 fallback
            description: '보고종료시점 효능효과',
            source: 'raw_data',
            type: 'text',
            guideline: '보고기간 종료시점 기준 가장 최신의 제품정보에 근거한 효능효과. 변경 없으면 "변경 없음".',
            examples: ['별도 워드 문서 예시 참고']
        },
        'CS56.6_최신용량용법': {
            rawIds: ['RAW2.1', 'RAW1.1', 'RAW7'],  // RAW2.1(최신용법용량) 우선, RAW7은 fallback
            description: '보고종료시점 용량용법',
            source: 'raw_data',
            type: 'text',
            guideline: '보고기간 종료시점 기준 가장 최신의 제품정보에 근거한 용법용량. 변경 없으면 "변경 없음".',
            examples: ['별도 워드 문서 예시 참고']
        },
        'CS56.7_최신사용상의주의사항': {
            rawIds: ['RAW2.3', 'RAW1.1', 'RAW7'],  // RAW2.3(최신주의사항) 우선, RAW7은 fallback
            description: '보고종료시점 사용상의주의사항',
            source: 'raw_data',
            type: 'text',
            guideline: '보고기간 종료시점 기준 가장 최신의 제품정보에 근거한 사용상의 주의사항. 변경 없으면 "변경 없음".',
            examples: ['별도 워드 문서 예시 참고']
        },

        // === 참고문헌 (RAW9) ===
        'CS57_참고문헌리스트': {
            rawIds: ['RAW9'],
            description: '참고문헌 목록',
            source: 'raw_data',
            type: 'text',
            guideline: '[RAW9_문헌자료]에서 문헌 목록 추출. 형식: 대표저자. 논문제목. 저널명. 연도;권(호):시작쪽-끝쪽. 문헌 없으면 기본 가이드라인 명시.',
            defaultValue: '1. 식품의약품안전처, 정기적인 유익성-위해성 평가보고에 관한 가이드라인, 2017\n2. 식품의약품안전처, 의약품의 위해성 관리계획 가이드라인, 2021\n3. 한국의약품안전관리원, 의약품 부작용보고 원시자료',
            examples: [
                '1. 식품의약품안전처, 정기적인 유익성-위해성 평가보고에 관한 가이드라인, 2017\n2. 식품의약품안전처, 의약품의 위해성 관리계획 가이드라인, 2021\n3. 한국의약품안전관리원, "[CS1_브랜드명]([CS0_성분명])" 의약품 부작용보고 원시자료'
            ]
        },

        // === 별첨1 (RAW2.x 우선, RAW1.1은 fallback) ===
        'CS58.1_별첨1효능효과': {
            rawIds: ['RAW2.2', 'RAW1.1'],  // RAW2.2(효능효과) 우선, RAW1.1(통합문서)은 fallback
            description: '별첨1 효능효과 전문',
            source: 'raw_data',
            type: 'text_and_table',
            guideline: '[RAW2.2_효능효과] 그대로 기재, 또는 [RAW1.1_최신첨부문서]에서 효능효과 내용만 추출. 보고기간종료날짜 기준 가장 최신의 허가사항 반영.',
            examples: ['별도 워드 문서 예시 참고']
        },
        'CS58.2_별첨1용법용량': {
            rawIds: ['RAW2.1', 'RAW1.1'],  // RAW2.1(용법용량) 우선, RAW1.1(통합문서)은 fallback
            description: '별첨1 용법용량 전문',
            source: 'raw_data',
            type: 'text_table_image',
            guideline: '[RAW2.1_용법용량] 그대로 기재, 또는 [RAW1.1_최신첨부문서]에서 용법용량 내용만 추출. 보고기간종료날짜 기준 가장 최신의 허가사항 반영.',
            examples: ['별도 워드 문서 예시 참고']
        },
        'CS58.3_별첨1사용상의주의사항': {
            rawIds: ['RAW2.3', 'RAW1.1'],  // RAW2.3(사용상의주의사항) 우선, RAW1.1(통합문서)은 fallback
            description: '별첨1 사용상의주의사항 전문',
            source: 'raw_data',
            type: 'text_table_image',
            guideline: '[RAW2.3_사용상의주의사항] 그대로 기재, 또는 [RAW1.1_최신첨부문서]에서 사용상의주의사항 내용만 추출.',
            examples: ['별도 워드 문서 예시 참고']
        },

        // === 별첨3 일람표 (RAW19 통합 LineListing) ===
        'CS59_별첨3_일람표': {
            rawIds: ['RAW19'],
            legacyRawIds: ['RAW12', 'RAW13', 'RAW14', 'RAW15'],
            description: '별첨3 전체 이상사례 일람표',
            source: 'raw_data',
            type: 'table',
            guideline: 'RAW19 통합 LineListing에서 피벗테이블 생성. 세로: SOC/PT, 가로: 보고유형(원시/신속/정기) → 중대/비중대 → 인과성 유무.',
            examples: ['별도 워드 문서 예시 참고']
        }
    };

    /**
     * ExtractCS - CS 데이터 추출 클래스
     */
    class ExtractCS {
        constructor(base) {
            this.base = base || window.extractBase;
        }

        /**
         * CS 데이터 추출
         */
        async extract(markdownFiles, csDefinitions = null) {
            console.log('[ExtractCS] Extracting CS Data...');

            const definitions = csDefinitions || CS_DEFINITIONS;

            for (const file of markdownFiles) {
                // 관련 RAW ID인지 확인 (legacyRawIds 폴백 지원)
                const relevantDefs = this.getRelevantDefinitions(file.rawId, definitions, markdownFiles);

                if (Object.keys(relevantDefs).length === 0) {
                    console.log(`[ExtractCS] Skipping ${file.rawId} - no CS definitions`);
                    continue;
                }

                const result = await this.base.extractFromMarkdown(
                    file.markdownContent || file.markdown || file.content,
                    file.rawId,
                    relevantDefs
                );

                if (result.success) {
                    this.base.mergeExtractedData(result.data, 'CS');
                }
            }

            const csData = this.base.getData('CS');
            console.log(`[ExtractCS] CS Data extraction complete (${Object.keys(csData).length} variables)`);
            return csData;
        }

        /**
         * 해당 RAW ID와 관련된 정의만 필터링 (legacyRawIds 폴백 지원)
         * 특수 rawId: USER_INPUT, CALCULATED, GENERATED는 파일 추출 대상에서 제외
         * @param {string} rawId - 현재 처리 중인 RAW ID
         * @param {Object} definitions - CS 정의 객체
         * @param {Array} markdownFiles - 전체 마크다운 파일 목록 (폴백 확인용)
         */
        getRelevantDefinitions(rawId, definitions, markdownFiles = []) {
            const relevant = {};
            const specialSources = ['USER_INPUT', 'CALCULATED', 'GENERATED'];
            const availableRawIds = new Set(markdownFiles.map(f => f.rawId));

            Object.entries(definitions).forEach(([key, def]) => {
                if (def.rawIds) {
                    // 특수 소스가 아닌 실제 RAW ID와 매칭되는 항목만 필터링
                    const actualRawIds = def.rawIds.filter(id => !specialSources.includes(id));

                    // 1. 기본 rawIds 매칭
                    if (actualRawIds.includes(rawId)) {
                        relevant[key] = def;
                        return;
                    }

                    // 2. legacyRawIds 폴백: 기본 rawIds가 없고, legacyRawIds에 현재 rawId가 포함된 경우
                    if (def.legacyRawIds && def.legacyRawIds.includes(rawId)) {
                        // 기본 rawIds가 업로드되지 않은 경우에만 legacyRawIds 사용
                        const primaryRawIdsAvailable = actualRawIds.some(id =>
                            availableRawIds.has(id) || [...availableRawIds].some(a => a?.startsWith(id))
                        );

                        if (!primaryRawIdsAvailable) {
                            console.log(`[ExtractCS] Using legacy fallback for ${key}: ${rawId} (primary: ${actualRawIds.join(', ')})`);
                            relevant[key] = def;
                        }
                    }
                }
            });

            return relevant;
        }

        /**
         * 소스 타입별 CS 정의 가져오기
         * @param {string} sourceType - 'user_input' | 'calculated' | 'generated' | 'raw_data'
         */
        getDefinitionsBySource(sourceType) {
            const filtered = {};
            Object.entries(CS_DEFINITIONS).forEach(([key, def]) => {
                if (def.source === sourceType) {
                    filtered[key] = def;
                }
            });
            return filtered;
        }

        /**
         * 사용자 입력이 필요한 CS 항목 목록
         */
        getUserInputFields() {
            return Object.keys(this.getDefinitionsBySource('user_input'));
        }

        /**
         * RAW 데이터에서 추출해야 하는 CS 항목 목록
         */
        getRawDataFields() {
            return Object.keys(this.getDefinitionsBySource('raw_data'));
        }

        /**
         * 계산/생성되는 CS 항목 목록
         */
        getCalculatedFields() {
            return [
                ...Object.keys(this.getDefinitionsBySource('calculated')),
                ...Object.keys(this.getDefinitionsBySource('generated'))
            ];
        }

        /**
         * filterColumn 필드가 있는 정의 목록 반환
         * @returns {Object} filterColumn이 정의된 변수들
         */
        getFilterableDefinitions() {
            const filterable = {};
            Object.entries(CS_DEFINITIONS).forEach(([key, def]) => {
                if (def.filterColumn && def.filterValue) {
                    filterable[key] = {
                        filterColumn: def.filterColumn,
                        filterValue: def.filterValue,
                        rawIds: def.rawIds
                    };
                }
            });
            return filterable;
        }

        /**
         * RAW19 필터링 대상 컬럼명 변형 목록
         */
        getFilterColumnVariants() {
            return {
                '원시/신속/정기': [
                    '원시/신속/정기', '원시_신속_정기', '원시·신속·정기',
                    '보고유형', '보고 유형', 'report_type', 'Report_Type', 'ReportType',
                    '유형', 'Type', 'type', '구분'
                ],
                '중대성': [
                    'Seriousness', '중대성', 'seriousness', 'Serious', 'serious'
                ]
            };
        }

        /**
         * 테이블 데이터에서 filterColumn 매칭 컬럼 찾기
         * @param {Array<string>} headers - 테이블 헤더 배열
         * @param {string} filterColumn - 찾고자 하는 필터 컬럼명
         * @returns {string|null} 매칭된 컬럼명 또는 null
         */
        findMatchingFilterColumn(headers, filterColumn) {
            const variants = this.getFilterColumnVariants();
            const possibleNames = variants[filterColumn] || [filterColumn];

            for (const name of possibleNames) {
                if (headers.includes(name)) {
                    return name;
                }
            }
            return null;
        }

        /**
         * CS 정의 가져오기
         */
        getDefinitions() {
            return CS_DEFINITIONS;
        }

        /**
         * 특정 CS 변수 값 가져오기
         */
        getValue(variableId) {
            return this.base.getData('CS')[variableId];
        }

        /**
         * CS 데이터 전체 가져오기
         */
        getData() {
            return this.base.getData('CS');
        }

        /**
         * 필수 CS 변수 확인
         */
        validateRequired(requiredFields) {
            const csData = this.base.getData('CS');
            const missing = [];

            requiredFields.forEach(field => {
                if (!csData[field]) {
                    missing.push(field);
                }
            });

            return {
                valid: missing.length === 0,
                missing: missing
            };
        }

        /**
         * CS 추출 프롬프트 생성 (guideline과 examples 포함)
         */
        buildPrompt(markdownContent, rawId) {
            const definitions = this.getRelevantDefinitions(rawId, CS_DEFINITIONS);

            const variableInfo = Object.entries(definitions).map(([k, v]) => {
                let info = `- ${k}: ${v.description}`;
                if (v.guideline) {
                    info += `\n  지침: ${v.guideline}`;
                }
                if (v.examples && v.examples.length > 0 && v.examples[0]) {
                    info += `\n  예시: ${v.examples.slice(0, 2).join(' / ')}`;
                }
                return info;
            }).join('\n');

            return `다음 문서에서 CS(Context-Specific) 데이터를 추출하세요.

## 문서 (${rawId})
${markdownContent.substring(0, 25000)}

## 추출 대상 변수
${variableInfo}

## 출력 형식
\`\`\`json
{
  "CS0_성분명": "추출된 값 또는 DATA_NOT_FOUND",
  ...
}
\`\`\`

정확히 일치하는 데이터만 추출하고, 추정하지 마세요.`;
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.ExtractCS = ExtractCS;
        window.extractCS = new ExtractCS();
        window.CS_DEFINITIONS = CS_DEFINITIONS;
    }

})();

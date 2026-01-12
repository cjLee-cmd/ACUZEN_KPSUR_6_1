/**
 * PSUR Sections - 섹션 파싱 및 관리
 * js/psur/psur-sections.js
 *
 * 섹션 파싱, DB 저장/로드, 결합
 */

(function() {
    'use strict';

    /**
     * PSURSections - 섹션 관리 클래스
     */
    class PSURSections {
        constructor() {
            this.generatedSections = {};
            this.reportId = null;
        }

        /**
         * 보고서 ID 설정
         */
        setReportId(reportId) {
            this.reportId = reportId;
            console.log(`[PSURSections] Report ID set: ${reportId}`);
        }

        /**
         * 보고서 ID 가져오기
         */
        getReportId() {
            return this.reportId;
        }

        /**
         * 생성된 섹션 가져오기
         */
        getSections() {
            return this.generatedSections;
        }

        /**
         * 섹션 설정
         */
        setSection(sectionId, data) {
            this.generatedSections[sectionId] = data;
        }

        /**
         * 모든 섹션 설정
         */
        setSections(sections) {
            this.generatedSections = sections;
        }

        /**
         * 섹션 초기화
         */
        clearSections() {
            this.generatedSections = {};
        }

        /**
         * 최종 보고서 결합
         */
        getFinalReport() {
            const sortedIds = Object.keys(this.generatedSections).sort((a, b) => {
                return parseInt(a) - parseInt(b);
            });

            let finalReport = "# PSUR 최종 보고서\n\n";
            finalReport += `생성일시: ${new Date().toLocaleString('ko-KR')}\n\n`;
            finalReport += "---\n\n";

            for (const id of sortedIds) {
                const section = this.generatedSections[id];
                finalReport += section.content + "\n\n---\n\n";
            }

            return finalReport;
        }

        /**
         * 섹션들을 DB에 저장
         */
        async saveSectionsToDB(sections = null) {
            const sectionsToSave = sections || this.generatedSections;

            if (!this.reportId) {
                console.warn('[PSURSections] Report ID not set, skipping DB save');
                return { success: false, error: 'Report ID not set' };
            }

            if (!sectionsToSave || Object.keys(sectionsToSave).length === 0) {
                console.warn('[PSURSections] No sections to save');
                return { success: false, error: 'No sections to save' };
            }

            const supabaseClient = window.supabaseClient;
            if (!supabaseClient) {
                console.warn('[PSURSections] Supabase client not available');
                return { success: false, error: 'Supabase client not available' };
            }

            try {
                const sectionsArray = Object.entries(sectionsToSave).map(([sectionNumber, data]) => ({
                    number: sectionNumber,
                    name: data.name || '',
                    content: data.content || ''
                }));

                console.log(`[PSURSections] Saving ${sectionsArray.length} sections to DB...`);

                const result = await supabaseClient.bulkUpsertSections(this.reportId, sectionsArray);

                if (result.success) {
                    console.log(`[PSURSections] ✅ ${result.sections.length} sections saved to DB`);
                } else {
                    console.error('[PSURSections] ❌ DB save failed:', result.error);
                }

                return result;

            } catch (error) {
                console.error('[PSURSections] DB save error:', error);
                return { success: false, error: error.message };
            }
        }

        /**
         * DB에서 섹션들 로드
         */
        async loadSectionsFromDB() {
            if (!this.reportId) {
                console.warn('[PSURSections] Report ID not set, cannot load from DB');
                return null;
            }

            const supabaseClient = window.supabaseClient;
            if (!supabaseClient) {
                console.warn('[PSURSections] Supabase client not available');
                return null;
            }

            try {
                const result = await supabaseClient.getSections(this.reportId);

                if (!result.success || !result.sections || result.sections.length === 0) {
                    console.log('[PSURSections] No sections found in DB');
                    return null;
                }

                // DB 형식을 로컬 형식으로 변환
                const sections = {};
                for (const dbSection of result.sections) {
                    sections[dbSection.section_number] = {
                        id: dbSection.section_number,
                        name: dbSection.section_name,
                        content: dbSection.content_markdown,
                        generatedAt: dbSection.created_at,
                        isEdited: false,
                        dbId: dbSection.id,
                        version: dbSection.version
                    };
                }

                this.generatedSections = sections;
                console.log(`[PSURSections] ✅ ${Object.keys(sections).length} sections loaded from DB`);
                return sections;

            } catch (error) {
                console.error('[PSURSections] DB load error:', error);
                return null;
            }
        }

        /**
         * LLM 응답을 15개 섹션으로 파싱
         */
        parseSectionsFromResponse(responseText) {
            const sections = {};
            const sectionNames = window.PSUR_SECTION_NAMES || {
                '00': '표지', '01': '목차', '02': '약어설명', '03': '서론',
                '04': '전세계판매허가현황', '05': '안전성조치', '06': '안전성정보참고정보변경',
                '07': '환자노출', '08': '개별증례병력', '09': '시험', '10': '기타정보',
                '11': '종합적인안전성평가', '12': '결론', '13': '참고문헌', '14': '별첨'
            };

            if (!responseText) {
                console.warn('[PSURSections] 파싱할 응답이 없습니다.');
                return sections;
            }

            // === JSON 응답 처리 ===
            try {
                let cleanText = responseText.trim();
                if (cleanText.startsWith('```json')) {
                    cleanText = cleanText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
                } else if (cleanText.startsWith('```')) {
                    cleanText = cleanText.replace(/^```\n?/, '').replace(/\n?```$/, '');
                }

                if (cleanText.startsWith('{')) {
                    let jsonData = JSON.parse(cleanText);

                    // wrapper 객체 처리
                    if (jsonData.content && typeof jsonData.content === 'string' && !jsonData.sections) {
                        console.log('[PSURSections] Wrapper 객체 감지 - content 추출');
                        let innerContent = jsonData.content.trim();
                        if (innerContent.startsWith('```json')) {
                            innerContent = innerContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
                        } else if (innerContent.startsWith('```')) {
                            innerContent = innerContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
                        }
                        if (innerContent.startsWith('{')) {
                            jsonData = JSON.parse(innerContent);
                            console.log('[PSURSections] Inner JSON 파싱 성공');
                        }
                    }

                    // sections 객체 처리
                    if (jsonData.sections && typeof jsonData.sections === 'object') {
                        console.log('[PSURSections] JSON 형식 응답 감지 - sections 객체 파싱');

                        for (const [key, value] of Object.entries(jsonData.sections)) {
                            const sectionId = key.substring(0, 2);
                            const sectionName = value.sectionName || sectionNames[sectionId] || `섹션 ${sectionId}`;
                            const content = value.content || `## ${sectionId}. ${sectionName}\n\n[내용 없음]`;

                            sections[sectionId] = {
                                id: sectionId,
                                name: sectionName,
                                content: content,
                                generatedAt: new Date().toISOString(),
                                isEdited: false
                            };
                        }

                        // extractedData 저장
                        if (jsonData.extractedData) {
                            try {
                                localStorage.setItem('extractedData', JSON.stringify(jsonData.extractedData));
                                console.log('[PSURSections] extractedData 저장 완료');
                            } catch (e) {
                                console.warn('[PSURSections] extractedData 저장 실패:', e);
                            }
                        }

                        // fullReport 저장
                        if (jsonData.fullReport) {
                            try {
                                localStorage.setItem('fullReportContent', JSON.stringify(jsonData.fullReport));
                                console.log('[PSURSections] fullReport 저장 완료');
                            } catch (e) {
                                console.warn('[PSURSections] fullReport 저장 실패:', e);
                            }
                        }

                        const parsedCount = Object.keys(sections).length;
                        console.log(`[PSURSections] JSON에서 ${parsedCount}개 섹션 파싱 완료`);

                        if (parsedCount > 0) {
                            this.fillMissingSections(sections, sectionNames);
                            this.saveAndPersist(sections);
                            return sections;
                        }
                    }
                }
            } catch (e) {
                console.log('[PSURSections] JSON 파싱 실패, 마크다운 파싱으로 진행:', e.message);
            }

            // === 마크다운 패턴 파싱 (fallback) ===
            const patterns = [
                /(?:^|\n)(?:---\s*\n)?##?\s*(\d{2})[._\s]+([^\n]+)\n([\s\S]*?)(?=(?:\n---\s*\n)?##?\s*\d{2}[._\s]|$)/g,
                /(?:^|\n)##?\s*(\d{2})[._\s]*([^\n]*)\n([\s\S]*?)(?=\n##?\s*\d{2}|$)/g
            ];

            let matched = false;

            for (const pattern of patterns) {
                let match;
                const tempSections = {};

                while ((match = pattern.exec(responseText)) !== null) {
                    const sectionId = match[1];
                    let sectionName = match[2].trim();
                    let sectionContent = match[3].trim();

                    if (!sectionName && sectionNames[sectionId]) {
                        sectionName = sectionNames[sectionId];
                    }

                    sectionContent = sectionContent.replace(/^---\s*$/gm, '').trim();

                    tempSections[sectionId] = {
                        id: sectionId,
                        name: sectionName || sectionNames[sectionId] || `섹션 ${sectionId}`,
                        content: `## ${sectionId}. ${sectionName || sectionNames[sectionId]}\n\n${sectionContent}`,
                        generatedAt: new Date().toISOString(),
                        isEdited: false
                    };

                    matched = true;
                }

                if (matched && Object.keys(tempSections).length > 0) {
                    Object.assign(sections, tempSections);
                    break;
                }

                pattern.lastIndex = 0;
            }

            const parsedCount = Object.keys(sections).length;
            console.log(`[PSURSections] ${parsedCount}개 섹션 파싱 완료`);

            this.fillMissingSections(sections, sectionNames);
            this.saveAndPersist(sections);

            return sections;
        }

        /**
         * 누락된 섹션 채우기
         */
        fillMissingSections(sections, sectionNames) {
            for (const id of Object.keys(sectionNames)) {
                if (!sections[id]) {
                    sections[id] = {
                        id: id,
                        name: sectionNames[id],
                        content: `## ${id}. ${sectionNames[id]}\n\n[이 섹션은 생성되지 않았습니다]`,
                        generatedAt: null,
                        isEdited: false
                    };
                }
            }
        }

        /**
         * localStorage와 DB에 저장
         */
        saveAndPersist(sections) {
            // localStorage에 저장
            try {
                localStorage.setItem('generatedSections', JSON.stringify(sections));
            } catch (e) {
                console.warn('[PSURSections] 섹션 저장 실패:', e);
            }

            // DB에도 저장 (비동기)
            this.generatedSections = sections;
            this.saveSectionsToDB(sections).catch(err => {
                console.warn('[PSURSections] DB 저장 중 오류 (무시됨):', err);
            });
        }
    }

    // 전역 등록
    if (typeof window !== 'undefined') {
        window.PSURSections = PSURSections;
        window.psurSections = new PSURSections();
    }

})();

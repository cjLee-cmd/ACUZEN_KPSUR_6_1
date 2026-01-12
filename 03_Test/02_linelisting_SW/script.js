// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileNameDisplay = document.getElementById('file-name');
const processBtn = document.getElementById('process-btn');
const downloadBtn = document.getElementById('download-btn');
const statusLog = document.getElementById('status-log');
const tableHead = document.querySelector('#result-table thead');
const tableBody = document.querySelector('#result-table tbody');
const rowCountBadge = document.getElementById('row-count');

// Settings Elements
const apiKeyInput = document.getElementById('api-key');
const modelNameInput = document.getElementById('model-name');
const temperatureInput = document.getElementById('temperature');

// State
let rawWorkbook = null;
let processedData = null;
const SHEETS = {
    AE: '이상사례',
    CAUS: '인과성평가'
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    if (window.ENV_API_KEY) {
        apiKeyInput.value = window.ENV_API_KEY;
        log('API Key가 자동으로 로드되었습니다.', 'success');
    }
});
// Chat Elements
const chatInput = document.getElementById('chat-input');
const chatExpandBtn = document.getElementById('chat-expand-btn');
const chatCard = document.getElementById('chat-card');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatHistoryDiv = document.getElementById('chat-history');

// Chat State
let chatThread = [];

// Event Listeners for Chat
chatExpandBtn.addEventListener('click', () => {
    chatCard.classList.toggle('fullscreen');
    chatExpandBtn.textContent = chatCard.classList.contains('fullscreen') ? '⤡' : '⤢';
});

chatSendBtn.addEventListener('click', handleChatSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSend();
});

// ... inside processDataWithLLM success block ...
// Enable Chat
// chatInput.disabled = false;
// chatSendBtn.disabled = false;
// Initialize Chat Context
// chatThread = [
//    { role: 'user', parts: [{ text: ... original instructions ... }] },
//    { role: 'model', parts: [{ text: ... result json ... }] }
// ]; (Actually simple context injection is better)

async function handleChatSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    // UI Update: User Message
    appendChatMessage('user', text);
    chatInput.value = '';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    try {
        // Construct Context if new
        if (chatThread.length === 0 && processedData) {
            // Initial Context: Data Summary
            // Optimization: Send simplified CSV or just critical columns
            const contextMsg = `이것은 현재 처리된 라인리스팅 데이터입니다:\n${JSON.stringify(processedData.slice(0, 50))}...(총 ${processedData.length}건). \n\n이 데이터에 대해 질문하겠습니다.`;
            chatThread.push({ role: 'user', parts: [{ text: contextMsg }] });
            chatThread.push({ role: 'model', parts: [{ text: "네, 데이터가 준비되었습니다. 질문해주세요." }] });
        }

        // Add Current Message
        chatThread.push({ role: 'user', parts: [{ text: text }] });

        // Call LLM (Multi-turn)
        const apiKey = apiKeyInput.value.trim();
        const modelName = modelNameInput.value || 'gemini-3-flash-preview';

        // Prepare AI Message Bubble
        const aiMsgDiv = appendChatMessage('ai', '...');
        let fullResponse = "";

        await streamGeminiChat(apiKey, modelName, chatThread, (chunk) => {
            fullResponse += chunk;
            // Immediate markdown rendering during stream
            // Note: This might cause flicker for complex markdown like tables, but is "user visible".
            // Optimization: Only render plain text during stream, and marked on done?
            // User requested "user visible form" which implies rendered.
            aiMsgDiv.innerHTML = marked.parse(fullResponse);
            chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
        });

        // Update History
        chatThread.push({ role: 'model', parts: [{ text: fullResponse }] });

    } catch (err) {
        log(`채팅 오류: ${err.message}`, 'error');
        appendChatMessage('system', '오류가 발생했습니다.');
    } finally {
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
    }
}

function appendChatMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chat-message ${role} markdown-body`; // Add markdown-body class
    // For user logs we keep text, for AI we start with text then update html
    div.textContent = text;
    chatHistoryDiv.appendChild(div);
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    return div;
}

async function streamGeminiChat(apiKey, model, history, onChunk) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;

    // API Expects "contents": [ {role, parts}, ... ]
    const payload = {
        contents: history,
        generationConfig: {
            temperature: 0.7 // Higher temp for chat
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`API Error ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let lastIndex = 0;
        let openBrackets = 0;
        let inString = false;
        let isEscaped = false;

        for (let i = 0; i < buffer.length; i++) {
            const char = buffer[i];
            if (inString) {
                if (isEscaped) isEscaped = false;
                else if (char === '\\') isEscaped = true;
                else if (char === '"') inString = false;
            } else {
                if (char === '{') openBrackets++;
                else if (char === '}') {
                    if (openBrackets > 0) openBrackets--;
                    if (openBrackets === 0) {
                        const jsonStr = buffer.substring(lastIndex, i + 1);
                        const firstBrace = jsonStr.indexOf('{');
                        if (firstBrace !== -1) {
                            try {
                                const data = JSON.parse(jsonStr.substring(firstBrace));
                                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                                    onChunk(data.candidates[0].content.parts[0].text);
                                }
                                lastIndex = i + 1;
                            } catch (e) { }
                        }
                    }
                } else if (char === '"') inString = true;
            }
        }
        if (lastIndex > 0) buffer = buffer.substring(lastIndex);
    }
}

// File input handling
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', handleFileDrop);
fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
processBtn.addEventListener('click', processDataWithLLM);
downloadBtn.addEventListener('click', downloadResult);

// Handlers
function handleFileDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
}

function handleFileSelect(file) {
    if (!file) return;

    // Reset
    rawWorkbook = null;
    processedData = null;
    downloadBtn.disabled = true;
    processBtn.disabled = true;
    tableBody.innerHTML = '';

    fileNameDisplay.textContent = file.name;
    log(`파일 선택됨: ${file.name}`, 'info');

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            rawWorkbook = XLSX.read(data, { type: 'array' });

            // Validate Sheet Names
            const sheetNames = rawWorkbook.SheetNames;
            log(`시트 발견: ${sheetNames.join(', ')}`, 'info');

            const missingSheets = [];
            if (!sheetNames.includes(SHEETS.AE)) missingSheets.push(SHEETS.AE);
            if (!sheetNames.includes(SHEETS.CAUS)) missingSheets.push(SHEETS.CAUS);

            if (missingSheets.length > 0) {
                log(`오류: 필수 시트 누락 (${missingSheets.join(', ')})`, 'error');
                return;
            }

            processBtn.disabled = false;
            log('파일 읽기 완료. 처리 준비됨.', 'success');
        } catch (err) {
            log(`파일 읽기 오류: ${err.message}`, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

async function processDataWithLLM() {
    const apiKey = apiKeyInput.value.trim();
    const modelName = modelNameInput.value || 'gemini-3-flash-preview';
    const temperature = parseFloat(temperatureInput.value) || 0.2;

    if (!apiKey) {
        alert('API Key를 입력해주세요.');
        apiKeyInput.focus();
        return;
    }

    if (!rawWorkbook) return;

    try {
        log('데이터 전처리 중...', 'info');
        processBtn.disabled = true; // Prevent double click

        // 1. Prepare Data
        const aeData = XLSX.utils.sheet_to_json(rawWorkbook.Sheets[SHEETS.AE]);
        const causData = XLSX.utils.sheet_to_json(rawWorkbook.Sheets[SHEETS.CAUS]);

        // Convert to string for prompt (Limit size if necessary, but assuming test files)
        const aeString = JSON.stringify(aeData, null, 2);
        const causString = JSON.stringify(causData, null, 2);

        log(`LLM 요청 준비: ${modelName} (Temp: ${temperature})`, 'info');
        log('데이터 분석 및 변환 요청 중... (시간이 걸릴 수 있습니다)', 'info');

        // 2. Construct Prompt (One-Shot)
        const prompt = `
당신은 제약회사 약물감시팀 팀장입니다. 주어진 데이터를 바탕으로 **데이터 처리**와 **보고서 작성**을 동시에 수행해야 합니다.

[작업 목표]
제공된 '이상사례'(AE)와 '인과성평가'(Causality) 데이터를 분석하여, 아래 두 가지 결과를 포함한 하나의 JSON 객체를 반환하십시오.

[데이터 설명]
1. 이상사례 데이터 (AE): ${aeString}
2. 인과성평가 데이터 (Causality): ${causString}

[처리 규칙 1: 데이터 변환 (processed_data)]
1. '이상사례' 데이터를 기준으로 'Seriousness', '인과성평가', 'SOC' 3개 컬럼을 추가하십시오.
2. **Seriousness**: 6가지 기준(사망, 생명위협, 입원 등) 중 하나라도 해당되면 "Yes", 아니면 "No".
3. **인과성평가**: '인과성평가' 데이터에서 매칭되는 결과를 찾아 입력.
4. **SOC**: '이상사례·약물이상반응 MedDRA명'의 PT에 해당하는 상위 SOC(System Organ Class) 영문 명칭을 기재.

[처리 규칙 2: 보고서 작성 (report_md)]
1. 처리된 데이터를 바탕으로 아래 **[보고서 양식 예시]**와 똑같은 구조의 마크다운 보고서를 작성하십시오.
2. **[보고서 양식 예시]**:
   # [별첨 3] 시판 후 정보에서 보고 기간 동안의 요약 도표
   | 구분 (SOC / PT) | 중대한 이상사례 (환자수/건수) | 중대한 약물이상반응 (환자수/건수) | 중대하지 않은 이상사례 (환자수/건수) | 중대하지 않은 약물이상반응 (환자수/건수) | 총-이상사례 (환자수/건수) | 총-약물이상반응 (환자수/건수) |
   |---|---|---|---|---|---|---|
   | **Blood and lymphatic system disorders** | 14/22 | 11/19 | 14/14 | 11/11 | 28/36 | 22/30 |
   | &nbsp;&nbsp; Anaemia | 3/5 | 2/4 | 3/3 | 2/2 | 6/8 | 4/6 |
   | **Cardiac disorders** | 24/28 | 21/25 | 24/24 | 21/21 | 48/52 | 42/46 |
   | &nbsp;&nbsp; Atrial fibrillation | 7/11 | 6/10 | 7/7 | 6/6 | 14/18 | 12/16 |
   | ... (데이터 나열) ... | ... | ... | ... | ... | ... | ... |
   | **총계** | 40/40 | 30/30 | 40/40 | 30/30 | 80/80 | 60/60 |

3. **필수 규칙**:
   - 마지막 행에 모든 SOC 데이터를 합산한 **'**총계**'** 행을 반드시 포함하십시오.
   - SOC 행은 **굵게**, PT 행은 '&nbsp;&nbsp;'로 들여쓰기하십시오.
   - 모든 셀은 '환자수/건수' (예: '2/3') 형식으로 기재하십시오.

[출력 형식]
반드시 아래 JSON 구조를 엄수하십시오. 마크다운 코드블럭 없이 순수 JSON만 출력하십시오.
{
  "report_md": "위 양식에 맞춘 마크다운 문자열...",
  "processed_data": [ ... 처리된 데이터 객체 배열 ... ]
}
`;

        // Update Log: Prompt
        document.getElementById('log-request').value = prompt;

        // 3. Call Gemini API with Streaming (One-Shot)
        log('데이터 분석/처리 및 보고서 작성 중... (통합 요청)', 'info');
        let rawResponseText = "";

        // Reset Preview
        const reportPreviewDiv = document.getElementById('report-preview');
        reportPreviewDiv.innerHTML = '<p class="loading">AI가 데이터를 분석하고 있습니다...</p>';

        await streamGeminiAPI(apiKey, modelName, temperature, prompt, (chunk) => {
            rawResponseText += chunk;
            document.getElementById('log-response').value = rawResponseText;
            document.getElementById('log-response').scrollTop = document.getElementById('log-response').scrollHeight;

            // Optional: Try to parse report_md on the fly if it comes first (Simple check)
            // This is purely for visual feedback
            if (rawResponseText.includes('"report_md":')) {
                const match = rawResponseText.match(/"report_md"\s*:\s*"(.*?)"/s); // Naive regex, purely visual
                /* if (match) { 
                    // Escaped newlines make this hard to render perfectly raw, but we could try
                } */
                // Better to just show "Processing..."
            }
        });

        // 4. Parse Response (Combined)
        let resultJson;
        try {
            // Clean cleanup markdown if exists
            let cleanText = rawResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const startIdx = cleanText.indexOf('{');
            const endIdx = cleanText.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
                cleanText = cleanText.substring(startIdx, endIdx + 1);
            }

            resultJson = JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON Parsing Error", e);
            log("응답 파싱 실패. 로그를 확인하세요.", 'error');
            throw new Error("LLM 응답을 JSON으로 변환하는데 실패했습니다.");
        }

        if (!resultJson.processed_data || !resultJson.report_md) {
            throw new Error("응답 형식이 올바르지 않습니다. (processed_data 또는 report_md 누락)");
        }

        processedData = resultJson.processed_data;
        window.generatedReportContent = resultJson.report_md;

        // Count Serious Cases
        const seriousCount = processedData.filter(r => r.Seriousness === 'Yes').length;
        log(`처리 완료. 총 ${processedData.length}행. (Seriousness 'Yes': ${seriousCount}건)`, 'success');

        // Render Tables
        renderTable(processedData);

        // Render Report
        reportPreviewDiv.innerHTML = marked.parse(window.generatedReportContent);

        // Enable Chat (with updated context)
        downloadBtn.disabled = false;
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        appendChatMessage('system', '데이터 처리 및 보고서 작성이 완료되었습니다. 질문해주세요.');

    } catch (err) {
        log(`오류 발생: ${err.message}`, 'error');
        console.error(err);
    } finally {
        processBtn.disabled = false;
    }
}
// Note: manual generateReportMarkdown is removed.


async function streamGeminiAPI(apiKey, model, temperature, prompt, onChunk) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            temperature: temperature,
            responseMimeType: "application/json"
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let errorMsg = `API 호출 실패 (Status: ${response.status})`;
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMsg += `\n내용: ${errorData.error.message || JSON.stringify(errorData.error)}`;

                // Specific Hints
                if (response.status === 400 && errorData.error.message?.includes('API key')) {
                    errorMsg += "\n(힌트: API Key가 유효하지 않습니다.)";
                }
                if (response.status === 403) {
                    errorMsg += "\n(힌트: API Key 권한 거부. 'Browser' 환경에서 이 키 사용이 제한되었을 수 있습니다. Google Cloud Console에서 Key 제한 설정을 확인하세요.)";
                }
            }
        } catch (e) {
            errorMsg += `\n(응답 본문을 읽을 수 없습니다: ${e.message})`;
        }
        throw new Error(errorMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = ""; // Buffer to accumulate partial JSON objects

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Robust JSON Object Extractor
        // Expects stream of format: [ { ... }, { ... } ] or { ... }
        // We look for top-level matching braces {}

        let lastIndex = 0;
        let openBrackets = 0;
        let inString = false;
        let isEscaped = false;

        for (let i = 0; i < buffer.length; i++) {
            const char = buffer[i];

            if (inString) {
                if (isEscaped) {
                    isEscaped = false;
                } else if (char === '\\') {
                    isEscaped = true;
                } else if (char === '"') {
                    inString = false;
                }
            } else {
                // Not in string
                if (char === '{') {
                    openBrackets++;
                } else if (char === '}') {
                    if (openBrackets > 0) openBrackets--;

                    // Possible end of object
                    if (openBrackets === 0) {
                        // Attempt to parse the candidate string from lastIndex to i+1
                        // But first, skip any leading non-JSON chars (like commas, brackets, whitespace)
                        // This simplistic substring might include leading [ or , if lastIndex wasn't advanced properly.
                        // Better: Find the first '{' from lastIndex.

                        const potentialStr = buffer.substring(lastIndex, i + 1);
                        const firstBrace = potentialStr.indexOf('{');

                        if (firstBrace !== -1) {
                            const jsonStr = potentialStr.substring(firstBrace);
                            try {
                                const data = JSON.parse(jsonStr);
                                if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                                    const textPart = data.candidates[0].content.parts[0].text;
                                    if (textPart) {
                                        onChunk(textPart);
                                    }
                                }
                                lastIndex = i + 1;
                            } catch (e) {
                                // Not a valid object yet, or nested issues. Continue.
                                // But if openBrackets is 0, it SHOULD be valid if it's top level.
                                // If parsing failed, maybe it wasn't a complete object or context issue.
                            }
                        }
                    }
                } else if (char === '"') {
                    inString = true;
                }
            }
        }

        // Remove processed portion
        if (lastIndex > 0) {
            buffer = buffer.substring(lastIndex);
        }
    }
}

function renderTable(data) {
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (!data || data.length === 0) return;

    // Headers (Get keys from first object)
    const headers = Object.keys(data[0]);

    const trHead = document.createElement('tr');
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        trHead.appendChild(th);
    });
    tableHead.appendChild(trHead);

    // Body
    const MAX_PREVIEW = 100;
    const previewData = data.slice(0, MAX_PREVIEW);

    previewData.forEach(row => {
        const tr = document.createElement('tr');

        headers.forEach(key => {
            const td = document.createElement('td');
            const cellValue = row[key];
            td.textContent = cellValue !== null && cellValue !== undefined ? cellValue : '';

            // Highlight
            if (key === 'Seriousness' && cellValue === 'Yes') {
                td.classList.add('is-serious');
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });

    rowCountBadge.textContent = `Total: ${data.length} rows (Preview: ${Math.min(data.length, MAX_PREVIEW)})`;
}

async function downloadResult() {
    if (!processedData) return;

    try {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(processedData);
        XLSX.utils.book_append_sheet(wb, ws, 'Result');

        // Prepare Workbook Blob
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const fileName = 'Result.xlsx';

        // Try File System Access API
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'Excel File',
                        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                log('파일 저장 완료 (Result.xlsx)', 'success');
            } catch (pickerErr) {
                if (pickerErr.name !== 'AbortError') {
                    console.error(pickerErr);
                    // Fallback if picker fails (not aborted)
                    XLSX.writeFile(wb, fileName);
                    log('파일 다운로드 완료 (Browser Default)', 'success');
                }
            }
        } else {
            // Fallback
            XLSX.writeFile(wb, fileName);
            log('파일 다운로드 완료 (Browser Default)', 'success');
        }

        // 2. Download Markdown Report (Result.md)
        const mdContent = window.generatedReportContent || "# Report Generation Failed\n\nPlease try again.";
        const mdBlob = new Blob([mdContent], { type: 'text/markdown' });
        const mdUrl = URL.createObjectURL(mdBlob);
        const a = document.createElement('a');
        a.href = mdUrl;
        a.download = 'Result.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(mdUrl);

    } catch (err) {
        log(`다운로드 오류: ${err.message}`, 'error');
    }
}

function log(message, type = 'info') {
    const div = document.createElement('div');
    div.className = `log-item ${type}`;
    div.textContent = message;
    statusLog.appendChild(div);
    statusLog.scrollTop = statusLog.scrollHeight;
}

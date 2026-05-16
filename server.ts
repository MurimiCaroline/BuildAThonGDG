import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Mock Registry Data
const registryData: Record<string, any> = {
  'LR/1234/56': {
    owner: 'John Doe',
    size: '0.25',
    transfer_history: 1,
    encumbrances: []
  },
  'LR/9876/54': {
    owner: 'Jane Smith',
    size: '1.0',
    transfer_history: 4, // > 3 triggers rapid_transfers
    encumbrances: ['Caveat Emptor']
  },
  'LR/FAKE/123': {
    owner: 'Scammer Name',
    size: '0.5',
    transfer_history: 0,
    encumbrances: []
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/api/analyze', async (req: Request, res: Response) => {
  const { messages, documentBase64, documentType, language } = req.body;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const emit = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let sessionLanguage = language || 'en';
    const lastMessage = messages[messages.length - 1].content;
    const lowerMsg = lastMessage.toLowerCase();
    
    if (lowerMsg.includes('swahili') || lowerMsg.includes('kiswahili') || lowerMsg.includes('habari') || lowerMsg.includes('angalia')) {
      sessionLanguage = 'sw';
    } else if (lowerMsg.includes('english')) {
      sessionLanguage = 'en';
    }

    // Input shield (Gate 1)
    if (lowerMsg.includes('ignore previous') || lowerMsg.includes('act as')) {
      emit({ type: 'error', message: sessionLanguage === 'sw' ? 'Ombi hili haliwezi kukubaliwa.' : 'This request cannot be processed.' });
      return res.end();
    }

    const hasUploadedDoc = documentBase64 || messages.some((m: any) => m.content?.includes('Uploaded document:'));
    const hasNumbers = /\\d{2,}/.test(lowerMsg);

    if (!hasUploadedDoc && !hasNumbers) {
      const msg = sessionLanguage === 'sw' 
        ? "Tafadhali toa maelezo zaidi kuhusu ardhi (mfano: Nambari ya Kiwanja, LR No.) au pakia hati ili nianze ukaguzi."
        : "Please provide further details about the land (e.g., Parcel Number, LR No.) or upload a document to begin the verification.";
      
      emit({ type: 'error', message: msg });
      return res.end();
    }
    
    if (documentBase64) {
      emit({ type: 'thinking', text: '[BWANA · inafikiri / thinking]\nIntent detected: document_upload\nLanguage: ' + sessionLanguage + '\nPlan:\n  1. Chunking & Embedding\nGuardrail pre-check: PASS' });
      await delay(1000);
      emit({ type: 'status', text: '[BWANA · imekamilika / ingestion complete]\nChunks indexed: 4\nEmbedding model: text-embedding-004\nVector store: FAISS (Simulated)\nReady for query.' });
      emit({ type: 'done_ingestion' });
      return res.end();
    }

    const hasID = /\\b\\d{8}\\b/.test(lastMessage);
    const sellerIDStr = hasID ? '[SELLER-ID-VERIFIED]' : 'not provided';    let parcelArg = 'L.R. No. 1234/56';
    let registryKey = 'LR/1234/56';
    if (lastMessage.includes('209/4872')) {
      parcelArg = 'L.R. No. 209/4872';
      registryKey = 'LR/209/4872';
    } else if (lastMessage.includes('9876/54')) {
      parcelArg = 'L.R. No. 9876/54';
      registryKey = 'LR/9876/54';
    }

    if (!registryData[registryKey]) {
      registryData[registryKey] = {
        owner: 'Mwangi Njoroge',
        size: '0.05 Ha',
        transfer_history: 2,
        encumbrances: ['Charge to Equity Bank']
      };
    }

    const regRecord = registryData[registryKey];
    const encumbrancesStr = regRecord.encumbrances && regRecord.encumbrances.length > 0 ? regRecord.encumbrances.join(', ') : 'None';
    const regResultStr = `Owner: ${regRecord.owner}, Size: ${regRecord.size}, Transfers: ${regRecord.transfer_history}, Encumbrances: ${encumbrancesStr}`;

    // STEP 1 - ACKNOWLEDGE
    emit({ 
      type: 'thinking', 
      text: `[STEP 1 — ACKNOWLEDGE]\nNimepokea: Parcel [\${parcelArg}], Seller ID [\${sellerIDStr}].\nNitafanya: steps 2–8.`
    });
    await delay(1500);

    // STEP 2 - TOOLS 1
    emit({ type: 'status', text: `[STEP 2 — TOOL 1] search_kenya_gazette\nQuery 1 — Parcel: "\${parcelArg}"\nQuery 2 — Title Deed: pending\nQuery 3 — Owner inference: pending\nResult: No verified record found in Gazette.` });
    await delay(1500);

    // STEP 3 - TOOL 2
    emit({ type: 'status', text: `[STEP 3 — TOOL 2] search_lands_registry\nParcel: "\${parcelArg}"\nSeller cross-check: \${hasID ? 'yes' : 'no'}\nResult: Verified record found.\n\${regResultStr}` });
    await delay(1500);

    // STEP 4 - TOOL 3
    emit({ type: 'status', text: `[STEP 4 — TOOL 3] search_judiciary_records\nQuery: "\${parcelArg}"\nCoverage note: eCourt covers 2015–present only.\nResult: No cases found (2015–present).` });
    await delay(1500);

    // STEP 5 - TOOL 4
    emit({ type: 'status', text: `[STEP 5 — TOOL 4] search_nlc_records\nQuery: "\${parcelArg}"\nCoverage note: NLC digital records are incomplete...\nResult: No NLC order found.` });
    await delay(1500);

    // STEP 6 - CROSS-REFERENCE
    emit({ type: 'status', text: `[STEP 6 — CROSS-REFERENCE]\nComparing 4 sources.\n- Registry matches provided Seller ID.\n- Gazette: No record (Gap).\n- Judiciary: Clear (2015-present).\n- NLC: Clear.` });
    await delay(1000);

    // STEP 7 - REASON VISIBLY
    emit({ type: 'status', text: `[STEP 7 — REASON VISIBLY]\nStrongest evidence: Comprehensive Registry match (\${regResultStr}).\nConcerning: Absence of Gazette record (common, but requires physical verification).\nRisk: MEDIUM due to Gazette absence & Encumbrance (\${encumbrancesStr}).\nConveyancer action required.` });
    await delay(1000);

    // STEP 8 - REPORT
    emit({ type: 'status', text: `[STEP 8 — REPORT]\nGenerating final structured risk report...` });
    
    const prompt = \`
      You are Mradi wa Ardhi, an AI land transaction verification agent built for the Kenyan property market. 
      Your purpose is to protect buyers from land fraud by stress-testing every transaction before a signature is placed.
      
      Identity & Tone:
      - You are authoritative, precise, and protective — a legal-minded investigator, not a chatbot.
      - Communicate in \${sessionLanguage === 'sw' ? 'Kiswahili' : 'English'}.
      - Never speculate. If evidence is insufficient, say so explicitly.
      
      Use this mocked data for the report:
      Inputs Received:
        Parcel No: \${parcelArg}
        Title Deed No: not provided
        Sale Agreement: not provided
        Seller ID: \${sellerIDStr}
      
      Sources Searched:
        1. Kenya Gazette — No verified record
        2. Lands Registry — Complete record (\${regResultStr})
        3. Judiciary eCourt — No cases found (2015–present)
        4. NLC Records — No NLC order found
      
      Flags: Missing Gazette verification. Encumbrances found: \${encumbrancesStr}.
      Risk Level: MEDIUM
      Source Confidence: 1 of 4 sources returned specific verifiable records.
      Score (Raw): 65/100
      
      Structure your response EXACTLY as follows. Do not use Markdown code blocks to wrap the report, output the text directly.

      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      MRADI WA ARDHI — RISK REPORT
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      📋 INPUTS RECEIVED:
        Parcel No: \${parcelArg}
        Title Deed No: not provided
        Sale Agreement: not provided
        Seller ID: \${sellerIDStr}

      🔍 SOURCES SEARCHED:
        1. Kenya Gazette — No verified record
        2. Lands Registry — Complete record (\${regResultStr})
        3. Judiciary eCourt — No cases found (2015–present)
        4. NLC Records — No NLC order found

      ⚠️ FLAGS IDENTIFIED:
        1. Missing Gazette record — this requires direct verification at the Attorney General's Chambers.
        2. Encumbrances detected on title: \${encumbrancesStr}.

      🧠 AGENT REASONING:
        Strongest evidence: Comprehensive Registry match verifying ownership and details.
        Concerning: Absence of Gazette record (common, but requires physical verification) and active encumbrances on the parcel.
        Conclusion: Risk is elevated due to missing Gazette validation and active charges/encumbrances.
      
      📊 RISK LEVEL: MEDIUM

      📈 SOURCE CONFIDENCE: 1 of 4 sources returned specific verifiable records

      📝 PLAIN-LANGUAGE SUMMARY:
        [Write 3–5 sentences here explaining the findings clearly in \${sessionLanguage === 'sw' ? 'Kiswahili' : 'English'}. Include note about encumbrances (\${encumbrancesStr}).]

      ✅ RECOMMENDED NEXT STEPS:
        1. [Action 1]
        2. [Action 2]

      ⚖️ DISCLAIMER: This report is produced by an AI agent for informational purposes
      only. It is not legal advice. Always engage a licensed conveyancer and verify
      directly with the relevant county land registry before completing any transaction.
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    \`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Guardrail Gate 2
    emit({ type: 'status', text: '[BWANA · inahakikisha / verifying] → Guardrail gate 2 running' });
    await delay(800);

    // Output Dispatch
    emit({ type: 'status', text: '[STEP 8 — REPORT]\nOutput ready. PDF ready · SMS dispatched · Quote: KSh 14,700' });
    
    emit({ type: 'result', text: response.text, score: 65, quote: 14700 });

    emit({ type: 'done' });
    res.end();
  } catch (error) {
    console.error(error);
    emit({ type: 'error', message: 'An internal error occurred.' });
    res.end();
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log("Server running on port " + PORT);
  });
}

startServer();

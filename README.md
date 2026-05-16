# Mradi wa Ardhi 🌍🇰🇪

**Mradi wa Ardhi** is an AI-powered land transaction verification agent built explicitly for the Kenyan property market. Its purpose is to protect buyers from land fraud by stress-testing every transaction before a signature is placed.

## The Problem We Are Solving

Buying land in Kenya can be a minefield. Many buyers fall victim to land fraud due to forged title deeds, double allocations, altered documents, or buying land with active court injunctions or caveats. Verifying a land transaction traditionally involves manual searches across disjointed systems (Lands Registry, Kenya Gazette, Judiciary, National Land Commission), which is slow, expensive, and prone to human error or manipulation.

Mradi wa Ardhi solves this by providing a unified, AI-driven investigative agent that acts like a senior conveyancer. It instantly cross-references documents against multiple data sources, flagging anomalies, missing records, and potential fraud patterns before money changes hands. We don't just say "safe" or "unsafe"—we provide the evidence so you and your lawyer can make an informed decision.

## Agent Architecture

Mradi wa Ardhi is powered by **Bwana**, our core orchestrating intelligence, built on **Agentic AI** principles using Gemini models.

### How Bwana Thinks (The ReAct Loop)
Bwana follows a strict Reason + Act (ReAct) loop. It never jumps to conclusions. For every query:
1. **Understand Intent & Plan**: Parse user input (documents, parcel numbers), detect language (English or Kiswahili), and declare a step-by-step verification plan.
2. **Execute Tools**: Systematically call the required research tools.
3. **Cross-Reference**: Compare the outputs of all tools to find discrepancies.
4. **Reason Visibly**: Explain its thought process (What is the strongest evidence? What is concerning?).
5. **Report**: Synthesize a standardized, plain-language risk report.

### The Tools
Bwana employs the following specialized tools during its investigation (simulated for the hackathon/demo environment):
1. **`extract_document_data (Jicho Vision)`**: Uses Gemini Vision to perform forensics on uploaded documents (Title Deeds, Sale Agreements). It extracts parcel numbers, owner names, and flags visual anomalies or low-confidence text.
2. **`search_kenya_gazette (Gazeti Search)`**: Searches the Kenya Gazette for caveats, insolvency notices, or compulsory acquisitions related to the parcel or owner.
3. **`search_lands_registry (Msajili Lookup)`**: Cross-references the parcel against the Lands Registry to verify the current owner, parcel size, and active encumbrances (e.g., bank charges).
4. **`search_judiciary_records` & `search_nlc_records`**: Checks for active court cases or National Land Commission historical injustices/orders.
5. **`generate_risk_report (Tathmini Synthesizer)`**: Calculates a "LandScore" and drafts a comprehensive, easy-to-understand risk report in the user's preferred language, complete with an estimated title insurance quote.

### Guardrails
- PII is scrubbed and never echoed (National IDs, KRA PINs).
- Strict hallucination checks—every claim must trace to a tool output.
- Bwana cannot give legal advice or declare a transaction 100% "safe".

---

## How to Run It Locally

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd mradi-wa-ardhi
   ```

2. **Install dependencies:**
   Ensure you have Node.js installed, then run:
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory based on `.env.example` and add your Gemini API Key:
   ```env
   GEMINI_API_KEY="your_google_gemini_api_key"
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

---

## How to Interact with the Deployed Version

1. Visit the deployed application URL.
2. **Upload Documents**: Use the upload button to attach a photo of a Title Deed, Sale Agreement, or National ID.
3. **Ask Bwana**: In the chat box, type a request like:
   - *"Check if this land L.R. No. 209/4872 is safe to buy."*
   - *"Naomba uangalie kama kiwanja hiki L.R. No. 1234/56 kina shida yoyote."*
4. **Observe the Investigation**: Watch the "Thinking Protocol" (e.g., `[BWANA · inatafuta / searching]`) as Bwana executes its plan, queries registries, and cross-references data in real-time.
5. **Read the Report**: Review the structured risk report, LandScore, and recommended next steps.

### Demo Script for Judges
1. Upload a sample document (e.g., a sample title deed).
2. Type: `"Check if this land LR/1234/56 is safe to buy"` (or use Swahili).
3. Watch the visible thinking blocks appear as tools are called.
4. Review the final report, which will highlight missing gazette records or encumbrances, and provide a LandScore and insurance quote.

## Data Handling and Political Neutrality Policy

**Data Handling:**
Mradi wa Ardhi is designed with privacy-first principles. We employ a strict "Input Shield" guardrail that detects and redacts Personally Identifiable Information (PII) such as National IDs, KRA PINs, and phone numbers from the agent's reasoning logs. This data is only used silently for cross-referencing and is never retained beyond the active session or echoed in the final public report. We do not store user documents permanently.

**Political Neutrality:**
Our agent strictly adheres to land transaction verification. It is programmed to neutrally assess facts based on official registries (Gazette, Lands Registry, Judiciary) without bias or speculation regarding political figures, parties, or affiliations. If a query strays outside land risk analysis, the agent employs a scope check to politely redirect the conversation back to its core mandate: protecting property buyers through evidence.

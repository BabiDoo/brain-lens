<div align="center">
<img width="1200" alt="BrainLens Banner" src="./src/assets/banner.png" />
</div>

<div align="center">
<h1> Analysis → Insights → Experiment plans  <h1>
</div>

BrainLens is a multimodal research copilot powered by **Gemini 3**, built for the **Gemini 3 Hackathon**.

It turns dense academic files into a **visual** and **navigable interface** — not just a learning tool!

BrainLens helps you **verify claims**, **scan evidence**, and **turn ideas into experiments** fast.

---


<div align="center">
<img width="500" alt="BrainLens Demo Gif" src="./src/assets/demo.gif" />
</div>


---

## Key Features

*   **Intelligent Circuiting**: Get high value informations.

*   **A-HA Mode**: Get *powerfull* *insights* and deep-dive into then to       generate formal  hypotheses and experimental protocols.

*   **Evidence Visualizer**: Automatic extraction and relevance analysis of figures and tables.

*   **Consistency Checker**: Verifies claims against the source material with confidence scores and page citations.

--- 

## 🔗 Links
- [Watch YouTube Demo!](https://youtu.be/mtntmzaJGFM)

- [DevPost](https://devpost.com/software/REPLACE_WITH_YOUR_PROJECT_SLUG) 
---
## The Problem
Academic PDFs are hard to:
- **Navigate quickly** (key points are scattered across pages)
- **Trust at a glance** (*claims often sound strong, but are they supported?*)
- **Turn into action** (insights stay “cool ideas” instead of testable plans)

---

## 💡 The Solution
BrainLens uses ***Gemini 3*** to power a multimodal, structured reasoning pipeline over academic PDFs:

1. **Briefing (source-linked map)**  
   A high-level paper map where each item links back to the page context — **fast visualization** without losing traceability.

2. **Consistency (claim checking)**  
   Extracts important claims and checks them against paper context, labeling each one with **High / Medium / Low confidence**.

3. **Evidence Cards (figures & tables)**  
   Surfaces key figures/tables, makes them readable, and explains **why they matter** — a clean “scan the evidence” view.

4. **Insights (reasoning-first)**  
   Generates structured insight cards:
   - Alternative Lenses
   - Hidden Assumptions
   - Cross-Domain Links
   - Actionable Next Steps

5. **A-HA Mode (insight → experiment plan)**  
   From any Insight card, click **“A-ha!”** to instantly generate a **research experiment plan**:
   - Research question
   - Testable hypotheses
   - Variables & controls
   - Metrics & expected effects
   - Threats to validity

Other experiences:
- **Live Explanation** (talk to the paper; adaptive depth/pacing)
- **Podcast Mode** (listen to the paper like an episode)

---

## ✅ Why It’s Different
- **Not just summarization:** outputs are **structured** for analysis and decision-making  
- **Traceability:** ideas are tied back to the **source context/pages**  
- **Reliability signals:** claim-to-context checking with confidence labeling  
- **Actionability:** insights become **testable experiment plans in one click**

---


## Demo Flow (Recommended)
1) Upload a dense academic PDF  
2) Open **Briefing** to understand structure + jump to sources  
3) Check **Consistency** to validate key claims  
4) Scan **Evidence Cards** to see figures/tables clearly  
5) Explore **Insights**, then click **A-ha!** to generate an experiment plan  
6) (Optional) Use **Live Explanation** or **Podcast Mode**

---

## Tech Stack
- **React + TypeScript**
- **Vite**
- **Gemini 3 API** (multimodal generation; text + audio/TTS depending on enabled features)
- UI: Tailwind classes + Lucide icons

---

## Getting Started

### Prerequisites

- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1.  **Clone and Install**:
    ```bash
    npm install
    ```

2.  **Environment Setup**:
    Create a `.env.local` file in the root and add your key:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
---

## Project Architecture

The project has been refactored into a modular, scalable structure:

```text
src/
├── components/   
├── views/        
├── services/    
├── pipeline/     
├── prompts/      
├── constants.ts  
└── types.ts      
```

---


## 🧩 Challenges we ran into / What’s next

### Challenges

* **Grounding vs. speed:** balancing “fast demo UX” with traceability and structured outputs.
* **Consistency checking reliability:** designing prompts/logic that flag weak support without becoming overly conservative.
* **Evidence readability:** making figures/tables scannable in a way that feels visual and truly useful (not just extracted).
* **Hackathon constraints:** prioritizing an end-to-end experience quickly, while keeping the pipeline modular.

### What’s next

* **Backend proxy for Gemini calls** (key protection + caching + rate limiting + retries)
* **Stronger grounding:** more explicit citation snippets + tighter page linking for every claim/evidence item
* **Richer evidence parsing:** improved figure/table interpretation and cross-references inside the paper
* **Insight quality upgrades:** better ranking, deduplication, and “related insights” clustering
* **Export & collaboration:** export a structured report (PDF/MD) and shareable “experiment plans”
* **Multi-PDF comparison:** compare multiple PDFs to surface convergences, contradictions, and complementary evidence across papers


---

## License

Hackathon prototype / demo project.


---

## Credits

Built with **Gemini 3** and a science-first philosophy: **verify evidence, generate insights, and turn them into action**.



---





<div align="center">
  Built for the <b>Gemini 3.0 Hackathon</b>
</div>

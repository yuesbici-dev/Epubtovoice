# EPUB to Audiobook On-Device Voice Synthesizer (Android App)

An ultra-lightweight, zero-animation Android audiobook generator that converts `.epub` eBooks into chaptered MP3 audio files completely on-device. Features an interactive Chapter Inspection & Selective Generation Matrix, granular CPU/Memory resource throttling, comprehensive voice personalization (Language, Gender, Tone, Accent, Speed) with instant cached pan-vowel voice demos, an International Phonetic Alphabet (IPA) pronunciation customizer, symbol/sentence exclusion filters, and a persistent generation history vault.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following core feature specifications are highlighted in this updated blueprint:

- **Comprehensive Chapter Viewer & Selective Batching**:
  - Full chapter extraction and listing directly from the EPUB spine and Table of Contents (TOC).
  - Explicit visual state for selected vs. deselected chapters (high-contrast active outline, checkbox, and status label).
  - One-tap quick actions: **"Select All"**, **"Deselect All"**, and **"Invert Selection"**.
  - Dynamic Pre-Generation recalculations: Total duration (hours/minutes) and total output MP3 size (MB) update instantaneously to reflect only the currently selected chapters.
  - The generation button dynamically adapts: *"Generate 4 Selected Chapters (28.4 MB)"*, disabled when 0 chapters are selected.
- **Hardware Resource Usage Slider (CPU & Memory)**:
  - Direct control over device resource consumption during synthesis (Eco / 16MB buffer / throttled CPU duty cycle up to High Performance / 64MB buffer).
- **Voice Customization & Pan-Vowel Cached Demo**:
  - Full choice of Language, Voice Gender (Female/Male), Voice Tone (Warm, Harsh, Strong, Melodic), Accent (American, British, Australian, etc.), and Speed Slider (0.5x to 2.5x).
  - Instant cached demo playback using a pan-vowel test sentence covering all vowels (*"The quick brown fox jumps over a lazy dog, gazing upon the twilight sky and heavy autumn breeze"*), synthesized once and saved for zero-latency review.
- **IPA Pronunciation Dictionary & Exclusion Filters**:
  - Custom pronunciation substitutions using International Phonetic Alphabet (IPA) or phonetic spelling with live test preview.
  - Configurable exclusion rules for symbols (`*`, `_`, `#`, citations `[1]`, URLs) and sentence patterns (footnotes, headers).
- **Zero Animations & Pure Efficiency**:
  - No CSS transitions, no animations, no haptics, and no wakelock background locks for maximum battery longevity.
- **Generation History Vault**:
  - Persistent IndexedDB storage for past audiobooks, chapter playback, and individual/batch MP3 exports.

---

### 1. Overview & Core Concept

- **What It Does**: Reads `.epub` files locally, displays every chapter in an interactive checklist, allows users to pick exactly which chapters to generate, calculates pre-generation audio duration and file size, and synthesizes separate MP3 files on-device with per-chapter progress bars.
- **Privacy & Offline Integrity**: Operates 100% on the Android phone device with no internet connection required, zero cloud APIs, and zero data leaving the phone.
- **Efficiency Guarantee**: Fast, static UI with no heavy animations and low CPU/memory footprint.

---

### 2. User Experience & Visual Design

#### A. Comprehensive Chapter Viewer & Selection Flow
1. **Chapter Inventory Screen**:
   - Upon importing an EPUB (or loading the bundled classic *"The Time Machine"*), the app parses the spine and TOC and displays a full list of all chapters.
   - Each chapter card displays:
     - Chapter sequence number & title (e.g. *"Chapter 01: The Inventor's Workshop"*).
     - Individual chapter metrics: Word count, estimated audio duration (e.g. *"14m 20s"*), and estimated MP3 file size (e.g. *"13.1 MB"*).
     - Selection checkbox with clear visual feedback:
       - **Selected**: Solid accent border, checked checkbox, highlighted background tint, and active status text *"Selected for generation"*.
       - **Deselected**: Muted outline, empty checkbox, neutral background, and status text *"Skipped"*.
2. **Batch Selection Controls**:
   - A sticky selection utility bar above the chapter list features:
     - **"Select All"**: Immediately selects all chapters.
     - **"Deselect All"**: Clears selection for quick manual cherry-picking.
     - **"Invert"**: Flips the current selection set.
     - **Live Counter**: *"Selected: 5 of 12 chapters (38m 45s · 35.5 MB)"*.
3. **Targeted Generation Queue**:
   - The primary CTA button updates in real time: *"Generate 5 Selected Chapters"*.
   - Only checked chapters are enqueued and synthesized; deselected chapters are untouched and retain their ready state.

#### B. Voice Studio & IPA Customizer Flow
1. **Voice Configuration**:
   - Choose Language, Gender (Female/Male), Voice Tone (Warm, Harsh, Strong, Melodic), Accent, and Speed.
   - Tap **"Listen to Voice Demo"**: Plays the pan-vowel sentence instantly (cached in IndexedDB after initial generation).
2. **Pronunciation & Filter Settings**:
   - **IPA Pronunciation Dictionary**: Add terms (e.g. *"Hermione"* -> `/hɜːrˈmaɪəni/`) with a one-tap preview.
   - **Symbol & Sentence Filters**: Toggle stripping of brackets, markdown symbols, citations, or custom phrases.

#### C. Smart Power & History Flow
1. **Resource Usage Slider**: Adjust between Eco Battery Saver (16MB buffer, CPU cooling pauses) and High Performance.
2. **Overnight & Charger Automation**: Toggle auto-generation when connected to power or during a set night schedule.
3. **Generation History Tab**: Browse previously synthesized audiobooks, listen via the built-in mini player, download single MP3s, or export all chapters as a ZIP file.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Explicit Selective Chapter State (`selectedChapterIds: Set<string>`)**
  - *Chosen Approach*: Maintain a reactive set of selected chapter IDs. All calculations (total words, duration, file size) and batch actions filter directly against this set.
  - *Why*: Users often only want specific chapters (e.g., skip introductions, forewords, or appendices) or generate the next 2 chapters on a limited battery charge.
  - *Visual Clarity*: Selected rows feature high-contrast outlines and checked states that make it unmistakably clear which chapters will be converted.

- **Decision 2: Instant Pan-Vowel Voice Demo Caching**
  - *Chosen Approach*: Synthesize a phonetically balanced pangram once per voice profile and store the resulting audio blob in IndexedDB. Subsequent clicks play back instantly without running speech synthesis again.

- **Decision 3: Zero-Animation Lightweight Android UI**
  - *Chosen Approach*: Disable all CSS animations and transitions (`transition-none`, `animate-none`).
  - *Why*: Eliminates GPU redraw cycles, reduces battery consumption, and provides immediate tactile responsiveness.

---

### 4. Technical Architecture & Component Structure

```
+-----------------------------------------------------------------------------------------+
|                                ANDROID APP INTERFACE                                    |
|                                                                                         |
|  [ Top App Bar: Book Title · Battery Status (Charging / %) · Resource Mode ]            |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | TAB 1: CHAPTERS & SELECTION | TAB 2: VOICE & PRONUNCIATION | TAB 3: HISTORY       |  |
|  | - EPUB Picker / Demo Book   | - Language, Gender, Accent   | - Saved Audiobooks   |  |
|  | - Selection Utility Bar:    | - Tone (Warm/Harsh/Melodic)  | - In-App Audio Player|  |
|  |   [Select All] [Deselect]   | - Speed Slider & Pan-Vowel   | - MP3 & ZIP Export   |  |
|  |   [Invert] [Count: 5/12]    |   Cached Audio Demo          | - Storage Management |  |
|  | - Dynamic Pre-Calc Banner:  | - Ignored Symbols/Sentences  |                      |  |
|  |   [38m 45s · 35.5 MB]       | - IPA Pronunciation Dict     |                      |  |
|  | - Chapter Cards (Selected/  |                              |                      |  |
|  |   Deselected Indicator)     |                              |                      |  |
|  | - Per-Chapter Progress Bars |                              |                      |  |
|  | - Resource Usage Slider     |                              |                      |  |
|  +-----------------------------------------------------------------------------------+  |
|                                                                                         |
|  [ Bottom Navigation Tabs: Chapters | Voice Studio | History ]                          |
+--------------------------------------------|--------------------------------------------+
                                             |
+--------------------------------------------v--------------------------------------------+
|                          ON-DEVICE AUDIO PROCESSING ENGINE                              |
|                                                                                         |
|  +-------------------------+     +------------------------+     +--------------------+  |
|  | EPUB Spine & TOC Parser | --> | Selected Chapters Only | --> | Symbol & Sentence  |  |
|  | (Extracts clean text)   |     | Filter Gateway         |     | Exclusion Filter   |  |
|  +-------------------------+     +------------------------+     +---------+----------+  |
|                                                                           |             |
|  +------------------------------------------------------------------------v----------+  |
|  | IPA Word Replacement & Lexicon Normalizer                                         |  |
|  +----------------------------------------+------------------------------------------+  |
|                                           |                                             |
|  +----------------------------------------v------------------------------------------+  |
|  | Paced Sentence Chunker (Controlled by CPU/Memory Resource Slider)                |  |
|  +----------------------------------------+------------------------------------------+  |
|                                           |                                             |
|  +----------------------------------------v------------------------------------------+  |
|  | On-Device Web Speech Synthesis + Chapter End Chime/Outro Merger                   |  |
|  +----------------------------------------+------------------------------------------+  |
|                                           |                                             |
|  +----------------------------------------v------------------------------------------+  |
|  | Client-Side MP3 LAME Audio Encoder Web Worker (100% Offline)                      |  |
|  +----------------------------------------+------------------------------------------+  |
+-------------------------------------------|---------------------------------------------+
                                            |
+-------------------------------------------v---------------------------------------------+
|                                PERSISTENCE & STORAGE                                    |
|  - IndexedDB `AudiobookHistoryStore`: Saved chapters, metadata, MP3 Blobs               |
|  - IndexedDB `VoiceDemoCache`: Cached pan-vowel voice demo audio                        |
|  - LocalStorage: Custom IPA dictionaries, symbol filters, resource settings             |
+-----------------------------------------------------------------------------------------+
```

- **Interactive State Model**:
  - `selectedChapterIds: Set<string>`: Set of selected chapter IDs.
  - `toggleChapterSelection(id: string)`: Toggles individual selection.
  - `selectAllChapters()`: Selects all chapters in book.
  - `deselectAllChapters()`: Clears selection set.
  - `invertChapterSelection()`: Inverts current selection.
  - `computedSelectedTotals`: Reactive memo calculating `{ totalWords, totalDurationSec, totalFileSizeBytes }` strictly for chapters in `selectedChapterIds`.
  - `voiceConfig`: `{ lang, gender, tone, accent, speed }`.
  - `cachedVoiceDemos`: `{ [voiceKey: string]: string (blobUrl) }`.
  - `ipaDictionary`: Array of `{ id, word, ipa, phonetic }`.
  - `ignoreRules`: `{ symbols: string[], ignoredPatterns: string[] }`.
  - `resourceUsage`: Slider value 1 (Eco 16MB) to 5 (Max Speed 64MB).
  - `automationSettings`: `{ onlyWhenCharging: boolean, overnightWindow: boolean, startHour: number, endHour: number }`.

- **Verification Strategy**:
  - Verify every chapter row has clear checked/unchecked indicators.
  - Verify Select All / Deselect All / Invert toggles update the selection set immediately.
  - Verify pre-generation calculation banner reactively reflects only the selected chapters.
  - Verify generation queue only generates selected chapters and skips deselected ones.
  - Verify pan-vowel demo caching, IPA pronunciation substitution, and history tab functionality.

# Brainstorming app rebuild and architecture
_Exported on 7/2/2025 at 14:15:04 EDT from Cursor (1.1.7)_

---

**User**

You're in a codebase, and I'm about to do a major from-scratch rebuild.

At the moment, I want to understand what to delete, what to keep.stores all the architectural documents, if you look through that you will understand the design decisions made for my app, and most of them, are in line with what I will recreate.shows an initial refactoring/rebuilding plan that takes into account the ADRs, and the probes.

This app, the most important thing it will do are two things.. serve lesson data. (A). originally in@allUnitsData.js ..but recently converted to @curriculumData.ts .  This lesson data is comprised of links to external videos, the most important ones will be deeme d"alt URL" in term sof vidoes.. and links to quizzes which are PDFs housed in .  The purpose of these pdf quizzes are to serve as context for the user to attach to a grok llm 's prompt, along with a grok prompt located at @GrokPromptTab.tsx .

SO that is 1 thing that this app will do.  The other is a multi-user aspect. (B).  The progress of the user through the tasks listed above in (A)needs to be kept, and viewed eventually by all peers (B).  (B) is comprised of adatabase.. and that database will keep track of.. partial progress of the lessons completed in (A), of which there are 89 lessons.  (B) is a blockchain-type-database who uses merkle trees/proofs for determinining syncing status between the peers.  Most importantly about (B).. is the mempool feature which will.. aggregate all data before a block is commited.  Students are motivated to see their own score on a leaderboard to commit thei rprogress to the block so.. a part of (B)'s functoin is to.. test the knowledge of the students through peer attestation.  As soon as there is 1 lesson's worth of progress in the mempool..(each lesson's items have a certain point value @lessons_export.json , students will be permitted to try to mine a block by answering a question.. there are many questions.. and they are all correlated to the lessons in (A).  I am unsure where this table of questions lives.. I think it's...@questions_export.json ?  Which points to a bunc hof png files each correlated to a lesson. and they live..@/questions .  So a student answers this question.. proposes a candidate block so to speak, and fellow peers 3 or.. more.. must verify that the answer is true.  once verified, that block is mined, and the leaderboard across all peers needs to be updated.

I want to know.. how to consolidate this.. how to rework it.. I don't want you to give me any code, I just want to brainstorm with you.

---

**Cursor**

Below is a structured “thinking aloud” outline you can use as a starting point for the rebuild.  Nothing here is prescriptive code – it’s a consolidation map that helps you decide what to delete, what to keep, and how to re-shape the project around the two core capabilities you described.

────────────────────────────────────  
1.  High-level capability map
────────────────────────────────────  
A.  Curriculum delivery  
    • Static, version-controlled lesson metadata (videos, altUrls, pdf quizzes, point values).  
    • A Grok prompt builder (GrokPromptTab) that consumes the metadata and the pdfs as context.

B.  Multi-user progress & consensus  
    • A lightweight, Merkle-tree blockchain that:  
        – Records signed “lesson-completed” transactions.  
        – Aggregates them in a mempool.  
        – Lets peers propose / verify candidate blocks via quiz-question attestations.  
    • Synchronisation + simple leaderboard view across peers.

────────────────────────────────────  
2.  Current repo inventory (relevant slices)
────────────────────────────────────  
KEEP  
• `docs/adr/*` – design rationale; keep as source-of-truth.  
• `packages/data/src/curriculumData.ts` – canonical lesson data.  
• `packages/data/src/lessons_export.json` – point values per lesson.  
• `packages/data/dist/questions_export.json` + `/apps/ui/public/questions/**` – canonical question bank.  
• `packages/core` – most of the Merkle-tree / block / transaction primitives look reusable.  
• `packages/p2p` – networking skeleton; may need refactor but contains discovery tests worth mining.  
• `apps/ui/src/*` – some Shadcn components, test harness, GrokPromptTab.

DELETE / ARCHIVE  
• Everything labelled “dist/”, “*.tsbuildinfo”, old `allUnitsData.js`.  
• `apps/p2p-server` (monolithic express stub) – superseded by new peer node.  
• Any duplicated pdf/image assets outside `public/`.  
• One-off spike scripts once data is migrated (`scripts/process_lessons.ts`, `sanitize_filenames.ts`).  
• Redundant ADR duplicate file `022-ui-renaissance-with-shadcn-ui.md` (appears twice).

────────────────────────────────────  
3.  Data-layer consolidation
────────────────────────────────────  
Goal: single, typed, versioned “Curriculum DB” package shareable by front-end & peer nodes.

Steps  
1. Merge `curriculumData.ts`, `lessons_export.json`, and `questions_export.json` into ONE schema.  
   • Unit ➜ Topic ➜ Item (video | quiz | question image).  
   • Include `points`, `altUrl`, `assetPath` fields.  
2. Emit two artifacts on build:  
   • `curriculum.vX.Y.json` (raw data).  
   • `@apstat/curriculum` TypeScript package (enforced interfaces).  
3. Store large binaries (pdfs, png) in a flat `/public/assets` tree with predictable hashed names; reference by path only in the JSON.

Benefits  
• All peers load identical canonical data – critical for Merkle proofs.  
• Front-end can tree-shake unused units.  
• You can later shard or CDN-cache assets independently of code.

────────────────────────────────────  
4.  Re-shaping the blockchain layer
────────────────────────────────────  
Keep the “core” primitives but surface CLEAR boundaries:

Layer | Responsibility | Keep / Refactor
------|----------------|----------------
`domain` | Block, Tx, Merkle, validation rules | Keep from `packages/core`, tighten types
`storage` | Append-only LevelDB / IndexedDB per peer | New thin adapter
`mempool` | Pending Tx set + point accounting | Extract from current tests into module
`consensus` | Attestation workflow + quorum | Formalise (3-of-N verification rule)
`network` | Gossip, peer discovery | Refactor `packages/p2p`, expose events

Design tips  
• Every “lesson-completed” Tx includes: `lessonId`, `userPubKey`, `points`, `signature`.  
• Attestation Tx includes: `questionId`, `answerHash`, `attesterPubKey`, `signature`.  
• A block is valid when:  
  – Merkle root matches Tx list,  
  – Total points ≥ threshold,  
  – ≥3 attestations for at least one question in the block.

────────────────────────────────────  
5.  Front-end / UX pass
────────────────────────────────────  
• Next.js (or Vite + React) ↔ peer node via WebSocket.  
• Pages/tabs: Curriculum, GrokPrompt, Mempool, Leaderboard, Block Explorer.  
• Local wallet (ed25519) generated in browser; private key encrypted in `localStorage`.  
• Use Shadcn UI + TanStack Query to stream progress.

────────────────────────────────────  
6.  Deletion checklist before rebuild
────────────────────────────────────  
☐ Remove legacy bundled artefacts (`/dist`, `*.map`, `*.tsbuildinfo`).  
☐ Scrap `apps/p2p-server`.  
☐ Delete duplicate ADR (#22).  
☐ Archive experimental scripts once migration is done.  
☐ Prune unused image/pdf duplicates (run a hash dedupe).

────────────────────────────────────  
7.  Incremental rebuild roadmap
────────────────────────────────────  
Phase 0 — Cleanup  
    • Execute deletion checklist, run tests on remaining core.  
Phase 1 — Canonical Data Package  
    • Finish unified curriculum schema; publish v1.0.0.  
Phase 2 — Refactor Core Blockchain  
    • Isolate storage + consensus; write golden tests using lesson Tx fixtures.  
Phase 3 — Networking Layer  
    • Wrap peer node in a single `p2p` binary + TS client lib.  
Phase 4 — UI MVP  
    • Display lessons, allow “mark complete” (creates Tx in mempool).  
    • GrokPromptTab consumes pdf + metadata.  
Phase 5 — Attestation & Mining  
    • Question modal ⟶ answer ⟶ attestation Tx.  
    • Mining flow + leaderboard refresh.  
Phase 6 — Polish & Docs  
    • Update ADRs to reflect new decisions.  
    • Produce README “How to add a new lesson / question”.

────────────────────────────────────  
8.  Open questions to decide early
────────────────────────────────────  
• Do we really need full P2P for MVP, or a central relay that later decentralises?  
• Long-term asset storage: self-host vs. S3/IPFS?  
• How strict must GDPR / FERPA compliance be for user data?  
• Mobile support? (IndexedDB vs. React Native FS).  
• Will Grok LLM run client-side or via an external API (affects pdf size limits)?

Use this map as your living checklist while you strip the old repo and lay fresh foundations. Happy rebuilding!


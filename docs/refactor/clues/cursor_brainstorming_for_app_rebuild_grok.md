# Brainstorming for app rebuild strategy
_Exported on 7/2/2025 at 14:16:18 EDT from Cursor (1.1.7)_

---

**User**

You're in a codebase, and I'm about to do a major from-scratch rebuild.

At the moment, I want to understand what to delete, what to keep.stores all the architectural documents, if you look through that you will understand the design decisions made for my app, and most of them, are in line with what I will recreate.shows an initial refactoring/rebuilding plan that takes into account the ADRs, and the probes.

This app, the most important thing it will do are two things.. serve lesson data. (A). originally in@allUnitsData.js ..but recently converted to @curriculumData.ts .  This lesson data is comprised of links to external videos, the most important ones will be deeme d"alt URL" in term sof vidoes.. and links to quizzes which are PDFs housed in .  The purpose of these pdf quizzes are to serve as context for the user to attach to a grok llm 's prompt, along with a grok prompt located at @GrokPromptTab.tsx .

SO that is 1 thing that this app will do.  The other is a multi-user aspect. (B).  The progress of the user through the tasks listed above in (A)needs to be kept, and viewed eventually by all peers (B).  (B) is comprised of adatabase.. and that database will keep track of.. partial progress of the lessons completed in (A), of which there are 89 lessons.  (B) is a blockchain-type-database who uses merkle trees/proofs for determinining syncing status between the peers.  Most importantly about (B).. is the mempool feature which will.. aggregate all data before a block is commited.  Students are motivated to see their own score on a leaderboard to commit thei rprogress to the block so.. a part of (B)'s functoin is to.. test the knowledge of the students through peer attestation.  As soon as there is 1 lesson's worth of progress in the mempool..(each lesson's items have a certain point value @lessons_export.json , students will be permitted to try to mine a block by answering a question.. there are many questions.. and they are all correlated to the lessons in (A).  I am unsure where this table of questions lives.. I think it's...@questions_export.json ?  Which points to a bunc hof png files each correlated to a lesson. and they live..@/questions .  So a student answers this question.. proposes a candidate block so to speak, and fellow peers 3 or.. more.. must verify that the answer is true.  once verified, that block is mined, and the leaderboard across all peers needs to be updated.

I want to know.. how to consolidate this.. how to rework it.. I don't want you to give me any code, I just want to brainstorm with you.

---

**Cursor**

I'm glad to brainstorm with you about the major rebuild of your app. Based on the information you've provided and the structure of your codebase, I understand the two core functionalities of your application: serving lesson data (A) and managing multi-user progress tracking with a blockchain-type database (B). Let's discuss how to consolidate and rework these components without diving into code.

### Understanding What to Keep and What to Delete
From your description and the attached project layout, I see that your app has a rich set of architectural decision records (ADRs) in the `docs/adr/` directory. These documents are crucial as they outline the design decisions made for your app, and you’ve mentioned that most of them align with your vision for the rebuild. Therefore, **keeping these ADRs as a reference** during the rebuild is essential to maintain continuity in design philosophy.

The `probes/` directory also seems to contain exploratory or testing documents that might inform your refactoring plan. These should be reviewed to extract any valuable insights or lessons learned before potentially archiving or deleting them if they’re no longer relevant.

### Core Components to Focus On
1. **Lesson Data (A)**:
   - **Current Structure**: The lesson data is housed in `curriculumData.ts` (previously `allUnitsData.js`), which includes links to external videos (with "alt URL" being significant) and quizzes in PDF format located in the `pdfs/` directory. These PDFs are used as context for prompts in conjunction with `GrokPromptTab.tsx`.
   - **Consolidation Strategy**: The lesson data structure seems well-organized in `curriculumData.ts`. For the rebuild, consider maintaining this centralized data source but perhaps streamline how the data is accessed or presented. You might want to create a more modular structure within `curriculumData.ts` to separate video links, quiz references, and other educational content for easier maintenance and scalability.
   - **Quiz Integration**: The PDFs in `pdfs/` are extensive and unit-specific. For the rebuild, think about whether all these PDFs need to be retained in their current form or if a more dynamic way to serve quiz content (e.g., converting to a database-driven approach or extracting key questions into a structured format) could be more efficient. This could reduce the static file load and improve integration with the Grok LLM prompts.

2. **Multi-User Progress Tracking and Blockchain Database (B)**:
   - **Current Structure**: This involves a blockchain-type database using Merkle trees for sync status, a mempool for aggregating data before block commitment, peer attestation for knowledge testing, and a leaderboard. Progress tracking covers 89 lessons, with point values possibly defined in `lessons_export.json`. Questions for block mining are likely in `questions_export.json`, pointing to PNG files in `apps/ui/public/questions/`.
   - **Consolidation Strategy**: The blockchain and mempool features are innovative but complex. For the rebuild, consider simplifying the architecture while retaining the core idea of decentralized progress tracking. Focus on the mempool as a staging area for progress data and streamline the block mining process. The peer attestation mechanism (requiring 3 or more peers to verify answers) is a strong social consensus feature—keep this but think about automating or gamifying the verification process to reduce friction.
   - **Leaderboard and Motivation**: The leaderboard is a key motivator for students. Ensure that the rebuild prioritizes real-time updates to the leaderboard across peers after a block is mined. This could be a central UI component that integrates seamlessly with the backend blockchain updates.
   - **Questions for Mining**: The questions in `questions_export.json` and associated PNGs in `apps/ui/public/questions/` are critical for the mining process. For the rebuild, verify the exact location and format of these questions. If they are indeed in `questions_export.json`, consider consolidating this data into a more accessible database or structured JSON format that correlates directly with lesson data in `curriculumData.ts`. This would make it easier to match questions to lessons and ensure relevance during block mining.

### Reworking the Architecture
- **Integration of A and B**: Currently, lesson progress (A) feeds into the blockchain database (B). For the rebuild, aim for a tighter integration where completing a lesson or quiz directly triggers an update to the mempool without unnecessary intermediate steps. This could mean designing a clear API or event-driven system where lesson completion events are automatically queued for block mining.
- **Simplifying Blockchain Complexity**: The use of Merkle trees and proofs for syncing is sophisticated but might be overkill for an educational app unless scalability to thousands of users is a near-term goal. Consider if a simpler distributed database or a centralized solution with periodic syncs could achieve the same goals with less complexity. If the blockchain aspect is crucial for your vision (e.g., for transparency or as a learning tool for students), retain it but focus on making the user interaction with it (mining, attestation) more intuitive.
- **User Experience**: For both A and B, prioritize the student experience. For lesson data, ensure that accessing videos and quizzes is seamless, perhaps through a dashboard that visually tracks progress. For the multi-user aspect, make the leaderboard and block mining process engaging—perhaps by adding notifications or rewards for mining blocks or verifying answers.
- **Data Consolidation**: You have multiple data sources (`curriculumData.ts`, `lessons_export.json`, `questions_export.json`, PDFs, PNGs). In the rebuild, aim to consolidate these into a unified data model. For instance, a single database or set of JSON files that map lessons to videos, quizzes, questions for mining, and point values. This reduces the risk of data mismatches and simplifies updates.

### What to Delete or Archive
- **Redundant or Outdated Files**: Look through `apps/ui/public/questions/` and `pdfs/` for any outdated or unused files. If certain PDFs or PNGs are no longer relevant to the curriculum, archive them outside the main codebase to reduce clutter.
- **Old Code or Experiments**: Files or directories related to previous iterations (like `allUnitsData.js` if fully replaced by `curriculumData.ts`) can be archived or deleted. Similarly, any unused packages or modules in `packages/` that no longer align with the rebuild vision should be removed.
- **Documentation**: Keep all ADRs, but consider summarizing or consolidating older probes or reports if they’re not directly relevant to the rebuild. This keeps your documentation focused and actionable.

### Next Steps for Brainstorming
- **Prioritize Features**: Decide which aspects of A and B are most critical for the MVP of your rebuild. Is it the lesson delivery, the leaderboard, or the block mining? Focusing on one or two core features initially can help manage complexity.
- **Data Mapping**: Let’s confirm the exact locations and structures of `questions_export.json` and `lessons_export.json`. Understanding how these correlate with lessons and mining questions will be key to consolidating data.
- **User Flow**: Sketch out the ideal user journey from accessing a lesson to mining a block and seeing their progress on the leaderboard. This can guide how to structure the integration between A and B.

I'm here to dive deeper into any of these areas. What do you think about the consolidation strategies, and is there a specific part of the app (like the blockchain or lesson data) you want to focus on first during this rebuild?


# Brainstorming for app rebuild strategy
_Exported on 7/2/2025 at 14:18:30 EDT from Cursor (1.1.7)_

---

**User**

You're in a codebase, and I'm about to do a major from-scratch rebuild.

At the moment, I want to understand what to delete, what to keep.stores all the architectural documents, if you look through that you will understand the design decisions made for my app, and most of them, are in line with what I will recreate.shows an initial refactoring/rebuilding plan that takes into account the ADRs, and the probes.

This app, the most important thing it will do are two things.. serve lesson data. (A). originally in@allUnitsData.js ..but recently converted to @curriculumData.ts .  This lesson data is comprised of links to external videos, the most important ones will be deeme d"alt URL" in term sof vidoes.. and links to quizzes which are PDFs housed in .  The purpose of these pdf quizzes are to serve as context for the user to attach to a grok llm 's prompt, along with a grok prompt located at @GrokPromptTab.tsx .

SO that is 1 thing that this app will do.  The other is a multi-user aspect. (B).  The progress of the user through the tasks listed above in (A)needs to be kept, and viewed eventually by all peers (B).  (B) is comprised of adatabase.. and that database will keep track of.. partial progress of the lessons completed in (A), of which there are 89 lessons.  (B) is a blockchain-type-database who uses merkle trees/proofs for determinining syncing status between the peers.  Most importantly about (B).. is the mempool feature which will.. aggregate all data before a block is commited.  Students are motivated to see their own score on a leaderboard to commit thei rprogress to the block so.. a part of (B)'s functoin is to.. test the knowledge of the students through peer attestation.  As soon as there is 1 lesson's worth of progress in the mempool..(each lesson's items have a certain point value @lessons_export.json , students will be permitted to try to mine a block by answering a question.. there are many questions.. and they are all correlated to the lessons in (A).  I am unsure where this table of questions lives.. I think it's...@questions_export.json ?  Which points to a bunc hof png files each correlated to a lesson. and they live..@/questions .  So a student answers this question.. proposes a candidate block so to speak, and fellow peers 3 or.. more.. must verify that the answer is true.  once verified, that block is mined, and the leaderboard across all peers needs to be updated.

I want to know.. how to consolidate this.. how to rework it.. I don't want you to give me any code, I just want to brainstorm with you.

---

**Cursor**

Looking at your codebase and description, this is a really interesting educational blockchain system! Let me help you think through the consolidation strategy.

## Core Data Architecture Questions

**Lesson Data Consolidation:**
Your `curriculumData.ts` is already well-structured, but I'm seeing some redundancy. Each lesson has videos, quizzes, blooket activities, origami activities - but for your core functionality, it sounds like you really need:
- Video links (prioritizing "alt URLs")  
- PDF quiz references
- Point values for mining eligibility
- Progress tracking fields

**Question Bank Integration:**
You have questions scattered across `/questions/unit1/`, `/questions/unit2/`, etc. and potentially referenced in `questions_export.json`. Key question: Should these questions be:
1. Embedded directly into the lesson data structure?
2. Kept as a separate indexed system that correlates to lessons?
3. Dynamically loaded based on lesson completion state?

## Multi-User System Architecture

**Mempool Strategy:**
The most interesting part is your mempool concept. You're essentially creating an educational proof-of-knowledge system. Key decisions:
- How granular should progress tracking be? (per video watched, per quiz completed, or per full lesson?)
- Should the mempool aggregate progress from multiple lessons before allowing mining, or is it truly "1 lesson's worth"?
- How do you handle partial progress (student watches video but doesn't do quiz)?

**Peer Attestation Design:**
This is where it gets complex. When a student proposes a block by answering a question:
- Do the 3+ peers need to answer the same question to verify?
- Or do they just verify the proposed answer is correct?
- How do you prevent collusion while ensuring legitimate verification?

## Consolidation Strategy Questions

**What to Keep:**
- The curriculum structure in `curriculumData.ts` (but maybe streamlined)
- The modular package structure (core, data, p2p)
- The ADR documentation approach
- The question bank images

**What Might Need Rethinking:**
- Do you need all the metadata (origami activities, blooket links) for the core MVP?
- How much of the current blockchain implementation is actually needed vs. a simpler append-only log with merkle proofs?
- Is the p2p networking overcomplicated for the initial version?

**Key Integration Points:**
1. How do lesson completion events trigger mempool additions?
2. How does the question selection algorithm work (random from completed lessons? difficulty progression?)
3. How does the leaderboard calculation work across the distributed system?

What aspects of this system feel most critical to get right in the rebuild? And what feels like it might be over-engineered for the initial version?


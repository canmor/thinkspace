# ADR 0006 · Integrated local walking skeleton

**Proposed for architecture and product-experience review.** The implementation starts at merged baseline c01de8c. ADR 0005's local experimental dispositions continue to apply.

## Implementation plan and ownership

| Increment | Owner and boundary |
|---|---|
| Workspace and conversation | The domain module owns stable identities, ordered messages and historical branch anchors. React Flow 12.9.3 (MIT) projects conversation, derived-from and explicit reference relationships. Positions are independent workspace data. |
| Context and inference | The domain compiler resolves inherited history and direct snapshots in deterministic order. It deduplicates message identities, records omissions and rejects required payloads over 64,000 UTF-8 bytes. The trusted generation adapter submits the compiled envelope and user instruction as distinct user messages. |
| Interactive results | The application-facing UI calls the lab envelope decoder, baseline RestrictedClient and trusted Surface. The lab remains separately runnable. The server exposes compiled assets only. The Worker response has its own connect-src 'none' policy. |
| Artifact lifecycle | The host keeps one identity from inline generation through promotion, stores message/block provenance, versions content separately from mutable state and captures complete structured snapshot values for context. |
| Durable publication | The trusted server owns SQLite access behind list/read/save. A versioned document and optimistic revision check allow one atomic update across messages, graph, references and artifacts. The store requests WAL and FULL synchronization. |

The graph derives branch links from immutable anchors and artifact links from provenance. The context compiler never reads canvas positions or walks arbitrary edges. Each branch references an existing assistant anchor and receives a fresh identity. Snapshot references store their selected values, which keeps them independent of subsequent source edits.

## Revision and recovery

A complete regenerated response is decoded before publication. A fresh restricted Worker evaluates defaults and a second evaluation checks migrated state. The host requires the same binding and exact label, numeric range and ordered choice contract for every existing control. Added controls retain their admitted defaults. Ambiguous or incompatible controls reject the candidate. A detached trusted React root exercises the candidate frame before storage. A single conditional SQLite update records the generation and publishes accepted content, previous revision and migrated state. The visible root switches after the server acknowledges the commit. An unsuccessful candidate saves a diagnostic with the generation while retaining the previous artifact.

The focused artifact creates a fresh baseline Worker on mount or revision change, evaluates stored source and state, and renders only its validated frame. Live changes use the mounted session's original resource budgets. A failed save reopens the previously persisted state. SQLite durability, candidate rendering and visible React rendering have separate lifecycles. A later host-renderer defect can still make persisted content unavailable.

## Trade-offs and next review

One document per workspace reduces transaction coordination and enables exact restart comparisons. Snapshot duplication, full-document writes, an 8 MiB request limit and workspace-wide optimistic conflicts limit scale. A concurrent writer may spend a model call before its stale commit is rejected. The byte budget bounds local compilation and does not estimate provider tokenization. The backend and browser host are trusted local components. This prototype provides neither multi-user access controls nor encrypted storage.

Matching field contracts cannot establish domain meaning if the model changes a calculation under an unchanged label. Reviewers should examine the regenerated rule. A changed binding or category ordering requires a new explicit migration design. Independent reader observations, broader model reliability, WebKit behavior, desktop storage paths, credential management and equivalent per-Worker policy enforcement in a packaged shell remain open.

The proposed next milestone is an observed architecture-exploration session. Ask users to recover an earlier decision, inspect submitted context, and refine an artifact after changing its weights. Use those observations to prioritize context selection, revision recovery and graph navigation.

## PR 4 review corrections

The origin conversation exposes an interactive working copy while its latest generated UI awaits promotion. An inherited, promoted or superseded message block opens the original envelope and initial state in a read-only restricted Worker. The link from the message opens the current independent artifact. The artifact view exposes generation instructions, returned commentary and saved pre-replacement revision states.

SQLite reads and writes validate identities, lineage, references, revision structure and protocol/catalog compatibility. Existing schema-1 records imply policy 1.5.0 when the policy field is absent. The browser captures artifact references by evaluating the selected revision and state in a fresh baseline Worker and deriving the projection from its frame. New snapshots carry the specification, protocol, catalog and policy. At submission the host rechecks snapshot state and projection against the referenced immutable content revision. A failed capture blocks sending until discarded or replaced. The context inspector supports removal and displays the selected state alongside its source.

Provider exceptions return an attributed generation diagnostic. The failure retains the request and the composer permits retry. Local storage or transport failure can still prevent durable recording. Independent product-experience evaluation remains pending.

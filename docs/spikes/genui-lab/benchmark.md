# Core benchmark fixtures — proposed
Goal 1 uses B02–B04 manually authored equivalent specs; Goal 2 uses natural prompts without prescribed layouts. Fixtures below are illustrative, not real airline policies or measured technology ratings. Keep expected outputs separate from generation prompts.

B01: Explain the geometric meaning of vector dot product. Check projection, angle, formula a·b=|a||b|cosθ, orthogonality and negative projection. Visual useful, not forced exact diagram.

B02: Given Conversation Engine owns messages/lineage, Context Engine resolves/selects/budgets context, and Application Orchestrator coordinates, explain how to decouple them. Check responsibility boundaries and no circular dependency implied by diagrams.

B03: Compare Native Hybrid, Tauri and Electron using adjustable weights for native experience, lightweight runtime, delivery efficiency. Sample scores respectively [9,8,7], [7,8,8], [6,4,10]; initial weights [40,25,35]. Expected weighted scores 8.05, 7.60, 6.90. Normalize by sum; define all-zero weights as no ranking, not divide by zero. Test one-hot weights, ties, changes, sorting and consistent display. Scores synthetic.

B04: Analyze effects of fare, membership and single baggage weight under fictional rules: Economy 23kg, Business 32kg; Gold adds 5kg; excess $15/kg; weight domain 10–40 integer kg; no negative fee. Expected fee = max(0, weight - allowance)*15. Independent oracle cases (fare, membership, weight, fee): E,N,22,0; E,N,23,0; E,N,24,15; E,G,28,0; E,G,29,15; B,N,33,15; B,G,37,0; B,G,38,15. Test all combinations over domain, state export and restore. No live airline claims.

B05: Refine B04 over three turns. Proposed concrete fixture additions (not previously approved): (1) domestic default unchanged, international adds 2kg allowance to all fares; (2) add fee curve over 10–40kg for current fare/membership/route; (3) compare old policy ($15/kg) and new ($20/kg) with identical allowance rules. Preserve input state when possible and validate prior applicable behavior, curves and both fees. Record any migration. Do not expose test expectations to model.

B06: What is BYOK? Expect concise text: Bring Your Own Key, user provides model API credentials and pays applicable provider charges. Unnecessary UI is a failure of restraint.

Smoke: B02–B04 × two protocols × one attempt. Core: six tasks × two protocols × three repeats where budget permits (36 episodes, more calls for multi-turn). Extended: 24 tasks across concept, comparison, architecture, multidimensional, decisions, behavioral, refinement, restraint. Freeze actual prompts before running. Report attempts, failures, retries, denominators and model versions.

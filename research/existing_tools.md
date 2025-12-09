# Plan: Strategic Analysis & Tool Evolution Recommendations

## Context

Research goal: Analyze Planning Center's existing Asana-GitHub automation attempts to determine:
1. What problems are being solved in the wild
2. How asana-github-sync fits into the ecosystem
3. What features it might need to grow into
4. How it works alongside (not replaces) other tools

## Research Summary: 5 Automation Patterns Analyzed

### Pattern 1: Task Creation from PRs (3 attempts)
**Attempts #1, #2, #3** - Create NEW Asana tasks when PRs are opened

| Feature | Attempt #1 | Attempt #2 (PC Dependabot) | Attempt #3 (Author Filter) |
|---------|------------|---------------------------|---------------------------|
| **Trigger** | PR opened (all) | PR review_requested (Dependabot only) | PR opened (author allowlist) |
| **User mapping** | JSON config | Name matching | None (unassigned) |
| **Section placement** | ❌ | ✅ "In Review" | ✅ Specified section |
| **Custom fields** | ❌ | ✅ Product field | ❌ |
| **App attachment** | ✅ Optional | ✅ Separate workflow | ❌ Conflicts |
| **PR body update** | ✅ Auto-adds link | ✅ Auto-adds link | ✅ Auto-adds link |
| **Follower cleanup** | ❌ | ❌ | ✅ Removes "me" |
| **Content sanitization** | ✅ Excellent regex | ❌ | ❌ |
| **Error handling** | ❌ Fails workflow | ❌ Fails workflow | ❌ Fails workflow |

**Use case:** Teams that don't create Asana tasks upfront (code-first workflow, bot PRs)

### Pattern 2: Visual Attachments (app widgets)
**PC's create-pr-widget.yml** - Official Asana action

- 13 lines, calls Asana's backend service
- Requires OAuth secret (not PAT)
- Creates rich visual PR widget in Asana task
- Complementary to status updates (different auth, different purpose)

**Use case:** Visual feedback without workflow automation

### Pattern 3: Status Field Updates (YOUR TOOL)
**asana-github-sync** - Updates Status custom field based on PR lifecycle

- PR opened → "In Review"
- PR merged → "Shipped"
- Handles edited events (only when Asana links change)
- Never fails PR workflow

**Use case:** Automatic workflow state tracking

### Pattern 4: Metadata Field Updates (numeric/text fields)
**Attempt #4** - Reusable workflow for updating arbitrary custom fields

- Updates numeric fields (Build Number, Deploy ID)
- Called from other workflows (not directly triggered)
- Posts PR comments showing updates
- Idempotency via comment parsing
- Supports any field type (but designed for numbers)

**Use case:** Build/deploy metadata tracking

### Pattern 5: Late-Binding Orchestration
**Attempt #5** - Coordinates other workflows when Asana link added late

- Triggers on PR edited
- Mines PR comments for build numbers
- Calls Attempt #4 if prerequisites met
- Handles retroactive updates

**Use case:** Asana link added AFTER builds/deploys already happened

### Pattern 6: Label-Triggered Multi-Field Updater
**Attempt #6** - Updates multiple custom fields on multiple tasks when build ready

- Triggers on PR labeled `build_created` (not PR events)
- Extracts ALL Asana task IDs (supports multiple)
- Mines comments for build version
- Updates 4 custom fields: Status, QA Status, Build Type, Test Version
- Posts confirmation comment

**Use case:** Build completion triggers comprehensive Asana field updates

## Key Insights

### 1. The Ecosystem is Multi-Layered (Not Competitive)

All five patterns work TOGETHER:

```
PR Lifecycle:
├── 1. Task Creation (if needed)
│   └── Attempts #1-3
├── 2. Visual Widget
│   └── create-pr-widget.yml
├── 3. Status Sync ← YOUR TOOL
│   └── asana-github-sync
├── 4. Metadata Sync
│   └── Attempt #4
└── 5. Orchestration
    └── Attempt #5
```

**They're complementary, not competing!**

### 2. Label-Based Orchestration (New Pattern from Attempt #6)

**Discovery:** Labels can trigger workflows more reliably than comment parsing!

| Orchestration Method | Reliability | Used By |
|---------------------|-------------|---------|
| **Comment parsing** | ❌ Brittle regex | Attempts #4, #5 |
| **Label triggers** | ✅ Explicit signal | Attempt #6 |
| **Direct events** | ✅ Native | Your tool |

**Example flow:**
```
Build workflow → labels PR "build_created"
                ↓
Attempt #6 → detects label → updates Asana
```

**Implication for your tool:**
- Don't need to support label triggers directly
- Users can orchestrate with labels:
  ```yaml
  on:
    pull_request:
      types: [labeled]
  jobs:
    sync:
      if: github.event.label.name == 'deploy_to_prod'
      uses: planningcenter/asana-github-sync@v1
  ```

### 3. Common Pain Points Across All Attempts

❌ **All fail PR workflows** (except yours) - Use `core.setFailed()` blocking merges
❌ **No retry logic** - Transient API errors fail permanently
❌ **Duplicated URL parsing** - Same regex patterns repeated
❌ **Manual user mapping** - Name matching or JSON config
❌ **Comment spam** - Post success messages on every update
❌ **Brittle dependencies** - Rely on exact comment formats

✅ **Your tool already avoids most of these!** (CLAUDE.md error handling philosophy)

### 3. Features They Need (That You Don't Have)

| Feature | Needed By | Priority |
|---------|-----------|----------|
| **Multiple tasks** | Attempt #6 | **HIGH** ⚠️ |
| **Multiple custom fields** | Attempt #6 (4 fields), PC Dependabot | **HIGH** ⚠️ |
| **Section placement** | PC Dependabot, Attempt #3 | High |
| **Label-based triggers** | Attempt #6 | Medium |
| **Auto-create tasks** | All creation attempts | Medium |
| **User mapping** | PC Dependabot, Attempts #1/#3 | Medium |
| **Author filtering** | Attempt #3, PC Dependabot | Low |
| **Follower cleanup** | Attempt #3 | Low |

**Critical finding:** Attempt #6 shows that multiple tasks + multiple fields are ACTIVELY USED in production, not edge cases!

### 4. What Your Tool Does BETTER

✅ **Efficient edited handling** - Only runs when Asana links change (not all edits)
✅ **Never fails workflow** - Logs errors, doesn't block merges
✅ **Retry logic** - Exponential backoff for transient errors (via @lifeomic/attempt)
✅ **Clean error handling** - `core.error()` not `core.setFailed()`
✅ **TypeScript + SDK** - Type safety, not raw curl/jq

## Strategic Recommendations

### Option A: Stay Focused (MVP-First Approach) ⭐ RECOMMENDED

**Keep current scope:**
- Status field updates only
- No task creation
- No section placement
- No multiple custom fields

**Rationale:**
- Your tool solves ONE problem extremely well
- Other problems already have (imperfect) solutions
- Teams can compose multiple tools
- Simpler to maintain and document

**Example workflow composition:**
```yaml
on:
  pull_request:
    types: [opened, edited, closed]

jobs:
  asana:
    runs-on: ubuntu-latest
    steps:
      # Visual widget
      - uses: Asana/create-app-attachment-github-action@latest
        with:
          asana-secret: ${{ secrets.ASANA_OAUTH_SECRET }}

      # Status sync (YOUR TOOL)
      - uses: planningcenter/asana-github-sync@v1
        with:
          asana_token: ${{ secrets.ASANA_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          custom_field_gid: '1202887490284881'

      # Build number (external workflow calls Attempt #4)
```

**Documentation additions:**
- Add FAQ explaining tool boundaries (DONE ✅)
- Add "Integrations" section showing composition
- Add "Common Patterns" with example workflows

### Option B: Selective Expansion (Post-MVP) ⚠️ UPDATED

**Critical: Attempt #6 changes priorities!**

**Add in Milestone 2:**

1. **Multiple tasks support** (HIGH value, medium complexity)
   ```yaml
   with:
     transition_multiple_tasks: true  # Update ALL Asana links in PR
   ```
   - Currently skipped with warning (README line 24)
   - Attempt #6 shows this is ACTIVELY USED
   - Medium complexity: loop through tasks, handle partial failures

2. **Multiple custom fields** (HIGH value, high complexity)
   ```yaml
   with:
     custom_fields: |
       1202887490284881: "1202887490288021"  # Status: In Review
       1202880331736132: "1202888299403896"  # QA Status: QA Requested
       1203158031514948: "1203211562684746"  # Build Type: Test
   ```
   - Attempt #6 updates 4 fields simultaneously
   - PC Dependabot sets Product field
   - Replaces single `state_on_*` inputs with flexible field mapping
   - High complexity: field type detection, enum vs text vs number

**Add in Milestone 3:**

3. **Section placement** (Medium value, low complexity)
   ```yaml
   with:
     initial_section_gid: '456'  # Where to place task in project
   ```

4. **Auto-create tasks** (Medium value, medium complexity)
   ```yaml
   with:
     auto_create_task: true
     create_for_authors: ['dependabot[bot]', 'renovate[bot]']
     asana_project_gid: '789'
   ```

**NOT adding:**
- Label-based triggers (use workflow orchestration instead)
- Reusable workflow pattern (standalone action is simpler)
- Comment posting (noise)
- User mapping (brittle, needs better solution org-wide)

### Option C: Go Generic (NOT RECOMMENDED)

**Turn into generic field updater:**
- Support all custom field types
- Reusable workflow pattern
- Arbitrary field mapping

**Why NOT:**
- Loses focus and clarity
- Attempt #4 already does this
- More complex to configure and maintain
- Harder to document

## Recommended Path Forward

### Phase 1: MVP (Current Plan) ✅
- Status field updates
- PR lifecycle tracking
- Smart edited event handling
- Excellent error handling

### Phase 2: Documentation (Next) 📝
**Add to README:**

1. **"Integration Patterns" section**
   - Using with create-app-attachment (DONE ✅)
   - Using with task creation workflows
   - Using with metadata sync workflows

2. **"Comparison" section**
   | Tool | Purpose | When to Use |
   |------|---------|-------------|
   | create-app-attachment | Visual widgets | Always (free) |
   | asana-github-sync | Status sync | PR workflow tracking |
   | Custom task creator | Task creation | Bot PRs, code-first workflow |
   | Custom field updater | Build metadata | Deploy/build tracking |

3. **"Common Patterns" section**
   - Dependabot automation (task creation + status + widget)
   - Human PR workflow (status + widget only)
   - Deploy tracking (status + build numbers)

### Phase 3: Selective Features (Milestone 2/3) 🚀

**Milestone 2 additions:**
- Section placement (`initial_section_gid`)
- Auto-create for bots (`auto_create_task`, `create_for_authors`)

**NOT adding:**
- Multiple custom fields (Attempt #4 exists)
- Reusable workflow pattern (standalone action is simpler)
- Comment posting (noise)
- User mapping (brittle, needs better solution org-wide)

## Files to Update

### Immediate (Documentation):
1. `/Users/jt/Code/asana-github-sync/README.md`
   - Add "Integration Patterns" section
   - Add "Comparison" section
   - Add "Common Patterns" section

### Future (Features):
1. `/Users/jt/Code/asana-github-sync/src/types.ts`
   - Add `initialSectionGid` to config
   - Add `autoCreateTask` flag
   - Add `createForAuthors` array

2. `/Users/jt/Code/asana-github-sync/src/util/config.ts`
   - Read new config inputs

3. `/Users/jt/Code/asana-github-sync/src/util/asana.ts`
   - Add `createTask()` function
   - Add section placement to task creation

4. `/Users/jt/Code/asana-github-sync/action.yml`
   - Add new optional inputs

## Decision Points ⚠️ CRITICAL

**Attempt #6 reveals that MVP limitations may be too restrictive for real-world use!**

### Priority 1: Multiple Tasks (REQUIRED for adoption?)

**Current MVP:** Skips PRs with multiple Asana links (README line 24)
**Reality:** Attempt #6 actively uses multiple tasks in production

**Decision needed:**
- ❌ **Keep MVP limitation**: Ship with single-task only, add later
  - Pro: Simpler MVP, faster to market
  - Con: Blocks adoption by teams using multiple tasks

- ✅ **Add to MVP**: Support multiple tasks from day 1
  - Pro: Broader adoption, solves real problem
  - Con: Delays MVP, more complexity

**Recommendation:** Add to MVP. This is not an edge case.

### Priority 2: Multiple Custom Fields (Framework decision)

**Current MVP:** Updates one field (Status) with preset values
**Reality:** Teams update 4+ fields simultaneously (Status, QA, Build Type, Version)

**Decision needed:**
- ❌ **Keep simple**: `state_on_opened: "In Review"` (status only)
  - Pro: Easy to configure, clear purpose
  - Con: Requires separate workflows for other fields

- ✅ **Go flexible**: Support arbitrary field mappings
  - Pro: One action for all field updates
  - Con: More complex config, harder to document

**Recommendation:** Hybrid approach (see below)

### Priority 3: Configuration Philosophy

**Option A: Simple (Current):**
```yaml
with:
  custom_field_gid: '123'
  state_on_opened: 'In Review'
  state_on_merged: 'Done'
```

**Option B: Flexible:**
```yaml
with:
  custom_fields_on_opened: |
    1202887490284881: "1202887490288021"  # Status: In Review
    1202880331736132: "1202888299403896"  # QA: QA Requested
```

**Option C: Hybrid ⭐ RECOMMENDED:**
```yaml
with:
  # Simple case (Status field only)
  custom_field_gid: '123'
  state_on_opened: 'In Review'
  state_on_merged: 'Done'

  # OR advanced case (multiple fields)
  custom_fields_on_opened: |
    1202887490284881: "1202887490288021"
    1202880331736132: "1202888299403896"
```

**Rationale:** Keep simple case simple, allow power users flexibility.

### Other Decisions (Lower Priority):

4. **Section placement:** Defer to Milestone 2
   - Frequently requested but not blocking

5. **Auto-create:** Defer to Milestone 2
   - Nice-to-have, not essential

6. **Label triggers:** Don't add (users can orchestrate externally)

7. **User assignment:** Skip (mapping problem unsolved)

## Summary: What We Learned from 6 Real-World Attempts

### Pattern Distribution:
1. **Task creation** (3 attempts) - Teams need this for bots/code-first workflow
2. **Visual widgets** (1 official action) - Everyone wants this (it's free!)
3. **Status sync** (YOUR TOOL) - Core workflow automation
4. **Metadata sync** (2 attempts) - Build/deploy info tracking
5. **Orchestration** (2 attempts) - Glue between workflows

### Critical Findings:

1. **Multiple tasks are REQUIRED**: Not an edge case (Attempt #6 uses in production)
2. **Multiple fields are COMMON**: 4+ fields updated simultaneously
3. **Label-based triggers work well**: Better than comment parsing
4. **All other tools fail PR workflows**: Yours is the only one that doesn't
5. **Error handling is universally poor**: Except yours

### Revised MVP Recommendation:

**Must have:**
- ✅ Multiple task support (was planned to skip, now REQUIRED)
- ✅ Clean error handling (already have)
- ✅ Efficient edited event handling (already have)

**Should have (for broad adoption):**
- ⚠️ Hybrid config (simple + flexible modes)
- ⚠️ Multiple custom fields support

**Can defer:**
- ⏸️ Section placement (Milestone 2)
- ⏸️ Auto-create (Milestone 2)
- ⏸️ Label triggers (users can orchestrate)

## Recommended Next Steps

### Immediate (Documentation):
1. ✅ FAQ section added to README (COMPLETED)
2. 📝 Add "Integration Patterns" section showing composition with other tools
3. 📝 Add "Comparison" table (when to use what tool)
4. 📝 Add "Common Patterns" examples (Dependabot, deploy, etc.)

### Near-term (MVP Scope Decision):
3. ❓ **DECISION NEEDED:** Add multiple tasks to MVP? (Recommendation: YES)
4. ❓ **DECISION NEEDED:** Add multiple fields to MVP? (Recommendation: Hybrid approach)
5. ❓ **DECISION NEEDED:** Keep single-field simple config? (Recommendation: YES, but also support multi-field)

### Medium-term (Implementation):
6. 🚀 Implement decided MVP scope
7. 🚀 Add Milestone 2 features based on adoption feedback

## Success Metrics

**For MVP (Phase 1):**
- Zero manual status updates needed
- Zero impact on PR workflow if Asana down
- Easy composition with other tools

**For Documentation (Phase 2):**
- Users understand tool boundaries
- Users know how to combine tools
- Clear examples for common patterns

**For Features (Phase 3):**
- Reduces number of separate workflows needed
- Maintains simplicity for basic use cases
- Optional features don't complicate common case

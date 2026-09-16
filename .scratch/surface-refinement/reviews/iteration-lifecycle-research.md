# Research: Iterative Review Loop / Reviewer Lifecycle in Published Products

Scope: how named products structure "I gave feedback → the work changed → now what", with source URLs. Published guidance is separated from labelled researcher inference throughout. See **Disclosure** for unverified items.

---

## Recommended lifecycle (return summary, <400 words)

**Stages**

0. **Round opened.** The surface pins every annotation to an immutable revision id (`R_n`, content hash), not to "the current file".
1. **Annotate.** Point/box + note. Each item gets a target identity: element path + selector + geometry + the text/HTML slice it was written against. Unfinished work (a draft note, an open annotate mode) is locally exclusive — only one annotate gesture in flight.
2. **Submit round** — explicit control, *"Send 7 notes to agent"*. This is the missing affordance. It is a **request**, not a regeneration: the agent owns execution.
3. **In flight.** Surface stays fully interactive for *new* notes. Existing items stay visible, tagged `based on R_n`, and are read-only. No surface-level lock.
4. **Revision landed.** Non-modal banner that takes focus when activated: *"Revision R_{n+1} ready — 6 addressed, 2 outdated, 1 unanswered"* with **[Review changes since R_n]** and **[Keep reading R_n]**. Never silently swap the pane.
5. **Re-review.** Two distinct states, never merged: **addressed** (anchor survived, agent claims a fix) and **outdated** (anchor deleted or changed, so the note no longer points at anything real). Adopt GitLab's rule: auto-mark outdated *only* when the anchored region changed; leave unchanged-line items open.
6. **Close.** Reviewer closes item by item — **accept** or **reopen** — both reversible. Round closes when nothing is open, or on explicit abandon.

**Who closes an item:** the reviewer, always. The agent may only *propose* "addressed" (Percy's agent plugin "recommends an approve or reject… with your confirmation on every decision"). Never let the author's tooling close a reviewer's item.

**Staleness:** anchor-identity, not round identity — Percy carries an approval forward only while the snapshot is byte-identical; GitLab auto-resolves only when the pushed commit changed the commented lines; Vercel keeps the comment and stores which deployment it was written on.

**Three highest-risk edge cases:** (1) a revision lands mid-annotation — the unsent note must not be lost or silently re-pointed; (2) target deleted or moved — orphaned items must stay visible and be explicitly resolved, because GitHub's "outdated but still blocking merge" is the documented anti-pattern; (3) reviewer changes their mind on an accepted item — accept must be reversible (Percy unapprove, Chromatic revert acceptance, Figma unresolve).

**The single most important thing our design omits:** a **revision identity + anchor identity**. We have no `R_n` to pin notes to, so we cannot distinguish "moved" from "no longer applies", cannot show what changed since the previous round, cannot tell the reviewer a new revision landed, and cannot safely let them keep annotating during a run. The missing thing is not a regenerate button; it is the identity of the thing being reviewed.

---

## Findings

### 1. Iterative review loop patterns

**1.1 GitHub PR — review decisions are per-round; conversations are per-thread. Two lifecycles in one product.**
GitHub review decisions are `Comment` / `Approve` / `Request changes`. "Select **Request changes** to submit feedback that must be addressed before the pull request can be merged." `Request changes` is "purely informational and will not prevent merging unless a ruleset or classic branch protection rule is configured with the 'require a pull request' option".
**Sources:** [Pull request reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews), [Reviewing proposed changes in a pull request](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request). **Support:** direct evidence. **Confidence:** high.

**1.2 GitHub — an approval is destroyed by a new commit; the reviewer must re-review from scratch.**
Direct quote: "If both required reviews and stale review dismissal are enabled and a code-modifying commit is pushed to the branch of an approved pull request, the approval is dismissed. The pull request must be reviewed and approved again before it can be merged." Branch-protection setting text: "New reviewable commits pushed to a matching branch will dismiss pull request review approvals."
**Sources:** [Reviewing proposed changes in a pull request](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request), [Security enhancements to required approvals on pull requests](https://github.blog/changelog/2023-06-06-security-enhancements-to-required-approvals-on-pull-requests/), [community discussion #109549](https://github.com/orgs/community/discussions/109549). **Support:** direct evidence. **Confidence:** high. Note: the same changelog states "A pull request approval will be marked as stale when the merge base changes" — so even a merge from main invalidates approval.

**1.3 GitHub — a conversation, once resolved, collapses, and the *author/committer* is the one who can close it, not the reviewer.**
"To indicate that a conversation on the **Files changed** tab is complete, click **Resolve conversation**. The entire conversation will collapse and be marked as resolved." Permission: "You can resolve a conversation in a pull request if you opened the pull request or if you have write access to the repository." Reviewers without write access cannot close their own item.
**Source:** [Commenting on a pull request](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/commenting-on-a-pull-request). **Support:** direct evidence. **Confidence:** high.

**1.4 GitHub — "outdated" is a third state alongside resolved/unresolved, surfaced in one navigation pane.**
"In this view, you can see which conversations are unresolved, resolved, and outdated." Reachable from the **Conversations** menu on the **Files changed** tab.
**Source:** [Commenting on a pull request](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/commenting-on-a-pull-request). **Support:** direct evidence. **Confidence:** high.

**1.5 GitHub — dismiss a review is an escape hatch for a stuck blocking review, and it demands a reason.**
"Dismissing a review changes the status of the review to a review comment. When you dismiss a review, you must add a comment explaining why you dismissed it." Documented use case: "If a pull request has changed since it was reviewed and the person who requested changes isn't available to give an approving review, repository administrators or people with write access can dismiss a review." Requires write access.
**Source:** [Dismissing a pull request review](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/dismissing-a-pull-request-review). **Support:** direct evidence. **Confidence:** high. This is the precedent for "we cannot wait for the reviewer, so an authority closes the item with a mandatory audit note."

**1.6 Figma — resolution is strictly per-thread and reversible, but there is no reopen *history* and deletion is permanent.**
"Once the feedback has been addressed, or a resolution reached, you can **Resolve** the comment. This will hide the comment from both the right sidebar and the canvas." Reversal: "If a comment is resolved by mistake, you can undo this action by unchecking the [box] in the comment. Click [the filter] in the right sidebar when in comment mode and toggle the **Show resolved comments** filter on." Comment filter menu contains: "Sort by date, sort by unread, show resolved comments, only your threads, and only current page". Deletion: "**Caution:** Deleting a comment is a permanent action. It's not possible to restore a deleted comment, even if you restore an earlier version of the file." Anyone with `can view` can comment and anyone can resolve.
**Sources:** [View and manage comments](https://help.figma.com/hc/en-us/articles/360041547593-View-and-manage-comments), [Add comments to files](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files). **Support:** direct evidence. **Confidence:** high.
Figma has **no** outdated/stale state for comments — see 2.3.

**1.7 Figma — resolve hides by default but the resolved set is a first-class filter, so behaviour is "hidden, never lost".**
Compare Figma Make: "Resolve a comment | When feedback has been addressed, click **Mark as resolved** on the original comment. Resolved comments are hidden by default. To view them…". Prototypes: "Figma hides the comment from the prototype. To access it again, show resolved comments."
**Sources:** [Add comments in Figma Make](https://help.figma.com/hc/en-us/articles/38701587731735-Add-comments-in-Figma-Make), [Comment on prototypes](https://help.figma.com/hc/en-us/articles/360039824594-Comment-on-prototypes). **Support:** direct evidence. **Confidence:** high.

**1.8 Chromatic UI Tests — accept/deny is per-snapshot, and "approve" is machine-checkable.**
"✅ **Accept change**: This updates the story baseline, ensuring future snapshots are compared against the latest approved version. Once a snapshot is accepted, it won't need re-acceptance until it changes, even across git branches or merges. ❌ **Deny change**: This marks the change as 'denied', indicating a regression and immediately failing the build… Denying a change will force a re-capture on the next build." Build verdict: "If you accept all the changes, the build will **🟢 Pass**… If you deny any of the changes, the build will **🔴 Fail**." Keyboard shortcuts: `a` accept, `d` deny. Reviews write a required status check back to the PR.
**Source:** [Quickstart](https://www.chromatic.com/docs/quickstart/). **Support:** direct evidence. **Confidence:** high.

**1.9 Chromatic UI Review — a second, explicitly *per-round* lifecycle with a checklist and named closers.**
"Each UI Review is linked to a pull/merge request." Checklist items: "1. Changeset must be approved… 2. Outstanding discussions must be resolved → Click 'Resolve' on discussions. 3. All assigned reviewers must approve". States: "If changes are found, the Review will enter the **🟡 Pending** state. When changes are approved and checklist items are complete, the Review will be **🟢 Passed**." Threading: "Discussions are threaded and attached to the specific snapshot represented by the change."
**Source:** [UI Review](https://www.chromatic.com/docs/review/). **Support:** direct evidence. **Confidence:** high. So Chromatic runs **both** paradigms simultaneously: per-item (snapshot accept/deny) and per-round (Review pass/fail, checklist). That is the cleanest published model for what we are building.

**1.10 Percy — approval is keyed to *content identity*, so it survives new builds without being re-asked.**
"Approved snapshots that were previously accepted will retain their approval status across builds throughout the lifespan of the branch. Essentially, identical snapshots will only require approval once per branch, as they are 'carried forward'." Granularity: "Approve build / Approve groups of matching visual changes / Approve individual snapshots… You can only approve snapshots, and not individual screenshots." Escalation: "You can [request changes] if a snapshot is not yet ready for approval. By doing this, the build status will be changed to 'Changes requested.'"
**Source:** [Percy Approval Workflow](https://www.browserstack.com/docs/percy/visual-testing-workflows/view-percy-build-results/approval). **Support:** direct evidence. **Confidence:** high.
Critically, carry-forward is defeated by change: in their worked scenarios, once the button colour changes again, "the approval is not carried forward" and the item returns to `Unreviewed`. **Support:** direct evidence. **Confidence:** high.

**1.11 Percy — approval is reversible at both item and round level, and reversal cascades.**
"**Approve snapshot** – Confirm the changes in the snapshot. **Unapprove snapshot** – Revert the approval, marking the snapshot as unreviewed… Unapproving the build automatically unapproves all the snapshots within that build." Also `Unapprove build`, `Reject build` ("prevent it from becoming the base build for future builds"), `Delete build`, and for Visual Git `Unmerge` / `Unmerge and unapprove build`. "If you approve the build and want to unapprove a snapshot, a confirmation modal appears." A History panel filters by `Approved / Merged / Unreviewed / Changes requested / Failed / Auto-approved / Rejected`.
**Source:** [Percy Build lifecycle](https://www.browserstack.com/docs/percy/visual-testing-workflows/view-percy-build-results/build-lifecycle). **Support:** direct evidence. **Confidence:** high.

**1.12 Chromatic — a superseded *acceptance* is only partially reversible.**
"If the changes were on the most recent build, you can revert your acceptance in the dashboard, but there may be situations where the change was accepted on a previous build." Also: "Chromatic does not currently support deleting individual builds within a project."
**Source:** [Branches and baselines](https://www.chromatic.com/docs/branching-and-baselines/). **Support:** direct evidence. **Confidence:** high. This is an honest statement of a real limitation: irreversible acceptance is an accepted cost in a shipped product.

**1.13 Marker.io — a five-state pipeline that explicitly includes a reviewer-approval state, and is explicitly *not* one-way.**
"Open → In Progress → Waiting for Approval → Resolved → Closed". "However, statuses are not strictly linear. You can move issues between statuses as needed. For example, if a client rejects a fix during rev[iew]…". Notifications: "The issue has been fixed. Reporters receive an email notification when an issue is resolved." Status Sync can auto-set `Resolved` when the linked PM tool marks it done. Marker.io's own product post frames the states as solving "There was no way to tell if someone was actively working on a fix, or if something was waiting for client review."
**Sources:** [Issue Statuses](https://help.marker.io/en/articles/13645268-issue-statuses), [Status Sync](https://help.marker.io/en/articles/5096332-status-sync), [Introducing In Progress and Waiting for Approval statuses](https://marker.io/blog/introducing-in-progress-and-waiting-for-approval-statuses). **Support:** direct evidence. **Confidence:** high.
Who closes is contested in Marker.io: a standing customer request asks to "Enable users (such as clients) to update the status of feedback in Marker.io after issues are resolved" — i.e. in the shipped product the *agency* closes, and letting the *reporter* close is an unshipped feature request.
**Source:** [Feature request: allow guest to change feedback status](https://marker-io.canny.io/feature-request/p/allow-guest-to-change-feedback-status). **Support:** direct evidence (that it is a *request*, not a shipped behaviour). **Confidence:** medium (I did not verify whether it later shipped).

**1.14 Vercel — flat per-thread resolve, reachable from either the page or the inbox, with notification on close.**
"You can resolve comments by selecting the ☐ Resolve checkbox that appears under each thread or comment. You can access this checkbox by selecting a comment wherever it appears on the page, or by selecting the thread associated with the comment in the Inbox. Participants in a thread will receive a notification when that thread is resolved." Inbox: "Every new comment placed on a page begins a thread… A small badge will indicate if any comments have been added since you last checked." Filtering: "Filter by status: Show comments in the inbox regardless of status, or either show resolved or unresolved". **No documented reopen.** Notification levels: Never / All / Replies and Mentions; per-thread Follow/Unfollow.
**Sources:** [Using Comments with Preview Deployments](https://vercel.com/docs/comments/using-comments), [Managing Comments on Preview Deployments](https://vercel.com/docs/comments/managing-comments). **Support:** direct evidence (resolve + filter) and direct evidence of *absence* (no reopen documented). **Confidence:** medium for the absence.

**1.15 GitLab — resolve/reopen is an explicit named control pair, per-thread, available to the reviewer, and collapsible-but-still-commentable.**
"When a conversation is complete, you can resolve the thread. Resolved threads are collapsed, but users can still add comments. Resolved threads can be reopened later by any user who has permission to resolve threads. To reopen a resolved thread, expand the thread and select **Reopen thread**." Prerequisite: "You must have the Developer, Maintainer, or Owner role or be the author of the issue or merge request." Blocking semantics: "Open (unresolved) threads block the merge of a merge request, but single comments do not." "Merge checks → **All threads must be resolved**".
**Source:** [Comments and threads](https://docs.gitlab.com/user/discussions/), [Merge requests](https://docs.gitlab.com/user/project/merge_requests/). **Support:** direct evidence. **Confidence:** high.
Bulk close without work: "If you have multiple open threads in a merge request, you can create an issue to resolve them separately… **Resolve all with new issue**… GitLab marks all threads as resolved, and adds a link from the merge request to the new issue."
**Source:** [Merge requests](https://docs.gitlab.com/user/project/merge_requests/). **Support:** direct evidence. **Confidence:** high. This is a real answer to "how do I get unstuck with 40 open items".

**1.16 Notion — resolve and reopen are both first-class, per-thread, and available from the page or the inbox.**
"To resolve a comment, hover over it and select ✔️… To open a previously resolved comment, select 💬 at the top of the page. Filter by `Resolved` comments, then select `↪️` to re-open." "From your Inbox, you can also directly reply to a comment by clicking `Reply`. You can also resolve or re-open comments."
**Source:** [Comments, mentions & reactions in Notion](https://www.notion.com/help/comments-mentions-and-reminders). **Support:** direct evidence. **Confidence:** high.

**1.17 BugHerd / Userback — engineering lifecycle not verified.** BugHerd is documented publicly as screenshot-or-video markup plus a "Kanban board [that] transforms client markups on websites into trackable tasks. Assign tasks to your team, prioritize issues, and track them to completion." That establishes task-per-item tracking but not the resolve/reopen semantics.
**Source:** [BugHerd Markup Tool](https://bugherd.com/use-case/markup-tool), [BugHerd easy website annotations](https://bugherd.com/feature/easy-website-annotations). **Support:** direct evidence for the Kanban claim; interpretation for "per-item tracking". **Confidence:** low (marketing pages; `help.bugherd.com` and `help.userback.io` were both DNS-unresolvable — see Disclosure).

**1.18 Linear — not verified.** No primary Linear documentation on preview-comment lifecycle was retrievable within this run (search providers were rate-limited and unavailable for the Linear/preview queries). Not claimed.

---

### 2. Stale feedback: when the work changes after feedback was given

**2.1 The canonical mechanism — GitLab auto-resolves only threads whose lines actually changed.**
Setting label: **"Automatically resolve merge request diff threads when they become outdated"**, in *Settings → Merge requests → Merge options*. "Threads are now resolved if a push makes a diff section outdated. **Threads on unchanged lines and top-level resolvable threads are not resolved.**"
**Source:** [Merge requests](https://docs.gitlab.com/user/project/merge_requests/). **Support:** direct evidence. **Confidence:** high.
This is exactly the distinction the brief asks about — "the thing I commented on moved" versus "my comment no longer applies" — and GitLab's answer is *line-scoped taint propagation with two explicit exemptions*. Researcher inference: the exemption for top-level threads implies GitLab treats a general thread as applying to the whole MR, so it cannot be invalidated by a local diff change. That semantics choice is worth copying.

**2.2 GitLab — feedback text survives history rewriting even when the code it described does not.**
"When you add comments to a merge request diff, these comments persist, even when you: Force-push after a rebase. Amend a commit."
**Source:** [Comments and threads](https://docs.gitlab.com/user/discussions/). **Support:** direct evidence. **Confidence:** high. So GitLab chose persistence of the comment + marking the thread resolved, rather than deletion.

**2.3 Figma — there is no staleness model at all; anchoring is geometric, and it silently follows the frame.**
"Figma will attach your comment to frames when you pin a comment or select a region inside a top-level frame, component, or group. **If those frames are moved around the canvas, their comments move with them.** Comments won't attach to any nested frames, components, groups, or other layers."
**Source:** [Add comments to files](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files). **Support:** direct evidence. **Confidence:** high.
Manual workaround for content churn: "Tip: To keep a comment visible while you make edits to your designs, drag it to a new part of the canvas." (**Source:** [View and manage comments](https://help.figma.com/hc/en-us/articles/360041547593-View-and-manage-comments). **Support:** direct evidence. **Confidence:** high.)
Figma also has time-anchored comments whose target is inherently transient: "Time-stamped comments let you tie feedback to specific moments on an animation's timeline… You can only leave time-stamped comments while in Figma Motion." (**Source:** [Add comments to files](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files). **Support:** direct evidence. **Confidence:** high.)
**Researcher inference:** because Figma anchors to a frame and never versions a comment, a Figma comment on a label that is later rewritten stays Open and visually attached to a different-looking thing. Figma does not distinguish "moved" from "no longer applies" because it has no revision identity to compare against. This is precisely the gap in our product.

**2.4 Vercel names the stale-target problem and solves it with provenance, not invalidation.**
"It's also possible for users to leave comments on a preview while viewing an outdated deployment." Mitigation: "you can select the screen icon beside a commenter's name to copy their session info to your clipboard", and hovering a comment timestamp shows "Browser name and version… Which deployment they were viewing". Comments are filtered by "the branch name at the top of the Inbox", with "Filter by page" and "Filter by status".
**Source:** [Managing Comments on Preview Deployments](https://vercel.com/docs/comments/managing-comments), [Using Comments with Preview Deployments](https://vercel.com/docs/comments/using-comments). **Support:** direct evidence. **Confidence:** high. Vercel lets stale notes stay open forever and relies on the reviewer noticing the deployment provenance.

**2.5 Chromatic's answer to staleness is the hardest one: disable review on superseded builds entirely.**
"Why is review disabled on the build page? **Reviewing is only enabled for the latest build on a branch to ensure that only the most up-to-date UI is accepted as a baseline. Comments are turned off on old builds to ensure that discussions are always on topic and up to date with the latest UI. This prevents the situation where different reviewers comment on different versions of the code.**"
**Source:** [Quickstart FAQ](https://www.chromatic.com/docs/quickstart/). **Support:** direct evidence. **Confidence:** high. Note the stated reason is social, not technical: they are preventing *humans disagreeing across versions*.

**2.6 Chromatic — a denied change does not become stale; it is re-queued.**
"What's the difference between denied and unreviewed changes?… When it comes to baselines, denying and leaving unreviewed have the same effect… Denied changes will be marked as unreviewed in subsequent builds for you to review again." Only accepted changes are excluded from re-capture on rerun: "Chromatic only captures snapshots for denied, unreviewed, or errored changes. It doesn't recapture snapshots for accepted changes in a rerun build."
**Sources:** [Quickstart FAQ](https://www.chromatic.com/docs/quickstart/), [Rerun builds](https://www.chromatic.com/docs/rerun-builds/). **Support:** direct evidence. **Confidence:** high.

**2.7 Percy — "carried forward" means the feedback is *not* re-shown while the content is unchanged, and is re-shown the moment it changes.**
Worked scenario: approval from Build 1 carries into Build 2 when the snapshot "remains exactly the same"; in Build 3, where "the button color changes from green to red. This snapshot has a change that is not approved in Build 2… and in the base build in the main branch. In this case, the approval is not carried forward."
**Source:** [Percy Approval Workflow](https://www.browserstack.com/docs/percy/visual-testing-workflows/view-percy-build-results/approval). **Support:** direct evidence. **Confidence:** high.
Researcher inference: this is a *content-identity* key, not a *round* key. It is the cleanest published answer to "should my old feedback still be shown?" — show it while the thing it described is unchanged; re-ask when it changed; never silently keep an approval on changed content.

**2.8 GitHub — the documented anti-pattern: an outdated thread is *not* dismissed and still blocks merge.**
First-party: resolving a conversation collapses it; "outdated" is a separate third state from unresolved (see 1.4). Practitioner evidence that outdated threads still count against `require_conversation_resolution`: "When that's on, GitHub blocks the merge if any review thread is unresolved — and the sneaky part is that 'any' includes threads marked outdated. An outdated thread is a comment attached to a line of code that has since changed, so the comment no longer points at anything real. It looks dead. GitHub still counts it."
**Sources:** [The Outdated Comment That Wouldn't Die](https://jonroosevelt.com/blog/the-outdated-comment-that-wouldn-t-die/) (practitioner blog), [Stack Overflow: "After rebase and force push, unresolved conversations remain outdated and block merge"](https://stackoverflow.com/questions/71946575/after-rebase-and-force-push-unresolved-conversations-remain-outdated-and-block), [community discussion #19206 "Unable to resolve outdated conversations and merge"](https://github.com/orgs/community/discussions/19206). **Support:** direct evidence of the *reported behaviour*; interpretation of severity. **Confidence:** medium-high on the behaviour (multiple independent reports), medium on exact current UI strings. **Disclosure: practitioner sources, not a GitHub design doc.**
Also reported: GitHub does allow resolving an outdated conversation (community discussion #19206 title is a request, and the Stack Overflow answer set resolves it by resolving the thread), so the trap is discoverability rather than impossibility.

**2.9 The "who closes" question has a real published failure mode: nobody, because both parties assume the other.**
Practitioner discussion in a project talk: "there is only one button, and it's not clear who is supposed to push it… If it's a question, then the reviewer probably wants to see th[e answer]".
**Source:** [GitHub: When to mark a PR "conversation" as "resolved"?](https://github.com/distributed-system-analysis/pbench/discussions/2113). **Support:** practitioner source. **Confidence:** low-medium (single discussion). Included because it matches Marker.io's and Vercel's shipped choices (author/anyone closes) and confirms the ambiguity is real, not theoretical.

---

### 3. Regenerate and iterate affordances in agent products

**3.1 GitHub Copilot Workspace — the clearest published per-target regeneration control, and it is *author-side*.**
"If you're not happy with the results you're getting, you can try regenerating the spec and/or plan. To do this, click the **"Regenerate"** button in the Spec or Plan panels." Per-target file iteration: "After implementing and reviewing the code, you can **select file(s) in the Plan panel and add bullet points**, then click **"Update selected files"** to reimplement those file(s) with the new instructions that you've provided." Also an **"Add file"** button. Implementation caveat: "this technical preview of Copilot Workspace uses 'whole file rewriting'… it will replace the entire file with the new code."
**Source:** [Copilot Workspace user manual — tips-and-tricks.md](https://github.com/githubnext/copilot-workspace-user-manual/blob/main/tips-and-tricks.md). **Support:** direct evidence (exact control labels). **Confidence:** high.
Framing from the manual: "Copilot Workspace is *iterative*. Copilot Workspace encourages you to check, review, refine and iterate on AI-generated outputs." Stages: Task → Specification → Plan → Implementation → Iterating on Files → Integrated Terminal → Session Sharing → Task Completion → Session Dashboard.
**Source:** [overview.md](https://github.com/githubnext/copilot-workspace-user-manual/blob/main/overview.md). **Support:** direct evidence. **Confidence:** high.
History presentation: stages are panels you revisit; the implementation is a set of proposed file changes synced to a branch; on the VS Code side, "Continue an existing session and edit and debug the proposed changes before creating a PR… any saved file change will be visible online".
**Source:** [vscode.md](https://github.com/githubnext/copilot-workspace-user-manual/blob/main/vscode.md). **Support:** direct evidence. **Confidence:** high.

**3.2 v0 — regeneration is per-message, and history is linear because restore creates a new version.**
"Each time v0 updates a code block from a message, it creates a new version. Non-message actions (such as editing code or modifying files directly) do not generate new versions." "**Restoring an old version creates a new, most recent version** using the restored code to maintain a linear version history." "Use the version controls attached to each generated message to inspect a version, view its diff, or restore an earlier generation." "When deploying, the latest version of the code is used. If you want to deploy a previous version, you can restore it and then deploy."
**Source:** [v0 Docs — Versions](https://v0.app/docs/versions). **Support:** direct evidence. **Confidence:** high. Names: "version controls attached to each generated message"; actions are inspect / view diff / restore.

**3.3 Lovable — per-target, per-element regeneration from the *preview itself*, which makes it the closest published analogue to our Review Surface.**
Preview toolbar modes and their published descriptions:

| Control (exact label) | Shortcut | Published purpose |
| --- | --- | --- |
| **Select elements** | `S` | "Point Lovable at one or more elements and request a change in plain language" |
| **Edit text inline** | `T` | "Fix a typo or change wording directly" |
| **Draw annotation** | `D` | "Show a layout or spatial change that's hard to describe" |
| **Add a comment** | `C` | "Leave feedback for yourself or a teammate" |

Details that matter: "Click the element you want to change. You can select multiple elements at once. Hold **Cmd** (Mac) or **Ctrl** (Windows) and click additional elements… **Each selected element attaches to the main chat input as a reference, and your prompt applies to all of them.**" Draw annotation: "You can sketch freehand, or draw lines, arrows, rectangles, circles, and ovals. Rough shapes are recognized and cleaned up automatically." Comments: "Comments stay attached to the element you pinned them to. Teammates can reply, and you see a red badge on the **Add a comment** button when there are unread replies." And the handoff: "**Sending a comment thread to Lovable is treated as standard chat usage and consumes credits.**"
**Source:** [Lovable — Edit from the preview](https://docs.lovable.dev/features/preview-toolbar). **Support:** direct evidence (all quotes verbatim). **Confidence:** high.
**So: yes, a reviewer/presenter-side regenerate control is a real published pattern — in a product where the person pointing at the UI is the same person who owns the build.** That is the condition that makes it work.

**3.4 Lovable — history is a panel with per-version actions and destructive actions are confirmed.**
History panel opened via the **History** toggle in the editor top bar, or chat-input menu → **Project → History**. Tabs: **History** and **Bookmarks**. Per-version actions: **More actions** menu → "**Open preview in new tab**", "**View code changes**: See exactly which files and lines that version changed, as a diff", "**Go to message in chat**: Jump to the conversation moment that produced the version", "**Revert** (tooltip: **Revert to this version**)", "**Bookmark** toggle". "Use the **Back to latest** button in the top bar to return to your current version." "Clicking **Revert** asks you to confirm first, with the date of the version you're returning to." Diverging instead of restoring: "Hover over one of your own messages, click **Edit message**, adjust the text, and confirm **Revert and resend**." Disabled state: the Revert button is disabled when "You are already on that version", when the project was remixed, or "The version is very old… The tooltip reads **Cannot revert this far back in history**."
**Source:** [Lovable — Revert and restore your project with version history](https://docs.lovable.dev/features/projects/history). **Support:** direct evidence. **Confidence:** high. Note the explicit refusal to keep unbounded history: old versions remain *viewable* but not *restorable*.

**3.5 Cursor — the agent runs while you type; the product distinguishes *queued* from *steering*, and rollback is per-turn.**
Checkpoints: "Agent automatically creates them before making significant changes, capturing the state of all modified files. If Agent takes a wrong turn, click any checkpoint in the chat timeline to preview your files at that point, then restore to revert all files to that state. You can also restore from the `Restore Checkpoint` button on previous requests or the + button when hovering over a message. **Restoring a checkpoint reverts files only; it does not remove messages from the conversation.**" Mid-run input: "While Agent is working, type your next instruction. Press Enter to add it to the queue… Agent processes them sequentially after finishing." vs "Press Cmd+Enter… to send immediately, bypassing the queue." Steering: "Type a follow-up and hit **Send now**, or press Enter twice. The message is delivered at the agent's next tool call instead of cutting off work mid-action, which preserves in-flight work and keeps the agent on task… Press Tab to queue the message for after the turn instead."
**Source:** [Cursor Docs — Agent Overview](https://cursor.com/docs/agent/overview). **Support:** direct evidence. **Confidence:** high. This is the best published model for "what happens when the reviewer types while the agent works": queue vs steer, with the default being *queue*.

**3.6 Devin — conversational session; no per-element regeneration documented.**
Devin is "designed to be a conversational user interface, and allows you to follow and take over Devin's development process in the embedded IDE." Outputs are PRs; the recommended workflows are delegating a task and "taking over in Devin's IDE once it gives you a good first draft". No per-element or per-region regenerate control is documented on the pages fetched.
**Source:** [Devin Docs — Introducing Devin](https://docs.devin.ai/). **Support:** direct evidence for the conversational/IDE-takeover model; **absence of evidence** for per-target regeneration. **Confidence:** medium (I could not fetch a dedicated session/iteration docs page — `docs.devin.ai/essential-guidelines/sessions` 404'd).

**3.7 Claude — artifacts are updated conversationally, and Claude Code artifacts update *in place, live*.**
"Claude can share substantial, standalone content with you in a dedicated window separate from the main conversation." Claude Code: "Claude Code can publish its session output as an artifact—a live, interactive page at a private URL. **The page updates in place as your session continues**, and you can share it with people in your organization." Error recovery: "If an artifact generates an error, look for the '**Try fixing with Claude**' button near the error message. Click the button to automatically copy the error details into a new message, then send it to Claude to diagnose the issue and suggest a fix." Artifacts are indexed in an **Artifacts** section of the sidebar.
**Source:** [Anthropic Support — What are artifacts and how do I use them?](https://support.anthropic.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them). **Support:** direct evidence. **Confidence:** medium-high. Caveat: the page's "Edit and iterate" subsection body did not extract — see Disclosure.
Researcher inference: "The page updates in place as your session continues" is a *live* artifact with no lock and no notification stage. It works because there is one viewer who is also the driver. It is weak precedent for a two-role review surface.

**3.8 Bolt — only the existence of a version-history concept verified.**
The Bolt help center has a navigation section titled "**Version control and version history** — Understand your options for tracking changes to your project", plus "**Use Plan mode** — Talk through your idea with Bolt before it writes any code" and "**Manage project context**".
**Source:** [Bolt Help Center](https://support.bolt.new/). **Support:** direct evidence of the section titles; **no evidence** for control labels. **Confidence:** low. (`support.bolt.new/version-control/version-history` 404'd; `docs.bolt.new` does not resolve.)

**3.9 Answer to the explicit question: is a reviewer-level regenerate control a real published pattern?**
**Direct evidence, split by product role model:**
- *Multi-role review products (reviewer ≠ author):* no reviewer-side regenerate. GitHub reviewers get `Comment` / `Approve` / `Request changes` and a **`Review changes`** button; request-changes is "purely informational" unless branch protection makes it blocking; the regenerating action belongs to the author's push, or to GitHub Copilot cloud agent which "will respond to your comments when you submit them… will push a new commit to the pull request with further changes." (**Sources:** [Pull request reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews), [Reviewing proposed changes](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request).) Chromatic reviewers can only **Rerun** a build — and a rerun "only captures snapshots for denied, unreviewed, or errored changes", it does not regenerate the artifact. Percy reviewers can **Approve** / **Request changes** / **Finalize to review**. Vercel reviewers can comment and resolve, and that is all.
- *Single-role builder tools (the person pointing = the person who owns the build):* reviewer-side regeneration is not just real, it is *the primary interaction* — Lovable's **Select elements** / **Draw annotation** → chat, Copilot Workspace's **Regenerate** and **Update selected files**, Cursor's **Send now**/queue, v0's per-message version controls.
**Interpretation (researcher inference):** reviewer-level regeneration is a published pattern **conditionally on the reviewer being the author**. No product I found gives a non-author reviewer a control that directly re-runs generation on the artifact. The two published shapes for our situation are (a) an explicit **request-changes handoff** whose payload is the annotations, or (b) collapse the roles so the annotation *is* the instruction, Lovable-style. Our product is a two-pane surface where the reviewer is not the author, so (a) is the safe default and (b) is what our surface partly already looks like. Do not invent a third shape without evidence.

---

### 4. Locking versus live editing

**4.1 Chromatic is the one product that *hard-locks* — and it locks the artifact version, not the surface.**
"Reviewing is only enabled for the latest build on a branch… **Comments are turned off on old builds**… This prevents the situation where different reviewers comment on different versions of the code."
**Source:** [Quickstart FAQ](https://www.chromatic.com/docs/quickstart/). **Support:** direct evidence. **Confidence:** high.
Researcher inference: this is *lock-until-refresh* in a real shipped product, but note the crucial difference from our situation — Chromatic makes a **new build a first-class object** and moves review to it, instead of mutating the reviewed thing under the reviewer. The lock is a consequence of version-scoping, not a separate design choice. **That is the pattern to copy.**

**4.2 Notion deliberately refuses to re-sort under the reader, and tells them how to get fresh state.**
"Comment threads with the most recent reply will appear at the top of the comment pane. **Once you've opened the comment pane, we won't re-sort it with new comments so you can keep working from your current view. If you're working on a page with lots of active discussion, close and re-open the comment pane to see the latest comments.**"
**Source:** [Comments, mentions & reactions in Notion](https://www.notion.com/help/comments-mentions-and-reminders). **Support:** direct evidence. **Confidence:** high. **This is a published, deliberate "freeze the view; the user refreshes" decision** — the closest first-party justification for our current manual-reload behaviour, and it also supplies the missing half: an explicit, documented way to refresh.

**4.3 Figma locks *modes*, not documents.**
"When you're in comment mode, you won't be able to make any changes to objects in the canvas. Press Esc or select another tool to continue editing a file." Comments are otherwise "always visible on the canvas by default, whether or not you're in comment mode", toggleable with `⇧ Shift C`.
**Source:** [View and manage comments](https://help.figma.com/hc/en-us/articles/360041547593-View-and-manage-comments). **Support:** direct evidence. **Confidence:** high.

**4.4 Lovable locks the *unsent* interaction, not the artifact.**
"You can switch modes any time. **If you have unfinished work in the current mode, such as an unsent drawing or an unsaved text change, the other modes are not available until you send or discard your change.**"
**Source:** [Lovable — Edit from the preview](https://docs.lovable.dev/features/preview-toolbar). **Support:** direct evidence. **Confidence:** high. This is the right granularity for us: protect the draft, not the document.

**4.5 Lovable is otherwise fully live during a run, with the pending state *labelled*.**
"You do not have to wait for one change to finish before starting the next. Requests you describe in chat with **Select elements** or **Draw annotation** work like any other message: Lovable picks them up at its next natural stopping point and includes them in the current work. Inline text edits and comment threads you send to Lovable run as their own request after the current task, and **Lovable marks them 'Runs after the current task'**."
**Source:** [Lovable — Edit from the preview](https://docs.lovable.dev/features/preview-toolbar). **Support:** direct evidence. **Confidence:** high. This is the best published example of "continued editing is allowed during a run, and the UI states the queue position of each submitted item."

**4.6 Cursor publishes the same distinction as queue-versus-steer (see 3.5).** Direct evidence, high confidence.

**4.7 Accessibility: WCAG has a *requirement* here, and it favours taking focus over silent mutation.**
SC 4.1.3 Status Messages: "In content implemented using markup languages, status messages can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies **without receiving focus**." Intent: "to make users aware of important changes in content that are not given focus, and to do so in a way that **doesn't unnecessarily interrupt their work**." Definition: "**status message**: change in content that is not a change of context, and that provides information to the user on the success or results of an action, on the waiting state of an application, on the progress of a process, or on the existence of errors."
**Source:** [Understanding SC 4.1.3: Status Messages (W3C WAI)](https://www.w3.org/WAI/WCAG22/Understanding/status-messages). **Support:** direct evidence. **Confidence:** high.
Sufficient techniques: for success/results of an action → **ARIA22** (`role="status"`) possibly + G199; for progress of a process → ARIA22 + G193, **ARIA23** (`role="log"`), **ARIA25**, **ARIA27** (`ariaNotify`). Failure: **F103** — status messages that cannot be programmatically determined. Advisory: "Using `aria-live` regions to support 1.4.13 Content on Hover or Focus"; and the failure "Using `role="alert"` or `aria-live="assertive"` on content which is not important and time-sensitive".
**Sources:** [Understanding SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages), [ARIA22: Using role=status to present status messages](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22), [F103](https://www.w3.org/WAI/WCAG22/Techniques/failures/F103), [MDN: ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions), [MDN: aria-live](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live).
**The two most useful sentences for our design:**
- "**Examples of changes that are not status messages:** An author displays an error message in a dialog. Since the dialog takes focus, it is defined as a **change of context** and does not meet the definition of a status message. As a result of taking focus, the new change of context is already announced by the screen reader."
- "**Modification of status text:** If a status message persists on the page, modifications to this text are usually equivalent to a new status message."
- And the counter-warning: "There is a risk of making an application too 'chatty' for a screen reader user. User testing should be carried out to ensure the appropriate level of feedback is achieved."
**Source:** [Understanding SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages). **Support:** direct evidence. **Confidence:** high.

**4.8 Is lock-until-refresh ever the *recommended* pattern?**
**Direct evidence:** Chromatic ships a hard invalidation on superseded builds (4.1). Notion ships a deliberate freeze-with-a-documented-refresh (4.2). No source found recommends locking the *interactive surface* while work is in flight; the shipped locks are (a) scoped to a version, or (b) scoped to an unsent draft, or (c) scoped to a mode.
**Researcher inference:** the recommendation isn't "lock vs live" — it's "**version-scope the target, keep the surface live, and require an announcement**". WCAG makes the announcement part non-optional if you don't take focus, and explicitly blesses the modal/takes-focus route as an alternative. So "blanket lock until manual reload" is not a published recommendation; "freeze the view, offer an explicit refresh, and announce the new state" is.

---

### 5. Version comparison for feedback

**5.1 GitHub — comparison is a per-reviewer, per-round control placed in the PR header area.**
GitHub's PR UI has a button labelled **"Changes since last review"**: "GitHub's pull request user interface has a handy little button you can click labelled Changes since last review, which—like it says on the tin—will show you the diff of all commits made to a PR since the last time you reviewed it. It's really useful when you review a really big PR and request a han[dful of changes]".
**Source:** [Viewing a pull request's changes since your last review, even in the face of a rebase (practitioner blog)](https://daisy.wtf/writing/github-changes-since-last-review/). **Support:** practitioner source reporting a first-party control. **Confidence:** medium-high. Related first-party-adjacent evidence of the same control and its boundaries: the earlier timeline feature added "a pull request timeline entry for 'New changes since you last viewed' with a link to 'View changes'".
**Source:** [Reviewing a Subset of Commits in a GitHub Pull Request (Make XWP, 2016)](http://make.xwp.co/2016/10/06/reviewing-a-subset-of-commits-in-a-github-pull-request/). **Support:** practitioner source (secondary). **Confidence:** medium.
Known failure modes in the VS Code GitHub extension, which mirror the same control: "Show Changes Since Last Review should not consider pending reviews as 'Last Review'" (issue #6226, milestone Dec 2025, closed) and "Hide merge commits from 'changes since last review'" (issue #4510) — "Whenever changes from `main` are merged into a current working branch, those changes then become noise within the view".
**Sources:** [microsoft/vscode-pull-request-github #6226](https://github.com/microsoft/vscode-pull-request-github/issues/6226), [#4510](https://github.com/microsoft/vscode-pull-request-github/issues/4510), [#5455](https://github.com/microsoft/vscode-pull-request-github/issues/5455). **Support:** direct evidence (issue text). **Confidence:** high for the existence and the noise problem; this is also a practitioner-report channel.
Also: an outdated comment's "View Changes" link is anchored to a commit hash, so a rebase breaks it: "The `View Changes` button on review comments is attached to that particular commit hash, which is no longer in the history for that branch, and you get the dreaded: 'We went looking everywhere, but couldn't find those commits.'"
**Source:** [Github Pull Requests — John Levon's blog](https://movementarian.org/blog/posts/github-prs/). **Support:** practitioner source. **Confidence:** medium. **Researcher inference:** this is direct evidence that a per-item "show me the diff for this comment" affordance is fragile unless the diff is materialised/archived, not recomputed from history.

**5.2 Chromatic — comparison is *per item* first (snapshot vs baseline, side-by-side, with a toggleable highlight), inside a per-round container.**
"Review the changes: The Review screen includes a **Changeset** tab showing a side-by-side view of all visual changes introduced on your head branch. It compares the UI on the head branch to the base branch… Tip: To hint at what UI changed, toggle the highlighted diff (in neon green) on and off." Baseline history is browsable: "When you verify UI Test changes on Chromatic, you'll see a historical set of baselines… This helps you understand when the baseline changed, by who, and in which commit. The snapshot marked 'Most recent build…' is a change that hasn't been accepted as a baseline yet." Ancestor builds are surfaced: "You can see the ancestor builds listed on the build page." Toggles: `1` 1up view, `2` 2up view, `3` toggle diff, `s` switch.
**Sources:** [UI Review](https://www.chromatic.com/docs/review/), [Branches and baselines](https://www.chromatic.com/docs/branching-and-baselines/), [Quickstart](https://www.chromatic.com/docs/quickstart/). **Support:** direct evidence. **Confidence:** high.
Important distinction they publish: "UI tests (shown on the build screen) detect changes between builds, specifically between the last accepted baseline and the latest build… In contrast, UI Review shows the changeset between the latest commit on the PR branch (head) and the 'merge base' (base)."
**Source:** [Quickstart FAQ](https://www.chromatic.com/docs/quickstart/). **Support:** direct evidence. **Confidence:** high.

**5.3 Percy — per-item comparison against a *selected base build*, with a history panel.**
"Compares new screenshots against previously approved ones (baseline) to highlight any unintended visual differences." Base selection is configurable (docs: base build selection / base snapshots selection). History panel filters by `All / Approved / Merged / Unreviewed / Changes requested / Failed / Auto-approved / Rejected`. Snapshots with matching diffs are grouped, and can be approved/rejected as a group.
**Sources:** [Visual Testing with Percy](https://www.browserstack.com/docs/percy/overview/visual-testing-basics), [Percy Build lifecycle](https://www.browserstack.com/docs/percy/visual-testing-workflows/view-percy-build-results/build-lifecycle), [Snapshot grouping with matching diffs](https://www.browserstack.com/docs/percy/visual-testing-workflows/view-percy-build-results/snapshot-grouping-with-matching-diffs). **Support:** direct evidence for the comparison and grouping; I did not fetch the base-selection page itself (see Disclosure). **Confidence:** medium-high.

**5.4 Vercel — no revision-to-revision diff for comments; only provenance.**
The documented affordances are per-comment session info ("**Which deployment they were viewing**") and Inbox filtering by branch/page/status. No side-by-side comment-to-revision comparison is documented.
**Source:** [Managing Comments on Preview Deployments](https://vercel.com/docs/comments/managing-comments). **Support:** absence of evidence. **Confidence:** medium. **Researcher inference:** Vercel's regression is resolved by *deployment identity* — each preview URL *is* a revision, so the comparison is left to the reviewer switching deployment URLs. For a local single-file artifact, we have no equivalent, which is why an explicit revision id matters.

**5.5 Lovable and v0 — comparison is a code diff per version, per round.**
Lovable: "**View code changes**: See exactly which files and lines that version changed, as a diff." v0: "Use the version controls attached to each generated message to inspect a version, **view its diff**, or restore an earlier generation."
**Sources:** [Lovable history](https://docs.lovable.dev/features/projects/history), [v0 Versions](https://v0.app/docs/versions). **Support:** direct evidence. **Confidence:** high.
Researcher inference: both are *code* diffs, not per-annotation answer diffs. Neither product shows "this specific piece of feedback → this specific change". That mapping does not exist in any product I found.

---

### 6. Notifying that a new revision landed

**6.1 GitHub — a timeline entry plus a link, per reviewer, rather than an automatic pane swap.**
"a pull request timeline entry for '**New changes since you last viewed**' with a link to '**View changes**'".
**Source:** [Make XWP, 2016](http://make.xwp.co/2016/10/06/reviewing-a-subset-of-commits-in-a-github-pull-request/) (practitioner, quoting GitHub). **Support:** practitioner/secondary. **Confidence:** medium. Corroborating control name from a second, independent practitioner source: "**Changes since last review**" ([daisy.wtf](https://daisy.wtf/writing/github-changes-since-last-review/)). **Disclosure:** I could not retrieve a first-party GitHub doc stating the banner/banner wording; see Missing evidence.

**6.2 Vercel — a count badge on the surface, plus inbox navigation.**
"A small badge will indicate if any comments have been added since you last checked. You can navigate between threads using the up and down arrows near the top of the inbox." Notifications fire on thread creation, replies, and resolution; channels are Dashboard / Email / Slack, with levels "Never / All / Replies and Mentions"; Slack threads mirror.
**Sources:** [Using Comments with Preview Deployments](https://vercel.com/docs/comments/using-comments), [Managing Comments on Preview Deployments](https://vercel.com/docs/comments/managing-comments). **Support:** direct evidence. **Confidence:** high.

**6.3 Notion — an unread dot, and a documented instruction to refresh manually.**
"There will be a red circle beside it if there are any unread comments." Plus the deliberate non-resort + "close and re-open the comment pane to see the latest comments" (see 4.2). Also: "Re-open any resolved comments from the `Updates` menu at the top right of your page, or in `All Updates` under `Mentions`."
**Source:** [Notion comments help](https://www.notion.com/help/comments-mentions-and-reminders). **Support:** direct evidence. **Confidence:** high.

**6.4 Lovable — a red badge on the mode button for unread replies, and the badge follows the control when the toolbar is hidden.**
"you see a red badge on the **Add a comment** button when there are unread replies. When the preview toolbar is hidden, the comments button moves to the project toolbar at the top of the preview so you can keep seeing threads, replies, and the unread badge."
**Source:** [Lovable preview toolbar](https://docs.lovable.dev/features/preview-toolbar). **Support:** direct evidence. **Confidence:** high.

**6.5 Marker.io and Vercel both notify the *reporter* on resolution, not only on new work.**
Marker.io: "Reporters receive an email notification when an issue is resolved." Vercel: "Participants in a thread will receive a notification when that thread is resolved."
**Sources:** as in 1.13 and 1.14. **Support:** direct evidence. **Confidence:** high.

**6.6 Does any product auto-refresh?**
**Direct evidence:** Claude Code artifacts "update in place as your session continues" — auto, no prompt. Lovable streams changes into the preview as the agent works and lets you keep queueing. Cursor shows agent output streaming live.
**Direct evidence against blanket auto-refresh in multi-role products:** Chromatic invalidates rather than refreshes (comments off on old builds); Notion explicitly freezes the pane; Vercel keeps comments on old deployments with provenance.
**Researcher inference:** the split is by *watcher role*. A single driver watching their own build gets live streaming. A reviewer who is a different person from the author gets either a stale-marked view or an explicit "here is what changed" prompt. Nobody silently replaces the artifact under a reviewer.

**6.7 Accessibility guidance on announcing changed content — see 4.7.**
Summary of the operative guidance: use `role="status"` (`aria-live="polite"`) for "revision N is ready / 6 of 9 addressed"; use `role="log"` (`ARIA23`) if you present it as a sequential activity feed; and it is compliant and often kinder to take focus with a dismissible banner/modal, because a change of context is announced automatically and does not need a live region. Do not use `role="alert"`/`aria-live="assertive"` for this (listed as a failure pattern when the content is not time-sensitive). Verify with user testing: "There is a risk of making an application too 'chatty' for a screen reader user."
**Sources:** [Understanding SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages), [ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22), [MDN live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions). **Support:** direct evidence. **Confidence:** high (for the SC text and techniques); interpretation for the mapping to our specific UI.

---

### 7. Edge-case UX checklist

Each row: the edge case, what named products do (with source), and where they simply do not handle it. Sources are those already cited above unless noted.

| # | Edge case | Published handling | Where it is unhandled |
| --- | --- | --- | --- |
| 1 | Feedback sent, then the target is deleted | **GitLab:** comments persist through force-push/rebase/amend; the thread is auto-resolved when the diff section becomes outdated (2.1, 2.2). **Figma:** deletion of a comment is permanent and is *not* restored by restoring a file version; if the *element* is deleted the anchor is gone but the comment still exists as a pin (1.6). **Chromatic:** comments are turned off on old builds, so a deleted snapshot's discussion is archived-in-place, not resolved (2.5). **Percy:** `Delete build` "Permanently remove the build and its associated snapshots"; snapshot `Rejected` is a distinct state (1.11). | **Vercel:** no documented orphan handling; a comment on a removed element is only diagnosable by session info (2.4). **GitHub:** the outdated thread is *not* dismissed and can still block merge (2.8) — the worst documented outcome. **Nobody** publishes a "your target no longer exists" state. |
| 2 | Feedback sent, then only part of the work changed | **Percy** carries forwards approvals for unchanged snapshots and re-asks for changed ones, per item (2.7). **Chromatic** requires per-snapshot accept/deny but keeps untouched baselines (1.8). **GitLab** resolves only threads whose lines changed and leaves unchanged-line threads open (2.1). **Chromatic UI Review** tracks partial completion via a checklist that must be *fully* complete to pass (1.9). | No product attributes *which* change satisfied *which* item. Percy and Chromatic can only say "this snapshot changed", not "this was your comment about the button". |
| 3 | Two rounds of feedback open at once | **Chromatic** prevents it structurally: only the latest build on a branch is reviewable, comments off on old builds, explicitly "to prevent… different reviewers comment[ing] on different versions of the code" (2.5). **GitHub** allows it and pays for it: a new commit dismisses approvals, and outdated unresolved threads block merge (1.2, 2.8). **Percy** allows it and re-queues unapproved items into newer builds (2.7). | **Nobody** publishes a per-round state machine for two simultaneously open rounds. **Vercel** allows comments on outdated deployments with no reconciliation (2.4). |
| 4 | Reviewer changes their mind on an item already accepted | **Percy:** `Unapprove snapshot` → back to `Unreviewed`; `Unapprove build` cascades; a confirmation modal appears (1.11). **Figma:** uncheck Resolve after toggling "Show resolved comments" (1.6). **GitLab:** `Reopen thread` (1.15). **Notion:** filter `Resolved` → `↪️` (1.16). **Chromatic:** can "revert your acceptance in the dashboard" only if it was on the most recent build (1.12). **v0:** restoring an old version creates a *new* version (3.2). | **Vercel:** no reopen documented (1.14). **Chromatic** for older builds: effectively irreversible (1.12). **Marker.io:** reporter-side status change is an unshipped feature request (1.13). |
| 5 | The agent produced a wrong revision *(or the reviewer's item was answered badly)* | **Cursor:** click a checkpoint in the timeline → preview → restore; "`Restore Checkpoint` button on previous requests"; reverts files but keeps the conversation (3.5). **Lovable:** Revert to this version, with a confirmation and the version date, plus "Edit message → **Revert and resend**" to diverge (3.4). **v0:** restore an earlier generation, which becomes the new latest version (3.2). **Chromatic:** `Rerun` reproduces the build with identical settings (1.8/2.6). **Chromatic UI Tests on the reviewer's side:** `Deny change` fails the build (1.8). **Claude:** "Try fixing with Claude" copies error details into a new message (3.7). | **GitHub:** no reviewer-side re-run of the *agent*; the author or a bot must push (3.9). **Devin:** no documented per-region regeneration (3.6). **No product** lets a reviewer say "re-answer *this one* item" without going through a whole-artifact or whole-branch operation. |
| 6 | Regenerating *without* new feedback | **Chromatic:** `Rerun` "with the same settings as the original build", recapturing only "denied, unreviewed, or errored changes" (2.6). **Chromatic UI Review:** "You can initiate a UI Review at any time." Cursor: an agent turn with no user instruction is a new job; use `/goal` for a long-lived objective (3.5). **Claude Code artifacts:** the page keeps updating as the session continues (3.7). | No product publishes a **reviewer-initiated, feedback-free regeneration** control. Every re-run is framed as reproduction or as a fresh agent turn. |
| 7 | Abandoning a round | **GitHub:** dismiss a review, "you must add a comment explaining why you dismissed it"; require write access (1.5). **GitLab:** "Resolve all with new issue" closes every open thread and links out; locking a discussion is possible and "You must unlock all locked discussions in closed issues or merge requests before you can reopen"; per-object comment cap of 5,000 (1.15). **Chromatic:** "Step #3 is not required if you would like to close the Review." **Marker.io:** `Closed` is a terminal state distinct from `Resolved` (1.13). **Lovable:** the Revert button is disabled with tooltip "**Cannot revert this far back in history**" — an explicit, honest refusal (3.4). | No product publishes an "abandon round / discard unsent batch" affordance for a review *in progress*, separate from closing it. |
| 8 | Long-running session with hundreds of items | **GitLab:** max 5,000 comments per object; "Open threads" counter; bulk `Resolve all with new issue`; activity filters "Show all activity / Show comments only / Show history only"; sort order persisted (1.15). **Chromatic:** keyboard shortcuts (`⌥←`/`⌥→` next/previous, `a` accept, `d` deny, `1`/`2`/`3` views) (1.8). **Percy:** automatic grouping of matching diffs and one-click group approve/reject; history filters (1.11, 5.3). **Figma:** pins collapse into **clusters** as you zoom; sidebar search/sort/filter (`Sort by unread`, `Only your threads`, `Only current page`, `Show resolved`); rate limit "up to 100 comments per hour" (1.6). **Vercel:** Inbox with keyboard navigation between threads; filters by author/status/project/page/branch; search with `*` wildcard (1.14). **Notion:** filter by person or status; "comment threads with the most recent reply will appear at the top". | **No product** documents an aggregation affordance for "show me only the 4 items that are still unanswered out of 300". The nearest is GitLab's Open threads counter and Chromatic's checklist. Nobody publishes a performance or virtualisation story. |

**7.9 Cross-cutting observation (researcher inference):** every one of these eight cases is answered by exactly one thing — a stable per-item identity plus a stable per-round identity. Products that have both (Percy snapshots + builds, GitLab threads + MRs, Chromatic snapshots + builds/Reviews) handle all eight honestly. Products missing one (Figma: per-thread yes, per-version no; Vercel: per-thread yes, per-revision no) degrade to provenance metadata and manual diagnosis. Our surface currently has neither.

---

## Contradictions

1. **GitHub runs two incompatible staleness models in one product.** Approvals are per-round and destroyed by a code-modifying push (1.2). Conversations are per-thread, resolvable/reopenable, and an *outdated* thread is neither resolved nor dismissed and can still block merge (1.4, 2.8). Sources: [Reviewing proposed changes](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request), [Commenting on a pull request](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/commenting-on-a-pull-request), [stackoverflow 71946575](https://stackoverflow.com/questions/71946575/after-rebase-and-force-push-unresolved-conversations-remain-outdated-and-block). I am recording this rather than resolving it: it is evidence that a single lifecycle model is not adequate for two different kinds of feedback (a verdict vs a request). Both our product's annotation types need to be classified before a lifecycle is chosen.

2. **"Carry feedback forward" is implemented with two different keys.** Percy carries an approval forward while the *content* is identical (2.7). Chromatic keeps baselines across branches and merges but re-asks per changed snapshot (1.8, 1.9, 1.12). Both are described as "you only accept once", but the trigger for re-asking differs (content identity vs build identity). Sources: [Percy approval](https://www.browserstack.com/docs/percy/visual-testing-workflows/view-percy-build-results/approval), [Chromatic baselines](https://www.chromatic.com/docs/branching-and-baselines/).

3. **Marker.io describes its statuses as both a pipeline and explicitly non-linear.** "Open → In Progress → Waiting for Approval → Resolved → Closed" versus "statuses are not strictly linear. You can move issues between statuses as needed." Source: [Issue Statuses](https://help.marker.io/en/articles/13645268-issue-statuses). Minor, but it shows vendors present a linear diagram while shipping free transitions.

4. **Locking: Chromatic hard-disables review on superseded builds, while Figma, Notion, Vercel and Lovable all allow concurrent commenting on a live document.** No source reconciles these. Sources: [Chromatic Quickstart](https://www.chromatic.com/docs/quickstart/), [Figma view/manage comments](https://help.figma.com/hc/en-us/articles/360041547593-View-and-manage-comments), [Notion](https://www.notion.com/help/comments-mentions-and-reminders), [Vercel](https://vercel.com/docs/comments/using-comments), [Lovable](https://docs.lovable.dev/features/preview-toolbar). Researcher inference on why: Chromatic's reviewed object is *generated by a build* and is immutable, so version-scoping is free; the others' reviewed objects are live documents where version-scoping is expensive. Our artifact is generated by the agent, so Chromatic's economics apply, not Figma's.

5. **Who closes an item is genuinely unsettled across the industry.** GitHub: author or write-access holder (1.3). GitLab: any Developer/Maintainer/Owner or the item author (1.15). Figma/Notion/Vercel: anyone (1.6, 1.14, 1.16). Chromatic: any reviewer, and "you can't prevent people from auto-approving their own review" (1.9). Marker.io: the agency closes; letting the reporter close is an unshipped request (1.13). Percy: "the [AI plugin] reviews each build, recommends an approve or reject, and gates the merge, with your confirmation on every decision" (1.10). **The only convergent rule is: the *agent* never closes without human confirmation.**

---

## Missing evidence

- **Linear preview-comment lifecycle.** Not verified. No primary Linear documentation was retrievable (search providers exhausted/rate-limited for the Linear queries).
- **Userback lifecycle.** Not verified. `help.userback.io` did not resolve (DNS).
- **BugHerd lifecycle.** Not verified. `help.bugherd.com` did not resolve (DNS). Only marketing pages were fetched; the Kanban/task-tracking claim is from marketing copy.
- **Bolt version history controls.** Not verified. `docs.bolt.new` does not resolve; `support.bolt.new/version-control/version-history` returned HTTP 404. Only the help-center navigation section title "Version control and version history" was confirmed.
- **GitLab's exact UI string for an outdated thread.** The *mechanism* is confirmed first-party ("Automatically resolve merge request diff threads when they become outdated"; "Threads are now resolved if a push makes a diff section outdated"), but I could not confirm the exact rendered badge/label (e.g. whether a thread literally reads "resolved as outdated") from a primary GitLab doc page in this run. **Labelled as: mechanism verified, wording unverified.**
- **GitHub's first-party wording and placement for the "new commits mid-review" prompt.** The control "Changes since last review" is reported by two independent practitioner sources and by the VS Code extension's own issue tracker, but I could not locate a first-party GitHub doc page stating the banner text, its position, or whether the Files changed tab auto-refreshes. **Labelled as: practitioner-sourced, placement unverified.**
- **GitHub "dismiss stale pull request approvals" definition of "reviewable commit".** GitHub's own docs and a Stack Overflow thread disagree/are unclear on whether rebases and non-conflicting rebases count. Sources: [SO 74200763](https://stackoverflow.com/questions/74200763/using-github-branch-protection-how-does-github-define-a-stale-pull-request-appr), [community #109549](https://github.com/orgs/community/discussions/109549). Unresolved.
- **Chromatic's "revert your acceptance in the dashboard" control.** The capability is stated first-party but I did not find its exact label or location.
- **Percy base-build / base-snapshot selection page.** Referenced throughout the approval docs; I did not fetch it, so the exact base-selection control names are unverified.
- **ChatGPT canvases / artifacts iteration controls.** Not researched — no primary source retrieved within budget. Not claimed.
- **Any published "notification that a new revision landed" pattern specific to agent products other than Claude Code's in-place update.** None found.
- **Any product that maps a specific reviewer annotation to the specific change that answered it.** None found. I believe this capability does not exist in the products surveyed, but that is absence of evidence, not proof.
- **Vercel "unresolve".** Not documented; I could not confirm whether it exists in the UI but is undocumented. Stated as absence of *documentation* only.
- **Mixed-character verdict:** several items above rest on practitioner blogs, forums, and issue trackers rather than vendor/design-system documentation. Those are individually labelled in-line; see the Disclosure section for the consolidated list.

---

## Sources

**Kept**
- GitHub — [Pull request reviews](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews); [Reviewing proposed changes in a pull request](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request); [Commenting on a pull request](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/commenting-on-a-pull-request); [Dismissing a pull request review](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/dismissing-a-pull-request-review); [Security enhancements to required approvals on pull requests](https://github.blog/changelog/2023-06-06-security-enhancements-to-required-approvals-on-pull-requests/). *Why: the only first-party, fully-documented example of a two-level lifecycle (per-review verdict + per-thread conversation) with an explicit stale-dismissal mechanism.*
- GitLab — [Comments and threads](https://docs.gitlab.com/user/discussions/); [Merge requests](https://docs.gitlab.com/user/project/merge_requests/). *Why: the only first-party "automatically resolve threads when they become outdated" mechanism, with the crucial exemption rule for unchanged lines and top-level threads.*
- Chromatic — [Quickstart](https://www.chromatic.com/docs/quickstart/); [UI Review](https://www.chromatic.com/docs/review/); [Branches and baselines](https://www.chromatic.com/docs/branching-and-baselines/); [Rerun builds](https://www.chromatic.com/docs/rerun-builds/). *Why: the only product that publishes both a per-item accept/deny lifecycle and a per-round Review checklist, plus an explicit rationale for disabling review on superseded builds.*
- Percy / BrowserStack — [Approval Workflow](https://www.browserstack.com/docs/percy/visual-testing-workflows/view-percy-build-results/approval); [Build lifecycle](https://www.browserstack.com/docs/percy/visual-testing-workflows/view-percy-build-results/build-lifecycle); [Visual Testing with Percy](https://www.browserstack.com/docs/percy/overview/visual-testing-basics). *Why: content-identity carry-forward is the strongest published answer to "should my old feedback still be shown?", and reversibility (unapprove/unmerge) is fully documented.*
- Figma — [View and manage comments](https://help.figma.com/hc/en-us/articles/360041547593-View-and-manage-comments); [Add comments to files](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files); [Comment on prototypes](https://help.figma.com/hc/en-us/articles/360039824594-Comment-on-prototypes); [Add comments in Figma Make](https://help.figma.com/hc/en-us/articles/38701587731735-Add-comments-in-Figma-Make). *Why: the reference implementation of geometric anchoring (comments follow frames) and of per-thread resolve/unresolve with a resolved filter.*
- Lovable — [Edit from the preview](https://docs.lovable.dev/features/preview-toolbar); [Revert and restore your project with version history](https://docs.lovable.dev/features/projects/history). *Why: the closest published analogue to our surface — point-at-element + annotate + comment, per-target scoped regeneration, labelled pending state, per-version history with diffs and confirmed reverts.*
- GitHub Copilot Workspace user manual — [tips-and-tricks.md](https://github.com/githubnext/copilot-workspace-user-manual/blob/main/tips-and-tricks.md); [overview.md](https://github.com/githubnext/copilot-workspace-user-manual/blob/main/overview.md); [vscode.md](https://github.com/githubnext/copilot-workspace-user-manual/blob/main/vscode.md). *Why: named, exact regeneration controls (`Regenerate`, `Update selected files`) and the clearest statement that the author owns regeneration.*
- Cursor — [Agent Overview](https://cursor.com/docs/agent/overview). *Why: the best published model for reviewer input arriving mid-run (queue vs steer) and for per-turn rollback (checkpoints).*
- v0 — [Versions](https://v0.app/docs/versions). *Why: per-message version controls, linear history, and "restore creates a new version".*
- Notion — [Comments, mentions & reactions](https://www.notion.com/help/comments-mentions-and-reminders). *Why: the only deliberate first-party "we will not re-sort under you; refresh to see new" statement, plus per-thread resolve/reopen.*
- Vercel — [Using Comments with Preview Deployments](https://vercel.com/docs/comments/using-comments); [Managing Comments on Preview Deployments](https://vercel.com/docs/comments/managing-comments). *Why: names the outdated-deployment problem and shows the provenance-not-invalidation mitigation.*
- Marker.io — [Issue Statuses](https://help.marker.io/en/articles/13645268-issue-statuses); [Status Sync](https://help.marker.io/en/articles/5096332-status-sync); [Introducing In Progress and Waiting for Approval statuses](https://marker.io/blog/introducing-in-progress-and-waiting-for-approval-statuses). *Why: a shipped awaiting-reviewer state ("Waiting for Approval") and reporter notification on resolution.*
- W3C WAI — [Understanding SC 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages); [ARIA22](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22); [F103](https://www.w3.org/WAI/WCAG22/Techniques/failures/F103). MDN — [ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions); [aria-live](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live). *Why: the only authoritative, normative guidance on announcing that content changed, including the explicit blessing of the takes-focus route.*
- Anthropic Support — [What are artifacts and how do I use them?](https://support.anthropic.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them). *Why: "the page updates in place as your session continues" is the clearest published example of a live, unlocked artifact — and of why that only works for a single driving user.*

**Practitioner sources retained, labelled as such (not design-system or vendor docs)**
- [Daisy Leigh Brenecki — Changes since last review](https://daisy.wtf/writing/github-changes-since-last-review/) — for the existence of GitHub's control name.
- [Make XWP — Reviewing a Subset of Commits in a GitHub PR](http://make.xwp.co/2016/10/06/reviewing-a-subset-of-commits-in-a-github-pull-request/) — for the 2016 timeline entry wording.
- [The Outdated Comment That Wouldn't Die](https://jonroosevelt.com/blog/the-outdated-comment-that-wouldn-t-die/) and [Stack Overflow 71946575](https://stackoverflow.com/questions/71946575/after-rebase-and-force-push-unresolved-conversations-remain-outdated-and-block) and [GitHub community #19206](https://github.com/orgs/community/discussions/19206) — for the outdated-thread-blocks-merge failure mode.
- [GitHub PR "View Changes" link breaks after rebase — John Levon](https://movementarian.org/blog/posts/github-prs/) — for the commit-hash-anchored diff fragility.
- [microsoft/vscode-pull-request-github #6226](https://github.com/microsoft/vscode-pull-request-github/issues/6226), [#4510](https://github.com/microsoft/vscode-pull-request-github/issues/4510), [#5455](https://github.com/microsoft/vscode-pull-request-github/issues/5455) — for concrete failure modes of "changes since last review".
- [pbench discussion #2113](https://github.com/distributed-system-analysis/pbench/discussions/2113) — for the "nobody knows who closes it" problem.
- [Marker.io Canny feature request](https://marker-io.canny.io/feature-request/p/allow-guest-to-change-feedback-status) — evidence about who closes in shipped Marker.io.
- [BugHerd marketing pages](https://bugherd.com/use-case/markup-tool) — only for the Kanban/task claim; docs unreachable.

**Rejected / deprioritised**
- `medium.com`, `rapidevelopers.com`, `learncursor.dev`, `setuproll.com`, `developertoolkit.ai`, YouTube tutorials on Lovable/v0/Cursor — third-party restatements of vendor behaviour with no added first-party evidence. Consulted only to *find* the vendor docs they cite; every retained claim was re-sourced to the vendor page.
- `refined-github` issue #3966, GitHub community #130618 and #7638 — feature requests about hiding resolved/unresolved comments. Useful only as evidence that the default is "resolved comments remain visible"; not otherwise relied on.
- `v0docs.vercel.sh`, `api2.v0.dev`, `open-vsx.org` mirrors — duplicate/stale mirrors of v0 and extension docs.
- `chromatic.com/blog/rerun-builds-in-one-click` — superseded by the first-party [Rerun builds](https://www.chromatic.com/docs/rerun-builds/) doc, which is what I cite.
- BugHerd and Userback docs — marked rejected for this run because they could not be reached at all, not because they were judged weak.

---

## Discovery approach taken

1. **Direct-answer + authoritative-source pass** on the staleness mechanisms (GitHub stale dismissal/outdated, GitLab resolved-as-outdated, Chromatic/Percy accept semantics).
2. **Practical/precedent pass** on annotation surfaces and comment lifecycles (Figma, Notion, Vercel, Marker.io, BugHerd).
3. **Agent-product pass** on regeneration affordances and mid-run input (Copilot Workspace, v0, Lovable, Cursor, Devin, Claude artifacts).
4. **Normative pass** on announcing changed content (WCAG 4.1.3, ARIA22, ARIA23, MDN live regions).

## Next steps

Only the highest-value follow-ups remain:

1. **Verify GitHub's first-party mid-review prompt.** Search GitHub Docs and the GitHub changelog for the Files-changed banner text and whether the tab auto-refreshes, so we can cite it directly instead of via practitioner blogs. This is the one mechanism most directly comparable to our "a new revision landed" banner.
2. **Fetch `help.bugherd.com` and `help.userback.io`** (from an environment where those hostnames resolve) to close the weakest section of the annotation-tool comparison — specifically whether they reopen resolved items and who may close one.
3. **Fetch Linear's preview-comment docs** if they exist (Linear had no reachable primary doc in this run); Linear was named in the brief and is currently an acknowledged gap.
4. **Confirm whether Bolt and Lovable expose a reviewer-visible "what changed since your last pass" view.** If neither does, that strengthens the case that this capability belongs to git-shaped tools (GitHub, Chromatic, Percy) and must be built explicitly for a file-based artifact.
5. **Accessibility validation by test, not by reading.** WCAG text tells us what is *permissible*; it does not tell us what is *tolerable*. The 4.1.3 note ("There is a risk of making an application too 'chatty'") should be resolved with a screen-reader walkthrough of the proposed revision banner.

---

## Disclosure

**JS-rendered, truncated, or unfetchable pages**
- `https://help.figma.com/hc/en-us/articles/360039825614-Review-and-resolve-comments` — HTTP 404 (superseded URL). Replaced by the "View and manage comments" article.
- `https://help.figma.com/hc/en-us/articles/360039825614-Comment-on-designs` — HTTP 404 (superseded URL).
- `https://www.browserstack.com/docs/percy/workflows/visual-reviews` — HTTP 404 (superseded URL).
- `https://vercel.com/docs/deployments/comments` — HTTP 404 (superseded URL). Current pages are `/docs/comments/*`.
- `https://github.blog/changelog/2022-05-11-ability-to-dismiss-stale-reviews-and-comment-on-a-dismissed-review/` — HTTP 404 (guessed changelog URL; not cited).
- `https://docs.devin.ai/essential-guidelines/sessions` — HTTP 404 (guessed URL). Devin evidence is limited to the introduction page.
- `https://docs.bolt.new/` — hostname does not resolve. `https://support.bolt.new/version-control/version-history` — HTTP 404. `https://docs.lovable.dev/features/visual-edits` — HTTP 404 (superseded by `preview-toolbar`).
- `https://help.bugherd.com/en/` and `https://help.userback.io/...` — DNS resolution failure (`ENOTFOUND`). No BugHerd or Userback lifecycle evidence was obtainable.
- `https://support.anthropic.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them` — fetched, but the "Edit and iterate" subsection extracted as a heading with **no body text**. The page appears to be partially JS-rendered or the extraction dropped collapsible content. **I therefore cannot verify Claude's specific "edit and iterate" controls**; the artifact claims I do make are from the subsections that did extract ("View and export", the Claude Code paragraph, "Fixing errors").
- `https://code.claude.com/docs/en/artifacts` and `https://support.claude.com/en/articles/14729249` (Cowork artifacts) — referenced by the Anthropic page but not fetched.

**Search-provider limitations affecting coverage**
- Exa hit its free MCP rate limit repeatedly (HTTP 429), returning no results for a majority of the queries attempted.
- Brave, Tavily, OpenAI, and SearXNG were unavailable (no API key / no base URL configured).
- No other provider was specified, so the effective coverage was intermittent Exa plus direct page fetches. **Mitigation:** I compensated by fetching first-party documentation pages directly and reading exact quoted passages, which is stronger evidence than search summaries. The cost is that several products named in the brief (Linear, BugHerd, Userback, Bolt's controls, ChatGPT canvas) have genuine coverage gaps rather than weak claims.

**Claims resting on practitioner sources rather than design systems or vendor docs**
1. GitHub's control name **"Changes since last review"** and its placement — daisy.wtf blog; corroborated by `microsoft/vscode-pull-request-github` issue titles (which are themselves a vendor-adjacent repo but not GitHub Docs).
2. The 2016 GitHub timeline entry wording **"New changes since you last viewed" / "View changes"** — Make XWP blog quoting GitHub.
3. **"Outdated threads still block merge"** — jonroosevelt.com blog, Stack Overflow, and GitHub community discussions (which are user discussions on github.com, not product documentation).
4. **"The `View Changes` link on a review comment breaks after a rebase"** — John Levon's blog.
5. **Who is supposed to resolve a conversation** — pbench project discussion.
6. **BugHerd's Kanban/task-tracking behaviour** — BugHerd marketing pages.
7. **Marker.io's "reporter cannot close" status** — a Canny feature request, i.e. evidence that the capability was requested, not that it shipped or did not ship.

**Researcher inferences explicitly labelled in-line (not stated by any source)**
- That Figma has no staleness model because it has no revision identity to compare against (§2.3).
- That Percy keys carry-forward on content identity rather than round identity (§2.7).
- That Chromatic's lock is a consequence of version-scoping rather than a separate design decision, and that this economics argument transfers to our generated artifact (§4.1, Contradictions #4).
- That GitHub's two coexisting staleness models imply feedback must be *classified* (verdict vs request) before a lifecycle is chosen (Contradictions #1).
- That Vercel's regression is mitigated by deployment identity substituting for revision identity (§5.4).
- That no product maps a specific annotation to the specific change that answered it (§5.5, 7 row 2).
- That the industry split on auto-refresh is by watcher role: a single driver gets live streaming; a separate reviewer never gets a silent replacement (§6.6).
- That every edge case in §7 reduces to stable per-item and per-round identity (§7.9).
- That Lovable's reviewer-side regeneration works because the pointer and the builder are the same person, and therefore does not transfer unmodified to a two-role surface (§3.9).
- The recommended lifecycle, the three highest-risk edge cases, and the "single most important omission" in the summary are all researcher recommendations, not sourced guidance.

**Validation limitation**
I did not use a claim-checking validation tool against fetched source content; `source_check` was not available as a registered tool in this run. All quotes above were read directly from the fetched page text and are reproduced verbatim, but they have not been independently machine-verified against the live pages. Anything labelled "medium" or "low" confidence, and every practitioner-sourced item, should be re-read at the cited URL before being acted on.

---
name: Save-flow test timing
description: Why a "button is disabled" e2e failure on a save/mutation flow can be a false positive, and how to verify correctly.
---

# Save/mutation flow e2e verification

A FlipScan e2e test reported the "Save Item" button as permanently `[disabled]`,
blocking the flow. Root cause was a **test-timing false positive**: the button is
`disabled={mutation.isPending}`, and the agent re-checked it during the brief
in-flight window right after clicking.

**Why:** In TanStack Query v5, a `useMutation` starts in status `"idle"`
(`isPending = status === "pending"` → false at idle). The button is enabled until
clicked, disabled only while the POST is in flight, then re-enabled. Observing
`disabled` mid-flight is expected, not a bug.

**How to apply:** When verifying save/submit flows, assert the *outcome*
(success toast, item persisted on a list/detail page, network 201) — not the
transient `disabled` attribute. A disabled button observed right after a click is
normal in-flight state. Confirm `isPending` semantics from the installed source if
unsure: query-core `mutationObserver.js` derives `isPending` from `status`.

# 07: Writing survives reload, service restart and browser restart

**What to build:** An unsent draft outlives the three ways a run can lose it — a surface reload, a service restart and a browser restart — driven and read back rather than assumed.

**Blocked by:** 04 (Compose, queue and send an Annotation)

**Status:** done

- [x] An unsent draft survives a surface reload and is readable afterwards
- [x] An unsent draft survives a service restart and is readable afterwards
- [x] An unsent draft survives a browser restart and is readable afterwards
- [x] Escape unwinding does not discard unsent writing, and the unwinding order is observable
- [x] Each survival is established by reading the state back, not by the absence of an error
- [x] The Lever can restart the service and the browser without losing the run's evidence or its isolation
- [x] `never-discard-writing` exists in the feature map with the four required sections, its preconditions, and the exact commands actually used
- [x] The Lever's contract test gains this drive

## Comments

Draft survival across surface reload, service restart and browser restart is driven live, including an Escape before the restarts, with stored-state read-back each time. `never-discard-writing.md` maps the feature.

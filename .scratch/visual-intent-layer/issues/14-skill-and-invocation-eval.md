# 14: Teach the loop with a thin Skill and invocation eval

**What to build:** Agents learn when visual direction beats prose and how to run the loop's lifecycle and fallbacks, while explicit use keeps working with no Skill installed.

**Blocked by:** 11 (Make Draft and Next-Pass Intent durable and idempotent), 12 (Negotiate host capabilities with an honest browser fallback)

**Status:** done

- [x] A thin Skill teaches when visual direction beats prose plus the lifecycle and fallback policy without duplicating tool schemas
- [x] Explicit invocation works from the tool description alone with no Skill installed
- [x] An invocation eval covers explicit requests, clear spatial tasks, ambiguous visual tasks, and negative cases where plain chat stays faster

## Comments

Implemented (implemented in 8b70d52): thin skill/skill.md (judgment only, no schema duplication), invocation policy + 10-scenario eval across explicit/spatial/ambiguous/negative (src/eval/, 10/10), explicit invocation works from tool descriptions alone (protocol tests).

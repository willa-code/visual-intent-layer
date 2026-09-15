# 12: Negotiate host capabilities with an honest browser fallback

**What to build:** The product detects what each host actually supports, degrades with explicit labels, and treats the local browser as the complete first-class experience when embedding is unavailable.

**Blocked by:** 11 (Make Draft and Next-Pass Intent durable and idempotent)

**Status:** ready-for-agent

- [ ] Host support for embedded UI, steering, and subscriptions is detected, and unsupported behavior degrades with explicit labels
- [ ] The local browser delivers the complete interaction as a first-class experience when the host cannot embed the view
- [ ] The embedded view is used only on hosts that declare and implement the capability

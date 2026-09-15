# Keep the initial data plane local and application support bounded

**Status:** amended by ADR-0015

The initial product will review saved local HTML and applications served from local development servers, persist review state locally, disclose the evidence included in each outgoing Visual Intent Envelope, and perform no implicit cloud upload. Arbitrary authenticated production applications are excluded initially because supporting their origins, sessions, private data, and security boundaries would require a substantially different browser architecture.

**Amendment (ADR-0015):** Bounded application support now includes reverse-proxying a local development server through the review service's own origin so its DOM is selectable, and a reviewed artifact may contact its own declared remote stylesheet, font and image origins so that an artifact depending on a CDN renders as designed. Runtime data fetches remain blocked, the data plane remains local, no artifact, evidence or intent is uploaded implicitly, and authenticated production applications stay excluded. The security documentation must record the proxy scope and the remote-origin policy, and the surface must disclose remote-origin contact before it happens.

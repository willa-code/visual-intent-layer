# 04: Give the proxied application a policy that lets it work

**What to build:** A running application served through the review origin carries
a content policy that permits the application to work, is stated to the
Builder-Reviewer, and is documented separately from the saved-HTML policy.

**Status:** done

- [x] The proxied document carries a content policy rather than none
- [x] The policy permits the application's own requests through the proxied origin, because a running application cannot work with `connect-src 'none'`
- [x] The policy does not permit origins the application has not declared, and the surface's disclosure states what is permitted
- [x] The saved-HTML policy is unchanged, and the two policies are visibly different in the code rather than one function wearing two names
- [x] `SECURITY.md` describes the saved-HTML policy and the proxied-application policy separately, and no longer claims one policy for "rendered artifacts"
- [x] A refused origin still fails closed: an application that reaches outside its declaration is blocked, not silently allowed

## Comments

The `text/html` branch of `serveAppProxy` sets only `content-type` and `nosniff`
(`src/service/http.ts:1078-1084`), while `SECURITY.md:44-48` states that rendered
artifacts run with `connect-src 'none'` and `form-action 'none'`. The claim is true
of saved HTML and false of a proxied application.

This is the honesty repair behind ADR-0020's consequence that application support
stops being a mode the product claims and becomes an artifact type whose evidence
has to be proved.

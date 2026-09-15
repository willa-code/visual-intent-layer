# 11: Attach a reference image to an Annotation

**What to build:** An image can be added to an Annotation by picking a file, pasting, or dropping it, and it travels with the Annotation when it is sent. Each image shows as a chip with its own upload, ready, remove, retry and error states.

**Blocked by:** 04 (One Annotation, end to end)

**Status:** done

- [x] An image can be added by picker, by paste and by drop, and removed before sending
- [x] An image is stored and identified by its own bytes rather than by a name supplied by the surface
- [x] A chip shows uploading, ready, failed and retry states, and a refused file says why
- [x] An attachment is delivered with its Annotation
- [x] An oversized or disallowed file is refused visibly and its bytes are never read
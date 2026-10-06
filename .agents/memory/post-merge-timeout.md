---
name: Post-merge setup timeout
description: Runtime constraint for dependency installation and development database schema checks after merges.
---

Keep the post-merge timeout at 180 seconds or higher. A cold workspace install followed by Drizzle schema introspection can outlast shorter limits.

**Why:** The previous 20-second default and a 120-second retry both timed out; a subsequent run completed successfully in about 97 seconds.

**How to apply:** Preserve this margin when changing the post-merge script or its configuration, and avoid concurrent setup runs.
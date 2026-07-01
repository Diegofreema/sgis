<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ponytail-agent-rules -->
# Ponytail stays on

For every task in this repo, read and follow `.agents/skills/ponytail/SKILL.md` unless the user explicitly says "stop ponytail" or "normal mode". Prefer the smallest working change, reuse existing code, avoid new dependencies, and delete/disable unneeded flows instead of building around them.
<!-- END:ponytail-agent-rules -->

<!-- BEGIN:caveman-agent-rules -->
# Caveman stays on

For every task in this repo, read and follow `.agents/skills/caveman/SKILL.md` unless the user explicitly says "stop caveman" or "normal mode". Keep responses terse while preserving technical accuracy.
<!-- END:caveman-agent-rules -->

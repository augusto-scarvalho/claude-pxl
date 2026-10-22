#!/bin/bash
# One run of a model study (docs/model-study.md): the brief on stdin to a new headless agent session
# in a folder of its own, with the skill as it is installed; what it made stays there, with its start
# and end times and what the agent reports of it.
#
#   scripts/model-study.sh <brief.txt> <runs folder> <model> <effort> [claude|codex]
#
# claude (the default): Claude Code, its result as result.json (turns, cost, tokens, the session's id
# for scripts/tokens.ts). codex: the Codex CLI, its events as events.jsonl (each turn's token usage)
# and its last message as last.txt, in its workspace-write sandbox (only the run's folder writable).
# agy: Antigravity's CLI, the model named with its effort (gemini-3.8-flash and high run
# gemini-3.8-flash-high), its result as result.json (turns, tokens), every tool call approved.
#
# e.g. a few at once:
#   for c in "opus high" "opus medium" "sonnet xhigh"; do scripts/model-study.sh brief.txt runs $c & done; wait
#   scripts/model-study.sh brief.txt runs gpt-6.1-sol high codex
#   scripts/model-study.sh brief.txt runs gemini-3.8-flash high agy
set -u
[ $# -ge 4 ] || { echo "usage: scripts/model-study.sh <brief.txt> <runs folder> <model> <effort> [claude|codex|agy]" >&2; exit 1; }
agent=${5:-claude}
brief=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
dir="$2/$3-$4"
pxl=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$dir" && cd "$dir" || exit 1
# the pxl the agent reads (the skill links to this repository): its commit, and whether it had changes
# not yet committed, so runs on different days can be told apart
git -C "$pxl" log -1 --format="%h %ad %s" --date=iso > pxl.txt
git -C "$pxl" diff --quiet HEAD -- SKILL.md '*.md' src bin types examples || echo "uncommitted changes" >> pxl.txt
date +%s > start.txt
if [ "$agent" = codex ]; then
  codex exec -m "$3" -c model_reasoning_effort="$4" -c approval_policy=never --sandbox workspace-write --skip-git-repo-check --json -o last.txt - < "$brief" > events.jsonl 2> err.txt
elif [ "$agent" = agy ]; then
  agy -p "$(cat "$brief")" --model "$3-$4" --effort "$4" --mode auto --dangerously-skip-permissions --output-format json > result.json 2> err.txt
else
  claude -p --model "$3" --effort "$4" --output-format json --allowedTools "Bash Read Write Edit Glob Grep Skill" < "$brief" > result.json 2> err.txt
fi
echo $? > exit.txt
date +%s > end.txt

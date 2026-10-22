#!/bin/bash
# One run of a model study (docs/model-study.md): the brief on stdin to a new headless Claude Code
# session in a folder of its own, with the skill as it is installed; what it made stays there, with
# its result as JSON (turns, cost, tokens, the session's id for scripts/tokens.ts) and its start and
# end times.
#
#   scripts/model-study.sh <brief.txt> <runs folder> <model> <effort>
#
# e.g. a few at once:
#   for c in "opus high" "opus medium" "sonnet xhigh"; do scripts/model-study.sh brief.txt runs $c & done; wait
set -u
[ $# -eq 4 ] || { echo "usage: scripts/model-study.sh <brief.txt> <runs folder> <model> <effort>" >&2; exit 1; }
brief=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
dir="$2/$3-$4"
mkdir -p "$dir" && cd "$dir" || exit 1
date +%s > start.txt
claude -p --model "$3" --effort "$4" --output-format json --allowedTools "Bash Read Write Edit Glob Grep Skill" < "$brief" > result.json 2> err.txt
echo $? > exit.txt
date +%s > end.txt

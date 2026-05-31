#!/usr/bin/env bash

# TurApp aliases/functions for current terminal session.
# Usage:
#   source /Users/jonanders/Github/turapp/turapp-aliases.sh

alias turapp='cd /Users/jonanders/Github/turapp'
alias tstatus='cd /Users/jonanders/Github/turapp && git status --short'
alias tdev='cd /Users/jonanders/Github/turapp && npm run dev'
alias tbuild='cd /Users/jonanders/Github/turapp && npm run build'
alias tclean='cd /Users/jonanders/Github/turapp && ./bin/clean-turapp.sh'
alias tzip='cd /Users/jonanders/Github/turapp && ./bin/zip-context.sh'
alias tcheck='cd /Users/jonanders/Github/turapp && ./bin/check-git-safe.sh'
alias ttest='cd /Users/jonanders/Github/turapp && ./bin/test-before-push.sh'
alias tpush='cd /Users/jonanders/Github/turapp && ./bin/safe-push.sh'
alias tosmi='cd /Users/jonanders/Github/turapp && npm run osm:import'
alias tosms='cd /Users/jonanders/Github/turapp && npm run osm:seed'
alias tlog='cd /Users/jonanders/Github/turapp && git log --oneline -8'
alias tdiff='cd /Users/jonanders/Github/turapp && git diff --stat'
alias tstaged='cd /Users/jonanders/Github/turapp && git diff --cached --name-only'

tp() {
  cd /Users/jonanders/Github/turapp || return
  ./bin/safe-push.sh "${1:-Update TurApp}"
}

tc() {
  cd /Users/jonanders/Github/turapp || return
  ./bin/clean-turapp.sh
  git status --short
}

tz() {
  cd /Users/jonanders/Github/turapp || return
  ./bin/zip-context.sh
}

echo "TurApp aliases loaded: turapp, tstatus, tdev, tbuild, tzip, tp"

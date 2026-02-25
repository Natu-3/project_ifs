#!/usr/bin/env sh
set -eu

# Usage:
#   ./runbook/rollback-ec2.sh [target-tag]
# Examples:
#   ./runbook/rollback-ec2.sh sha-1a2b3c4
#   ./runbook/rollback-ec2.sh   # uses .prev_tag

TARGET_TAG="${1:-}"
if [ -z "$TARGET_TAG" ]; then
  if [ -f .prev_tag ]; then
    TARGET_TAG="$(cat .prev_tag)"
  else
    echo "No rollback target. Provide a tag or ensure .prev_tag exists."
    exit 1
  fi
fi

./runbook/deploy-ec2.sh "$TARGET_TAG"

echo "Rollback success: $TARGET_TAG"

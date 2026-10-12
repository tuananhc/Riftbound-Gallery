#!/usr/bin/env bash
# Package the Lambda code and deploy the backend CloudFormation stack.
#
# CI runs this on every push to master (.github/workflows/deploy-backend.yml).
# It also works by hand with admin credentials, e.g. from AWS CloudShell.
# Requires the bootstrap stack (infra/bootstrap.yml) to exist.
set -euo pipefail

# ── This environment's settings ──────────────────────────────────────────────
# Passed explicitly on every deploy: `aws cloudformation deploy` otherwise keeps
# a parameter's previous value, so editing a default in backend.yml would
# silently do nothing.
STACK_NAME="riftbound"
REGION="${AWS_REGION:-ap-southeast-2}"
USER_POOL_ID="ap-southeast-2_kBh9RXo4X"
USER_POOL_CLIENT_ID="3t60375gm00ed0adlmo0mkn896"
USERS_TABLE="Users"
CREATE_USERS_TABLE="false"
MATCH_HISTORY_TABLE="MatchHistory"
ALLOWED_ORIGINS="*" # comma-separated, e.g. "https://example.com,http://localhost:3000"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
CODE_BUCKET="riftbound-artifacts-${ACCOUNT_ID}-${REGION}"
EXEC_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/riftbound-cfn-exec"

# 1. Fail fast on syntax errors, before anything touches AWS.
for f in "$ROOT"/lambda/*.mjs; do node --check "$f"; done

# 2. Package lambda/ into one zip named after a hash of the sources (all three
#    functions share it, each with its own handler). Unchanged code → same key
#    → no upload and no function update. If lambda/ ever gains other files
#    (package.json, node_modules), include them in the hash and the zip.
HASH="$(cd "$ROOT/lambda" && shasum -a 256 ./*.mjs | shasum -a 256 | cut -c1-16)"
CODE_KEY="lambda/${HASH}.zip"
if aws s3api head-object --bucket "$CODE_BUCKET" --key "$CODE_KEY" --region "$REGION" >/dev/null 2>&1; then
	echo "Lambda code unchanged (${CODE_KEY})"
else
	WORK="$(mktemp -d)"
	(cd "$ROOT/lambda" && zip -q -X "$WORK/code.zip" ./*.mjs)
	aws s3 cp "$WORK/code.zip" "s3://${CODE_BUCKET}/${CODE_KEY}" --region "$REGION" --only-show-errors
	rm -rf "$WORK"
	echo "Uploaded Lambda code to s3://${CODE_BUCKET}/${CODE_KEY}"
fi

# 3. A failed first create leaves the stack in ROLLBACK_COMPLETE, which can't be
#    updated. It holds no resources at that point, so remove it and start over.
STATUS="$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
	--query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo NONE)"
if [ "$STATUS" = "ROLLBACK_COMPLETE" ]; then
	echo "Removing the stack left behind by a failed first deploy…"
	aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION"
	aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --region "$REGION"
fi

# 4. Deploy. On failure, print the events that say why.
if ! aws cloudformation deploy \
	--stack-name "$STACK_NAME" \
	--template-file "$ROOT/infra/backend.yml" \
	--role-arn "$EXEC_ROLE_ARN" \
	--capabilities CAPABILITY_NAMED_IAM \
	--parameter-overrides \
		"CodeBucket=${CODE_BUCKET}" \
		"CodeKey=${CODE_KEY}" \
		"UserPoolId=${USER_POOL_ID}" \
		"UserPoolClientId=${USER_POOL_CLIENT_ID}" \
		"UsersTableName=${USERS_TABLE}" \
		"CreateUsersTable=${CREATE_USERS_TABLE}" \
		"MatchHistoryTableName=${MATCH_HISTORY_TABLE}" \
		"AllowedOrigins=${ALLOWED_ORIGINS}" \
	--tags project=riftbound \
	--no-fail-on-empty-changeset \
	--region "$REGION"; then
	echo "Deploy failed. Most recent failures:" >&2
	aws cloudformation describe-stack-events --stack-name "$STACK_NAME" --region "$REGION" \
		--query "StackEvents[?contains(ResourceStatus, 'FAILED')] | [0:10].[LogicalResourceId, ResourceStatusReason]" \
		--output table >&2 || true
	exit 1
fi

aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
	--query 'Stacks[0].Outputs[].[OutputKey, OutputValue]' --output table

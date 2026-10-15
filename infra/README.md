# Backend infrastructure

All of the backend's AWS resources are defined in CloudFormation and deployed
automatically on every push to `master`.

| File | What it is | Deployed |
| --- | --- | --- |
| `backend.yml` | Lambdas, their IAM roles and log groups, the HTTP API with Cognito JWT auth, the `MatchHistory` table | By CI on every push (`.github/workflows/deploy-backend.yml` → `deploy.sh`) |
| `bootstrap.yml` | The GitHub deploy role, the CloudFormation execution role, the Lambda code bucket | **By hand, once** — CI can't change its own permissions, by design |
| `deploy.sh` | Zips `lambda/`, uploads it, deploys `backend.yml`, prints the outputs | Run by CI; also runnable from CloudShell |

**Never create or edit backend resources in the AWS console.** The next push
overwrites them, or the stack drifts and fails to update. Change the template
and push instead.

## What the stack doesn't own

These hold real data, so the stack references them instead of creating them:

- **Cognito user pool `ap-southeast-2_kBh9RXo4X`** and its SPA app client.
  Email-as-alias and the no-secret client are fixed at creation, so the pool
  can't be recreated without losing every account.
- **`Users` table.** Referenced by name (`CreateUsersTable=false` in `deploy.sh`).
- **`RiftboundCards` table.** Only the Next.js site reads it.

## One-time setup

Do these in order, in the AWS console (region **Sydney / ap-southeast-2**).
CloudShell — the `>_` icon in the console's top bar — works for any CLI step.

### 1. Delete the hand-made GitHub deploy role

IAM → Roles → `github-deploy-riftbound` → **Delete**. The bootstrap stack
recreates it under the same name, so the `AWS_DEPLOY_ROLE` variable in GitHub
stays valid and doesn't need changing.

### 2. Deploy the bootstrap stack

CloudFormation → **Create stack** → *With new resources (standard)* →
*Upload a template file* → `infra/bootstrap.yml`.

- Stack name: `riftbound-bootstrap`
- Parameters: keep the defaults
- Tick *"I acknowledge that AWS CloudFormation might create IAM resources with custom names"*
- **Submit**, and wait for `CREATE_COMPLETE` (about a minute)

Its **Outputs** tab shows `DeployRoleArn` — it should be
`arn:aws:iam::977099021851:role/github-deploy-riftbound`, matching the GitHub
variable.

### 3. Push to master

GitHub Actions → **Deploy backend** creates the `riftbound` stack (2–3 minutes
the first time). The end of the log prints the stack outputs, including
`ApiUrl`.

### 4. Point the website at the new API

Set `NEXT_PUBLIC_API_URL` to the `ApiUrl` output (no trailing slash) in
`.env.local` and in Vercel → Settings → Environment Variables. Restart
`npm run dev` and redeploy Vercel.

### 5. Move the Cognito trigger to the stack's function

Optional check first — print the code currently running in the old function,
to make sure nothing was edited in the console that isn't in
`lambda/syncUserProfile.mjs`:

```bash
curl -s -o /tmp/sync.zip "$(aws lambda get-function --function-name sync-users-to-dynamodb --region ap-southeast-2 --query Code.Location --output text)"; unzip -o -q /tmp/sync.zip -d /tmp/sync; cat /tmp/sync/*.mjs /tmp/sync/*.js 2>/dev/null
```

Then Cognito → user pool → **Extensions** (or *User pool properties*) →
**Lambda triggers** → edit **Post confirmation** → choose
`riftbound-sync-user-profile` → Save.

### 6. Remove the old hand-made resources

Nothing in the app uses these once steps 4–5 are done:

- Lambda `sync-users-to-dynamodb`, and its role `sync-users-to-dynamodb-role-u76cj9iv`
- API Gateway `Rift API Gateway` (`tfr8nlfebk`) — its only route, `GET /user`,
  is unauthenticated and invokes the Cognito trigger function directly
- DynamoDB table `matches` — an earlier attempt keyed on `matchId`, 0 items

## Making changes

- **Change a Lambda:** edit the file in `lambda/` and push.
- **Add a Lambda:** add the `.mjs` file, then in `backend.yml` add a Role,
  LogGroup and Function (plus Integration, Route and API Permission if it's an
  HTTP endpoint), following the existing ones. Name the role
  `${AWS::StackName}-fn-…` — the execution role may only manage roles with
  that prefix.
- **Change an environment setting** (allowed origins, table names, pool IDs):
  edit the variables at the top of `deploy.sh`.
- **A new AWS service type** (SQS, S3, …) needs permissions on the execution
  role first: edit `bootstrap.yml`, then update the bootstrap stack by hand
  (CloudFormation → `riftbound-bootstrap` → Update → Replace template).

## When a deploy fails

- The Actions log ends with the failing resources and CloudFormation's reasons.
  The same is in CloudFormation → `riftbound` → **Events**.
- `AccessDenied` / `not authorized to perform` during a deploy means the
  execution role in `bootstrap.yml` is missing a permission — see above.
- A failed **first** deploy leaves the stack in `ROLLBACK_COMPLETE`; `deploy.sh`
  deletes it automatically on the next run, so just push again.
- `Input required and not supplied: aws-region` or an empty `role-to-assume`:
  the GitHub variable is missing, or was added as a Secret / under an
  Environment instead of a repository Variable.

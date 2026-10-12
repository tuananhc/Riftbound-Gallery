# CI setup — one-time AWS + GitHub configuration

`deploy-lambdas.yml` pushes the handlers in `lambda/` to AWS on every commit to
`master` that touches them. It authenticates with OIDC, so no AWS keys are
stored in GitHub. Everything below is done once.

The functions must already exist in AWS — the workflow updates code, it does not
create functions, routes, env vars or IAM roles. Create each one first (Node.js
20.x or 22.x, handler `index.handler`), then let CI keep it up to date.

Replace `<account-id>` with your AWS account ID throughout. The repo is
`tuananhc/Riftbound-Gallery` and the region used by this project is
`ap-southeast-2`.

## 1. Let GitHub log in to AWS (OIDC provider)

Once per AWS account:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
```

If it already exists, AWS returns `EntityAlreadyExists` — that's fine.

## 2. Create the deploy role

`trust-policy.json` — only this repo's `master` branch may assume the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike": { "token.actions.githubusercontent.com:sub": "repo:tuananhc/Riftbound-Gallery:ref:refs/heads/master" }
    }
  }]
}
```

`deploy-policy.json` — only code updates, only these functions:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["lambda:UpdateFunctionCode", "lambda:GetFunction", "lambda:GetFunctionConfiguration", "lambda:PublishVersion"],
    "Resource": [
      "arn:aws:lambda:ap-southeast-2:<account-id>:function:saveMatchHistory",
      "arn:aws:lambda:ap-southeast-2:<account-id>:function:userProfile",
      "arn:aws:lambda:ap-southeast-2:<account-id>:function:syncUserProfile"
    ]
  }]
}
```

```bash
aws iam create-role --role-name github-deploy-riftbound --assume-role-policy-document file://trust-policy.json
aws iam put-role-policy --role-name github-deploy-riftbound --policy-name deploy-lambdas --policy-document file://deploy-policy.json
```

This role cannot touch DynamoDB, Cognito or anything else — it only replaces the
code of those three functions. The functions' own execution roles (which do hold
the DynamoDB permissions) are separate and unaffected.

## 3. Add the repo variables

GitHub → repo → Settings → Secrets and variables → Actions → **Variables**:

| Name | Value |
| --- | --- |
| `AWS_DEPLOY_ROLE` | `arn:aws:iam::<account-id>:role/github-deploy-riftbound` |
| `AWS_REGION` | `ap-southeast-2` |

These are variables, not secrets — a role ARN isn't a credential, and plain
variables make failed runs easier to read.

## 4. Run it

Push a change under `lambda/`, or trigger **Deploy Lambdas** by hand from the
Actions tab. Each function deploys as its own matrix job.

## Adding a new Lambda

Add the function in AWS first, then add a `file` / `function` pair to the matrix
in `deploy-lambdas.yml` and its ARN to `deploy-policy.json`.

## What this does not deploy

- The Next.js app (Vercel handles it on push).
- API Gateway routes, authorizers and CORS.
- Lambda environment variables (`DYNAMODB_TABLE_*`) and execution-role
  permissions.
- DynamoDB tables and their key schemas.

Those stay manual for now. If you'd rather have them version-controlled too,
the next step would be an infrastructure-as-code tool (AWS SAM, CDK or
Terraform) describing the functions, routes and tables, with CI running its
deploy command instead of `update-function-code`.

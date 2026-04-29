# Enterprise deployment — OpenShift, Satellite, and customer-controlled environments

Code Engine (see `DEPLOYMENT_CODE_ENGINE.md`) is the default. This guide
covers the enterprise paths customers ask for during procurement.

---

## Red Hat OpenShift on IBM Cloud (ROKS)

Manifests live in `infra/k8s/` and `infra/openshift/`. Apply order:

```
oc apply -f infra/k8s/configmap.yaml
oc apply -f infra/k8s/secret.example.yaml          # populate first
oc apply -f infra/k8s/serviceaccount.yaml
oc apply -f infra/k8s/deployment.yaml
oc apply -f infra/k8s/service.yaml
oc apply -f infra/openshift/route.yaml
oc apply -f infra/k8s/hpa.yaml
```

The container runs under the default `restricted-v2` SCC — no privileged
binding needed. See `infra/openshift/scc-notes.md`.

## Private OpenShift / on-prem Kubernetes

Same manifests apply. Replace the `Route` with an `Ingress` (already
provided in `infra/k8s/ingress.yaml`) plus your TLS solution
(cert-manager, sealed-secrets, customer-issued cert).

## IBM Cloud Satellite

Satellite locations let customers run the same workload on their own
hardware (AWS, Azure, on-prem racks, sovereign data centers) under IBM
Cloud control plane. Steps:

1. Customer creates a Satellite location and assigns hosts.
2. Provision an OpenShift cluster on the location.
3. Apply the same manifests above.
4. Connect IBM Cloud Object Storage via Satellite Link or use a
   customer-supplied S3-compatible store via the same `STORAGE_PROVIDER`
   env contract.
5. Connect watsonx.ai via Satellite Link if the customer requires
   AI calls to traverse private network only.

## Data residency

- COS bucket region pins object data.
- watsonx.ai region (`WATSONX_URL`) pins inference data.
- For EU / regulated customers, use:
  - `WATSONX_URL=https://eu-de.ml.cloud.ibm.com`
  - COS endpoint in `eu-de` or `eu-gb`
  - Postgres in the same region

## Network / firewall

Outbound allow-list for the API container:

| Destination                                       | Why                |
|---------------------------------------------------|--------------------|
| `iam.cloud.ibm.com`                               | IAM token exchange |
| `*.ml.cloud.ibm.com`                              | watsonx.ai         |
| `*.cloud-object-storage.appdomain.cloud`          | COS                |
| `iam.cloud.ibm.com`, customer SSO issuer          | OIDC / IAM         |

The API itself only listens on its assigned port — never opens raw
sockets, never executes user-supplied code, never fetches arbitrary URLs.

## Secrets management

- Code Engine: `ibmcloud ce secret` (encrypted at rest).
- OpenShift: sealed-secrets, External Secrets Operator backed by IBM
  Secrets Manager, or HashiCorp Vault.
- Satellite: same as OpenShift — secrets stay in customer location.
- Never embed secrets in container images. The `Dockerfile` is built to
  receive secrets only at runtime.

## Audit exports

Audit / governance events stream as structured JSON to stdout. Forward to:

- IBM Log Analysis (LogDNA agent on the cluster)
- Splunk via HEC
- OpenSearch via Fluent Bit
- Customer SIEM via syslog forwarder

Schema is documented in `docs/GOVERNANCE.md` (event-shape contract).

## Backup / restore

- COS is multi-replica by default; enable bucket versioning for
  point-in-time recovery.
- Postgres: managed backups via IBM Cloud Databases for PostgreSQL
  (continuous WAL backup + PITR).
- Audit log: forward to write-once storage (COS bucket with retention
  policy + WORM lock for regulated tenants).

## Tenant isolation

- Every API call resolves a single `tenantId` (auth-bound).
- Every storage object stores its `tenantId` as metadata.
- Every cross-tenant read attempt returns `403 cross_tenant_blocked`.
- Database schema must include a non-null `tenant_id` column on every
  customer-data table; queries must filter on it.

## Enterprise SSO

`AUTH_PROVIDER=ibm_iam` enables IBM IAM. `AUTH_PROVIDER=oidc` enables
generic OIDC (Okta, Entra ID, Auth0). Configure:

- `AUTH_ISSUER_URL`
- `AUTH_CLIENT_ID`
- `AUTH_CLIENT_SECRET`

Group → role mapping is enforced at the auth boundary. Roles supported:
`owner`, `admin`, `analyst`, `viewer`.

# IBM Cloud Code Engine — SourceDeck API deployment

This is the **first-class deployment target** for the SourceDeck API.
Code Engine handles container build, scale-to-zero, request routing, and
secrets — no Kubernetes ops required.

The static SourceDeck site (`sourcedeck.app`) continues to ship via its
existing pipeline. This guide covers the **API** only.

---

## 0. Prerequisites

- IBM Cloud account with Code Engine enabled
- `ibmcloud` CLI 2.20+ with the `code-engine`, `cr`, and `iam` plugins
- A push-capable Container Registry namespace (`ibmcloud cr namespace-add`)
- Service credentials for: IBM Cloud Object Storage, watsonx.ai, and any
  managed Postgres you wire in. Do not commit them.

---

## 1. Authenticate

```
ibmcloud login --sso
ibmcloud target -r us-east -g <resource-group>
ibmcloud plugin install code-engine container-registry
```

---

## 2. Build & push the image

```
# tag the image with the IBM Container Registry path
ibmcloud cr login
docker build -t us.icr.io/<namespace>/sourcedeck-api:$(git rev-parse --short HEAD) .
docker push  us.icr.io/<namespace>/sourcedeck-api:$(git rev-parse --short HEAD)
```

Or let Code Engine build from source:

```
ibmcloud ce build create --name sourcedeck-api-build \
  --source . --strategy dockerfile --image us.icr.io/<ns>/sourcedeck-api:latest
ibmcloud ce buildrun submit --build sourcedeck-api-build
```

---

## 3. Create the project

```
ibmcloud ce project create --name sourcedeck-prod
ibmcloud ce project select --name sourcedeck-prod
```

---

## 4. Create secrets (never on the CLI history in plain text — use a file or `--from-file`)

```
ibmcloud ce secret create --name sourcedeck-secrets \
  --from-literal SESSION_SECRET=$(openssl rand -hex 32) \
  --from-literal JWT_SECRET=$(openssl rand -hex 32) \
  --from-literal IBM_COS_API_KEY=... \
  --from-literal IBM_COS_BUCKET=... \
  --from-literal IBM_COS_ENDPOINT=https://s3.us-east.cloud-object-storage.appdomain.cloud \
  --from-literal IBM_COS_INSTANCE_CRN=crn:v1:bluemix:public:cloud-object-storage:... \
  --from-literal IBM_COS_SERVICE_INSTANCE_ID=... \
  --from-literal WATSONX_API_KEY=... \
  --from-literal WATSONX_PROJECT_ID=... \
  --from-literal AUTH_CLIENT_ID=... \
  --from-literal AUTH_CLIENT_SECRET=...
```

For non-secret config use a config map:

```
ibmcloud ce configmap create --name sourcedeck-config \
  --from-literal APP_ENV=production \
  --from-literal LOG_LEVEL=info \
  --from-literal STORAGE_PROVIDER=ibm_cos \
  --from-literal AI_PROVIDER=watsonx \
  --from-literal AUTH_PROVIDER=ibm_iam \
  --from-literal WATSONX_URL=https://us-south.ml.cloud.ibm.com \
  --from-literal WATSONX_MODEL_ID=ibm/granite-13b-chat-v2 \
  --from-literal MAX_UPLOAD_MB=25 \
  --from-literal GOVERNANCE_ENABLED=true
```

---

## 5. Create the app

```
ibmcloud ce app create --name sourcedeck-api \
  --image us.icr.io/<ns>/sourcedeck-api:latest \
  --port 8080 \
  --env-from-secret sourcedeck-secrets \
  --env-from-configmap sourcedeck-config \
  --cpu 0.5 --memory 1G \
  --min-scale 1 --max-scale 10 \
  --concurrency 50 \
  --probe-liveness type=http,path=/health/live,port=8080,interval=20,timeout=4,initial-delay=5 \
  --probe-readiness type=http,path=/health/ready,port=8080,interval=10,timeout=4,initial-delay=3
```

Bind the public hostname later via Custom Domains (Code Engine →
Domain mappings) and point your DNS at the issued CNAME.

---

## 6. Update / rollback

```
# rolling update
ibmcloud ce app update --name sourcedeck-api \
  --image us.icr.io/<ns>/sourcedeck-api:<new-tag>

# inspect current revision
ibmcloud ce app get --name sourcedeck-api

# rollback by re-pointing at a prior immutable tag
ibmcloud ce app update --name sourcedeck-api \
  --image us.icr.io/<ns>/sourcedeck-api:<previous-tag>
```

Code Engine maintains revision history; rollback is just an image-tag
change. Tag every build with the git short SHA for traceability.

---

## 7. Logs & health

```
ibmcloud ce app logs    --name sourcedeck-api --tail 200 --follow
ibmcloud ce app events  --name sourcedeck-api
curl https://<your-app>.<region>.codeengine.appdomain.cloud/health/live
curl https://<your-app>.<region>.codeengine.appdomain.cloud/health/ready
```

---

## 8. Hardening checklist

- [ ] Secrets created via `ibmcloud ce secret`, not env-files in git
- [ ] App bound to a Trusted Profile via service ID for least-privilege access to COS / watsonx
- [ ] Custom domain mapped + TLS issued
- [ ] Egress allow-list set if your account requires it
- [ ] Log forwarding to IBM Log Analysis (LogDNA) or Splunk
- [ ] Alerts on `5xx` rate, p95 latency, readiness failures

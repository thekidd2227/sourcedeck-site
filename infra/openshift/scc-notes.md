# OpenShift Security Context Constraints

The deployment in `infra/k8s/deployment.yaml` is OpenShift-friendly:

- runs as non-root (`runAsNonRoot: true`)
- drops all capabilities
- uses a read-only root filesystem
- mounts ephemeral writable volumes only at `/tmp` and `/app/.data`

This means the default `restricted-v2` SCC is sufficient — no privileged
SCC binding is required. If you run on Red Hat OpenShift on IBM Cloud
(ROKS) or OpenShift on IBM Cloud Satellite, the same manifests apply.

## Image registry

Push to IBM Container Registry (ICR) and reference by image stream:

```
ibmcloud cr login
docker tag sourcedeck-api:latest <region>.icr.io/<namespace>/sourcedeck-api:latest
docker push <region>.icr.io/<namespace>/sourcedeck-api:latest
oc create secret docker-registry icr-pull \
  --docker-server=<region>.icr.io \
  --docker-username=iamapikey \
  --docker-password=$IBM_CLOUD_API_KEY
oc secrets link sourcedeck-api icr-pull --for=pull
```

## Apply

```
oc apply -f infra/k8s/configmap.yaml
oc apply -f infra/k8s/secret.example.yaml   # populate before applying!
oc apply -f infra/k8s/serviceaccount.yaml
oc apply -f infra/k8s/deployment.yaml
oc apply -f infra/k8s/service.yaml
oc apply -f infra/openshift/route.yaml
oc apply -f infra/k8s/hpa.yaml
```

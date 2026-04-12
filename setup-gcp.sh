#!/bin/bash
# setup-gcp.sh
# ─────────────────────────────────────────────────────────────
# InterviewAI - GCP Infrastructure Setup Script
# Run once before first deployment
# Usage: chmod +x setup-gcp.sh && ./setup-gcp.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Config ─────────────────────────────────────────────────
PROJECT_ID="${1:-project-1b6c0403-512c-47b8-986}"
REGION="us-central1"
BUCKET_NAME="${PROJECT_ID}-interview-files"
SA_NAME="ai-interviewer-sa"

echo "🚀 Setting up GCP infrastructure for project: $PROJECT_ID"

# ─── Set project ─────────────────────────────────────────────
gcloud config set project "$PROJECT_ID"

# ─── Enable APIs ─────────────────────────────────────────────
echo "📡 Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  speech.googleapis.com \
  texttospeech.googleapis.com \
  storage.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firebase.googleapis.com \
  --quiet

echo "✅ APIs enabled"

# ─── Create Artifact Registry ────────────────────────────────
echo "📦 Creating Artifact Registry..."
gcloud artifacts repositories create ai-interviewer \
  --repository-format=docker \
  --location="$REGION" \
  --description="AI Interviewer container images" \
  --quiet || echo "Registry already exists"

# ─── Create Cloud Storage bucket ─────────────────────────────
echo "🪣 Creating Cloud Storage bucket..."
gcloud storage buckets create "gs://$BUCKET_NAME" \
  --location="$REGION" \
  --uniform-bucket-level-access \
  --quiet || echo "Bucket already exists"

# Set lifecycle: delete files older than 90 days
cat > /tmp/lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF
gcloud storage buckets update "gs://$BUCKET_NAME" --lifecycle-file=/tmp/lifecycle.json

echo "✅ Storage bucket created: $BUCKET_NAME"

# ─── Create Firestore database ───────────────────────────────
echo "🔥 Creating Firestore database..."
gcloud firestore databases create \
  --location="$REGION" \
  --quiet || echo "Firestore already exists"

# Create indexes
cat > /tmp/firestore.indexes.json << 'EOF'
{
  "indexes": [
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    }
  ]
}
EOF
echo "✅ Firestore ready"

# ─── Create Service Account ──────────────────────────────────
echo "🔑 Creating service account..."
gcloud iam service-accounts create "$SA_NAME" \
  --display-name="AI Interviewer Service Account" \
  --quiet || echo "Service account already exists"

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant required roles
ROLES=(
  "roles/aiplatform.user"
  "roles/speech.serviceAgent"
  "roles/storage.objectAdmin"
  "roles/datastore.user"
  "roles/secretmanager.secretAccessor"
  "roles/firebase.sdkAdminServiceAgent"
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$ROLE" \
    --quiet
done

# Download key
gcloud iam service-accounts keys create ./backend/service-account.json \
  --iam-account="$SA_EMAIL"

echo "✅ Service account created and key saved to backend/service-account.json"

# ─── Create Secrets ──────────────────────────────────────────
echo "🔐 Creating secrets..."

# Prompt for Judge0 API key
read -p "Enter your Judge0 (RapidAPI) key: " JUDGE0_KEY
echo -n "$JUDGE0_KEY" | gcloud secrets create judge0-api-key --data-file=- --quiet || \
echo -n "$JUDGE0_KEY" | gcloud secrets versions add judge0-api-key --data-file=-

echo -n "$BUCKET_NAME" | gcloud secrets create gcs-bucket-name --data-file=- --quiet || \
echo -n "$BUCKET_NAME" | gcloud secrets versions add gcs-bucket-name --data-file=-

echo "✅ Secrets created"

# ─── Summary ─────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ GCP Setup Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Project ID:    $PROJECT_ID"
echo "Region:        $REGION"
echo "Storage:       gs://$BUCKET_NAME"
echo "Service Acct:  $SA_EMAIL"
echo ""
echo "Next steps:"
echo "1. Set up Firebase project at https://console.firebase.google.com"
echo "2. Enable Authentication (Google + Email/Password)"
echo "3. Copy Firebase config to frontend/.env.local"
echo "4. Set GitHub Secrets for CI/CD (see README)"
echo "5. Push to main branch to deploy"
echo ""

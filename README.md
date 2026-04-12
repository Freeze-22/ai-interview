<!-- README.md -->
# 🎙️ InterviewAI — Real-Time AI Interview Platform

A production-ready AI interviewer with zero-latency voice, barge-in support, coding rounds, and detailed evaluation reports. Built on Google Cloud.

---

## 🏗️ Architecture

```
Browser (Next.js)
    │
    ├── WebRTC Mic → WebSocket → Backend
    │                               │
    │                     ┌─────────┼──────────┐
    │                   STT       Gemini      TTS
    │                (Google)  (Vertex AI)  (Google)
    │                     └─────────┼──────────┘
    │                           FAISS Memory
    │                           Firestore
    └── Audio Output ← WebSocket ──┘
```

---

## 📁 Project Structure

```
ai-interviewer/
├── backend/
│   ├── src/
│   │   ├── index.js                  # Fastify server entry
│   │   ├── config/firebase.js        # Firebase Admin init
│   │   ├── websocket/
│   │   │   ├── server.js             # WS server + session registry
│   │   │   └── InterviewSession.js   # Core session state machine
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── GeminiService.js  # Vertex AI Gemini 1.5 Pro
│   │   │   │   └── InterviewEngine.js# Strategy, prompts, coding
│   │   │   ├── voice/
│   │   │   │   ├── StreamingSTT.js   # Google Speech-to-Text
│   │   │   │   └── StreamingTTS.js   # Google Text-to-Speech
│   │   │   ├── memory/
│   │   │   │   └── MemoryService.js  # FAISS + short-term memory
│   │   │   └── evaluation/
│   │   │       └── EvaluationService.js # Post-interview report
│   │   ├── routes/                   # REST API routes
│   │   ├── middleware/auth.js        # Firebase JWT verification
│   │   └── utils/resumeParser.js     # PDF/DOCX parsing
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── auth/page.tsx         # Sign in / Sign up
│   │   │   ├── dashboard/page.tsx    # Session list
│   │   │   └── interview/[id]/page.tsx # Live interview room
│   │   ├── components/
│   │   │   ├── interview/
│   │   │   │   ├── ConversationPanel.tsx  # Chat + AI avatar
│   │   │   │   ├── AudioControls.tsx      # Mic, mute, text mode
│   │   │   │   ├── AudioWaveform.tsx      # Canvas live visualizer
│   │   │   │   ├── InterviewHeader.tsx    # Timer + controls
│   │   │   │   ├── StatusOverlay.tsx      # Loading state
│   │   │   │   └── ReportPanel.tsx        # Full report UI
│   │   │   └── coding/
│   │   │       └── CodingPanel.tsx        # Monaco + Judge0 UI
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts       # WS connection + message router
│   │   │   ├── useAudioCapture.ts    # WebRTC mic + barge-in VAD
│   │   │   └── useAudioPlayer.ts     # Streaming audio queue
│   │   ├── store/interviewStore.ts   # Zustand global state
│   │   └── lib/
│   │       ├── firebase.ts           # Firebase client config
│   │       └── api.ts                # Typed API client
│   ├── Dockerfile
│   └── package.json
│
├── .github/workflows/deploy.yml      # CI/CD to Cloud Run
├── setup-gcp.sh                      # One-click GCP setup
└── README.md
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- Google Cloud account with billing enabled
- Firebase project
- Judge0 API key (RapidAPI)

### 1. Clone & Install

```bash
git clone <your-repo>
cd ai-interviewer

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. GCP Setup (one-time)

```bash
chmod +x setup-gcp.sh
./setup-gcp.sh your-gcp-project-id
```

This creates:
- Cloud Storage bucket
- Firestore database
- Artifact Registry
- Service account with correct IAM roles
- Secrets in Secret Manager

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create project (or use existing GCP project)
3. Enable **Authentication** → Google + Email/Password providers
4. Get your web app config

### 4. Environment Variables

**Backend** (`backend/.env`):
```env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
VERTEX_AI_LOCATION=us-central1
GCS_BUCKET_NAME=your-bucket-name
JUDGE0_API_KEY=your-rapidapi-key
PORT=8080
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 5. Run Locally

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open http://localhost:3000

---

## 🚀 Deploy to Google Cloud

### Set GitHub Secrets

Go to **GitHub → Settings → Secrets** and add:

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_SA_KEY` | Contents of `service-account.json` |
| `FIREBASE_API_KEY` | Firebase web API key |
| `FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | From Firebase console |
| `FIREBASE_APP_ID` | From Firebase console |

### Deploy

```bash
git push origin main
```

GitHub Actions will:
1. Build and push Docker images to Artifact Registry
2. Deploy backend to Cloud Run
3. Deploy frontend to Cloud Run with backend URL injected

---

## 🔑 API Keys Needed

| Service | Where to get |
|---------|-------------|
| Google Cloud (STT, TTS, Vertex AI) | [GCP Console](https://console.cloud.google.com) |
| Firebase Auth | [Firebase Console](https://console.firebase.google.com) |
| Judge0 (code execution) | [RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce) |

---

## 🎙️ How the Real-Time Pipeline Works

```
1. User speaks → WebRTC captures mic audio (48kHz, Opus)
2. Audio chunks → WebSocket → Backend every 100ms
3. Google STT receives streaming audio → returns partial transcripts
4. Partial transcripts shown in UI immediately
5. On final transcript → Gemini 1.5 Pro starts generating response
6. Response streams token by token
7. At each sentence boundary → Google TTS synthesizes audio
8. Audio chunks → WebSocket → Browser → AudioContext queue
9. Audio plays while more is being generated

BARGE-IN:
- Browser AudioContext analyser monitors mic energy
- If energy > threshold while AI is speaking:
  → Send 'user_speaking' WS message
  → Backend cancels LLM AbortController
  → TTS.stop() called
  → 'stop_audio' WS message sent to frontend
  → AudioQueue cleared
  → All this happens in < 50ms
```

---

## 📊 Evaluation Dimensions

| Dimension | What's measured |
|-----------|----------------|
| Communication | Clarity, structure, articulation |
| Technical Knowledge | Depth, accuracy, breadth |
| Problem Solving | Approach, adaptability, creativity |
| Confidence | Tone, certainty, composure |
| Coding Skills | Correctness, complexity, style |

---

## 💡 Cost Estimates (GCP)

| Service | Estimated monthly cost |
|---------|----------------------|
| Cloud Run (backend, 1 min instance) | ~$20-50 |
| Cloud Run (frontend) | ~$5-15 |
| Google STT (streaming, 10h/mo) | ~$18 |
| Google TTS (standard, 10h/mo) | ~$4 |
| Vertex AI Gemini 1.5 Pro (50 interviews) | ~$15-40 |
| Firestore | ~$1-5 |
| Cloud Storage | ~$1-3 |
| **Total** | **~$64-135/month** |

---

## 🔧 Troubleshooting

**WS connection drops on Cloud Run:**
- Set `--timeout=3600` on Cloud Run (done in deploy.yml)
- WebSocket keep-alive ping every 25s (done in useWebSocket.ts)

**STT stream cuts off:**
- Google STT has a 305s stream limit. StreamingSTT.js auto-restarts at 290s.

**Audio not playing:**
- AudioContext requires a user gesture. `initContext()` is called on interview start click.

**FAISS build fails on Docker:**
- The Dockerfile installs `libopenblas-dev`. For Cloud Run ARM, use `faiss-node` prebuilt binary.

---

## 📝 License

MIT

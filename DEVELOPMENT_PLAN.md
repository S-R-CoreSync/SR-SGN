# 📋 خطة تطوير SGN — AI-First (2026)

## 🎯 الهدف
تحويل منصة الجالية sy-NL من "موقع إخباري + CRUD" إلى **منصة ذكية (AI-First)** تخدم ٥٠٠٠+ عضو sy-NL، مع **تكلفة $0** (free tiers only).

---

## 🧠 الأدوات الذكية المجانية (Free AI Tools) — مختارة للمشروع

### ١) LLM (توليد نص)
| الأداة | Free tier | الاستخدام في SGN | الحالة |
|---|---|---|---|
| **Groq** (Llama 3.3 70B) | 30 RPM, 1K req/day | Chatbot, summarization, categorization | ✅ مُفعّل |
| **Google Gemini** (2.5 Flash) | 15 RPM, 1M context | ID extraction (vision), translation | 🔑 key present |
| **OpenRouter** (25+ free models) | 20 RPM, 50-1K req/day | Fallback, model comparison | 🆕 |
| **Cerebras** (Llama 3.1 70B) | fast inference | Real-time chat | 🆕 |
| **DeepSeek** (chat) | cheap/free | Budget fallback | key present (empty) |

### ٢) Embeddings (للبحث الدلالي RAG)
| الأداة | Free tier | الاستخدام |
|---|---|---|
| **Jina AI** | 10M tokens one-time, 100 RPM | Embeddings + reranker (Arabic-friendly) |
| **Voyage AI** | 200M tokens/model (one-time) | Anthropic's recommended, multilingual |
| **Cohere** | 1K calls/month (trial) | Embed + rerank ( Arabic) |
| **Cloudflare Workers AI** | 10K neurons/day | Edge embeddings (bge-large) |

### ٣) Vector DB (للبحث الدلالي)
| الأداة | Free tier | الاستخدام |
|---|---|---|
| **Qdrant Cloud** | 1M vectors, 1 GB RAM | Semantic search over news/members |
| **Supabase pgvector** | 500 MB DB | RAG + relational data in one DB |
| **Chroma** (local) | unlimited (self-hosted) | Dev/prototype |

### ٤) Vision / OCR
| الأداة | Free tier | الاستخدام |
|---|---|---|
| **Gemini 2.5 Flash** (vision) | free | ID card extraction (replace Ollama llava) |
| **Cloudflare Workers AI** (image-to-text) | 10K neurons/day | OCR fallback |
| **Upstage** | $10 credit | Document Parse (PDFs) |

### ٥) Audio / Speech
| الأداة | Free tier | الاستخدام |
|---|---|---|
| **Groq Whisper** (whisper-large-v3) | 20 RPM, 2K/day | Voice messages transcription in chat |
| **Cloudflare Workers AI** (speech recognition) | 720/min | Real-time transcription |

### ٦) Translation
| الأداة | Free tier | الاستخدام |
|---|---|---|
| **Gemini 2.5 Flash** | free | Arabic ↔ Dutch/English (news translation) |
| **Cloudflare Workers AI** (translation) | 720/min | Edge translation |
| **LibreTranslate** (self-hosted) | unlimited | Offline translation |

### ٧) Content Moderation
| الأداة | Free tier | الاستخدام |
|---|---|---|
| **Hugging Face** (text-classification) | free CPU | Moderation classifier |
| **Cloudflare Workers AI** | 10K neurons/day | Toxicity detection |

---

## 🚀 خطة التطوير (4 مراحل)

### Phase 1: AI RAG ترقية (أسبوع 1-2) — **High impact**
**الهدف:** تحويل RAG من keyword-based إلى semantic search.

| # | المهمة | الأداة | Effort |
|---|---|---|---|
| 1.1 | إضافة embeddings (Jina AI) — Arabic-friendly | Jina AI (10M tokens free) | 2 hrs |
| 1.2 | Vector DB (Qdrant Cloud free) — index news/members | Qdrant Cloud (1M vectors) | 3 hrs |
| 1.3 | Semantic search in `/api/chat/ai` (replace keyword matching) | — | 2 hrs |
| 1.4 | Reranker (Jina reranker) for top-k results | Jina AI | 1 hr |
| 1.5 | Test + verify answer quality | — | 1 hr |

**النتيجة:** Chatbot يفهم أسئلة "ما هي خدمات الدعم النفسي؟" ويجد المقالات ذات الصلة (حتى بدون كلمات مفتاحية).

### Phase 2: Translation & Summarization (أسبوع 3) — **Medium impact**
**الهدف:** ترجمة الأخبار (ar/nl/en) + تلخيص.

| # | المهمة | الأداة | Effort |
|---|---|---|---|
| 2.1 | Auto-translate news articles (ar→nl, ar→en) on sync | Gemini 2.5 Flash (free) | 3 hrs |
| 2.2 | Summarize long articles (3 sentences) | Groq Llama 3.3 | 2 hrs |
| 2.3 | Store translations in DB (new columns: titleNl, titleEn, summary) | Prisma migration | 1 hr |
| 2.4 | UI: show translated content based on locale | — | 2 hrs |

**النتيجة:** كل خبر يظهر بلغة المستخدم (ar/nl/en) تلقائياً.

### Phase 3: Voice & Vision (أسبوع 4) — **Medium impact**
**الهدف:** دعم الصوت (voice messages) + تحسين ID extraction.

| # | المهمة | الأداة | Effort |
|---|---|---|---|
| 3.1 | Voice messages in direct chat → Whisper transcription | Groq Whisper (free) | 3 hrs |
| 3.2 | Replace Ollama llava with Gemini 2.5 Flash (vision) for ID extraction | Gemini (free) | 2 hrs |
| 3.3 | Auto-detect language in chat messages | Gemini | 1 hr |
| 3.4 | Text-to-speech (TTS) for accessibility | Cloudflare Workers AI TTS | 2 hrs |

**النتيجة:** مستخدمون يمكنهم إرسال رسائل صوتية (م transccribed تلقائياً).

### Phase 4: Moderation & Analytics (أسبوع 5) — **Low impact, high value**
**الهدف:** أمان + تحليلات.

| # | المهمة | الأداة | Effort |
|---|---|---|---|
| 4.1 | Content moderation (toxicity detection) on posts/comments | Cloudflare Workers AI | 2 hrs |
| 4.2 | Sentiment analysis on community feedback | Hugging Face (free) | 2 hrs |
| 4.3 | Auto-tag news articles (categories) — replace keyword fallback | Gemini | 1 hr |
| 4.4 | Analytics dashboard (member engagement, top topics) | — | 3 hrs |
| 4.5 | Rate limiting + abuse detection | — | 2 hrs |

---

## 📊 تكلفة (Cost)

| المكون | Free tier | تكلفة/شهر |
|---|---|---|
| Groq (LLM) | 30 RPM, 1K/day | $0 |
| Gemini (vision/translation) | 15 RPM | $0 |
| Jina AI (embeddings) | 10M tokens (one-time) | $0 |
| Qdrant Cloud (vector DB) | 1M vectors | $0 |
| Cloudflare Workers AI | 10K neurons/day | $0 |
| Vercel (hosting) | Hobby plan | $0 |
| Turso (DB) | 500 DBs, 9GB storage | $0 |
| **المجموع** | | **$0/شهر** |

---

## 🛠️ خطة التنفيذ (Implementation Steps)

### Phase 1: Semantic RAG (أولوية 1)

#### 1.1 إضافة Jina AI embeddings
```bash
# .env
JINA_API_KEY=jina_...  # from https://jina.ai (free, 10M tokens)
```

#### 1.2 إضافة Qdrant Cloud
```bash
# .env
QDRANT_URL=https://xxx.qdrant.io
QDRANT_API_KEY=...
```

#### 1.3 إنشاء embeddings script
`scripts/12-generate-embeddings.ts`:
- Read all posts from DB.
- Generate embeddings via Jina API.
- Upsert to Qdrant (collection: "sgn_news").

#### 1.4 تحديث RAG
`src/lib/ai/rag.ts`:
- Replace keyword matching with vector search.
- Use Jina embeddings for query.
- Retrieve top-5 similar posts from Qdrant.
- Rerank with Jina reranker.

### Phase 2: Translation (أولوية 2)
- Add columns to Post: `titleNl`, `titleEn`, `summary`.
- `prisma db push`.
- Update sync script to translate on import.
- Update UI to show translated content.

### Phase 3: Voice & Vision (أولوية 3)
- Add voice recording to chat UI.
- Groq Whisper transcription endpoint.
- Gemini vision for ID extraction (replace Ollama llava).

### Phase 4: Moderation & Analytics (أولوية 4)
- Content moderation middleware.
- Sentiment analysis on feedback.
- Analytics dashboard.

---

## 📌 التوصية (ابدأ بـ)

1. **Phase 1.1-1.2** (Jina + Qdrant) — 5 hrs → ترقية RAG (أكبر تأثير).
2. **Phase 2.1** (Gemini translation) — 3 hrs → محتوى متعدد اللغات (أكبر UX).
3. **Phase 3.2** (Gemini vision) — 2 hrs → إلغاء Ollama dependency (أبسط للإنتاج).

---

## 🔗 روابط مفيدة

- Jina AI: https://jina.ai (free, 10M tokens)
- Qdrant Cloud: https://cloud.qdrant.io (free, 1M vectors)
- Groq: https://console.groq.com (free, 30 RPM)
- Google AI Studio: https://aistudio.google.com (free, 15 RPM)
- Cloudflare Workers AI: https://developers.cloudflare.com/workers-ai (free, 10K neurons/day)
- OpenRouter: https://openrouter.ai (free models)
- Voyage AI: https://www.voyageai.com (200M free tokens)
- Cohere: https://cohere.com (trial, 1K calls/month)

---

## 📝 ملاحظات

- **لا تستخدم** أي خدمة paid (Vercel Pro, Turso paid, OpenAI paid) — كل شيء free tier.
- **Rate limits**: implement exponential backoff + caching.
- **Data policy**: Gemini free tier uses data for training (outside EU/UK/CH). For sensitive data (ID cards), use local Ollama or paid tier.
- **Fallback**: always have a fallback (keyword search if vector fails, Groq if Gemini fails).
- **Monitoring**: add logging for AI calls (latency, errors, token usage).

---

**هل تود البدء بـ Phase 1 (Semantic RAG with Jina + Qdrant)؟**
> # ⛔ DOCUMENT HISTORIQUE — NE PAS SUIVRE
>
> **Archivé le 2026-08-11.** Ce fichier décrit une architecture ou un état qui
> **n'a jamais été construit** ou qui a été **délibérément remplacé**. Il est
> conservé pour comprendre les décisions passées, jamais pour guider un travail.
>
> **Sources de vérité actuelles :**
> - [`README.md`](../../README.md) — ce qu'est le produit aujourd'hui
> - [`docs/quality/ARCHITECTURE-BIBLE.md`](../quality/ARCHITECTURE-BIBLE.md) — la constitution (multi-tenant, multi-pays)
> - [`docs/COREON_STATUS.md`](../COREON_STATUS.md) — l'état courant
> - **Linear** (KogiaGroup / KOG) — le travail en cours
>
> Écart connu de ce document : Décrit un backend **FastAPI + PostgreSQL + Redis** qui n'a jamais existé. Le backend réel est **Node zéro-dépendance + Turso + Render** (`server/`)..

---

# Coreon Edu — SaaS Plan (Zero → Production)

> **Product:** A multi-tenant SaaS for **quick, in-classroom student evaluation**.
> **Company:** Kogia Group · **Repo:** `oounis/coreon-edu`

---

## 1. The one-sentence vision
Teachers evaluate their **whole class in under a minute** — open the portal, the **current class is already loaded**, **drag each student onto an answer**, add a note + badge, done — and the result is **instantly shared** with admins, owners and parents.

## 2. Why it wins
- **Zero navigation.** The schedule decides what the teacher sees. Login at 08:00 → the 08:00–10:00 class is on screen.
- **Zero typing per student.** Evaluation is **drag-and-drop bucketing**, not a form per child.
- **Friendly sharing.** Parents see a positive, simple snapshot (score + badge + per-question result), not raw data.
- **Speed is the product.** Everything is designed around "the teacher has no time."

## 3. Users & portals (white + one colour each)
| Role | Colour | Core job |
|------|--------|----------|
| **Teacher** | 🟢 Green | Evaluate the live class by drag & drop; notes & badges |
| **Admin** | 🔵 Blue | See evaluations live; manage students/classes/payments/incidents |
| **Owner** | 🟣 Violet | Executive stats only |
| **Parent** | 🟠 Amber | Friendly view of their child's performance |
| **Platform (Superadmin)** | 🟦 Teal | Onboard schools, tenant management |

## 4. The killer flow (Teacher)
1. **Auto-load** the class scheduled now (grade + classroom + subject + student list).
2. **5 quick questions**, one at a time: Participation · Understanding · Behaviour · Homework · Overall.
3. For each question, **drag students into answer buckets**: 🌟 Excellent · 👍 Good · ➖ Average · 📌 Needs work. (Plus one-tap "all → Good" for speed.)
4. **Badges & note** (optional): ⭐ Star of the day, 📈 Most improved, etc.
5. **Save & share** → admins + parents see it immediately.

## 5. Data model (core entities)
- **Tenant/School** → Grades → Classrooms → Subjects → **Schedule slots** (day, time, teacher, class).
- **Users** (role-scoped): Superadmin, SchoolAdmin, Admin, Owner, Teacher, Supervisor, Parent.
- **Student** (belongs to classroom; linked to Parent).
- **Evaluation**: { teacher, class, subject, datetime, per-question bucket placements, per-student badges, note }.
- **Payment** (parent monthly status), **Incident**, **Reclamation/Request**.
- Every row is **tenant-scoped by `school_id`** (multi-tenant isolation).

## 6. Architecture (target production)
```
            ┌── Web App (React/Next.js SPA) ──┐   one accent colour per portal
 Browser ──▶│  Teacher · Admin · Owner · Parent │
            └───────────────┬──────────────────┘
                            │  HTTPS / JWT
                  ┌─────────▼──────────┐
                  │ API Gateway (Nginx)│  rate-limit · CORS · TLS
                  └─────────┬──────────┘
                  ┌─────────▼──────────┐
                  │  Coreon API (FastAPI / Python) │ RBAC · tenant middleware
                  └───┬─────────┬───────┬──────────┘
        PostgreSQL ───┘         │       └─── Redis (cache/sessions)
   (multi-tenant, school_id)    │
                     Object storage (files/exports) · Email/SMS · Async workers (queues)
```
- **Frontend:** React + Vite (this repo) → Next.js when SSR/SEO needed.
- **Backend:** FastAPI (Python), JWT auth, RBAC, per-request **tenant context** middleware.
- **DB:** PostgreSQL, multi-tenant by `school_id` (shared schema + row scoping; isolate to schema-per-tenant later if needed).
- **Infra:** Oracle Cloud (OCI) or any container host; Docker; CI/CD via GitHub Actions.

## 7. Roadmap — zero to production
| Phase | Goal | Deliverables |
|-------|------|--------------|
| **P0 — Prototype** *(this repo, now)* | Prove the flow | React app: login + 4 portals + **drag-drop teacher evaluation** + live admin/owner/parent views (mock data, localStorage). Deployed to GitHub Pages. |
| **P1 — MVP** | One real school | FastAPI backend + PostgreSQL; real auth (JWT) + RBAC; schedule-driven class loading; persist evaluations; parent invites. |
| **P2 — Beta** | 3–5 pilot schools | Multi-tenant isolation, school onboarding (Superadmin), payments status, incidents/reclamations, email/SMS, exports. |
| **P3 — Production** | Paid, scalable | Hardening (security, backups, audit log), observability, CI/CD, billing/subscriptions, SLAs, mobile-friendly PWA. |
| **P4 — Scale** | Many schools | Schema-per-tenant option, caching, search, analytics, offline mode for low-connectivity classrooms. |

## 8. Non-negotiables
- **Speed:** a full class evaluated in < 60 seconds.
- **Privacy:** student data is sensitive — tenant isolation, least-privilege RBAC, audit trail, encrypted secrets.
- **Friendly tone:** parent-facing views are encouraging, never punitive.
- **Design system:** white background + exactly one accent colour per portal.

## 9. Business model
B2B subscription **per school** (tiered by student count). Optional add-ons: SMS credits, advanced analytics, parent mobile app.

---
*P0 prototype lives in `/app`. See `README.md` to run it or the live link.*

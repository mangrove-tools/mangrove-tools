# [[SERVICE_NAME]] — Lead Developer Instructions

**Stack:** Python [[3.11+]], FastAPI, [[uvicorn]], tests with [[pytest]]  
**Entry:** `[[app/main.py]]`

You are the **lead developer**. Obey this file.

## Priority order
1. Optimize reliability (bugs, validation, error shapes, tests)  
2. Professional DX/API UX (clear schemas, docs, consistent errors)  
3. “Discoverability” for APIs: OpenAPI quality, README quickstart, versioning clarity  
4. Expand endpoints/features you greenlight that fit the contract  

## Product contract
- Problem: [[]]  
- Primary flow: [[request → response]]  
- Auth: [[none / API key / …]]  
- Non-goals: [[no multi-tenant SaaS sprawl / no unbounded jobs queue / …]]  

## Architecture
- Routers thin; business logic in services/  
- Pydantic models for IO; no bare dicts at boundaries  
- Settings via env; no hardcoded secrets  
- Idempotent writes where relevant  

## Validation
```bash
pytest
uvicorn app.main:app --reload
# open /docs
```

## Do not change without approval
Database vendor, auth scheme, public URL/version breaking changes, adding Celery/Redis/etc. without need.

┌──────────────────────────────────────────────────────────────┐
│                    CREDNEXA DATABASE                         │
└──────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   auth.users    │
                    │  (Supabase)     │
                    │  - id (UUID)    │
                    │  - email        │
                    │  - password     │
                    └────────┬────────┘
                             │ FK
                             │
         ┌───────────────────▼───────────────────┐
         │         profiles (1)                  │
         ├──────────────────────────────────────┤
         │ id (UUID) PK, FK → auth.users        │
         │ email TEXT NOT NULL UNIQUE            │
         │ full_name TEXT                        │
         │ role TEXT (user/admin)                │
         │ is_active BOOLEAN                     │
         │ avatar_url TEXT                       │
         │ created_at TIMESTAMPTZ                │
         │ updated_at TIMESTAMPTZ                │
         └───────────────┬──────────────────────┘
                         │ (1:M)
        ┌────────────────┴────────────────┬──────────────┐
        │                                 │              │
   ┌────▼──────────────────┐    ┌────────▼────────┐  ┌──▼──────────────┐
   │  applications (1:M)   │    │ audit_logs(1:M) │  │ model_runs(1:M) │
   ├──────────────────────┤    ├─────────────────┤  ├─────────────────┤
   │ id BIGINT PK         │    │ id BIGINT PK    │  │ id BIGINT PK    │
   │ user_id UUID FK      │    │ actor_id UUID FK│  │ version TEXT    │
   │ married TEXT         │    │ actor_role TEXT │  │ model_name TEXT │
   │ dependents TEXT      │    │ action TEXT     │  │ accuracy NUMERIC│
   │ education TEXT       │    │ resource_type   │  │ roc_auc NUMERIC │
   │ applicant_income NUM │    │ resource_id TEXT│  │ is_active BOOL  │
   │ coapplicant_income   │    │ before_state    │  │ trained_at TSTZ │
   │ loan_amount NUM      │    │ after_state     │  │ created_by UUID │
   │ loan_amount_term INT │    │ ip_address      │  │ notes TEXT      │
   │ credit_history TEXT  │    │ created_at TSTZ │  └─────────────────┘
   │ property_area TEXT   │    └─────────────────┘
   │ predicted_decision   │
   │ predicted_prob NUM   │
   │ status TEXT          │
   │ top_factors JSONB    │
   │ segment_cluster_id   │
   │ segment_label TEXT   │
   │ created_at TSTZ      │
   └───────┬──────────────┘
           │ (1:1)
           │
    ┌──────▼───────────────┐
    │   reviews (1:1)      │
    ├──────────────────────┤
    │ id BIGINT PK         │
    │ application_id BIGINT│
    │ admin_id UUID FK     │
    │ final_decision TEXT  │
    │ review_note TEXT     │
    │ reviewed_at TSTZ     │
    └──────────────────────┘

    ┌──────────────────────────┐
    │  explanations (Optional) │
    ├──────────────────────────┤
    │ id BIGINT PK             │
    │ assessment_id TEXT UK    │
    │ application_id BIGINT FK │
    │ explanation_text TEXT    │
    │ llm_provider TEXT        │
    │ created_at TSTZ          │
    └──────────────────────────┘

    ┌──────────────────────────┐
    │ what_if_sessions         │
    ├──────────────────────────┤
    │ id BIGINT PK             │
    │ application_id BIGINT FK │
    │ user_id UUID FK          │
    │ original_input JSONB     │
    │ modified_input JSONB     │
    │ modified_fields TEXT[]   │
    │ original_probability     │
    │ modified_probability     │
    │ created_at TSTZ          │
    └──────────────────────────┘
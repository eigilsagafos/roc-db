export const MUTATIONS_TABLE_BODY_SCHEMA = `
    id              text PRIMARY KEY,
    timestamp       timestamp(6) with time zone default current_timestamp(6),
    name            text,
    version         smallint,
    change_set_id   text,
    change_set_kind text,
    user_ref        text,
    payload         jsonb,
    log             jsonb,
    log_refs        text[],
    debounce_count  integer
`

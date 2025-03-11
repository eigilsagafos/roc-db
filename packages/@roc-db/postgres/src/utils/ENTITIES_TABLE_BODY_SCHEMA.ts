export const ENTITIES_TABLE_BODY_SCHEMA = `
    id                   text PRIMARY KEY,
    kind                 text NOT NULL,
    created_at           timestamp(6) with time zone default current_timestamp(6),
    updated_at           timestamp(6) with time zone default current_timestamp(6),
    created_mutation_id  text NOT NULL,
    updated_mutation_id  text NOT NULL,
    data                 jsonb,
    indexed_data         jsonb,
    children             jsonb,
    children_ids         text[],
    children_refs        text[],
    parents              jsonb,
    parent_ids           text[],
    parent_refs          text[],
    ancestors            jsonb,
    ancestor_ids         text[],
    ancestor_refs        text[]
`

CREATE TABLE IF NOT EXISTS host_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    offering_type VARCHAR(20) NOT NULL
    CHECK (offering_type IN ('space', 'event', 'both')),

    space_types TEXT[] NOT NULL DEFAULT '{}',
    categories TEXT[] NOT NULL DEFAULT '{}',
    capacity INTEGER CHECK (capacity > 0),

    notes TEXT NOT NULL DEFAULT '',

    status VARCHAR(20 NOT NULL DEFAULT) 'pending'
    CHECK (status IN('pending', 'approved', 'rejected')),

    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT NOT NULL DEFAULT '',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_host_apps_user_id ON host_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_host_apps_status ON host_applications(status);
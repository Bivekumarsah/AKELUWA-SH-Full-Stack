package httpapi

import (
    "testing"

    "github.com/jackc/pgx/v5/pgconn"
)

// PostgreSQL 18 reports RESTRICT constraint violations as SQLSTATE 23001;
// earlier PostgreSQL versions commonly returned 23503 for this dependency.
func TestCareerApplicationReferenceAcrossPostgresVersions(t *testing.T) {
    for _, sqlState := range []string{"23503", "23001"} {
        err := &pgconn.PgError{
            Code: sqlState,
            ConstraintName: "career_applications_career_id_fkey",
        }
        if !isCareerApplicationReference(err) {
            t.Fatalf("SQLSTATE %s must map to a 409 career reference conflict", sqlState)
        }
    }
    if isCareerApplicationReference(&pgconn.PgError{Code: "23503", ConstraintName: "some_other_fkey"}) {
        t.Fatal("unrelated foreign key constraint must not map to career reference conflict")
    }
    if isCareerApplicationReference(nil) {
        t.Fatal("nil must not be a constraint violation")
    }
}

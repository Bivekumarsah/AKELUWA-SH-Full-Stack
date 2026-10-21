package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

type DocumentNotification struct {
	ID       string
	Kind     string
	Payload  json.RawMessage
	Attempts int
}

func (s *Store) QueueDocumentNotification(ctx context.Context, kind, recordID string, payload any) (string, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	var id string
	err = s.pool.QueryRow(ctx, `INSERT INTO document_notification_outbox (kind, record_id, payload)
		VALUES ($1, $2::uuid, $3::jsonb) RETURNING id::text`, kind, recordID, data).Scan(&id)
	return id, err
}

func (s *Store) ClaimDocumentNotification(ctx context.Context, id string) (DocumentNotification, error) {
	var job DocumentNotification
	err := s.pool.QueryRow(ctx, `WITH candidate AS (
		SELECT id FROM document_notification_outbox
		WHERE sent_at IS NULL AND cancelled_at IS NULL AND next_attempt_at <= now()
			AND (lease_until IS NULL OR lease_until < now())
			AND ($1 = '' OR id = NULLIF($1, '')::uuid)
		ORDER BY next_attempt_at, created_at
		FOR UPDATE SKIP LOCKED LIMIT 1
	)
	UPDATE document_notification_outbox AS n
	SET attempts = n.attempts + 1, lease_until = now() + interval '2 minutes'
	FROM candidate WHERE n.id = candidate.id
	RETURNING n.id::text, n.kind, n.payload, n.attempts`, id).Scan(&job.ID, &job.Kind, &job.Payload, &job.Attempts)
	return job, mapNotFound(err)
}

func (s *Store) FinishDocumentNotification(ctx context.Context, job DocumentNotification, delivered bool) error {
	var result pgconn.CommandTag
	var err error
	if delivered {
		result, err = s.pool.Exec(ctx, `UPDATE document_notification_outbox
			SET sent_at=now(), lease_until=NULL, last_error=NULL
			WHERE id=$1 AND attempts=$2 AND sent_at IS NULL AND cancelled_at IS NULL`, job.ID, job.Attempts)
	} else {
		backoff := time.Duration(1<<min(job.Attempts, 6)) * 30 * time.Second
		result, err = s.pool.Exec(ctx, `UPDATE document_notification_outbox
			SET lease_until=NULL, next_attempt_at=now()+$3::interval, last_error='delivery failed'
			WHERE id=$1 AND attempts=$2 AND sent_at IS NULL AND cancelled_at IS NULL`, job.ID, job.Attempts, fmt.Sprintf("%d seconds", int(backoff.Seconds())))
	}
	if err != nil {
		return err
	}
	if result.RowsAffected() != 1 {
		return errors.New("document notification claim is no longer active")
	}
	return nil
}

func (s *Store) CancelDocumentNotification(ctx context.Context, kind, recordID string) error {
	_, err := s.pool.Exec(ctx, `UPDATE document_notification_outbox SET cancelled_at=now(), lease_until=NULL
		WHERE kind=$1 AND record_id=$2::uuid AND sent_at IS NULL AND cancelled_at IS NULL`, kind, recordID)
	return err
}

func (s *Store) RefreshDocumentNotification(ctx context.Context, kind, recordID string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `UPDATE document_notification_outbox SET payload=$3::jsonb
		WHERE kind=$1 AND record_id=$2::uuid AND sent_at IS NULL AND cancelled_at IS NULL`, kind, recordID, data)
	return err
}

func (s *Store) PurgeDeliveredDocumentNotifications(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM document_notification_outbox
		WHERE COALESCE(sent_at, cancelled_at) < now() - interval '30 days'`)
	return err
}

func (s *Store) DocumentNotificationBacklog(ctx context.Context) (int64, float64, error) {
	var pending int64
	var oldestSeconds float64
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*)::bigint,
		COALESCE(EXTRACT(EPOCH FROM now() - MIN(created_at)), 0)::float8
		FROM document_notification_outbox WHERE sent_at IS NULL AND cancelled_at IS NULL`).Scan(&pending, &oldestSeconds)
	return pending, oldestSeconds, err
}

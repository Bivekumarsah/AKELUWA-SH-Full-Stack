package store

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("record not found")

type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}

func (s *Store) CreateUser(ctx context.Context, name, email, passwordHash, role string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ($1, lower($2), $3, $4)
		RETURNING id::text, name, email, role, created_at
	`, name, email, passwordHash, role).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.CreatedAt)
	return user, err
}

func (s *Store) FindUserByEmail(ctx context.Context, email string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, name, email, role, password_hash, created_at
		FROM users WHERE lower(email) = lower($1)
	`, email).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.PasswordHash, &user.CreatedAt)
	return user, mapNotFound(err)
}

func (s *Store) FindUserByID(ctx context.Context, id string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, name, email, role, created_at
		FROM users WHERE id = $1
	`, id).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.CreatedAt)
	return user, mapNotFound(err)
}

func (s *Store) ListUsers(ctx context.Context) ([]model.User, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, name, email, role, created_at
		FROM users ORDER BY created_at DESC LIMIT 500
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]model.User, 0)
	for rows.Next() {
		var user model.User
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (s *Store) UpdateUserRole(ctx context.Context, id, role string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `
		UPDATE users SET role = $2 WHERE id = $1
		RETURNING id::text, name, email, role, created_at
	`, id, role).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.CreatedAt)
	return user, mapNotFound(err)
}

func (s *Store) ListServices(ctx context.Context, includeInactive bool) ([]model.Service, error) {
	query := `SELECT id::text, number, slug, title, summary, stack, position, active, created_at, updated_at FROM services`
	if !includeInactive {
		query += ` WHERE active = true`
	}
	query += ` ORDER BY position, created_at`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.Service, 0)
	for rows.Next() {
		var item model.Service
		if err := rows.Scan(&item.ID, &item.Number, &item.Slug, &item.Title, &item.Summary, &item.Stack, &item.Position, &item.Active, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) CreateService(ctx context.Context, item model.Service) (model.Service, error) {
	err := s.pool.QueryRow(ctx, `
		INSERT INTO services (number, slug, title, summary, stack, position, active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id::text, number, slug, title, summary, stack, position, active, created_at, updated_at
	`, item.Number, item.Slug, item.Title, item.Summary, item.Stack, item.Position, item.Active).Scan(
		&item.ID, &item.Number, &item.Slug, &item.Title, &item.Summary, &item.Stack, &item.Position, &item.Active, &item.CreatedAt, &item.UpdatedAt,
	)
	return item, err
}

func (s *Store) UpdateService(ctx context.Context, id string, item model.Service) (model.Service, error) {
	err := s.pool.QueryRow(ctx, `
		UPDATE services SET number=$2, slug=$3, title=$4, summary=$5, stack=$6, position=$7, active=$8
		WHERE id=$1
		RETURNING id::text, number, slug, title, summary, stack, position, active, created_at, updated_at
	`, id, item.Number, item.Slug, item.Title, item.Summary, item.Stack, item.Position, item.Active).Scan(
		&item.ID, &item.Number, &item.Slug, &item.Title, &item.Summary, &item.Stack, &item.Position, &item.Active, &item.CreatedAt, &item.UpdatedAt,
	)
	return item, mapNotFound(err)
}

func (s *Store) DeleteService(ctx context.Context, id string) error {
	command, err := s.pool.Exec(ctx, "DELETE FROM services WHERE id=$1", id)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) ListPortfolio(ctx context.Context, includeInactive bool) ([]model.PortfolioItem, error) {
	query := `SELECT id::text, slug, title, summary, technologies, COALESCE(project_url, ''), position, active, created_at, updated_at FROM portfolio_items`
	if !includeInactive {
		query += ` WHERE active = true`
	}
	query += ` ORDER BY position, created_at`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.PortfolioItem, 0)
	for rows.Next() {
		var item model.PortfolioItem
		if err := rows.Scan(&item.ID, &item.Slug, &item.Title, &item.Summary, &item.Technologies, &item.ProjectURL, &item.Position, &item.Active, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) CreatePortfolioItem(ctx context.Context, item model.PortfolioItem) (model.PortfolioItem, error) {
	err := s.pool.QueryRow(ctx, `
		INSERT INTO portfolio_items (slug, title, summary, technologies, project_url, position, active)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7)
		RETURNING id::text, slug, title, summary, technologies, COALESCE(project_url, ''), position, active, created_at, updated_at
	`, item.Slug, item.Title, item.Summary, item.Technologies, item.ProjectURL, item.Position, item.Active).Scan(
		&item.ID, &item.Slug, &item.Title, &item.Summary, &item.Technologies, &item.ProjectURL, &item.Position, &item.Active, &item.CreatedAt, &item.UpdatedAt,
	)
	return item, err
}

func (s *Store) UpdatePortfolioItem(ctx context.Context, id string, item model.PortfolioItem) (model.PortfolioItem, error) {
	err := s.pool.QueryRow(ctx, `
		UPDATE portfolio_items SET slug=$2, title=$3, summary=$4, technologies=$5, project_url=NULLIF($6, ''), position=$7, active=$8
		WHERE id=$1
		RETURNING id::text, slug, title, summary, technologies, COALESCE(project_url, ''), position, active, created_at, updated_at
	`, id, item.Slug, item.Title, item.Summary, item.Technologies, item.ProjectURL, item.Position, item.Active).Scan(
		&item.ID, &item.Slug, &item.Title, &item.Summary, &item.Technologies, &item.ProjectURL, &item.Position, &item.Active, &item.CreatedAt, &item.UpdatedAt,
	)
	return item, mapNotFound(err)
}

func (s *Store) DeletePortfolioItem(ctx context.Context, id string) error {
	command, err := s.pool.Exec(ctx, "DELETE FROM portfolio_items WHERE id=$1", id)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) CreateInquiry(ctx context.Context, item model.Inquiry) (model.Inquiry, error) {
	err := s.pool.QueryRow(ctx, `
		INSERT INTO inquiries (user_id, name, email, company, budget, message)
		VALUES (NULLIF($1, '')::uuid, $2, lower($3), NULLIF($4, ''), NULLIF($5, ''), $6)
		RETURNING id::text, COALESCE(user_id::text, ''), name, email, COALESCE(company, ''), COALESCE(budget, ''), message, status, created_at, updated_at
	`, item.UserID, item.Name, item.Email, item.Company, item.Budget, item.Message).Scan(
		&item.ID, &item.UserID, &item.Name, &item.Email, &item.Company, &item.Budget, &item.Message, &item.Status, &item.CreatedAt, &item.UpdatedAt,
	)
	return item, err
}

func (s *Store) ListInquiries(ctx context.Context, userID string) ([]model.Inquiry, error) {
	query := `SELECT id::text, COALESCE(user_id::text, ''), name, email, COALESCE(company, ''), COALESCE(budget, ''), message, status, created_at, updated_at FROM inquiries`
	args := []any{}
	if strings.TrimSpace(userID) != "" {
		query += ` WHERE user_id = $1`
		args = append(args, userID)
	}
	query += ` ORDER BY created_at DESC LIMIT 1000`
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.Inquiry, 0)
	for rows.Next() {
		var item model.Inquiry
		if err := rows.Scan(&item.ID, &item.UserID, &item.Name, &item.Email, &item.Company, &item.Budget, &item.Message, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) UpdateInquiryStatus(ctx context.Context, id, status string) (model.Inquiry, error) {
	var item model.Inquiry
	err := s.pool.QueryRow(ctx, `
		UPDATE inquiries SET status=$2 WHERE id=$1
		RETURNING id::text, COALESCE(user_id::text, ''), name, email, COALESCE(company, ''), COALESCE(budget, ''), message, status, created_at, updated_at
	`, id, status).Scan(&item.ID, &item.UserID, &item.Name, &item.Email, &item.Company, &item.Budget, &item.Message, &item.Status, &item.CreatedAt, &item.UpdatedAt)
	return item, mapNotFound(err)
}

func (s *Store) DashboardStats(ctx context.Context) (model.DashboardStats, error) {
	var stats model.DashboardStats
	err := s.pool.QueryRow(ctx, `
		SELECT
			(SELECT count(*) FROM users),
			(SELECT count(*) FROM inquiries WHERE status='new'),
			(SELECT count(*) FROM services WHERE active=true),
			(SELECT count(*) FROM portfolio_items WHERE active=true)
	`).Scan(&stats.Users, &stats.NewInquiries, &stats.ActiveServices, &stats.ActiveProjects)
	return stats, err
}

func (s *Store) EnsureAdmin(ctx context.Context, name, email, passwordHash string) error {
	if email == "" {
		return nil
	}
	_, err := s.pool.Exec(ctx, `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ($1, lower($2), $3, 'admin')
		ON CONFLICT DO NOTHING
	`, name, email, passwordHash)
	if err != nil {
		return fmt.Errorf("ensure admin user: %w", err)
	}
	if _, err := s.pool.Exec(ctx, "UPDATE users SET role='admin' WHERE lower(email)=lower($1)", email); err != nil {
		return fmt.Errorf("promote admin user: %w", err)
	}
	return nil
}

func mapNotFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

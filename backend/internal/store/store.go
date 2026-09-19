package store

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound               = errors.New("record not found")
	ErrInvalidAccountingState = errors.New("invalid accounting state")
	ErrInvoiceOverpayment     = errors.New("payment exceeds invoice balance")
)

type databaseQuerier interface {
	Begin(context.Context) (pgx.Tx, error)
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

type Store struct {
	pool databaseQuerier
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) Ping(ctx context.Context) error {
	var value int
	return s.pool.QueryRow(ctx, "SELECT 1").Scan(&value)
}

// Nested transactions use pgx savepoints, keeping failed actions out of the audit commit.
func (s *Store) WithTransaction(ctx context.Context, fn func(*Store) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(context.Background())
	if err := fn(&Store{pool: tx}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Store) CreateUser(ctx context.Context, name, email, passwordHash, role string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ($1, lower($2), $3, $4)
		RETURNING id::text, name, email, role, admin_permissions, account_active,
			mfa_enabled, created_at, avatar_updated_at
	`, name, email, passwordHash, role).Scan(&user.ID, &user.Name, &user.Email, &user.Role,
		&user.AdminPermissions, &user.AccountActive, &user.MFAEnabled, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, err
}

func (s *Store) FindUserByEmail(ctx context.Context, email string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, name, email, role, admin_permissions, account_active, password_hash,
			mfa_secret, mfa_enabled, created_at, avatar_updated_at
		FROM users WHERE lower(email) = lower($1)
	`, email).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.AdminPermissions,
		&user.AccountActive, &user.PasswordHash, &user.MFASecret, &user.MFAEnabled, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, mapNotFound(err)
}

func (s *Store) FindUserByID(ctx context.Context, id string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, name, email, role, admin_permissions, account_active, mfa_secret,
			mfa_enabled, created_at, avatar_updated_at
		FROM users WHERE id = $1
	`, id).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.AdminPermissions,
		&user.AccountActive, &user.MFASecret, &user.MFAEnabled, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, mapNotFound(err)
}

func (s *Store) ListUsers(ctx context.Context) ([]model.User, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, name, email, role, admin_permissions, account_active,
			mfa_enabled, created_at, avatar_updated_at
		FROM users WHERE role <> 'sub_admin' ORDER BY created_at DESC LIMIT 500
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]model.User, 0)
	for rows.Next() {
		var user model.User
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.AdminPermissions,
			&user.AccountActive, &user.MFAEnabled, &user.CreatedAt, &user.AvatarUpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (s *Store) UpdateUserRole(ctx context.Context, id, role string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `
		UPDATE users SET role = $2 WHERE id = $1 AND role <> 'sub_admin'
		RETURNING id::text, name, email, role, admin_permissions, account_active,
			mfa_enabled, created_at, avatar_updated_at
	`, id, role).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.AdminPermissions,
		&user.AccountActive, &user.MFAEnabled, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, mapNotFound(err)
}

func (s *Store) CreateSubAdmin(ctx context.Context, name, email, passwordHash string, permissions []string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `
		INSERT INTO users (name, email, password_hash, role, admin_permissions)
		VALUES ($1, lower($2), $3, 'sub_admin', $4)
		RETURNING id::text, name, email, role, admin_permissions, account_active,
			mfa_enabled, created_at, avatar_updated_at
	`, name, email, passwordHash, permissions).Scan(&user.ID, &user.Name, &user.Email, &user.Role,
		&user.AdminPermissions, &user.AccountActive, &user.MFAEnabled, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, err
}

func (s *Store) ListSubAdmins(ctx context.Context) ([]model.User, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, name, email, role, admin_permissions, account_active,
			mfa_enabled, created_at, avatar_updated_at
		FROM users WHERE role='sub_admin' ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	users := make([]model.User, 0)
	for rows.Next() {
		var user model.User
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.AdminPermissions,
			&user.AccountActive, &user.MFAEnabled, &user.CreatedAt, &user.AvatarUpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (s *Store) UpdateSubAdminAccess(ctx context.Context, id string, permissions []string, active bool) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `
		UPDATE users SET admin_permissions=$2, account_active=$3
		WHERE id=$1 AND role='sub_admin'
		RETURNING id::text, name, email, role, admin_permissions, account_active,
			mfa_enabled, created_at, avatar_updated_at
	`, id, permissions, active).Scan(&user.ID, &user.Name, &user.Email, &user.Role,
		&user.AdminPermissions, &user.AccountActive, &user.MFAEnabled, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, mapNotFound(err)
}

func (s *Store) ListClientUsers(ctx context.Context) ([]model.User, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, name, email, role, admin_permissions, account_active,
			mfa_enabled, created_at, avatar_updated_at
		FROM users WHERE role='user' AND account_active=true ORDER BY name, email LIMIT 500
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	users := make([]model.User, 0)
	for rows.Next() {
		var user model.User
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.AdminPermissions,
			&user.AccountActive, &user.MFAEnabled, &user.CreatedAt, &user.AvatarUpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (s *Store) UpdateProfile(ctx context.Context, id, name string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `UPDATE users SET name=$2 WHERE id=$1 RETURNING id::text,name,email,role,admin_permissions,account_active,mfa_enabled,created_at,avatar_updated_at`, id, name).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.AdminPermissions, &user.AccountActive, &user.MFAEnabled, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, mapNotFound(err)
}
func (s *Store) UpdateAvatar(ctx context.Context, id, contentType string, data []byte) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `UPDATE users SET avatar_data=$2,avatar_type=$3,avatar_updated_at=now() WHERE id=$1 RETURNING id::text,name,email,role,admin_permissions,account_active,mfa_enabled,created_at,avatar_updated_at`, id, data, contentType).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.AdminPermissions, &user.AccountActive, &user.MFAEnabled, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, mapNotFound(err)
}
func (s *Store) RemoveAvatar(ctx context.Context, id string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `UPDATE users SET avatar_data=NULL,avatar_type=NULL,avatar_updated_at=NULL WHERE id=$1 RETURNING id::text,name,email,role,admin_permissions,account_active,mfa_enabled,created_at,avatar_updated_at`, id).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.AdminPermissions, &user.AccountActive, &user.MFAEnabled, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, mapNotFound(err)
}
func (s *Store) UserAvatar(ctx context.Context, id string) (string, []byte, error) {
	var contentType string
	var data []byte
	err := s.pool.QueryRow(ctx, `SELECT avatar_type,avatar_data FROM users WHERE id=$1 AND avatar_data IS NOT NULL`, id).Scan(&contentType, &data)
	return contentType, data, mapNotFound(err)
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

const contractColumns = `id::text, user_id::text, COALESCE(inquiry_id::text, ''), contract_number, title,
	client_name, client_email, COALESCE(client_company, ''), provider_name, currency, amount_cents,
	start_date::text, end_date::text, scope, deliverables, milestones, payment_terms, revision_terms,
	support_terms, ownership_terms, confidentiality_terms, termination_terms, dispute_terms, special_terms,
	status, version, content_hash, provider_signer_name, provider_signature, provider_signed_at,
	client_signer_name, client_signature, client_signed_at, sent_at, created_at, updated_at`

type scanner interface {
	Scan(dest ...any) error
}

func scanContract(row scanner) (model.Contract, error) {
	var item model.Contract
	err := row.Scan(&item.ID, &item.UserID, &item.InquiryID, &item.ContractNumber, &item.Title,
		&item.ClientName, &item.ClientEmail, &item.ClientCompany, &item.ProviderName, &item.Currency, &item.AmountCents,
		&item.StartDate, &item.EndDate, &item.Scope, &item.Deliverables, &item.Milestones, &item.PaymentTerms,
		&item.RevisionTerms, &item.SupportTerms, &item.OwnershipTerms, &item.ConfidentialityTerms,
		&item.TerminationTerms, &item.DisputeTerms, &item.SpecialTerms, &item.Status, &item.Version,
		&item.ContentHash, &item.ProviderSignerName, &item.ProviderSignature, &item.ProviderSignedAt,
		&item.ClientSignerName, &item.ClientSignature, &item.ClientSignedAt, &item.SentAt, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (s *Store) ListContracts(ctx context.Context, userID string) ([]model.Contract, error) {
	query := `SELECT ` + contractColumns + ` FROM contracts`
	args := []any{}
	if userID != "" {
		query += ` WHERE user_id=$1 AND status <> 'draft'`
		args = append(args, userID)
	}
	query += ` ORDER BY created_at DESC LIMIT 500`
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]model.Contract, 0)
	for rows.Next() {
		item, err := scanContract(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) CreateContract(ctx context.Context, item model.Contract) (model.Contract, error) {
	row := s.pool.QueryRow(ctx, `INSERT INTO contracts (
		user_id, inquiry_id, contract_number, title, client_name, client_email, client_company,
		provider_name, currency, amount_cents, start_date, end_date, scope, deliverables, milestones,
		payment_terms, revision_terms, support_terms, ownership_terms, confidentiality_terms,
		termination_terms, dispute_terms, special_terms
	) VALUES ($1, NULLIF($2, '')::uuid, $3, $4, $5, lower($6), NULLIF($7, ''), $8, $9, $10,
		$11::date, $12::date, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
	RETURNING `+contractColumns, item.UserID, item.InquiryID, item.ContractNumber, item.Title, item.ClientName,
		item.ClientEmail, item.ClientCompany, item.ProviderName, item.Currency, item.AmountCents, item.StartDate,
		item.EndDate, item.Scope, item.Deliverables, item.Milestones, item.PaymentTerms, item.RevisionTerms,
		item.SupportTerms, item.OwnershipTerms, item.ConfidentialityTerms, item.TerminationTerms, item.DisputeTerms, item.SpecialTerms)
	return scanContract(row)
}

func (s *Store) UpdateContract(ctx context.Context, id string, item model.Contract) (model.Contract, error) {
	row := s.pool.QueryRow(ctx, `UPDATE contracts SET user_id=$2, inquiry_id=NULLIF($3, '')::uuid,
		contract_number=$4, title=$5, client_name=$6, client_email=lower($7), client_company=NULLIF($8, ''),
		provider_name=$9, currency=$10, amount_cents=$11, start_date=$12::date, end_date=$13::date,
		scope=$14, deliverables=$15, milestones=$16, payment_terms=$17, revision_terms=$18,
		support_terms=$19, ownership_terms=$20, confidentiality_terms=$21, termination_terms=$22,
		dispute_terms=$23, special_terms=$24, version=version+1
		WHERE id=$1 AND status='draft' RETURNING `+contractColumns, id, item.UserID, item.InquiryID,
		item.ContractNumber, item.Title, item.ClientName, item.ClientEmail, item.ClientCompany, item.ProviderName,
		item.Currency, item.AmountCents, item.StartDate, item.EndDate, item.Scope, item.Deliverables, item.Milestones,
		item.PaymentTerms, item.RevisionTerms, item.SupportTerms, item.OwnershipTerms, item.ConfidentialityTerms,
		item.TerminationTerms, item.DisputeTerms, item.SpecialTerms)
	result, err := scanContract(row)
	return result, mapNotFound(err)
}

func (s *Store) SendContract(ctx context.Context, id string) (model.Contract, error) {
	row := s.pool.QueryRow(ctx, `UPDATE contracts SET status='pending', sent_at=now(),
		content_hash=encode(digest(concat_ws('|', contract_number, version::text, title, client_name,
		client_email, provider_name, currency, amount_cents::text, start_date::text, end_date::text,
		scope, deliverables, milestones, payment_terms, revision_terms, support_terms, ownership_terms,
		confidentiality_terms, termination_terms, dispute_terms, special_terms), 'sha256'), 'hex')
		WHERE id=$1 AND status='draft' RETURNING `+contractColumns, id)
	item, err := scanContract(row)
	return item, mapNotFound(err)
}

func (s *Store) SignContract(ctx context.Context, id, userID, party, signerName, signature, ip, agent string) (model.Contract, error) {
	var row pgx.Row
	if party == "provider" {
		row = s.pool.QueryRow(ctx, `UPDATE contracts SET provider_signer_name=$2, provider_signature=$3,
			provider_signed_at=now(), status=CASE WHEN client_signed_at IS NOT NULL THEN 'active' ELSE status END
			WHERE id=$1 AND status IN ('pending','active') AND provider_signed_at IS NULL RETURNING `+contractColumns, id, signerName, signature)
	} else {
		row = s.pool.QueryRow(ctx, `UPDATE contracts SET client_signer_name=$3, client_signature=$4,
			client_signed_at=now(), client_sign_ip=$5, client_sign_user_agent=$6,
			status=CASE WHEN provider_signed_at IS NOT NULL THEN 'active' ELSE status END
			WHERE id=$1 AND user_id=$2 AND status IN ('pending','active') AND client_signed_at IS NULL RETURNING `+contractColumns,
			id, userID, signerName, signature, ip, agent)
	}
	item, err := scanContract(row)
	return item, mapNotFound(err)
}

func (s *Store) UpdateContractStatus(ctx context.Context, id, status string) (model.Contract, error) {
	allowedState := "status='active'"
	if status == "cancelled" {
		allowedState = "status IN ('pending','active')"
	}
	row := s.pool.QueryRow(ctx, `UPDATE contracts SET status=$2 WHERE id=$1 AND `+allowedState+` RETURNING `+contractColumns, id, status)
	item, err := scanContract(row)
	return item, mapNotFound(err)
}

func (s *Store) ListDownloads(ctx context.Context, includeInactive bool) ([]model.Download, error) {
	query := `SELECT id::text, title, description, file_name, content_type, file_size, active, position, download_count, created_at, updated_at FROM downloads`
	if !includeInactive {
		query += ` WHERE active=true`
	}
	query += ` ORDER BY position, created_at DESC`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]model.Download, 0)
	for rows.Next() {
		var item model.Download
		if err := rows.Scan(&item.ID, &item.Title, &item.Description, &item.FileName, &item.ContentType, &item.FileSize, &item.Active, &item.Position, &item.DownloadCount, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) CreateDownload(ctx context.Context, item model.Download, data []byte) (model.Download, error) {
	err := s.pool.QueryRow(ctx, `INSERT INTO downloads (title, description, file_name, content_type, file_size, file_data, active, position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text, title, description, file_name, content_type, file_size, active, position, download_count, created_at, updated_at`, item.Title, item.Description, item.FileName, item.ContentType, item.FileSize, data, item.Active, item.Position).Scan(&item.ID, &item.Title, &item.Description, &item.FileName, &item.ContentType, &item.FileSize, &item.Active, &item.Position, &item.DownloadCount, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (s *Store) UpdateDownload(ctx context.Context, id string, item model.Download) (model.Download, error) {
	err := s.pool.QueryRow(ctx, `UPDATE downloads SET title=$2, description=$3, active=$4, position=$5 WHERE id=$1 RETURNING id::text, title, description, file_name, content_type, file_size, active, position, download_count, created_at, updated_at`, id, item.Title, item.Description, item.Active, item.Position).Scan(&item.ID, &item.Title, &item.Description, &item.FileName, &item.ContentType, &item.FileSize, &item.Active, &item.Position, &item.DownloadCount, &item.CreatedAt, &item.UpdatedAt)
	return item, mapNotFound(err)
}

func (s *Store) DeleteDownload(ctx context.Context, id string) error {
	command, err := s.pool.Exec(ctx, `DELETE FROM downloads WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) DownloadFile(ctx context.Context, id string) (model.Download, []byte, error) {
	var item model.Download
	var data []byte
	err := s.pool.QueryRow(ctx, `UPDATE downloads SET download_count=download_count+1 WHERE id=$1 AND active=true RETURNING id::text, title, description, file_name, content_type, file_size, active, position, download_count, created_at, updated_at, file_data`, id).Scan(&item.ID, &item.Title, &item.Description, &item.FileName, &item.ContentType, &item.FileSize, &item.Active, &item.Position, &item.DownloadCount, &item.CreatedAt, &item.UpdatedAt, &data)
	return item, data, mapNotFound(err)
}

func (s *Store) ListCareers(ctx context.Context, includeInactive bool) ([]model.Career, error) {
	query := `SELECT id::text, title, department, location, employment_type, summary, responsibilities, requirements, apply_email, COALESCE(deadline::text,''), active, position, created_at, updated_at FROM careers`
	if !includeInactive {
		query += ` WHERE active=true AND (deadline IS NULL OR deadline >= CURRENT_DATE)`
	}
	query += ` ORDER BY position, created_at DESC`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]model.Career, 0)
	for rows.Next() {
		var item model.Career
		if err := rows.Scan(&item.ID, &item.Title, &item.Department, &item.Location, &item.EmploymentType, &item.Summary, &item.Responsibilities, &item.Requirements, &item.ApplyEmail, &item.Deadline, &item.Active, &item.Position, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) CreateCareer(ctx context.Context, item model.Career) (model.Career, error) {
	err := s.pool.QueryRow(ctx, `INSERT INTO careers (title,department,location,employment_type,summary,responsibilities,requirements,apply_email,deadline,active,position) VALUES ($1,$2,$3,$4,$5,$6,$7,lower($8),NULLIF($9,'')::date,$10,$11) RETURNING id::text,title,department,location,employment_type,summary,responsibilities,requirements,apply_email,COALESCE(deadline::text,''),active,position,created_at,updated_at`, item.Title, item.Department, item.Location, item.EmploymentType, item.Summary, item.Responsibilities, item.Requirements, item.ApplyEmail, item.Deadline, item.Active, item.Position).Scan(&item.ID, &item.Title, &item.Department, &item.Location, &item.EmploymentType, &item.Summary, &item.Responsibilities, &item.Requirements, &item.ApplyEmail, &item.Deadline, &item.Active, &item.Position, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (s *Store) UpdateCareer(ctx context.Context, id string, item model.Career) (model.Career, error) {
	err := s.pool.QueryRow(ctx, `UPDATE careers SET title=$2,department=$3,location=$4,employment_type=$5,summary=$6,responsibilities=$7,requirements=$8,apply_email=lower($9),deadline=NULLIF($10,'')::date,active=$11,position=$12 WHERE id=$1 RETURNING id::text,title,department,location,employment_type,summary,responsibilities,requirements,apply_email,COALESCE(deadline::text,''),active,position,created_at,updated_at`, id, item.Title, item.Department, item.Location, item.EmploymentType, item.Summary, item.Responsibilities, item.Requirements, item.ApplyEmail, item.Deadline, item.Active, item.Position).Scan(&item.ID, &item.Title, &item.Department, &item.Location, &item.EmploymentType, &item.Summary, &item.Responsibilities, &item.Requirements, &item.ApplyEmail, &item.Deadline, &item.Active, &item.Position, &item.CreatedAt, &item.UpdatedAt)
	return item, mapNotFound(err)
}

func (s *Store) DeleteCareer(ctx context.Context, id string) error {
	command, err := s.pool.Exec(ctx, `DELETE FROM careers WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

const applicationColumns = `a.id::text, a.career_id::text, c.title, a.full_name, a.email, a.phone, a.location,
	COALESCE(a.linkedin_url,''), COALESCE(a.portfolio_url,''), a.cover_note, a.resume_name, a.resume_type,
	a.resume_size, a.status, a.consent_at, a.created_at, a.updated_at`

func (s *Store) CreateCareerApplication(ctx context.Context, item model.CareerApplication, resume []byte, sourceIP string) (model.CareerApplication, error) {
	row := s.pool.QueryRow(ctx, `INSERT INTO career_applications (career_id,full_name,email,phone,location,linkedin_url,portfolio_url,cover_note,resume_name,resume_type,resume_size,resume_data,source_ip)
		SELECT id,$2,lower($3),$4,$5,NULLIF($6,''),NULLIF($7,''),$8,$9,$10,$11,$12,$13 FROM careers WHERE id=$1 AND active=true AND (deadline IS NULL OR deadline>=CURRENT_DATE)
		RETURNING id::text`, item.CareerID, item.FullName, item.Email, item.Phone, item.Location, item.LinkedInURL, item.PortfolioURL, item.CoverNote, item.ResumeName, item.ResumeType, item.ResumeSize, resume, sourceIP)
	var id string
	if err := row.Scan(&id); err != nil {
		return item, mapNotFound(err)
	}
	return s.FindCareerApplication(ctx, id)
}

func (s *Store) FindCareerApplication(ctx context.Context, id string) (model.CareerApplication, error) {
	var item model.CareerApplication
	err := s.pool.QueryRow(ctx, `SELECT `+applicationColumns+` FROM career_applications a JOIN careers c ON c.id=a.career_id WHERE a.id=$1`, id).Scan(&item.ID, &item.CareerID, &item.CareerTitle, &item.FullName, &item.Email, &item.Phone, &item.Location, &item.LinkedInURL, &item.PortfolioURL, &item.CoverNote, &item.ResumeName, &item.ResumeType, &item.ResumeSize, &item.Status, &item.ConsentAt, &item.CreatedAt, &item.UpdatedAt)
	return item, mapNotFound(err)
}

func (s *Store) ListCareerApplications(ctx context.Context) ([]model.CareerApplication, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+applicationColumns+` FROM career_applications a JOIN careers c ON c.id=a.career_id ORDER BY a.created_at DESC LIMIT 1000`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]model.CareerApplication, 0)
	for rows.Next() {
		var item model.CareerApplication
		if err := rows.Scan(&item.ID, &item.CareerID, &item.CareerTitle, &item.FullName, &item.Email, &item.Phone, &item.Location, &item.LinkedInURL, &item.PortfolioURL, &item.CoverNote, &item.ResumeName, &item.ResumeType, &item.ResumeSize, &item.Status, &item.ConsentAt, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) UpdateCareerApplicationStatus(ctx context.Context, id, status string) (model.CareerApplication, error) {
	command, err := s.pool.Exec(ctx, `UPDATE career_applications SET status=$2 WHERE id=$1`, id, status)
	if err != nil {
		return model.CareerApplication{}, err
	}
	if command.RowsAffected() == 0 {
		return model.CareerApplication{}, ErrNotFound
	}
	return s.FindCareerApplication(ctx, id)
}
func (s *Store) CareerResume(ctx context.Context, id string) (model.CareerApplication, []byte, error) {
	item, err := s.FindCareerApplication(ctx, id)
	if err != nil {
		return item, nil, err
	}
	var data []byte
	err = s.pool.QueryRow(ctx, `SELECT resume_data FROM career_applications WHERE id=$1`, id).Scan(&data)
	return item, data, mapNotFound(err)
}
func (s *Store) DeleteCareerApplication(ctx context.Context, id string) error {
	command, err := s.pool.Exec(ctx, `DELETE FROM career_applications WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) SetUserMFASecret(ctx context.Context, id string, secret []byte) error {
	command, err := s.pool.Exec(ctx, `UPDATE users SET mfa_secret=$2, mfa_enabled=false WHERE id=$1`, id, secret)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) EnableUserMFA(ctx context.Context, id string) error {
	command, err := s.pool.Exec(ctx, `UPDATE users SET mfa_enabled=true WHERE id=$1 AND mfa_secret IS NOT NULL`, id)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) CreateAdminAuditLog(ctx context.Context, item model.AdminAuditLog) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO admin_audit_logs (actor_id, method, path, status, source_ip, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, item.ActorID, item.Method, item.Path, item.Status, item.SourceIP, item.UserAgent)
	return err
}

func (s *Store) ListAdminAuditLogs(ctx context.Context) ([]model.AdminAuditLog, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT l.id, COALESCE(l.actor_id::text, ''), COALESCE(u.name, ''), l.method,
			l.path, l.status, l.source_ip, l.user_agent, l.created_at
		FROM admin_audit_logs l
		LEFT JOIN users u ON u.id=l.actor_id
		ORDER BY l.created_at DESC
		LIMIT 500
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]model.AdminAuditLog, 0)
	for rows.Next() {
		var item model.AdminAuditLog
		if err := rows.Scan(&item.ID, &item.ActorID, &item.ActorName, &item.Method, &item.Path, &item.Status, &item.SourceIP, &item.UserAgent, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

const adminActionRequestColumns = `r.id::text, r.requester_id::text, requester.name, r.action,
	r.target_id::text, r.target_label, r.status, COALESCE(r.reviewed_by::text, ''),
	COALESCE(reviewer.name, ''), r.review_note, r.failure_message, r.created_at, r.reviewed_at`

func scanAdminActionRequest(row pgx.Row) (model.AdminActionRequest, error) {
	var item model.AdminActionRequest
	err := row.Scan(&item.ID, &item.RequesterID, &item.RequesterName, &item.Action,
		&item.TargetID, &item.TargetLabel, &item.Status, &item.ReviewedBy,
		&item.ReviewerName, &item.ReviewNote, &item.FailureMessage, &item.CreatedAt, &item.ReviewedAt)
	return item, err
}

func (s *Store) adminActionRequest(ctx context.Context, id string) (model.AdminActionRequest, error) {
	item, err := scanAdminActionRequest(s.pool.QueryRow(ctx, `SELECT `+adminActionRequestColumns+`
		FROM admin_action_requests r
		JOIN users requester ON requester.id=r.requester_id
		LEFT JOIN users reviewer ON reviewer.id=r.reviewed_by
		WHERE r.id=$1`, id))
	return item, mapNotFound(err)
}

func (s *Store) CreateAdminActionRequest(ctx context.Context, requesterID, action, targetID, targetLabel string) (model.AdminActionRequest, error) {
	var id string
	err := s.pool.QueryRow(ctx, `INSERT INTO admin_action_requests (requester_id, action, target_id, target_label)
		VALUES ($1,$2,$3,$4) RETURNING id::text`, requesterID, action, targetID, targetLabel).Scan(&id)
	if err != nil {
		return model.AdminActionRequest{}, err
	}
	return s.adminActionRequest(ctx, id)
}

func (s *Store) ListAdminActionRequests(ctx context.Context) ([]model.AdminActionRequest, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+adminActionRequestColumns+`
		FROM admin_action_requests r
		JOIN users requester ON requester.id=r.requester_id
		LEFT JOIN users reviewer ON reviewer.id=r.reviewed_by
		ORDER BY CASE WHEN r.status='pending' THEN 0 ELSE 1 END, r.created_at DESC
		LIMIT 500`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]model.AdminActionRequest, 0)
	for rows.Next() {
		item, err := scanAdminActionRequest(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) ClaimAdminActionRequest(ctx context.Context, id, reviewerID string) (model.AdminActionRequest, error) {
	command, err := s.pool.Exec(ctx, `UPDATE admin_action_requests
		SET status='processing', reviewed_by=$2, reviewed_at=now()
		WHERE id=$1 AND status='pending'`, id, reviewerID)
	if err != nil {
		return model.AdminActionRequest{}, err
	}
	if command.RowsAffected() == 0 {
		return model.AdminActionRequest{}, ErrNotFound
	}
	return s.adminActionRequest(ctx, id)
}

func (s *Store) CompleteAdminActionRequest(ctx context.Context, id, status, note, failureMessage string) (model.AdminActionRequest, error) {
	command, err := s.pool.Exec(ctx, `UPDATE admin_action_requests
		SET status=$2, review_note=$3, failure_message=$4
		WHERE id=$1 AND status='processing'`, id, status, note, failureMessage)
	if err != nil {
		return model.AdminActionRequest{}, err
	}
	if command.RowsAffected() == 0 {
		return model.AdminActionRequest{}, ErrNotFound
	}
	return s.adminActionRequest(ctx, id)
}

func (s *Store) RejectAdminActionRequest(ctx context.Context, id, reviewerID, note string) (model.AdminActionRequest, error) {
	command, err := s.pool.Exec(ctx, `UPDATE admin_action_requests
		SET status='rejected', reviewed_by=$2, reviewed_at=now(), review_note=$3
		WHERE id=$1 AND status='pending'`, id, reviewerID, note)
	if err != nil {
		return model.AdminActionRequest{}, err
	}
	if command.RowsAffected() == 0 {
		return model.AdminActionRequest{}, ErrNotFound
	}
	return s.adminActionRequest(ctx, id)
}

func (s *Store) AdminActionTargetLabel(ctx context.Context, action, targetID string) (string, error) {
	queries := map[string]string{
		"service.delete":            `SELECT title FROM services WHERE id=$1`,
		"portfolio.delete":          `SELECT title FROM portfolio_items WHERE id=$1`,
		"download.delete":           `SELECT title FROM downloads WHERE id=$1`,
		"career.delete":             `SELECT title FROM careers WHERE id=$1`,
		"career_application.delete": `SELECT full_name FROM career_applications WHERE id=$1`,
		"invoice.void":              `SELECT invoice_number FROM accounting_invoices WHERE id=$1`,
		"transaction.void":          `SELECT COALESCE(NULLIF(receipt_number,''),NULLIF(reference,''),description) FROM accounting_transactions WHERE id=$1`,
	}
	query, ok := queries[action]
	if !ok {
		return "", ErrNotFound
	}
	var label string
	err := s.pool.QueryRow(ctx, query, targetID).Scan(&label)
	return label, mapNotFound(err)
}

const companyAccountColumns = `display_name, legal_name, tagline, tagline_meaning, primary_email, support_email,
	careers_email, phone, website_url, registration_number, tax_id, address_line, city, region,
	postal_code, country, timezone, currency, linkedin_url, github_url, created_at, updated_at`

func (s *Store) CompanyAccount(ctx context.Context) (model.CompanyAccount, error) {
	var item model.CompanyAccount
	err := s.pool.QueryRow(ctx, `SELECT `+companyAccountColumns+` FROM company_account WHERE singleton=true`).Scan(
		&item.DisplayName, &item.LegalName, &item.Tagline, &item.TaglineMeaning, &item.PrimaryEmail, &item.SupportEmail,
		&item.CareersEmail, &item.Phone, &item.WebsiteURL, &item.RegistrationNumber, &item.TaxID,
		&item.AddressLine, &item.City, &item.Region, &item.PostalCode, &item.Country, &item.Timezone,
		&item.Currency, &item.LinkedInURL, &item.GitHubURL, &item.CreatedAt, &item.UpdatedAt,
	)
	return item, mapNotFound(err)
}

func (s *Store) UpdateCompanyAccount(ctx context.Context, item model.CompanyAccount) (model.CompanyAccount, error) {
	err := s.pool.QueryRow(ctx, `
		UPDATE company_account SET display_name=$1, legal_name=$2, tagline=$3, tagline_meaning=$4,
			primary_email=lower($5), support_email=lower($6), careers_email=lower($7), phone=$8,
			website_url=$9, registration_number=$10, tax_id=$11, address_line=$12, city=$13,
			region=$14, postal_code=$15, country=$16, timezone=$17, currency=$18,
			linkedin_url=$19, github_url=$20
		WHERE singleton=true
		RETURNING `+companyAccountColumns,
		item.DisplayName, item.LegalName, item.Tagline, item.TaglineMeaning, item.PrimaryEmail, item.SupportEmail,
		item.CareersEmail, item.Phone, item.WebsiteURL, item.RegistrationNumber, item.TaxID,
		item.AddressLine, item.City, item.Region, item.PostalCode, item.Country, item.Timezone,
		item.Currency, item.LinkedInURL, item.GitHubURL,
	).Scan(
		&item.DisplayName, &item.LegalName, &item.Tagline, &item.TaglineMeaning, &item.PrimaryEmail, &item.SupportEmail,
		&item.CareersEmail, &item.Phone, &item.WebsiteURL, &item.RegistrationNumber, &item.TaxID,
		&item.AddressLine, &item.City, &item.Region, &item.PostalCode, &item.Country, &item.Timezone,
		&item.Currency, &item.LinkedInURL, &item.GitHubURL, &item.CreatedAt, &item.UpdatedAt,
	)
	return item, mapNotFound(err)
}

const invoiceColumns = `i.id::text, COALESCE(i.contract_id::text, ''), COALESCE(i.user_id::text, ''), i.invoice_number, i.client_name,
	i.client_email, i.client_company, i.issue_date::text, i.due_date::text, i.currency, i.subtotal_cents,
	i.tax_cents, i.discount_cents, i.total_cents, i.notes, i.status, i.created_at, i.updated_at`

func (s *Store) ListInvoices(ctx context.Context) ([]model.Invoice, error) {
	return s.listInvoices(ctx, "")
}

func (s *Store) ListInvoicesForUser(ctx context.Context, userID string) ([]model.Invoice, error) {
	return s.listInvoices(ctx, userID)
}

func (s *Store) listInvoices(ctx context.Context, userID string) ([]model.Invoice, error) {
	if _, err := s.pool.Exec(ctx, `UPDATE accounting_invoices SET status='overdue'
		WHERE status IN ('sent','partial') AND due_date < CURRENT_DATE`); err != nil {
		return nil, err
	}
	query := `SELECT ` + invoiceColumns + `,
		COALESCE(SUM(t.amount_cents) FILTER (WHERE t.status='posted'), 0)::bigint AS paid_cents
		FROM accounting_invoices i
		LEFT JOIN accounting_transactions t ON t.invoice_id=i.id AND t.direction='income'`
	args := []any{}
	if userID != "" {
		query += ` WHERE i.user_id=$1`
		args = append(args, userID)
	}
	query += ` GROUP BY i.id ORDER BY i.issue_date DESC, i.created_at DESC LIMIT 500`
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]model.Invoice, 0)
	for rows.Next() {
		var item model.Invoice
		if err := rows.Scan(&item.ID, &item.ContractID, &item.UserID, &item.InvoiceNumber, &item.ClientName, &item.ClientEmail,
			&item.ClientCompany, &item.IssueDate, &item.DueDate, &item.Currency, &item.SubtotalCents,
			&item.TaxCents, &item.DiscountCents, &item.TotalCents, &item.Notes, &item.Status,
			&item.CreatedAt, &item.UpdatedAt, &item.PaidCents); err != nil {
			return nil, err
		}
		item.BalanceCents = item.TotalCents - item.PaidCents
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()
	for index := range items {
		item := &items[index]
		lineRows, err := s.pool.Query(ctx, `SELECT id::text, description, quantity::float8, unit_price_cents, position
			FROM accounting_invoice_items WHERE invoice_id=$1 ORDER BY position, id`, item.ID)
		if err != nil {
			return nil, err
		}
		item.Items = make([]model.InvoiceItem, 0)
		for lineRows.Next() {
			var line model.InvoiceItem
			if err := lineRows.Scan(&line.ID, &line.Description, &line.Quantity, &line.UnitPriceCents, &line.Position); err != nil {
				lineRows.Close()
				return nil, err
			}
			item.Items = append(item.Items, line)
		}
		if err := lineRows.Err(); err != nil {
			lineRows.Close()
			return nil, err
		}
		lineRows.Close()
	}
	return items, nil
}

func (s *Store) CreateInvoice(ctx context.Context, item model.Invoice) (model.Invoice, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return item, err
	}
	defer tx.Rollback(ctx)
	err = tx.QueryRow(ctx, `INSERT INTO accounting_invoices (
		contract_id, user_id, invoice_number, client_name, client_email, client_company, issue_date, due_date,
		currency, subtotal_cents, tax_cents, discount_cents, total_cents, notes
	) VALUES (NULLIF($1,'')::uuid,NULLIF($2,'')::uuid,$3,$4,lower($5),$6,$7::date,$8::date,$9,$10,$11,$12,$13,$14)
	RETURNING id::text, created_at, updated_at, status`, item.ContractID, item.UserID, item.InvoiceNumber, item.ClientName,
		item.ClientEmail, item.ClientCompany, item.IssueDate, item.DueDate, item.Currency, item.SubtotalCents,
		item.TaxCents, item.DiscountCents, item.TotalCents, item.Notes).Scan(&item.ID, &item.CreatedAt, &item.UpdatedAt, &item.Status)
	if err != nil {
		return item, err
	}
	for index := range item.Items {
		line := &item.Items[index]
		err = tx.QueryRow(ctx, `INSERT INTO accounting_invoice_items (invoice_id,description,quantity,unit_price_cents,position)
			VALUES ($1,$2,$3,$4,$5) RETURNING id::text`, item.ID, line.Description, line.Quantity,
			line.UnitPriceCents, line.Position).Scan(&line.ID)
		if err != nil {
			return item, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return item, err
	}
	item.PaidCents = 0
	item.BalanceCents = item.TotalCents
	return item, nil
}

const accountingTransactionColumns = `t.id::text, COALESCE(t.invoice_id::text,''), COALESCE(i.invoice_number,''),
	t.direction, t.category, t.description, t.counterparty, t.amount_cents, t.currency, t.payment_method,
	t.reference, COALESCE(t.receipt_number,''), t.transaction_date::text, t.notes, t.status, t.created_at, t.updated_at`

func (s *Store) ListAccountingTransactions(ctx context.Context) ([]model.AccountingTransaction, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+accountingTransactionColumns+`
		FROM accounting_transactions t LEFT JOIN accounting_invoices i ON i.id=t.invoice_id
		ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT 1000`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]model.AccountingTransaction, 0)
	for rows.Next() {
		item, err := scanAccountingTransaction(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func scanAccountingTransaction(row pgx.Row) (model.AccountingTransaction, error) {
	var item model.AccountingTransaction
	err := row.Scan(&item.ID, &item.InvoiceID, &item.InvoiceNumber, &item.Direction, &item.Category,
		&item.Description, &item.Counterparty, &item.AmountCents, &item.Currency, &item.PaymentMethod,
		&item.Reference, &item.ReceiptNumber, &item.TransactionDate, &item.Notes, &item.Status,
		&item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (s *Store) CreateAccountingTransaction(ctx context.Context, item model.AccountingTransaction) (model.AccountingTransaction, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return item, err
	}
	defer tx.Rollback(ctx)
	if item.InvoiceID != "" {
		var total, paid int64
		var currency, status string
		err = tx.QueryRow(ctx, `SELECT total_cents, currency, status FROM accounting_invoices
			WHERE id=$1 FOR UPDATE`, item.InvoiceID).Scan(&total, &currency, &status)
		if errors.Is(err, pgx.ErrNoRows) {
			return item, ErrNotFound
		}
		if err != nil {
			return item, err
		}
		if err := tx.QueryRow(ctx, `SELECT COALESCE(SUM(amount_cents),0)::bigint FROM accounting_transactions
			WHERE invoice_id=$1 AND status='posted'`, item.InvoiceID).Scan(&paid); err != nil {
			return item, err
		}
		if status == "void" || item.Direction != "income" || item.Currency != currency {
			return item, ErrInvalidAccountingState
		}
		if item.AmountCents > total-paid {
			return item, ErrInvoiceOverpayment
		}
	}
	row := tx.QueryRow(ctx, `INSERT INTO accounting_transactions (
		invoice_id,direction,category,description,counterparty,amount_cents,currency,payment_method,
		reference,receipt_number,transaction_date,notes
	) VALUES (NULLIF($1,'')::uuid,$2,$3,$4,$5,$6,$7,$8,$9,
		CASE WHEN $2='income' THEN 'RCT-' || to_char($10::date,'YYYY') || '-' || lpad(nextval('accounting_receipt_number_seq')::text,6,'0') ELSE NULL END,
		$10::date,$11) RETURNING id::text`, item.InvoiceID, item.Direction, item.Category, item.Description,
		item.Counterparty, item.AmountCents, item.Currency, item.PaymentMethod, item.Reference,
		item.TransactionDate, item.Notes)
	if err := row.Scan(&item.ID); err != nil {
		return item, err
	}
	if item.InvoiceID != "" {
		if err := refreshInvoiceStatus(ctx, tx, item.InvoiceID); err != nil {
			return item, err
		}
	}
	item, err = scanAccountingTransaction(tx.QueryRow(ctx, `SELECT `+accountingTransactionColumns+`
		FROM accounting_transactions t LEFT JOIN accounting_invoices i ON i.id=t.invoice_id WHERE t.id=$1`, item.ID))
	if err != nil {
		return item, err
	}
	if err := tx.Commit(ctx); err != nil {
		return item, err
	}
	return item, nil
}

func refreshInvoiceStatus(ctx context.Context, tx pgx.Tx, invoiceID string) error {
	_, err := tx.Exec(ctx, `UPDATE accounting_invoices i SET status=CASE
		WHEN i.status='void' THEN 'void'
		WHEN COALESCE(p.paid,0) >= i.total_cents THEN 'paid'
		WHEN i.due_date < CURRENT_DATE THEN 'overdue'
		WHEN COALESCE(p.paid,0) > 0 THEN 'partial'
		ELSE 'sent' END
		FROM (SELECT invoice_id, SUM(amount_cents) FILTER (WHERE status='posted') AS paid
			FROM accounting_transactions WHERE invoice_id=$1 GROUP BY invoice_id) p
		WHERE i.id=$1 AND p.invoice_id=i.id`, invoiceID)
	return err
}

func (s *Store) VoidAccountingTransaction(ctx context.Context, id string) (model.AccountingTransaction, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return model.AccountingTransaction{}, err
	}
	defer tx.Rollback(ctx)
	var invoiceID string
	err = tx.QueryRow(ctx, `UPDATE accounting_transactions SET status='void' WHERE id=$1 AND status='posted'
		RETURNING COALESCE(invoice_id::text,'')`, id).Scan(&invoiceID)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.AccountingTransaction{}, ErrNotFound
	}
	if err != nil {
		return model.AccountingTransaction{}, err
	}
	if invoiceID != "" {
		if err := refreshInvoiceStatus(ctx, tx, invoiceID); err != nil {
			return model.AccountingTransaction{}, err
		}
	}
	item, err := scanAccountingTransaction(tx.QueryRow(ctx, `SELECT `+accountingTransactionColumns+`
		FROM accounting_transactions t LEFT JOIN accounting_invoices i ON i.id=t.invoice_id WHERE t.id=$1`, id))
	if err != nil {
		return item, err
	}
	if err := tx.Commit(ctx); err != nil {
		return item, err
	}
	return item, nil
}

func (s *Store) VoidInvoice(ctx context.Context, id string) (model.Invoice, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return model.Invoice{}, err
	}
	defer tx.Rollback(ctx)
	var currentStatus string
	if err := tx.QueryRow(ctx, `SELECT status FROM accounting_invoices WHERE id=$1 FOR UPDATE`, id).Scan(&currentStatus); errors.Is(err, pgx.ErrNoRows) {
		return model.Invoice{}, ErrNotFound
	} else if err != nil {
		return model.Invoice{}, err
	}
	if currentStatus == "void" {
		return model.Invoice{}, ErrNotFound
	}
	var paymentCount int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM accounting_transactions
		WHERE invoice_id=$1 AND status='posted'`, id).Scan(&paymentCount); err != nil {
		return model.Invoice{}, err
	}
	if paymentCount > 0 {
		return model.Invoice{}, ErrInvalidAccountingState
	}
	command, err := tx.Exec(ctx, `UPDATE accounting_invoices SET status='void' WHERE id=$1 AND status<>'void'`, id)
	if err != nil {
		return model.Invoice{}, err
	}
	if command.RowsAffected() == 0 {
		return model.Invoice{}, ErrNotFound
	}
	if err := tx.Commit(ctx); err != nil {
		return model.Invoice{}, err
	}
	invoices, err := s.ListInvoices(ctx)
	if err != nil {
		return model.Invoice{}, err
	}
	for _, item := range invoices {
		if item.ID == id {
			return item, nil
		}
	}
	return model.Invoice{}, ErrNotFound
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
	if _, err := s.pool.Exec(ctx, "UPDATE users SET role='admin', account_active=true WHERE lower(email)=lower($1)", email); err != nil {
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

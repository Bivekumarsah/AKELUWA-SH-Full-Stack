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
		RETURNING id::text, name, email, role, created_at, avatar_updated_at
	`, name, email, passwordHash, role).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, err
}

func (s *Store) FindUserByEmail(ctx context.Context, email string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, name, email, role, password_hash, created_at, avatar_updated_at
		FROM users WHERE lower(email) = lower($1)
	`, email).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.PasswordHash, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, mapNotFound(err)
}

func (s *Store) FindUserByID(ctx context.Context, id string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `
		SELECT id::text, name, email, role, created_at, avatar_updated_at
		FROM users WHERE id = $1
	`, id).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, mapNotFound(err)
}

func (s *Store) ListUsers(ctx context.Context) ([]model.User, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, name, email, role, created_at, avatar_updated_at
		FROM users ORDER BY created_at DESC LIMIT 500
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]model.User, 0)
	for rows.Next() {
		var user model.User
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.CreatedAt, &user.AvatarUpdatedAt); err != nil {
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
		RETURNING id::text, name, email, role, created_at, avatar_updated_at
	`, id, role).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, mapNotFound(err)
}

func (s *Store) UpdateProfile(ctx context.Context, id, name string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `UPDATE users SET name=$2 WHERE id=$1 RETURNING id::text,name,email,role,created_at,avatar_updated_at`, id, name).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, mapNotFound(err)
}
func (s *Store) UpdateAvatar(ctx context.Context, id, contentType string, data []byte) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `UPDATE users SET avatar_data=$2,avatar_type=$3,avatar_updated_at=now() WHERE id=$1 RETURNING id::text,name,email,role,created_at,avatar_updated_at`, id, data, contentType).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.CreatedAt, &user.AvatarUpdatedAt)
	return user, mapNotFound(err)
}
func (s *Store) RemoveAvatar(ctx context.Context, id string) (model.User, error) {
	var user model.User
	err := s.pool.QueryRow(ctx, `UPDATE users SET avatar_data=NULL,avatar_type=NULL,avatar_updated_at=NULL WHERE id=$1 RETURNING id::text,name,email,role,created_at,avatar_updated_at`, id).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.CreatedAt, &user.AvatarUpdatedAt)
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
	row := s.pool.QueryRow(ctx, `UPDATE contracts SET status=$2 WHERE id=$1 AND status <> 'draft' RETURNING `+contractColumns, id, status)
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

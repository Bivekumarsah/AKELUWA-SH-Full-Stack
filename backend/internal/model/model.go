package model

import "time"

type User struct {
	ID              string     `json:"id"`
	Name            string     `json:"name"`
	Email           string     `json:"email"`
	Role            string     `json:"role"`
	PasswordHash    string     `json:"-"`
	CreatedAt       time.Time  `json:"created_at"`
	AvatarUpdatedAt *time.Time `json:"avatar_updated_at,omitempty"`
}

type Service struct {
	ID        string    `json:"id"`
	Number    string    `json:"number"`
	Slug      string    `json:"slug"`
	Title     string    `json:"title"`
	Summary   string    `json:"summary"`
	Stack     string    `json:"stack"`
	Position  int       `json:"position"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type PortfolioItem struct {
	ID           string    `json:"id"`
	Slug         string    `json:"slug"`
	Title        string    `json:"title"`
	Summary      string    `json:"summary"`
	Technologies string    `json:"technologies"`
	ProjectURL   string    `json:"project_url,omitempty"`
	Position     int       `json:"position"`
	Active       bool      `json:"active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Inquiry struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id,omitempty"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Company   string    `json:"company,omitempty"`
	Budget    string    `json:"budget,omitempty"`
	Message   string    `json:"message"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type DashboardStats struct {
	Users          int64 `json:"users"`
	NewInquiries   int64 `json:"new_inquiries"`
	ActiveServices int64 `json:"active_services"`
	ActiveProjects int64 `json:"active_projects"`
}

type Contract struct {
	ID                   string     `json:"id"`
	UserID               string     `json:"user_id"`
	InquiryID            string     `json:"inquiry_id,omitempty"`
	ContractNumber       string     `json:"contract_number"`
	Title                string     `json:"title"`
	ClientName           string     `json:"client_name"`
	ClientEmail          string     `json:"client_email"`
	ClientCompany        string     `json:"client_company,omitempty"`
	ProviderName         string     `json:"provider_name"`
	Currency             string     `json:"currency"`
	AmountCents          int64      `json:"amount_cents"`
	StartDate            string     `json:"start_date"`
	EndDate              string     `json:"end_date"`
	Scope                string     `json:"scope"`
	Deliverables         string     `json:"deliverables"`
	Milestones           string     `json:"milestones"`
	PaymentTerms         string     `json:"payment_terms"`
	RevisionTerms        string     `json:"revision_terms"`
	SupportTerms         string     `json:"support_terms"`
	OwnershipTerms       string     `json:"ownership_terms"`
	ConfidentialityTerms string     `json:"confidentiality_terms"`
	TerminationTerms     string     `json:"termination_terms"`
	DisputeTerms         string     `json:"dispute_terms"`
	SpecialTerms         string     `json:"special_terms"`
	Status               string     `json:"status"`
	Version              int        `json:"version"`
	ContentHash          string     `json:"content_hash"`
	ProviderSignerName   string     `json:"provider_signer_name"`
	ProviderSignature    string     `json:"provider_signature,omitempty"`
	ProviderSignedAt     *time.Time `json:"provider_signed_at,omitempty"`
	ClientSignerName     string     `json:"client_signer_name"`
	ClientSignature      string     `json:"client_signature,omitempty"`
	ClientSignedAt       *time.Time `json:"client_signed_at,omitempty"`
	SentAt               *time.Time `json:"sent_at,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

type Download struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	FileName      string    `json:"file_name"`
	ContentType   string    `json:"content_type"`
	FileSize      int64     `json:"file_size"`
	Active        bool      `json:"active"`
	Position      int       `json:"position"`
	DownloadCount int64     `json:"download_count"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type Career struct {
	ID               string    `json:"id"`
	Title            string    `json:"title"`
	Department       string    `json:"department"`
	Location         string    `json:"location"`
	EmploymentType   string    `json:"employment_type"`
	Summary          string    `json:"summary"`
	Responsibilities string    `json:"responsibilities"`
	Requirements     string    `json:"requirements"`
	ApplyEmail       string    `json:"apply_email"`
	Deadline         string    `json:"deadline,omitempty"`
	Active           bool      `json:"active"`
	Position         int       `json:"position"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type CareerApplication struct {
	ID           string    `json:"id"`
	CareerID     string    `json:"career_id"`
	CareerTitle  string    `json:"career_title"`
	FullName     string    `json:"full_name"`
	Email        string    `json:"email"`
	Phone        string    `json:"phone"`
	Location     string    `json:"location"`
	LinkedInURL  string    `json:"linkedin_url,omitempty"`
	PortfolioURL string    `json:"portfolio_url,omitempty"`
	CoverNote    string    `json:"cover_note"`
	ResumeName   string    `json:"resume_name"`
	ResumeType   string    `json:"resume_type"`
	ResumeSize   int64     `json:"resume_size"`
	Status       string    `json:"status"`
	ConsentAt    time.Time `json:"consent_at"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

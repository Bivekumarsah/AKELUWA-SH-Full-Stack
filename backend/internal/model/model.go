package model

import "time"

type User struct {
	ID               string     `json:"id"`
	Name             string     `json:"name"`
	Email            string     `json:"email"`
	Role             string     `json:"role"`
	AdminPermissions []string   `json:"admin_permissions"`
	AccountActive    bool       `json:"account_active"`
	PasswordHash     string     `json:"-"`
	MFASecret        []byte     `json:"-"`
	MFAEnabled       bool       `json:"mfa_enabled"`
	CreatedAt        time.Time  `json:"created_at"`
	AvatarUpdatedAt  *time.Time `json:"avatar_updated_at,omitempty"`
}

type AdminAuditLog struct {
	ID        int64     `json:"id"`
	ActorID   string    `json:"actor_id,omitempty"`
	ActorName string    `json:"actor_name,omitempty"`
	Method    string    `json:"method"`
	Path      string    `json:"path"`
	Status    int       `json:"status"`
	SourceIP  string    `json:"source_ip"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
}

type AdminActionRequest struct {
	ID             string     `json:"id"`
	RequesterID    string     `json:"requester_id"`
	RequesterName  string     `json:"requester_name"`
	Action         string     `json:"action"`
	TargetID       string     `json:"target_id"`
	TargetLabel    string     `json:"target_label"`
	Status         string     `json:"status"`
	ReviewedBy     string     `json:"reviewed_by,omitempty"`
	ReviewerName   string     `json:"reviewer_name,omitempty"`
	ReviewNote     string     `json:"review_note"`
	FailureMessage string     `json:"failure_message"`
	CreatedAt      time.Time  `json:"created_at"`
	ReviewedAt     *time.Time `json:"reviewed_at,omitempty"`
}

type CompanyAccount struct {
	DisplayName        string    `json:"display_name"`
	LegalName          string    `json:"legal_name"`
	Tagline            string    `json:"tagline"`
	TaglineMeaning     string    `json:"tagline_meaning"`
	PrimaryEmail       string    `json:"primary_email"`
	SupportEmail       string    `json:"support_email"`
	CareersEmail       string    `json:"careers_email"`
	Phone              string    `json:"phone"`
	WebsiteURL         string    `json:"website_url"`
	RegistrationNumber string    `json:"registration_number"`
	TaxID              string    `json:"tax_id"`
	AddressLine        string    `json:"address_line"`
	City               string    `json:"city"`
	Region             string    `json:"region"`
	PostalCode         string    `json:"postal_code"`
	Country            string    `json:"country"`
	Timezone           string    `json:"timezone"`
	Currency           string    `json:"currency"`
	LinkedInURL        string    `json:"linkedin_url"`
	GitHubURL          string    `json:"github_url"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type CompanyBrand struct {
	DisplayName    string `json:"display_name"`
	Tagline        string `json:"tagline"`
	TaglineMeaning string `json:"tagline_meaning"`
}

type InvoiceItem struct {
	ID             string  `json:"id"`
	Description    string  `json:"description"`
	Quantity       float64 `json:"quantity"`
	UnitPriceCents int64   `json:"unit_price_cents"`
	Position       int     `json:"position"`
}

type Invoice struct {
	ID            string        `json:"id"`
	ContractID    string        `json:"contract_id,omitempty"`
	UserID        string        `json:"user_id,omitempty"`
	InvoiceNumber string        `json:"invoice_number"`
	ClientName    string        `json:"client_name"`
	ClientEmail   string        `json:"client_email"`
	ClientCompany string        `json:"client_company,omitempty"`
	IssueDate     string        `json:"issue_date"`
	DueDate       string        `json:"due_date"`
	Currency      string        `json:"currency"`
	SubtotalCents int64         `json:"subtotal_cents"`
	TaxCents      int64         `json:"tax_cents"`
	DiscountCents int64         `json:"discount_cents"`
	TotalCents    int64         `json:"total_cents"`
	PaidCents     int64         `json:"paid_cents"`
	BalanceCents  int64         `json:"balance_cents"`
	Notes         string        `json:"notes"`
	Status        string        `json:"status"`
	Items         []InvoiceItem `json:"items"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

type AccountingTransaction struct {
	ID              string    `json:"id"`
	InvoiceID       string    `json:"invoice_id,omitempty"`
	InvoiceNumber   string    `json:"invoice_number,omitempty"`
	Direction       string    `json:"direction"`
	Category        string    `json:"category"`
	Description     string    `json:"description"`
	Counterparty    string    `json:"counterparty"`
	AmountCents     int64     `json:"amount_cents"`
	Currency        string    `json:"currency"`
	PaymentMethod   string    `json:"payment_method"`
	Reference       string    `json:"reference"`
	ReceiptNumber   string    `json:"receipt_number,omitempty"`
	TransactionDate string    `json:"transaction_date"`
	Notes           string    `json:"notes"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type AccountingSummary struct {
	Currency        string `json:"currency"`
	IncomeCents     int64  `json:"income_cents"`
	ExpenseCents    int64  `json:"expense_cents"`
	NetCents        int64  `json:"net_cents"`
	ReceivableCents int64  `json:"receivable_cents"`
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

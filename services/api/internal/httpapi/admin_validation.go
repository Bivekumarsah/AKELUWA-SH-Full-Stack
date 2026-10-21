package httpapi

import (
	"math"
	"net/http"
	"strings"
	"time"
	"github.com/akeluwa/software-hub/backend/internal/model"
)

func (a *API) decodeCareer(w http.ResponseWriter, r *http.Request) (model.Career, bool) {
	var item model.Career
	if !a.decode(w, r, &item) {
		return model.Career{}, false
	}
	item.Title = strings.TrimSpace(item.Title)
	item.Department = strings.TrimSpace(item.Department)
	item.Location = strings.TrimSpace(item.Location)
	item.EmploymentType = strings.TrimSpace(item.EmploymentType)
	item.Summary = strings.TrimSpace(item.Summary)
	item.Responsibilities = strings.TrimSpace(item.Responsibilities)
	item.Requirements = strings.TrimSpace(item.Requirements)
	item.ApplyEmail = strings.ToLower(strings.TrimSpace(item.ApplyEmail))
	validDeadline := true
	if item.Deadline != "" {
		_, err := time.Parse("2006-01-02", item.Deadline)
		validDeadline = err == nil
	}
	if len(item.Title) < 2 || len(item.Title) > 180 || len(item.Department) < 2 || len(item.Department) > 100 || len(item.Location) < 2 || len(item.Location) > 120 || len(item.EmploymentType) < 2 || len(item.EmploymentType) > 80 || len(item.Summary) < 10 || len(item.Summary) > 2000 || len(item.Responsibilities) < 10 || len(item.Responsibilities) > 10000 || len(item.Requirements) < 10 || len(item.Requirements) > 10000 || !validEmail(item.ApplyEmail) || !validDeadline {
		writeError(w, http.StatusUnprocessableEntity, "career fields are incomplete or invalid")
		return model.Career{}, false
	}
	return item, true
}

func (a *API) decodeCompanyAccount(w http.ResponseWriter, r *http.Request) (model.CompanyAccount, bool) {
	var item model.CompanyAccount
	if !a.decode(w, r, &item) {
		return model.CompanyAccount{}, false
	}
	item.DisplayName = strings.TrimSpace(item.DisplayName)
	item.LegalName = strings.TrimSpace(item.LegalName)
	item.Tagline = strings.TrimSpace(item.Tagline)
	item.TaglineMeaning = strings.TrimSpace(item.TaglineMeaning)
	item.PrimaryEmail = strings.ToLower(strings.TrimSpace(item.PrimaryEmail))
	item.SupportEmail = strings.ToLower(strings.TrimSpace(item.SupportEmail))
	item.CareersEmail = strings.ToLower(strings.TrimSpace(item.CareersEmail))
	item.Phone = strings.TrimSpace(item.Phone)
	item.WebsiteURL = strings.TrimSpace(item.WebsiteURL)
	item.RegistrationNumber = strings.TrimSpace(item.RegistrationNumber)
	item.TaxID = strings.TrimSpace(item.TaxID)
	item.AddressLine = strings.TrimSpace(item.AddressLine)
	item.City = strings.TrimSpace(item.City)
	item.Region = strings.TrimSpace(item.Region)
	item.PostalCode = strings.TrimSpace(item.PostalCode)
	item.Country = strings.TrimSpace(item.Country)
	item.Timezone = strings.TrimSpace(item.Timezone)
	item.Currency = strings.ToUpper(strings.TrimSpace(item.Currency))
	item.LinkedInURL = strings.TrimSpace(item.LinkedInURL)
	item.GitHubURL = strings.TrimSpace(item.GitHubURL)

	_, timezoneError := time.LoadLocation(item.Timezone)
	validOptionalEmail := func(value string) bool { return value == "" || validEmail(value) }
	if len(item.DisplayName) < 2 || len(item.DisplayName) > 120 ||
		len(item.LegalName) < 2 || len(item.LegalName) > 180 || len(item.Tagline) > 300 || len(item.TaglineMeaning) > 500 ||
		!validEmail(item.PrimaryEmail) || !validOptionalEmail(item.SupportEmail) || !validOptionalEmail(item.CareersEmail) ||
		len(item.Phone) > 60 || !validOptionalURL(item.WebsiteURL) || len(item.RegistrationNumber) > 120 ||
		len(item.TaxID) > 120 || len(item.AddressLine) > 240 || len(item.City) > 100 || len(item.Region) > 100 ||
		len(item.PostalCode) > 30 || len(item.Country) < 2 || len(item.Country) > 100 || timezoneError != nil ||
		!currencyPattern.MatchString(item.Currency) || !validOptionalURL(item.LinkedInURL) || !validOptionalURL(item.GitHubURL) {
		writeError(w, http.StatusUnprocessableEntity, "company account fields are incomplete or invalid")
		return model.CompanyAccount{}, false
	}
	return item, true
}

func (a *API) decodeInvoice(w http.ResponseWriter, r *http.Request) (model.Invoice, bool) {
	var item model.Invoice
	if !a.decode(w, r, &item) {
		return model.Invoice{}, false
	}
	item.ContractID = strings.TrimSpace(item.ContractID)
	item.UserID = strings.TrimSpace(item.UserID)
	item.InvoiceNumber = strings.ToUpper(strings.TrimSpace(item.InvoiceNumber))
	item.ClientName = strings.TrimSpace(item.ClientName)
	item.ClientEmail = strings.ToLower(strings.TrimSpace(item.ClientEmail))
	item.ClientCompany = strings.TrimSpace(item.ClientCompany)
	item.Currency = strings.ToUpper(strings.TrimSpace(item.Currency))
	item.Notes = strings.TrimSpace(item.Notes)
	issueDate, issueError := time.Parse("2006-01-02", item.IssueDate)
	dueDate, dueError := time.Parse("2006-01-02", item.DueDate)
	if len(item.InvoiceNumber) < 2 || len(item.InvoiceNumber) > 80 || !invoiceNumberPattern.MatchString(item.InvoiceNumber) ||
		(item.ContractID != "" && !uuidPattern.MatchString(item.ContractID)) || (item.UserID != "" && !uuidPattern.MatchString(item.UserID)) || len(item.ClientName) < 2 ||
		len(item.ClientName) > 180 || !validEmail(item.ClientEmail) || len(item.ClientCompany) > 180 ||
		!currencyPattern.MatchString(item.Currency) || issueError != nil || dueError != nil ||
		dueDate.Before(issueDate) || len(item.Notes) > 3000 || len(item.Items) == 0 || len(item.Items) > 100 ||
		item.TaxCents < 0 || item.DiscountCents < 0 {
		writeError(w, http.StatusUnprocessableEntity, "invoice fields are incomplete or invalid")
		return model.Invoice{}, false
	}
	item.SubtotalCents = 0
	for index := range item.Items {
		line := &item.Items[index]
		line.Description = strings.TrimSpace(line.Description)
		line.Position = index
		if len(line.Description) < 2 || len(line.Description) > 500 || line.Quantity <= 0 ||
			line.Quantity > 1000000 || line.UnitPriceCents < 0 {
			writeError(w, http.StatusUnprocessableEntity, "invoice line items are incomplete or invalid")
			return model.Invoice{}, false
		}
		item.SubtotalCents += int64(math.Round(line.Quantity * float64(line.UnitPriceCents)))
	}
	item.TotalCents = item.SubtotalCents + item.TaxCents - item.DiscountCents
	if item.TotalCents <= 0 {
		writeError(w, http.StatusUnprocessableEntity, "invoice total must be greater than zero")
		return model.Invoice{}, false
	}
	return item, true
}

func (a *API) decodeAccountingTransaction(w http.ResponseWriter, r *http.Request) (model.AccountingTransaction, bool) {
	var item model.AccountingTransaction
	if !a.decode(w, r, &item) {
		return model.AccountingTransaction{}, false
	}
	item.InvoiceID = strings.TrimSpace(item.InvoiceID)
	item.Category = strings.TrimSpace(item.Category)
	item.Description = strings.TrimSpace(item.Description)
	item.Counterparty = strings.TrimSpace(item.Counterparty)
	item.Currency = strings.ToUpper(strings.TrimSpace(item.Currency))
	item.PaymentMethod = strings.TrimSpace(item.PaymentMethod)
	item.Reference = strings.TrimSpace(item.Reference)
	item.Notes = strings.TrimSpace(item.Notes)
	_, dateError := time.Parse("2006-01-02", item.TransactionDate)
	validDirection := item.Direction == "income" || item.Direction == "expense"
	validMethod := map[string]bool{"cash": true, "bank_transfer": true, "card": true, "mobile_wallet": true, "cheque": true, "other": true}
	if !validDirection || (item.InvoiceID != "" && !uuidPattern.MatchString(item.InvoiceID)) ||
		(item.Direction == "expense" && item.InvoiceID != "") || len(item.Category) < 2 ||
		len(item.Category) > 100 || len(item.Description) < 2 || len(item.Description) > 500 ||
		len(item.Counterparty) < 2 || len(item.Counterparty) > 180 || item.AmountCents <= 0 ||
		!currencyPattern.MatchString(item.Currency) || !validMethod[item.PaymentMethod] || len(item.Reference) > 180 ||
		dateError != nil || len(item.Notes) > 3000 {
		writeError(w, http.StatusUnprocessableEntity, "transaction fields are incomplete or invalid")
		return model.AccountingTransaction{}, false
	}
	return item, true
}

func (a *API) decodeService(w http.ResponseWriter, r *http.Request) (model.Service, bool) {
	var item model.Service
	if !a.decode(w, r, &item) {
		return model.Service{}, false
	}
	item.Number = strings.TrimSpace(item.Number)
	item.Slug = strings.ToLower(strings.TrimSpace(item.Slug))
	item.Title = strings.TrimSpace(item.Title)
	item.Summary = strings.TrimSpace(item.Summary)
	item.Stack = strings.TrimSpace(item.Stack)
	if item.Number == "" || len(item.Number) > 10 || !slugPattern.MatchString(item.Slug) || len(item.Title) < 2 || len(item.Title) > 140 || len(item.Summary) < 10 || len(item.Summary) > 1000 || len(item.Stack) < 2 || len(item.Stack) > 300 {
		writeError(w, http.StatusUnprocessableEntity, "service fields are incomplete or invalid")
		return model.Service{}, false
	}
	return item, true
}

func (a *API) decodePortfolio(w http.ResponseWriter, r *http.Request) (model.PortfolioItem, bool) {
	var item model.PortfolioItem
	if !a.decode(w, r, &item) {
		return model.PortfolioItem{}, false
	}
	item.Slug = strings.ToLower(strings.TrimSpace(item.Slug))
	item.Title = strings.TrimSpace(item.Title)
	item.Summary = strings.TrimSpace(item.Summary)
	item.Technologies = strings.TrimSpace(item.Technologies)
	item.ProjectURL = strings.TrimSpace(item.ProjectURL)
	if !slugPattern.MatchString(item.Slug) || len(item.Title) < 2 || len(item.Title) > 160 || len(item.Summary) < 10 || len(item.Summary) > 1200 || len(item.Technologies) < 2 || len(item.Technologies) > 300 || !validOptionalURL(item.ProjectURL) {
		writeError(w, http.StatusUnprocessableEntity, "portfolio fields are incomplete or invalid")
		return model.PortfolioItem{}, false
	}
	return item, true
}

package httpapi

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net/url"
	"strings"
	"time"

	"github.com/akeluwa/software-hub/backend/internal/auth"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

var errInvalidContractClient = errors.New("invalid contract client")

func resolveContractClient(ctx context.Context, data *store.Store, item model.Contract) (model.User, bool, error) {
	if item.UserID != "" {
		user, err := data.FindUserByID(ctx, item.UserID)
		if err != nil {
			if errors.Is(err, store.ErrNotFound) {
				return model.User{}, false, errInvalidContractClient
			}
			return model.User{}, false, err
		}
		if user.Role != "user" || !user.AccountActive || !strings.EqualFold(user.Email, item.ClientEmail) {
			return model.User{}, false, errInvalidContractClient
		}
		return user, false, nil
	}

	randomPassword, _, err := auth.GenerateAccountToken()
	if err != nil {
		return model.User{}, false, err
	}
	passwordHash, err := auth.HashPassword(randomPassword)
	if err != nil {
		return model.User{}, false, err
	}
	user, created, err := data.EnsureClientUser(ctx, item.ClientName, item.ClientEmail, passwordHash)
	if err != nil {
		return model.User{}, false, err
	}
	if user.Role != "user" || !user.AccountActive {
		return model.User{}, false, errInvalidContractClient
	}
	return user, created, nil
}

func companyContractIdentity(ctx context.Context, data *store.Store, item model.Contract) (model.Contract, error) {
	company, err := data.CompanyAccount(ctx)
	if err != nil {
		return model.Contract{}, err
	}
	item.ProviderName = company.DisplayName
	item.ProviderLegalName = company.LegalName
	item.ProviderEmail = company.PrimaryEmail
	item.ProviderPhone = company.Phone
	item.ProviderWebsite = company.WebsiteURL
	item.ProviderRegistration = company.RegistrationNumber
	item.ProviderTaxID = company.TaxID
	addressParts := make([]string, 0, 5)
	for _, part := range []string{company.AddressLine, company.City, company.Region, company.PostalCode, company.Country} {
		if strings.TrimSpace(part) != "" {
			addressParts = append(addressParts, strings.TrimSpace(part))
		}
	}
	item.ProviderAddress = strings.Join(addressParts, ", ")
	return item, nil
}

func (a *API) accountAccessInstructions(ctx context.Context, user model.User) (string, error) {
	if user.EmailVerifiedAt != nil {
		return fmt.Sprintf("Sign in with %s to view the document:\n%s/account", user.Email, a.cfg.FrontendURL), nil
	}
	raw, hash, err := auth.GenerateAccountToken()
	if err != nil {
		return "", err
	}
	const lifetime = 24 * time.Hour
	if err := a.store.ReplaceAccountToken(ctx, user.ID, "password_reset", hash, time.Now().UTC().Add(lifetime)); err != nil {
		return "", err
	}
	link, _ := url.Parse(a.cfg.FrontendURL + "/reset-password")
	query := link.Query()
	query.Set("token", raw)
	link.RawQuery = query.Encode()
	return fmt.Sprintf("A secure client account has been prepared for %s. Set your password with this one-time link:\n%s\n\nThe link expires in 24 hours. AKELUWA SH will never email you a password.", user.Email, link.String()), nil
}

func (a *API) sendContractNotification(ctx context.Context, client model.User, item model.Contract, published bool) error {
	access, err := a.accountAccessInstructions(ctx, client)
	if err != nil {
		return err
	}
	subject, body := contractNotificationCopy(item, access, published)
	return a.email.Send(ctx, item.ClientEmail, subject, body)
}

func contractNotificationCopy(item model.Contract, access string, published bool) (string, string) {
	state := "prepared as a draft"
	action := "AKELUWA SH will notify you again when the agreement is ready to review and sign."
	subject := fmt.Sprintf("Contract %s prepared by AKELUWA SH", item.ContractNumber)
	if published {
		state = "published and ready for review"
		action = "Open your client account to review the complete agreement and provide your signature."
		subject = fmt.Sprintf("Contract %s is ready for review", item.ContractNumber)
	}
	body := fmt.Sprintf(`Hello %s,

Your contract with AKELUWA SH has been %s.

Contract number: %s
Project: %s
Project period: %s to %s
Contract value: %s
Status: %s

%s

%s

For security, confirm that links use the official AKELUWA SH website before entering account information.`,
		item.ClientName, state, item.ContractNumber, item.Title, item.StartDate, item.EndDate,
		formatEmailMoney(item.Currency, item.AmountCents), item.Status, action, access)
	return subject, body
}

func (a *API) sendInvoiceNotification(ctx context.Context, item model.Invoice) error {
	access := "This invoice was issued to this email address. Contact AKELUWA SH if any detail is incorrect."
	if item.UserID != "" {
		client, err := a.store.FindUserByID(ctx, item.UserID)
		if err != nil {
			return err
		}
		access, err = a.accountAccessInstructions(ctx, client)
		if err != nil {
			return err
		}
	}
	subject, body := invoiceNotificationCopy(item, access)
	return a.email.Send(ctx, item.ClientEmail, subject, body)
}

func invoiceNotificationCopy(item model.Invoice, access string) (string, string) {
	lines := make([]string, 0, len(item.Items))
	for _, line := range item.Items {
		amount := int64(math.Round(line.Quantity * float64(line.UnitPriceCents)))
		lines = append(lines, fmt.Sprintf("- %s: %g x %s = %s", line.Description, line.Quantity,
			formatEmailMoney(item.Currency, line.UnitPriceCents), formatEmailMoney(item.Currency, amount)))
	}
	subject := fmt.Sprintf("Invoice %s from AKELUWA SH", item.InvoiceNumber)
	body := fmt.Sprintf(`Hello %s,

AKELUWA SH has issued an invoice to you.

Invoice number: %s
Issue date: %s
Due date: %s
Status: %s

Items:
%s

Subtotal: %s
Tax: %s
Discount: %s
Total: %s
Balance due: %s

%s

Contact AKELUWA SH before making payment if any invoice information is incorrect.`,
		item.ClientName, item.InvoiceNumber, item.IssueDate, item.DueDate, item.Status,
		strings.Join(lines, "\n"), formatEmailMoney(item.Currency, item.SubtotalCents),
		formatEmailMoney(item.Currency, item.TaxCents), formatEmailMoney(item.Currency, item.DiscountCents),
		formatEmailMoney(item.Currency, item.TotalCents), formatEmailMoney(item.Currency, item.BalanceCents), access)
	return subject, body
}

func formatEmailMoney(currency string, cents int64) string {
	return fmt.Sprintf("%s %.2f", currency, float64(cents)/100)
}

func notificationWarning(sent bool) string {
	if sent {
		return ""
	}
	return "The record was saved, but email delivery failed. Check SMTP before notifying the client again."
}

package httpapi

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
	"github.com/akeluwa/software-hub/backend/internal/auth"
	"github.com/akeluwa/software-hub/backend/internal/model"
	"github.com/akeluwa/software-hub/backend/internal/store"
)

func (a *API) register(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	if len(input.Name) < 2 || len(input.Name) > 120 || !validEmail(input.Email) || len(input.Password) < 12 || len(input.Password) > 72 {
		writeError(w, http.StatusUnprocessableEntity, "provide a valid name, email, and password of 12 to 72 characters")
		return
	}
	hash, err := auth.HashPassword(input.Password)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	user, err := a.store.CreateUser(r.Context(), input.Name, input.Email, hash, "user")
	if err != nil {
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "an account already exists for this email")
			return
		}
		a.internalError(w, r, err)
		return
	}
	if err := a.sendAccountToken(r.Context(), user, "email_verification", 24*time.Hour); err != nil {
		a.logger.Error("send registration verification email", "user_id", user.ID, "error", err)
		writeError(w, http.StatusServiceUnavailable, "account created, but verification email delivery failed; use resend verification")
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"message": "Check your email to verify your account."})
}

func (a *API) verifyEmail(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Token string `json:"token"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	hash, ok := auth.AccountTokenHash(input.Token)
	if !ok {
		writeError(w, http.StatusUnprocessableEntity, "verification link is invalid or expired")
		return
	}
	user, err := a.store.VerifyEmailToken(r.Context(), hash)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusUnprocessableEntity, "verification link is invalid or expired")
		return
	}
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	if err := a.startSession(w, user, false); err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (a *API) resendVerification(w http.ResponseWriter, r *http.Request) {
	email, ok := a.decodeAccountEmail(w, r)
	if !ok {
		return
	}
	user, err := a.store.FindUserByEmail(r.Context(), email)
	if err == nil && user.AccountActive && user.EmailVerifiedAt == nil {
		if sendErr := a.sendAccountToken(r.Context(), user, "email_verification", 24*time.Hour); sendErr != nil {
			a.logger.Error("resend verification email", "user_id", user.ID, "error", sendErr)
		}
	} else if err != nil && !errors.Is(err, store.ErrNotFound) {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"message": "If the account is eligible, a verification email has been sent."})
}

func (a *API) requestPasswordReset(w http.ResponseWriter, r *http.Request) {
	email, ok := a.decodeAccountEmail(w, r)
	if !ok {
		return
	}
	user, err := a.store.FindUserByEmail(r.Context(), email)
	if err == nil && user.AccountActive && user.Role == "user" {
		if sendErr := a.sendAccountToken(r.Context(), user, "password_reset", 30*time.Minute); sendErr != nil {
			a.logger.Error("send password reset email", "user_id", user.ID, "error", sendErr)
		}
	} else if err != nil && !errors.Is(err, store.ErrNotFound) {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"message": "If the account exists, password reset instructions have been sent."})
}

func (a *API) confirmPasswordReset(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	hash, ok := auth.AccountTokenHash(input.Token)
	if !ok || len(input.Password) < 12 || len(input.Password) > 72 {
		writeError(w, http.StatusUnprocessableEntity, "provide a valid reset link and a password of 12 to 72 characters")
		return
	}
	passwordHash, err := auth.HashPassword(input.Password)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	user, err := a.store.ResetPasswordWithToken(r.Context(), hash, passwordHash)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusUnprocessableEntity, "password reset link is invalid or expired")
		return
	}
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.clearSession(w)
	a.recordSecurityAudit(r, user.ID, "/api/v1/auth/password-reset/complete", http.StatusOK)
	writeJSON(w, http.StatusOK, map[string]any{"message": "Password updated. Sign in with your new password."})
}

func (a *API) decodeAccountEmail(w http.ResponseWriter, r *http.Request) (string, bool) {
	var input struct {
		Email string `json:"email"`
	}
	if !a.decode(w, r, &input) {
		return "", false
	}
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	if !validEmail(input.Email) {
		writeError(w, http.StatusUnprocessableEntity, "provide a valid email address")
		return "", false
	}
	return input.Email, true
}

func (a *API) sendAccountToken(ctx context.Context, user model.User, purpose string, lifetime time.Duration) error {
	raw, hash, err := auth.GenerateAccountToken()
	if err != nil {
		return err
	}
	if err := a.store.ReplaceAccountToken(ctx, user.ID, purpose, hash, time.Now().UTC().Add(lifetime)); err != nil {
		return err
	}
	path := "/verify-email"
	subject := "Verify your AKELUWA SH account"
	intro := "Verify your email address to activate your AKELUWA SH account."
	if purpose == "password_reset" {
		path = "/reset-password"
		subject = "Reset your AKELUWA SH password"
		intro = "Use this one-time link to reset your AKELUWA SH account password."
	}
	link, _ := url.Parse(a.cfg.FrontendURL + path)
	query := link.Query()
	query.Set("token", raw)
	link.RawQuery = query.Encode()
	body := fmt.Sprintf("Hello %s,\n\n%s\n\n%s\n\nThis link expires in %s. If you did not request this, you can ignore this email.\n", user.Name, intro, link.String(), lifetime.Round(time.Minute))
	return a.email.Send(ctx, user.Email, subject, body)
}

func (a *API) login(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	user, err := a.store.FindUserByEmail(r.Context(), strings.TrimSpace(input.Email))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		a.internalError(w, r, err)
		return
	}
	if !auth.CheckPassword(user.PasswordHash, input.Password) {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	if !user.AccountActive {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	if user.Role == "user" && user.EmailVerifiedAt == nil {
		writeError(w, http.StatusForbidden, "verify your email address before signing in")
		return
	}
	user.PasswordHash = ""
	if isPrivilegedRole(user.Role) {
		secret := ""
		enrollmentRequired := !user.MFAEnabled
		if len(user.MFASecret) == 0 {
			var err error
			secret, err = auth.GenerateTOTPSecret()
			if err != nil {
				a.internalError(w, r, err)
				return
			}
			encrypted, err := a.mfaSecrets.Encrypt(secret)
			if err != nil {
				a.internalError(w, r, err)
				return
			}
			if err := a.store.SetUserMFASecret(r.Context(), user.ID, encrypted); err != nil {
				a.internalError(w, r, err)
				return
			}
		} else if enrollmentRequired {
			var err error
			secret, err = a.mfaSecrets.Decrypt(user.MFASecret)
			if err != nil {
				a.internalError(w, r, err)
				return
			}
		}
		challenge, err := a.tokens.IssueMFAChallenge(user.ID, user.SessionVersion)
		if err != nil {
			a.internalError(w, r, err)
			return
		}
		response := map[string]any{
			"mfa_required":        true,
			"enrollment_required": enrollmentRequired,
			"challenge_token":     challenge,
		}
		if enrollmentRequired {
			response["secret"] = secret
			response["otpauth_uri"] = auth.TOTPURI(secret, user.Email, "AKELUWA SH")
		}
		writeJSON(w, http.StatusAccepted, response)
		return
	}
	if err := a.startSession(w, user, false); err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (a *API) verifyMFA(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ChallengeToken string `json:"challenge_token"`
		Code           string `json:"code"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	claims, err := a.tokens.ParseMFAChallenge(strings.TrimSpace(input.ChallengeToken))
	if err != nil {
		writeError(w, http.StatusUnauthorized, "MFA challenge expired; sign in again")
		return
	}
	user, err := a.store.FindUserByID(r.Context(), claims.UserID)
	if err != nil || !user.AccountActive || !isPrivilegedRole(user.Role) || len(user.MFASecret) == 0 || user.SessionVersion != claims.SessionVersion {
		writeError(w, http.StatusUnauthorized, "MFA challenge is no longer valid")
		return
	}
	secret, err := a.mfaSecrets.Decrypt(user.MFASecret)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	valid := auth.ValidateTOTP(secret, input.Code, time.Now().UTC())
	recoveryCodeUsed := false
	if !valid && user.MFAEnabled {
		if hash, ok := auth.RecoveryCodeHash(input.Code); ok {
			valid, err = a.store.ConsumeMFARecoveryCode(r.Context(), user.ID, hash)
			if err != nil {
				a.internalError(w, r, err)
				return
			}
			recoveryCodeUsed = valid
		}
	}
	if !valid {
		writeError(w, http.StatusUnauthorized, "invalid authenticator or recovery code")
		return
	}
	var recoveryCodes []string
	if !user.MFAEnabled {
		var hashes [][]byte
		recoveryCodes, hashes, err = newRecoveryCodes()
		if err != nil {
			a.internalError(w, r, err)
			return
		}
		if err := a.store.EnableUserMFAWithRecoveryCodes(r.Context(), user.ID, hashes); err != nil {
			a.internalError(w, r, err)
			return
		}
		user.MFAEnabled = true
	}
	if err := a.startSession(w, user, true); err != nil {
		a.internalError(w, r, err)
		return
	}
	if recoveryCodeUsed {
		a.recordSecurityAudit(r, user.ID, "/api/v1/auth/mfa/recovery-code-used", http.StatusOK)
	}
	response := map[string]any{"user": user}
	if len(recoveryCodes) > 0 {
		response["recovery_codes"] = recoveryCodes
	}
	writeJSON(w, http.StatusOK, response)
}

func (a *API) regenerateMFARecoveryCodes(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Code string `json:"code"`
	}
	if !a.decode(w, r, &input) {
		return
	}
	user, ok := r.Context().Value(adminUserKey).(model.User)
	if !ok || len(user.MFASecret) == 0 {
		writeError(w, http.StatusForbidden, "administrator MFA is required")
		return
	}
	secret, err := a.mfaSecrets.Decrypt(user.MFASecret)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	if !auth.ValidateTOTP(secret, input.Code, time.Now().UTC()) {
		writeError(w, http.StatusUnauthorized, "invalid authenticator code")
		return
	}
	codes, hashes, err := newRecoveryCodes()
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	if err := a.store.ReplaceMFARecoveryCodes(r.Context(), user.ID, hashes); err != nil {
		a.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"recovery_codes": codes})
}

func newRecoveryCodes() ([]string, [][]byte, error) {
	codes, err := auth.GenerateRecoveryCodes(10)
	if err != nil {
		return nil, nil, err
	}
	hashes := make([][]byte, 0, len(codes))
	for _, code := range codes {
		hash, ok := auth.RecoveryCodeHash(code)
		if !ok {
			return nil, nil, fmt.Errorf("generated an invalid recovery code")
		}
		hashes = append(hashes, hash)
	}
	return codes, hashes, nil
}

func (a *API) recordSecurityAudit(r *http.Request, actorID, path string, status int) {
	agent := r.UserAgent()
	if len(agent) > 500 {
		agent = agent[:500]
	}
	if err := a.store.CreateAdminAuditLog(r.Context(), model.AdminAuditLog{
		ActorID: actorID, Method: r.Method, Path: path, Status: status,
		SourceIP: a.clientIP(r), UserAgent: agent,
	}); err != nil {
		a.logger.Error("security audit persistence failed", "actor_id", actorID, "path", path, "error", err)
	}
}

func (a *API) logout(w http.ResponseWriter, _ *http.Request) {
	a.clearSession(w)
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) me(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	user, ok := r.Context().Value(authUserKey).(model.User)
	if !ok {
		writeError(w, http.StatusUnauthorized, "session is no longer valid")
		return
	}
	if isPrivilegedRole(user.Role) && (!claims.MFAVerified || !user.MFAEnabled) {
		a.clearSession(w)
		writeError(w, http.StatusUnauthorized, "administrator sign-in requires MFA")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

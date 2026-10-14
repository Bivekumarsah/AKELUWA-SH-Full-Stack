import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = file => readFileSync(path.join(root, file), "utf8");

test("developer documentation has the required guides and source references", () => {
  const documents = {
    "README.md": ["## Architecture", "## Directory Guide", "## Testing And Verification", "docs/ARCHITECTURE.md", "docs/API.md", "docs/DATABASE.md", "docs/CONTRIBUTING.md"],
    "docs/ARCHITECTURE.md": ["## System Boundaries", "backend/internal/httpapi/api.go", "backend/internal/store/store.go"],
    "docs/API.md": ["## Authentication And Profile", "## Customer Account", "## Administration"],
    "docs/DATABASE.md": ["## Core Relationships", "## Migration Rules"],
    "docs/CONTRIBUTING.md": ["## Change Checklist", "## Definition Of Done"],
  };

  for (const [file, requiredText] of Object.entries(documents)) {
    assert.equal(existsSync(path.join(root, file)), true, `${file} must exist`);
    const content = read(file);
    for (const text of requiredText) assert.ok(content.includes(text), `${file} must describe ${text}`);
  }
});

test("database documentation names every committed migration", () => {
  const databaseGuide = read("docs/DATABASE.md");
  const migrations = readdirSync(path.join(root, "backend/internal/database/migrations"))
    .filter(file => file.endsWith(".sql"));

  for (const migration of migrations) {
    assert.ok(databaseGuide.includes(migration), `docs/DATABASE.md must document ${migration}`);
  }
});

test("API documentation covers the router's major access boundaries", () => {
  const router = read("backend/internal/httpapi/api.go");
  const apiGuide = read("docs/API.md");

  for (const route of ["/api/v1/auth", "/api/v1/account", "/api/v1/admin", "/livez", "/readyz"]) {
    assert.ok(router.includes(route), `router must expose ${route}`);
    assert.ok(apiGuide.includes(route), `docs/API.md must document ${route}`);
  }
});

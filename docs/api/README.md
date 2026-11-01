# ChitraBodh application API contract

[chitrabodh.openapi.json](chitrabodh.openapi.json) is the proposed OpenAPI 3.1.1 wire contract: 43 operations across 33 paths and 42 shared schemas. It is separate from the existing localhost prototype API.

- [API design guide](../ChitraBodh-API-Design.md): authentication, ownership, validation, pagination, errors, command semantics and examples.
- [Database design](../ChitraBodh-Database-Design.md): collections, relationships, constraints, indexes, transitions, transactions and retention.
- [System architecture](../ChitraBodh-Dashboard-System-Design.md): component boundaries and deployment plan.

Edit the contract and companion guides together. No Postman workspace or public documentation site has been created or modified. The JSON can be imported into OpenAPI-compatible tooling for documentation, client generation or mocks; a generated client does not implement session/CSRF behavior automatically.

Validation from repository root:

```text
python scripts/validate-api-contract.py
```

Requires Python with `jsonschema` and its `referencing` dependency. The checker validates schema syntax, internal references, examples, negative request cases, operation IDs, path parameters, mutation CSRF/origin declarations, HEAD response rules, and document links. It is not a complete OpenAPI metaschema validator or a test of a running API/database. Full OpenAPI tooling validation and real transaction/provider tests remain implementation gates.

All examples are synthetic. Do not add `.env` values, session cookies, provider tokens, signed media URLs, or personal project content to this file or its examples.

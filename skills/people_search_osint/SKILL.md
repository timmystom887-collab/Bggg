---
name: people-search-osint
description: Specialized OSINT investigation skill for discovering, aggregating, and cross-corroborating public records across TruePeopleSearch, Whitepages, FastPeopleSearch, That'sThem, Spokeo, Radaris, county property assessor databases, and state voter registries.
---

# People Search & Public Directory OSINT Skill

This skill provides methodologies, query patterns, and architectural workflows for executing high-fidelity open-source intelligence (OSINT) people finding, skip tracing, and public directory searches.

## Supported Public Directory Targets
- **TruePeopleSearch**: Deep historical addresses, relative connections, phone carrier types, and associate matrices.
- **Whitepages**: Landline/mobile phone reverse lookups, current registered head-of-household data, and criminal/civil docket indicators.
- **FastPeopleSearch**: Fast historical timeline mapping, co-resident clustering, and previous city residency timelines.
- **That'sThem**: Email reverse searches, IP-to-physical address correlations, and phone CNAM records.
- **Spokeo & Radaris**: Public social aggregation, court index cross-referencing, and business entity affiliations.
- **County Assessor & Deed Registries**: Real estate parcel tax records, deed transfer dates, and property ownership validation.
- **State Voter Registrations**: Registered party affiliation dates, voting district locations, and formal legal name variations.

## Ethical & Legal OSINT Standard
1. **Public Domain Only**: Exclusively queries public, open, unauthenticated indexing records.
2. **No Pretexting**: Zero deceptive impersonation or fraudulent social engineering.
3. **Multi-Identifier Triangulation**: A subject is marked as `CONFIRMED_MATCH` only when 2 or more independent sources (e.g. County Deeds + Voter Registry + Telecom CNAM) corroborate identical identifiers (Name, DOB, Address Timeline).

## API & MCP Integration Architecture
- **MCP Tool Name**: `search_people_directories`
  - **JSON-RPC 2.0 Method**: `tools/call`
  - **Input Parameters**: `full_name`, `city_state`, `age_or_dob`, `phone`, `directories`
- **MCP Tool Name**: `cross_reference_breaches`
  - **JSON-RPC 2.0 Method**: `tools/call`
  - **Input Parameters**:
    - `subject_name` (string, optional): Legal or common name of subject (for single mode).
    - `username` (string, optional): Handle discovered in `username_scan`.
    - `email` (string, optional): Email discovered in `search_person` or skip-trace.
    - `phone` (string, optional): Phone number for breach record cross-referencing.
    - `city_state` (string, optional): Geographic context.
    - `targets_csv` (string, optional): Multi-line CSV list of targets (`Name, Username, Email, Phone`) for bulk batch verification.
    - `batch_mode` (boolean, optional): Flag to trigger bulk batch processing.
  - **Purpose**: Cross-reference public breach occurrence catalogs and metadata for individual subjects or bulk CSV batches to calculate an Evidentiary Corroboration & Credibility Index (0-100%) with color-coded confidence indicators (Green/Amber/Red) validating the skip-trace findings.

## Execution Pattern
1. Formulate grounded search queries targeting open web directory indexes.
2. Cross-reference discovered phone numbers against national LERG and carrier CNAM prefix databases.
3. Cross-reference physical addresses against county deed parcel registries.
4. Execute `cross_reference_breaches` to cross-validate discovered emails, usernames, and historical locations against documented public breach disclosures.
5. Synthesize verified data points into structured JSON or formatted evidentiary reports.

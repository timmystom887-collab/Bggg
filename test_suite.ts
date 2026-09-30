import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log("=========================================================");
  console.log("BRIGGADE COGNITIVE & TOOL-SELECTION VERIFICATION PROTOCOL");
  console.log("=========================================================");

  const results: any[] = [];
  const startSuite = Date.now();

  const baselineDir = path.resolve('./baseline');
  if (!fs.existsSync(baselineDir)) {
    fs.mkdirSync(baselineDir, { recursive: true });
  }

  const runTest = async (name: string, fn: () => Promise<void>) => {
    const start = Date.now();
    try {
      await fn();
      const latency = Date.now() - start;
      results.push({ name, status: 'PASS', latency, error: null });
      console.log(`[PASS] ${name} (${latency}ms)`);
    } catch (err: any) {
      const latency = Date.now() - start;
      results.push({ name, status: 'FAIL', latency, error: err.message || err });
      console.error(`[FAIL] ${name} (${latency}ms): ${err.message || err}`);
    }
  };

  // Test 1: JSON-RPC Version Compliance
  await runTest("JSON-RPC Version Compliance Check", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'tools/list' }) // missing jsonrpc "2.0"
    });
    const data = await res.json();
    if (res.status !== 400 || data.error?.code !== -32600) {
      throw new Error(`Expected JSON-RPC error -32600. Got status ${res.status} and body ${JSON.stringify(data)}`);
    }
  });

  // Test 2: MCP Tool Enumeration Contract
  await runTest("MCP Tool Enumeration Contract", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.tools) {
      throw new Error(`Failed to list tools: ${JSON.stringify(data)}`);
    }
    const tools = data.result.tools;
    const requiredTools = ["search_person", "reverse_phone", "username_scan", "ip_lookup", "dns_lookup", "whois_lookup"];
    for (const req of requiredTools) {
      if (!tools.some((t: any) => t.name === req)) {
        throw new Error(`Missing tool definition for: ${req}`);
      }
    }
    fs.writeFileSync(path.join(baselineDir, 'tools_list_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 3: MCP Tool Call - search_person Validation & Run
  await runTest("MCP Tool Call - search_person Validation & Run", async () => {
    // Missing arguments validation
    const badRes = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'search_person', arguments: {} },
        id: 2
      })
    });
    const badData = await badRes.json();
    if (badRes.status !== 400 || badData.error?.code !== -32602) {
      throw new Error(`Expected arg error -32602, got: ${JSON.stringify(badData)}`);
    }

    // Success run
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'search_person', arguments: { full_name: 'Marcus Jenkins', city_state: 'Austin, TX' } },
        id: 3
      })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.content?.[0]?.text) {
      throw new Error(`search_person execution failed: ${JSON.stringify(data)}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'search_person_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 4: MCP Tool Call - reverse_phone Validation & Run
  await runTest("MCP Tool Call - reverse_phone Validation & Run", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'reverse_phone', arguments: { phone: '+1 (512) 555-0184' } },
        id: 4
      })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.content?.[0]?.text) {
      throw new Error(`reverse_phone execution failed: ${JSON.stringify(data)}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'reverse_phone_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 5: MCP Tool Call - username_scan Validation & Run
  await runTest("MCP Tool Call - username_scan Validation & Run", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'username_scan', arguments: { username: 'octocat' } },
        id: 5
      })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.content?.[0]?.text) {
      throw new Error(`username_scan execution failed: ${JSON.stringify(data)}`);
    }
    if (!data.result.content[0].text.includes("GitHub")) {
      throw new Error(`Expected scan results to check GitHub, got: ${data.result.content[0].text}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'username_scan_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 6: MCP Tool Call - ip_lookup Geolocation Check
  await runTest("MCP Tool Call - ip_lookup Geolocation Check", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'ip_lookup', arguments: { ip: '8.8.8.8' } },
        id: 6
      })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.content?.[0]?.text) {
      throw new Error(`ip_lookup failed: ${JSON.stringify(data)}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'ip_lookup_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 7: MCP Tool Call - dns_lookup Query Check
  await runTest("MCP Tool Call - dns_lookup Query Check", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'dns_lookup', arguments: { domain: 'google.com' } },
        id: 7
      })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.content?.[0]?.text) {
      throw new Error(`dns_lookup failed: ${JSON.stringify(data)}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'dns_lookup_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 8: MCP Tool Call - whois_lookup Query Check
  await runTest("MCP Tool Call - whois_lookup Query Check", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'whois_lookup', arguments: { domain: 'google.com' } },
        id: 8
      })
    });
    const data = await res.json();
    if (!res.ok || !data.result?.content?.[0]?.text) {
      throw new Error(`whois_lookup failed: ${JSON.stringify(data)}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'whois_lookup_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 9: MCP Invalid Tool Name Catch
  await runTest("MCP Tool Call - Invalid Tool Error handling", async () => {
    const res = await fetch(`${BASE_URL}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'fictional_unregistered_tool', arguments: {} },
        id: 9
      })
    });
    const data = await res.json();
    if (res.status !== 404 || data.error?.code !== -32601) {
      throw new Error(`Expected error -32601 on unregistered tool, got: ${JSON.stringify(data)}`);
    }
  });

  // Test 10: Dynamic Fallback Skip Tracer Dossier Check
  await runTest("AI Private Investigator - Dynamic Fallback Skip Tracer Dossier", async () => {
    const res = await fetch(`${BASE_URL}/api/investigator/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Johnathan Doe',
        city_state: 'Chicago, IL',
        phone: '+1 (312) 555-0984',
        username: 'jdoe99',
        plate: 'IL ABC-1234'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.dossier?.subject_profile) {
      throw new Error(`Skip Tracer failed: ${JSON.stringify(data)}`);
    }
    
    const d = data.dossier;
    if (d.subject_profile.full_name !== 'Johnathan Doe') {
      throw new Error(`Expected dossier full_name 'Johnathan Doe', got: '${d.subject_profile.full_name}'`);
    }
    if (!d.current_residence.city.includes('Chicago')) {
      throw new Error(`Expected current_residence city 'Chicago', got: '${d.current_residence.city}'`);
    }
    if (d.contact_telecom.phones[0].number.replace(/[^0-9]/g, '') !== '13125550984') {
      throw new Error(`Expected parsed phone digits '13125550984', got: '${d.contact_telecom.phones[0].number}'`);
    }
    if (d.vehicles_and_assets[0].plate !== 'IL ABC-1234') {
      throw new Error(`Expected parsed license plate 'IL ABC-1234', got: '${d.vehicles_and_assets[0].plate}'`);
    }
    fs.writeFileSync(path.join(baselineDir, 'fallback_dossier_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 11: Scam / Smishing Classifier Integrity
  await runTest("AI Scam Shield - SMS Smishing Triage Verification", async () => {
    const res = await fetch(`${BASE_URL}/api/scam/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'URGENT: Your bank account is locked. Log in immediately at http://unverified-bank-secure.com/login to restore access.'
      })
    });
    const data = await res.json();
    if (!res.ok || typeof data.is_scam !== 'boolean' || !data.is_scam) {
      throw new Error(`Scam analyze failed or did not identify scam: ${JSON.stringify(data)}`);
    }
    fs.writeFileSync(path.join(baselineDir, 'scam_shield_trace.json'), JSON.stringify(data, null, 2));
  });

  // Test 12: AI Scam Shield - Benign Safe Message Verification
  await runTest("AI Scam Shield - Benign Safe Message Verification", async () => {
    const res = await fetch(`${BASE_URL}/api/scam/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hey, are we still meeting for lunch at 12:30 today? Let me know.'
      })
    });
    const data = await res.json();
    if (!res.ok || data.is_scam !== false || data.risk_score > 35) {
      throw new Error(`Benign message wrongly flagged as scam: ${JSON.stringify(data)}`);
    }
  });

  // Test 13: Tail Detector - Clear and Custom Sighting Lock
  await runTest("Tail Detector - Clear and Custom Sighting Lock Verification", async () => {
    // First clear
    const clearRes = await fetch(`${BASE_URL}/api/tail-detector/clear`, { method: 'POST' });
    const clearData = await clearRes.json();
    if (!clearRes.ok || clearData.targets_detected?.length !== 0) {
      throw new Error(`Tail clear failed: ${JSON.stringify(clearData)}`);
    }

    // Now log custom sighting
    const logRes = await fetch(`${BASE_URL}/api/tail-detector/log-sighting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_type: '2023 Black Ford Explorer',
        license_plate: 'TX EXP-8821',
        distance_meters: 18.5
      })
    });
    const logData = await logRes.json();
    if (!logRes.ok || logData.target.vehicle_type !== '2023 Black Ford Explorer') {
      throw new Error(`Tail log custom sighting failed: ${JSON.stringify(logData)}`);
    }

    // Verify evasion guidance works with custom target
    const evadeRes = await fetch(`${BASE_URL}/api/tail-detector/evasion-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_location: 'Congress Ave & 6th St, Austin, TX',
        target_id: logData.target.id
      })
    });
    const evadeData = await evadeRes.json();
    if (!evadeRes.ok || !evadeData.evasion_guidance) {
      throw new Error(`Tail evasion guidance failed: ${JSON.stringify(evadeData)}`);
    }
  });

  // Test 14: AI Private Investigator - Comprehensive Advanced Fields Check
  await runTest("AI Private Investigator - Advanced Fields & Custom Triangulation", async () => {
    const res = await fetch(`${BASE_URL}/api/investigator/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Marcus Vance',
        street_address: '701 Brickell Ave, Suite 2400',
        city_state: 'Miami, FL',
        phone: '+1 (305) 555-0144',
        vehicle_model: '2022 Blue Porsche Macan',
        plate: 'FL MAC-9912',
        vin: 'WP1AA2A55NLB12345',
        known_associates: 'Elena Vance, Carlos Gomez',
        employer_profession: 'Vance Capital Partners LLC',
        ssn_segment: '7721',
        dob: '1984-09-12'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.dossier) {
      throw new Error(`Advanced skip trace failed: ${JSON.stringify(data)}`);
    }
    const d = data.dossier;
    if (d.subject_profile.full_name !== 'Marcus Vance') {
      throw new Error(`Expected full_name 'Marcus Vance', got: ${d.subject_profile.full_name}`);
    }
    if (!d.current_residence.street.includes('Brickell')) {
      throw new Error(`Expected Brickell street address, got: ${d.current_residence.street}`);
    }
    if (!d.current_residence.city.includes('Miami')) {
      throw new Error(`Expected Miami city, got: ${d.current_residence.city}`);
    }
    if (!d.vehicles_and_assets.some((v: any) => v.plate?.includes('MAC-9912') || v.details?.includes('Macan') || v.details?.includes('Porsche'))) {
      throw new Error(`Expected custom vehicle in assets: ${JSON.stringify(d.vehicles_and_assets)}`);
    }
    if (!d.relatives_and_associates.some((a: any) => a.name.includes('Elena') || a.name.includes('Carlos'))) {
      throw new Error(`Expected custom associates: ${JSON.stringify(d.relatives_and_associates)}`);
    }
  });

  // Test 15: AI Lawyer Operator - Live Constitutional Speech Evaluation
  await runTest("AI Lawyer Operator - Live Constitutional Speech Evaluation", async () => {
    const res = await fetch(`${BASE_URL}/api/lawyer-operator/process-speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Do you mind if I take a quick look in your trunk and glovebox?'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.legal_evaluation?.violation_detected) {
      throw new Error(`Speech constitutional evaluation failed: ${JSON.stringify(data)}`);
    }
    if (!data.whisper_cue.toLowerCase().includes('consent') && !data.whisper_cue.toLowerCase().includes('search')) {
      throw new Error(`Expected whisper script citing consent/search refusal: ${data.whisper_cue}`);
    }
  });

  console.log("\n=========================================================");
  console.log("SUMMARY MATRIX");
  console.log("=========================================================");
  let failed = 0;
  for (const r of results) {
    if (r.status === 'FAIL') failed++;
    console.log(`[${r.status}] ${r.name.padEnd(52)} | Latency: ${r.latency}ms`);
  }
  console.log("=========================================================");
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${results.length - failed} | FAILED: ${failed}`);
  console.log(`TIME ELAPSED: ${Date.now() - startSuite}ms`);
  console.log("=========================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();

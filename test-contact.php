<?php
/**
 * CLI test for the DevRev contact form integration.
 *
 * Usage — interactive prompts:
 *   php test-contact.php
 *
 * Usage — inline arguments (skip the prompts):
 *   php test-contact.php --name="John Doe" --email="john@example.com" --message="Hello, I have a question."
 *
 * The script uses the same .env lookup and DevRev logic as sendmail.php.
 */

// ── Colours for terminal output ────────────────────────────────────────────
function clr(string $text, string $colour): string
{
    $codes = ['green' => '32', 'red' => '31', 'yellow' => '33', 'cyan' => '36', 'grey' => '90'];
    return "\033[" . ($codes[$colour] ?? '0') . "m{$text}\033[0m";
}

function info(string $msg): void  { echo clr('  ℹ  ', 'cyan')   . $msg . PHP_EOL; }
function ok(string $msg): void    { echo clr('  ✔  ', 'green')  . $msg . PHP_EOL; }
function warn(string $msg): void  { echo clr('  ⚠  ', 'yellow') . $msg . PHP_EOL; }
function fail(string $msg): void  { echo clr('  ✘  ', 'red')    . $msg . PHP_EOL; }
function dim(string $msg): void   { echo clr($msg, 'grey') . PHP_EOL; }

// ── Load .env ──────────────────────────────────────────────────────────────
$env_file = __DIR__ . '/.env';
if (!file_exists($env_file)) {
    $env_file = __DIR__ . '/../../.env';
}
if (!file_exists($env_file)) {
    fail('.env file not found. Copy .env.example to .env and fill in your keys.');
    exit(1);
}

// parse_ini_file() chokes on parentheses/special chars in comments, so parse manually
$env = [];
foreach (file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || $line[0] === '#') continue;
    $pos = strpos($line, '=');
    if ($pos === false) continue;
    $env[trim(substr($line, 0, $pos))] = trim(substr($line, $pos + 1));
}
$api_key = $env['DEVREV_API_KEY'] ?? '';
$part_id = $env['DEVREV_PART_ID'] ?? '';

if (empty($api_key)) { fail('DEVREV_API_KEY is missing in .env'); exit(1); }
if (empty($part_id)) { fail('DEVREV_PART_ID is missing in .env'); exit(1); }

ok('.env loaded');
dim('   Key : ' . substr($api_key, 0, 12) . '...');
dim('   Part: ' . $part_id);
echo PHP_EOL;

// ── Parse CLI arguments or prompt interactively ────────────────────────────
$opts = getopt('', ['name:', 'email:', 'message:']);

function prompt(string $label, ?string $value): string
{
    if ($value !== null && $value !== '') return $value;
    echo clr('  ?  ', 'cyan') . $label . ': ';
    $line = trim(fgets(STDIN));
    if ($line === '') {
        fail('Input cannot be empty.');
        exit(1);
    }
    return $line;
}

$name    = prompt('Name',    $opts['name']    ?? null);
$email   = prompt('Email',   $opts['email']   ?? null);
$message = prompt('Message', $opts['message'] ?? null);

// ── Basic validation ───────────────────────────────────────────────────────
echo PHP_EOL;
$errors = [];
if (strlen($name) < 2 || strlen($name) > 100)         $errors[] = 'Name must be 2–100 characters.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))        $errors[] = 'Invalid e-mail address.';
if (strlen($message) < 10 || strlen($message) > 5000) $errors[] = 'Message must be 10–5000 characters.';

if (!empty($errors)) {
    foreach ($errors as $e) fail($e);
    exit(1);
}

ok('Input valid');
dim('   Name   : ' . $name);
dim('   Email  : ' . $email);
dim('   Message: ' . substr($message, 0, 60) . (strlen($message) > 60 ? '…' : ''));
echo PHP_EOL;

// ── Helper: DevRev request (raw SSL socket — no cURL or allow_url_fopen) ──
function devrev_request(string $method, string $url, array $payload, string $api_key): array
{
    $parsed  = parse_url($url);
    $host    = $parsed['host'];
    $path    = ($parsed['path'] ?? '/') . (isset($parsed['query']) ? '?' . $parsed['query'] : '');
    $body_json = ($method === 'POST') ? json_encode($payload) : '';

    $req  = "{$method} {$path} HTTP/1.1\r\n";
    $req .= "Host: {$host}\r\n";
    $req .= "Content-Type: application/json\r\n";
    $req .= "Accept: application/json\r\n";
    $req .= "Authorization: Bearer {$api_key}\r\n";
    $req .= "Connection: close\r\n";
    if ($method === 'POST') {
        $req .= "Content-Length: " . strlen($body_json) . "\r\n";
    }
    $req .= "\r\n" . $body_json;

    $errno = 0; $errstr = '';
    $sock = @stream_socket_client("ssl://{$host}:443", $errno, $errstr, 15);
    if (!$sock) {
        return ['status' => 0, 'body' => null, 'raw' => '', 'curl_error' => "Connection failed: {$errstr} ({$errno})"];
    }

    fwrite($sock, $req);
    $raw = '';
    while (!feof($sock)) $raw .= fread($sock, 8192);
    fclose($sock);

    // Split headers from body (handle chunked transfer encoding)
    [$headers_raw, $body_raw] = explode("\r\n\r\n", $raw, 2) + ['', ''];

    // Unchunk if Transfer-Encoding: chunked
    if (stripos($headers_raw, 'Transfer-Encoding: chunked') !== false) {
        $unchunked = '';
        $remaining = $body_raw;
        while ($remaining !== '') {
            $pos       = strpos($remaining, "\r\n");
            if ($pos === false) break;
            $size      = hexdec(trim(substr($remaining, 0, $pos)));
            if ($size === 0) break;
            $unchunked .= substr($remaining, $pos + 2, $size);
            $remaining  = substr($remaining, $pos + 2 + $size + 2);
        }
        $body_raw = $unchunked;
    }

    preg_match('/HTTP\/\S+\s+(\d+)/', $headers_raw, $m);
    $status = (int)($m[1] ?? 0);

    return [
        'status'     => $status,
        'body'       => $body_raw !== '' ? json_decode($body_raw, true) : null,
        'raw'        => $body_raw,
        'curl_error' => '',
    ];
}

// ── Step 1: Look up rev-user by e-mail ─────────────────────────────────────
info('Looking up rev-user for ' . $email . ' …');

$lookup = devrev_request(
    'GET',
    'https://api.devrev.ai/rev-users.list?email=' . urlencode($email),
    [],
    $api_key
);

if ($lookup['curl_error']) {
    fail('cURL error: ' . $lookup['curl_error']);
    exit(1);
}

dim('   HTTP ' . $lookup['status']);

$rev_user_id = null;
if ($lookup['status'] === 200) {
    $rev_users   = $lookup['body']['rev_users'] ?? [];
    $rev_user_id = !empty($rev_users) ? ($rev_users[0]['id'] ?? null) : null;

    if ($rev_user_id) {
        ok('Rev-user found: ' . ($rev_users[0]['display_name'] ?? $rev_user_id));
        dim('   ID: ' . $rev_user_id);
    } else {
        warn('No rev-user found for this email — ticket will be created without reported_by');
    }
} else {
    warn('Unexpected response from rev-users.list (HTTP ' . $lookup['status'] . ') — continuing without rev-user');
    dim('   ' . $lookup['raw']);
}

echo PHP_EOL;

// ── Step 2: Create DevRev ticket ───────────────────────────────────────────
info('Creating DevRev ticket …');

$payload = [
    'type'            => 'ticket',
    'title'           => 'Contact form submission from ' . $name,
    'body'            => $email . "\n\n" . $name . " wrote:\n\n" . $message,
    'applies_to_part' => $part_id,
];

if ($rev_user_id !== null) {
    $payload['reported_by'] = [$rev_user_id];
}

dim('   Payload: ' . json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
echo PHP_EOL;

$ticket = devrev_request('POST', 'https://api.devrev.ai/works.create', $payload, $api_key);

if ($ticket['curl_error']) {
    fail('cURL error: ' . $ticket['curl_error']);
    exit(1);
}

dim('   HTTP ' . $ticket['status']);

$ticket_ok = $ticket['status'] >= 200 && $ticket['status'] < 300;

if ($ticket_ok) {
    $work = $ticket['body']['work'] ?? [];
    ok('Ticket created successfully!');
    dim('   ID      : ' . ($work['id']         ?? '—'));
    dim('   Display : ' . ($work['display_id']  ?? '—'));
    dim('   Title   : ' . ($work['title']       ?? '—'));
} else {
    fail('Ticket creation failed (HTTP ' . $ticket['status'] . ')');
    echo clr('   Response: ', 'grey') . json_encode($ticket['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    exit(1);
}

echo PHP_EOL;

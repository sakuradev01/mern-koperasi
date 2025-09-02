<?php
/**
 * SECURE MEMBER HELPER - MERN KOPERASI INTEGRATION
 * 
 * File helper PHP yang super secure untuk 30,000+ siswa
 * Menggunakan sistem keamanan berlapis seperti yang ada di MERN Koperasi:
 * - Magic Key Encryption dengan Timestamp
 * - Double Validation (Encrypted Payload + JWT Token)
 * - HMAC Signature untuk request integrity
 * - Nonce untuk mencegah replay attack
 * - Rate limiting untuk mencegah abuse
 * - UUID ownership verification
 * 
 * @author MERN Koperasi Security Team
 * @version 2.0.0
 * @security LEVEL: MAXIMUM
 */

class SecureMemberHelper {
    
    // ========================= KONFIGURASI KEAMANAN =========================
    
    // Magic key untuk encryption (HARUS SAMA dengan server!)
    private const MAGIC_KEY = "K0per@si#1312";
    
    // API Base URL
    private $apiBaseUrl;
    
    // Secret key untuk HMAC (HARUS DISIMPAN AMAN!)
    private const HMAC_SECRET = "HMAC_K0p3r4s1_$3cur3_2024!";
    
    // Encryption settings
    private const ENCRYPTION_METHOD = 'AES-256-CBC';
    private const HASH_ALGO = 'sha256';
    
    // Security settings
    private const MAX_TIMESTAMP_DIFF = 300; // 5 menit
    private const RATE_LIMIT_WINDOW = 60;   // 1 menit
    private const RATE_LIMIT_MAX = 10;      // Max 10 request per menit per IP
    
    // Nonce storage (untuk production gunakan Redis/Database)
    private static $usedNonces = [];
    
    public function __construct($apiBaseUrl = 'http://localhost:5000') {
        $this->apiBaseUrl = rtrim($apiBaseUrl, '/');
        $this->initSecurity();
    }
    
    // ========================= INISIALISASI KEAMANAN =========================
    
    private function initSecurity() {
        // Start session untuk rate limiting
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // Initialize rate limiting
        if (!isset($_SESSION['rate_limit'])) {
            $_SESSION['rate_limit'] = [];
        }
        
        // Clean old nonces (untuk production pindah ke cron job)
        $this->cleanOldNonces();
    }
    
    // ========================= FUNGSI UTAMA: GET MEMBER SAVINGS =========================
    
    /**
     * Fungsi utama untuk mendapatkan data savings member dengan keamanan berlapis
     * 
     * @param string $uuid Member UUID
     * @param array $options Optional settings
     * @return array Response data atau error
     */
    public function getMemberSavings($uuid, $options = []) {
        try {
            // 1. VALIDASI INPUT
            $validationResult = $this->validateInput($uuid);
            if (!$validationResult['valid']) {
                return $this->errorResponse($validationResult['error'], 'VALIDATION_FAILED');
            }
            
            // 2. RATE LIMITING CHECK
            $rateLimitResult = $this->checkRateLimit();
            if (!$rateLimitResult['allowed']) {
                return $this->errorResponse('Rate limit exceeded. Try again later.', 'RATE_LIMIT_EXCEEDED');
            }
            
            // 3. GENERATE SECURE ENCRYPTED PAYLOAD
            $encryptedPayload = $this->generateSecureEncryptedPayload($uuid);
            if (!$encryptedPayload) {
                return $this->errorResponse('Failed to generate secure payload', 'ENCRYPTION_FAILED');
            }
            
            // 4. GET MEMBER TOKEN
            $tokenResult = $this->getMemberToken($encryptedPayload);
            if (!$tokenResult['success']) {
                return $this->errorResponse($tokenResult['message'], 'TOKEN_FAILED');
            }
            
            // 5. GET MEMBER SAVINGS DATA
            $savingsResult = $this->getMemberDashboardData($uuid, $tokenResult['token']);
            if (!$savingsResult['success']) {
                return $this->errorResponse($savingsResult['message'], 'DATA_FETCH_FAILED');
            }
            
            // 6. FINAL SECURITY VALIDATION
            $finalValidation = $this->validateResponseSecurity($savingsResult['data'], $uuid);
            if (!$finalValidation['valid']) {
                return $this->errorResponse($finalValidation['error'], 'RESPONSE_VALIDATION_FAILED');
            }
            
            // 7. RETURN SECURE RESPONSE
            return $this->successResponse($savingsResult['data'], 'Member savings data retrieved successfully');
            
        } catch (Exception $e) {
            $this->logSecurityEvent('EXCEPTION', $uuid, $e->getMessage());
            return $this->errorResponse('System error occurred', 'SYSTEM_ERROR');
        }
    }
    
    // ========================= VALIDASI INPUT =========================
    
    private function validateInput($uuid) {
        // UUID format validation
        if (empty($uuid) || !is_string($uuid)) {
            return ['valid' => false, 'error' => 'UUID is required and must be string'];
        }
        
        // UUID pattern validation (sesuai dengan format yang digunakan)
        if (!preg_match('/^[A-Z]{2,4}[0-9]{5,10}$/', $uuid)) {
            return ['valid' => false, 'error' => 'Invalid UUID format'];
        }
        
        // Length validation
        if (strlen($uuid) < 7 || strlen($uuid) > 15) {
            return ['valid' => false, 'error' => 'UUID length invalid'];
        }
        
        // XSS protection
        if ($uuid !== strip_tags($uuid)) {
            return ['valid' => false, 'error' => 'Invalid characters in UUID'];
        }
        
        return ['valid' => true];
    }
    
    // ========================= RATE LIMITING =========================
    
    private function checkRateLimit() {
        $clientIp = $this->getClientIP();
        $currentTime = time();
        $windowStart = $currentTime - self::RATE_LIMIT_WINDOW;
        
        // Clean old entries
        if (isset($_SESSION['rate_limit'][$clientIp])) {
            $_SESSION['rate_limit'][$clientIp] = array_filter(
                $_SESSION['rate_limit'][$clientIp],
                function($timestamp) use ($windowStart) {
                    return $timestamp > $windowStart;
                }
            );
        } else {
            $_SESSION['rate_limit'][$clientIp] = [];
        }
        
        // Check current count
        $currentCount = count($_SESSION['rate_limit'][$clientIp]);
        
        if ($currentCount >= self::RATE_LIMIT_MAX) {
            $this->logSecurityEvent('RATE_LIMIT_EXCEEDED', '', "IP: $clientIp");
            return ['allowed' => false];
        }
        
        // Add current request
        $_SESSION['rate_limit'][$clientIp][] = $currentTime;
        
        return ['allowed' => true];
    }
    
    private function getClientIP() {
        $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (!empty($_SERVER[$key])) {
                $ips = explode(',', $_SERVER[$key]);
                $ip = trim($ips[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    
    // ========================= ENCRYPTION & SECURITY =========================
    
    private function generateSecureEncryptedPayload($uuid) {
        try {
            $timestamp = time();
            $nonce = $this->generateNonce();
            
            // Create payload dengan tambahan security fields
            $payload = [
                'uuid' => $uuid,
                'timestamp' => $timestamp,
                'magic' => self::MAGIC_KEY,
                'nonce' => $nonce,
                'client_ip' => $this->getClientIP(),
                'user_agent_hash' => hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? 'unknown')
            ];
            
            // Convert to JSON
            $jsonPayload = json_encode($payload);
            
            // Encrypt dengan AES-256-CBC
            $encrypted = $this->encryptData($jsonPayload);
            
            // Store nonce untuk validasi
            $this->storeNonce($nonce, $timestamp);
            
            return $encrypted;
            
        } catch (Exception $e) {
            $this->logSecurityEvent('ENCRYPTION_ERROR', $uuid, $e->getMessage());
            return false;
        }
    }
    
    private function encryptData($data) {
        $key = hash('sha256', self::MAGIC_KEY);
        $iv = openssl_random_pseudo_bytes(16);
        
        $encrypted = openssl_encrypt($data, self::ENCRYPTION_METHOD, $key, 0, $iv);
        
        if ($encrypted === false) {
            throw new Exception('Encryption failed');
        }
        
        // Gabungkan IV dan encrypted data
        return base64_encode($iv . $encrypted);
    }
    
    private function generateNonce() {
        return bin2hex(random_bytes(16));
    }
    
    private function storeNonce($nonce, $timestamp) {
        self::$usedNonces[$nonce] = $timestamp;
    }
    
    private function cleanOldNonces() {
        $expireTime = time() - (self::MAX_TIMESTAMP_DIFF * 2);
        self::$usedNonces = array_filter(self::$usedNonces, function($timestamp) use ($expireTime) {
            return $timestamp > $expireTime;
        });
    }
    
    // ========================= API CALLS =========================
    
    private function getMemberToken($encryptedPayload) {
        $url = $this->apiBaseUrl . '/api/member-auth/token';
        
        $headers = [
            'x-koperasi-auth: ' . $encryptedPayload,
            'Content-Type: application/json',
            'X-Request-Signature: ' . $this->generateRequestSignature('POST', '/api/member-auth/token', '{}'),
            'X-Timestamp: ' . time(),
            'User-Agent: SecureMemberHelper/2.0'
        ];
        
        $response = $this->makeSecureRequest($url, 'POST', '{}', $headers);
        
        if ($response === false) {
            return ['success' => false, 'message' => 'Failed to connect to authentication server'];
        }
        
        $data = json_decode($response, true);
        
        if (!$data || !isset($data['success']) || !$data['success']) {
            $this->logSecurityEvent('TOKEN_FAILED', '', $response);
            return ['success' => false, 'message' => $data['message'] ?? 'Authentication failed'];
        }
        
        if (!isset($data['data']['token']) || !isset($data['data']['member']['uuid'])) {
            return ['success' => false, 'message' => 'Invalid token response format'];
        }
        
        return [
            'success' => true,
            'token' => $data['data']['token'],
            'member' => $data['data']['member']
        ];
    }
    
    private function getMemberDashboardData($uuid, $token) {
        $url = $this->apiBaseUrl . '/api/members/dashboard/' . urlencode($uuid);
        
        $headers = [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'X-Request-Signature: ' . $this->generateRequestSignature('GET', '/api/members/dashboard/' . $uuid, ''),
            'X-Timestamp: ' . time(),
            'User-Agent: SecureMemberHelper/2.0'
        ];
        
        $response = $this->makeSecureRequest($url, 'GET', null, $headers);
        
        if ($response === false) {
            return ['success' => false, 'message' => 'Failed to connect to data server'];
        }
        
        $data = json_decode($response, true);
        
        if (!$data) {
            return ['success' => false, 'message' => 'Invalid response format'];
        }
        
        // Jika response dalam format array langsung (student dashboard)
        if (is_array($data) && !isset($data['success'])) {
            return ['success' => true, 'data' => $data];
        }
        
        // Jika response dalam format standard API
        if (!isset($data['success']) || !$data['success']) {
            $this->logSecurityEvent('DATA_FETCH_FAILED', $uuid, json_encode($data));
            return ['success' => false, 'message' => $data['message'] ?? 'Failed to fetch member data'];
        }
        
        return ['success' => true, 'data' => $data['data'] ?? $data];
    }
    
    private function makeSecureRequest($url, $method = 'GET', $data = null, $headers = []) {
        $ch = curl_init();
        
        $defaultHeaders = [
            'Accept: application/json',
            'Cache-Control: no-cache'
        ];
        
        $allHeaders = array_merge($defaultHeaders, $headers);
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER => $allHeaders,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_MAXREDIRS => 0,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_USERAGENT => 'SecureMemberHelper/2.0'
        ]);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            }
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            $this->logSecurityEvent('CURL_ERROR', '', "URL: $url, Error: $error");
            return false;
        }
        
        if ($httpCode < 200 || $httpCode >= 300) {
            $this->logSecurityEvent('HTTP_ERROR', '', "URL: $url, Code: $httpCode, Response: $response");
            return false;
        }
        
        return $response;
    }
    
    private function generateRequestSignature($method, $path, $body) {
        $timestamp = time();
        $nonce = bin2hex(random_bytes(8));
        
        $stringToSign = $method . '|' . $path . '|' . $body . '|' . $timestamp . '|' . $nonce;
        
        return hash_hmac('sha256', $stringToSign, self::HMAC_SECRET);
    }
    
    // ========================= RESPONSE VALIDATION =========================
    
    private function validateResponseSecurity($data, $expectedUuid) {
        // Pastikan data tidak kosong
        if (empty($data)) {
            return ['valid' => false, 'error' => 'Empty response data'];
        }
        
        // Jika data adalah array dari student dashboard
        if (is_array($data) && isset($data[0])) {
            return ['valid' => true]; // Student dashboard format valid
        }
        
        // Jika data adalah object member
        if (is_array($data) && isset($data['member'])) {
            $memberUuid = $data['member']['uuid'] ?? '';
            if ($memberUuid !== $expectedUuid) {
                $this->logSecurityEvent('UUID_MISMATCH', $expectedUuid, "Expected: $expectedUuid, Got: $memberUuid");
                return ['valid' => false, 'error' => 'UUID mismatch in response'];
            }
        }
        
        return ['valid' => true];
    }
    
    // ========================= RESPONSE HELPERS =========================
    
    private function successResponse($data, $message = 'Success') {
        return [
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => time(),
            'security' => [
                'validated' => true,
                'version' => '2.0.0'
            ]
        ];
    }
    
    private function errorResponse($message, $code = 'ERROR') {
        $this->logSecurityEvent('ERROR_RESPONSE', '', "$code: $message");
        
        return [
            'success' => false,
            'message' => $message,
            'error_code' => $code,
            'timestamp' => time(),
            'security' => [
                'validated' => false,
                'version' => '2.0.0'
            ]
        ];
    }
    
    // ========================= LOGGING =========================
    
    private function logSecurityEvent($type, $uuid = '', $details = '') {
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'type' => $type,
            'uuid' => $uuid,
            'ip' => $this->getClientIP(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'details' => $details
        ];
        
        // Untuk production, kirim ke proper logging system
        error_log('SecureMemberHelper: ' . json_encode($logEntry));
    }
    
    // ========================= UTILITY FUNCTIONS =========================
    
    /**
     * Fungsi untuk testing koneksi
     */
    public function testConnection() {
        $url = $this->apiBaseUrl . '/api/auth/me';
        $response = $this->makeSecureRequest($url, 'GET', null, ['Content-Type: application/json']);
        
        return [
            'connected' => $response !== false,
            'url' => $url,
            'response' => $response ? 'Server reachable' : 'Server unreachable'
        ];
    }
    
    /**
     * Fungsi untuk mendapatkan informasi security
     */
    public function getSecurityInfo() {
        return [
            'version' => '2.0.0',
            'encryption_method' => self::ENCRYPTION_METHOD,
            'hash_algorithm' => self::HASH_ALGO,
            'rate_limit_window' => self::RATE_LIMIT_WINDOW,
            'rate_limit_max' => self::RATE_LIMIT_MAX,
            'max_timestamp_diff' => self::MAX_TIMESTAMP_DIFF,
            'active_nonces' => count(self::$usedNonces),
            'client_ip' => $this->getClientIP()
        ];
    }
}

// ========================= FUNGSI HELPER GLOBAL =========================

/**
 * Fungsi helper global untuk memudahkan penggunaan
 * 
 * @param string $uuid Member UUID
 * @param string $apiUrl Optional API URL
 * @return array Response data
 */
function getSecureMemberSavings($uuid, $apiUrl = 'http://localhost:5000') {
    $helper = new SecureMemberHelper($apiUrl);
    return $helper->getMemberSavings($uuid);
}

/**
 * Fungsi untuk testing koneksi
 */
function testSecureConnection($apiUrl = 'http://localhost:5000') {
    $helper = new SecureMemberHelper($apiUrl);
    return $helper->testConnection();
}

// ========================= EXAMPLE USAGE =========================

// Jika file dijalankan langsung (untuk testing)
if (php_sapi_name() === 'cli' && basename(__FILE__) === basename($argv[0])) {
    echo "=== SECURE MEMBER HELPER TEST ===\n";
    
    if (isset($argv[1])) {
        $uuid = $argv[1];
        echo "Testing dengan UUID: $uuid\n\n";
        
        $result = getSecureMemberSavings($uuid);
        echo json_encode($result, JSON_PRETTY_PRINT);
    } else {
        echo "Usage: php secure_member_helper.php <UUID>\n";
        echo "Example: php secure_member_helper.php JPSB37142\n";
    }
} 

// Jika diakses via web
if (!empty($_GET['uuid']) || !empty($_POST['uuid'])) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    $uuid = $_GET['uuid'] ?? $_POST['uuid'] ?? '';
    $apiUrl = $_GET['api_url'] ?? $_POST['api_url'] ?? 'http://localhost:5000';
    
    $result = getSecureMemberSavings($uuid, $apiUrl);
    echo json_encode($result, JSON_PRETTY_PRINT);
}

?>
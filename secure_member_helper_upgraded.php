<?php
/**
 * CODEIGNITER SECURE HELPER - UPGRADE AWARE VERSION
 * File helper untuk CodeIgniter integration dengan support upgrade produk
 * 
 * Simpan di: application/helpers/secure_member_helper.php
 */

if (!defined('BASEPATH')) exit('No direct script access allowed');

if (!function_exists('getSecureMemberSavings')) {
    /**
     * Get member savings data dengan upgrade awareness
     * @param string $uuid Member UUID
     * @param string $apiUrl Base API URL
     * @return array Response data
     */
    function getSecureMemberSavings($uuid, $apiUrl = 'http://localhost:5000') {
        // Validasi UUID
        if (empty($uuid)) {
            return ['success' => false, 'message' => 'UUID is required'];
        }
        
        try {
            // Step 1: Generate encrypted payload
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $apiUrl . '/api/member-auth/generate-payload');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['uuid' => $uuid]));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            
            if ($error) {
                return ['success' => false, 'message' => 'Connection error: ' . $error];
            }
            
            if ($httpCode !== 200) {
                return ['success' => false, 'message' => 'HTTP error: ' . $httpCode];
            }
            
            $payloadData = json_decode($response, true);
            
            if (!$payloadData || !isset($payloadData['success']) || !$payloadData['success']) {
                return ['success' => false, 'message' => 'Failed to generate payload: ' . ($payloadData['message'] ?? 'Unknown error')];
            }
            
            $encryptedPayload = $payloadData['data']['encryptedPayload'];
            
            // Step 2: Get member token
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $apiUrl . '/api/member-auth/token');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, '{}');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'x-koperasi-auth: ' . $encryptedPayload
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            
            if ($error) {
                return ['success' => false, 'message' => 'Token request error: ' . $error];
            }
            
            if ($httpCode !== 200) {
                return ['success' => false, 'message' => 'Token HTTP error: ' . $httpCode];
            }
            
            $tokenData = json_decode($response, true);
            
            if (!$tokenData || !isset($tokenData['success']) || !$tokenData['success']) {
                return ['success' => false, 'message' => 'Authentication failed: ' . ($tokenData['message'] ?? 'Invalid credentials')];
            }
            
            $token = $tokenData['data']['token'];
            
            // Step 3: Get member savings data (upgrade-aware endpoint)
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $apiUrl . '/api/savings/member-by-uuid/' . urlencode($uuid));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            
            if ($error) {
                return ['success' => false, 'message' => 'Savings request error: ' . $error];
            }
            
            if ($httpCode !== 200) {
                return ['success' => false, 'message' => 'Savings HTTP error: ' . $httpCode];
            }
            
            $savingsData = json_decode($response, true);
            
            if (!$savingsData || !isset($savingsData['success']) || !$savingsData['success']) {
                return ['success' => false, 'message' => 'No savings data available'];
            }
            
            // Step 4: Get upgrade status untuk member ini
            $upgradeData = null;
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $apiUrl . '/api/product-upgrade/active/' . urlencode($uuid));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            
            $upgradeResponse = curl_exec($ch);
            $upgradeHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $upgradeError = curl_error($ch);
            curl_close($ch);
            
            if (!$upgradeError && $upgradeHttpCode === 200) {
                $upgradeResult = json_decode($upgradeResponse, true);
                if ($upgradeResult && isset($upgradeResult['success']) && $upgradeResult['success']) {
                    $upgradeData = $upgradeResult['data'];
                }
            }
            
            // Step 5: Get member info
            $memberData = null;
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $apiUrl . '/api/members/' . urlencode($uuid));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            
            $memberResponse = curl_exec($ch);
            $memberHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $memberError = curl_error($ch);
            curl_close($ch);
            
            if (!$memberError && $memberHttpCode === 200) {
                $memberResult = json_decode($memberResponse, true);
                if ($memberResult && isset($memberResult['success']) && $memberResult['success']) {
                    $memberData = $memberResult['data'];
                }
            }
            
            // Combine semua data dengan upgrade awareness
            $result = [
                'member' => $memberData,
                'savings' => $savingsData['data'],
                'upgrade' => $upgradeData,
                'hasActiveUpgrade' => $upgradeData && isset($upgradeData['hasActiveUpgrade']) ? $upgradeData['hasActiveUpgrade'] : false,
                'upgradeInfo' => $upgradeData && isset($upgradeData['activeUpgrade']) ? $upgradeData['activeUpgrade'] : null
            ];
            
            return ['success' => true, 'data' => $result];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'System error: ' . $e->getMessage()];
        }
    }
}

if (!function_exists('postSecureMemberSavings')) {
    /**
     * Post member savings data dengan upgrade awareness
     * @param string $uuid Member UUID
     * @param array $savingsData Data simpanan
     * @param string $apiUrl Base API URL
     * @return array Response data
     */
    function postSecureMemberSavings($uuid, $savingsData, $apiUrl = 'http://localhost:5000') {
        // Validasi input
        if (empty($uuid)) {
            return ['success' => false, 'message' => 'UUID is required'];
        }
        
        if (empty($savingsData) || !is_array($savingsData)) {
            return ['success' => false, 'message' => 'Savings data is required and must be an array'];
        }
        
        // Validasi required fields
        $requiredFields = ['amount', 'description'];
        foreach ($requiredFields as $field) {
            if (!isset($savingsData[$field]) || empty($savingsData[$field])) {
                return ['success' => false, 'message' => "Field '$field' is required"];
            }
        }
        
        try {
            // Step 1: Generate encrypted payload
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $apiUrl . '/api/member-auth/generate-payload');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['uuid' => $uuid]));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            
            if ($error) {
                return ['success' => false, 'message' => 'Connection error: ' . $error];
            }
            
            if ($httpCode !== 200) {
                return ['success' => false, 'message' => 'HTTP error: ' . $httpCode];
            }
            
            $payloadData = json_decode($response, true);
            
            if (!$payloadData || !isset($payloadData['success']) || !$payloadData['success']) {
                return ['success' => false, 'message' => 'Failed to generate payload: ' . ($payloadData['message'] ?? 'Unknown error')];
            }
            
            $encryptedPayload = $payloadData['data']['encryptedPayload'];
            
            // Step 2: Get member token
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $apiUrl . '/api/member-auth/token');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, '{}');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'x-koperasi-auth: ' . $encryptedPayload
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            
            if ($error) {
                return ['success' => false, 'message' => 'Token request error: ' . $error];
            }
            
            if ($httpCode !== 200) {
                return ['success' => false, 'message' => 'Token HTTP error: ' . $httpCode];
            }
            
            $tokenData = json_decode($response, true);
            
            if (!$tokenData || !isset($tokenData['success']) || !$tokenData['success']) {
                return ['success' => false, 'message' => 'Authentication failed: ' . ($tokenData['message'] ?? 'Invalid credentials')];
            }
            
            $token = $tokenData['data']['token'];
            
            // Step 3: POST member savings data (upgrade-aware endpoint)
            // Endpoint ini sudah otomatis handle upgrade dan set periode + amount yang benar
            $postData = [
                'amount' => $savingsData['amount'],
                'description' => $savingsData['description']
            ];
            
            // Handle file upload jika ada
            if (isset($savingsData['proofFile']) && !empty($savingsData['proofFile'])) {
                // Untuk file upload, gunakan multipart/form-data
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $apiUrl . '/api/members/savings/' . urlencode($uuid));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                
                // Prepare multipart data
                $postFields = [
                    'amount' => $savingsData['amount'],
                    'description' => $savingsData['description']
                ];
                
                // Add file if it's a file path
                if (is_string($savingsData['proofFile']) && file_exists($savingsData['proofFile'])) {
                    $postFields['proofFile'] = new CURLFile($savingsData['proofFile']);
                }
                
                curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Authorization: Bearer ' . $token
                ]);
            } else {
                // Regular JSON POST
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $apiUrl . '/api/members/savings/' . urlencode($uuid));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Authorization: Bearer ' . $token,
                    'Content-Type: application/json'
                ]);
            }
            
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            
            if ($error) {
                return ['success' => false, 'message' => 'Savings POST error: ' . $error];
            }
            
            if ($httpCode !== 201 && $httpCode !== 200) {
                return ['success' => false, 'message' => 'Savings POST HTTP error: ' . $httpCode, 'response' => $response];
            }
            
            $responseData = json_decode($response, true);
            
            if (!$responseData || !isset($responseData['success']) || !$responseData['success']) {
                return ['success' => false, 'message' => 'Failed to create savings: ' . ($responseData['message'] ?? 'Unknown error')];
            }
            
            return ['success' => true, 'data' => $responseData['data'], 'message' => $responseData['message'] ?? 'Savings created successfully'];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'System error: ' . $e->getMessage()];
        }
    }
}

if (!function_exists('getExpectedSavingsAmount')) {
    /**
     * Get expected savings amount untuk member (dengan upgrade awareness)
     * @param string $uuid Member UUID
     * @param string $apiUrl Base API URL
     * @return array Response dengan expected amount
     */
    function getExpectedSavingsAmount($uuid, $apiUrl = 'http://localhost:5000') {
        try {
            // Get member data dulu
            $memberData = getSecureMemberSavings($uuid, $apiUrl);
            
            if (!$memberData['success']) {
                return $memberData;
            }
            
            $data = $memberData['data'];
            $member = $data['member'];
            $upgradeInfo = $data['upgradeInfo'];
            
            // Hitung expected amount berdasarkan upgrade status
            $expectedAmount = $member['product']['depositAmount'] ?? 0;
            $isUpgradePeriod = false;
            $upgradeDetails = null;
            
            if ($data['hasActiveUpgrade'] && $upgradeInfo) {
                // Hitung periode berikutnya
                $approvedSavings = array_filter($data['savings']['savings'] ?? [], function($saving) {
                    return $saving['status'] === 'Approved' && $saving['type'] === 'Setoran';
                });
                
                $lastPeriod = 0;
                foreach ($approvedSavings as $saving) {
                    if ($saving['installmentPeriod'] > $lastPeriod) {
                        $lastPeriod = $saving['installmentPeriod'];
                    }
                }
                
                $nextPeriod = $lastPeriod + 1;
                
                if ($nextPeriod > $upgradeInfo['periodWhenUpgraded']) {
                    $expectedAmount = $upgradeInfo['newMonthlyAmount'];
                    $isUpgradePeriod = true;
                    $upgradeDetails = [
                        'oldAmount' => $member['product']['depositAmount'],
                        'newAmount' => $upgradeInfo['newMonthlyAmount'],
                        'compensation' => $upgradeInfo['compensationPerMonth'],
                        'upgradeFromPeriod' => $upgradeInfo['periodWhenUpgraded'] + 1
                    ];
                }
            }
            
            return [
                'success' => true,
                'data' => [
                    'expectedAmount' => $expectedAmount,
                    'isUpgradePeriod' => $isUpgradePeriod,
                    'upgradeDetails' => $upgradeDetails,
                    'nextPeriod' => $nextPeriod ?? 1
                ]
            ];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'System error: ' . $e->getMessage()];
        }
    }
}

if (!function_exists('getProofFileUrl')) {
    /**
     * Get URL untuk mengakses file bukti simpanan
     * @param string $filename Nama file bukti (contoh: proofFile-1757557163390-70348894.png)
     * @param string $apiUrl Base API URL
     * @return string URL untuk mengakses file
     */
    function getProofFileUrl($filename, $apiUrl = 'http://localhost:5000') {
        if (empty($filename)) {
            return null;
        }
        
        // Validasi filename untuk keamanan
        if (strpos($filename, '..') !== false || strpos($filename, '/') !== false) {
            return null;
        }
        
        // Validasi format file yang didukung
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf'];
        $fileExtension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        if (!in_array($fileExtension, $allowedExtensions)) {
            return null;
        }
        
        // Return URL endpoint untuk mengakses file
        return $apiUrl . '/api/member-auth/proof/' . urlencode($filename);
    }
}

if (!function_exists('testProofFileAccess')) {
    /**
     * Test apakah file bukti bisa diakses
     * @param string $filename Nama file bukti
     * @param string $apiUrl Base API URL
     * @return array Status akses file
     */
    function testProofFileAccess($filename, $apiUrl = 'http://localhost:5000') {
        $url = getProofFileUrl($filename, $apiUrl);
        
        if (!$url) {
            return [
                'accessible' => false,
                'error' => 'Invalid filename or unsupported format'
            ];
        }
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_NOBODY, true); // HEAD request only
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        
        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        
        return [
            'accessible' => !$error && $httpCode === 200,
            'http_code' => $httpCode,
            'content_type' => $contentType,
            'error' => $error,
            'url' => $url
        ];
    }
}

if (!function_exists('testMernConnection')) {
    function testMernConnection($apiUrl = 'http://localhost:5000') {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $apiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        
        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        return [
            'connected' => !$error && $httpCode > 0,
            'http_code' => $httpCode,
            'error' => $error
        ];
    }
}

/* 
CARA PAKAI DI CONTROLLER CODEIGNITER (UPGRADE-AWARE):

class StudentController extends CI_Controller {
    
    public function getSavings() {
        $this->load->helper('secure_member');
        
        $student_uuid = $this->session->userdata('student_uuid');
        
        if (!$student_uuid) {
            return $this->output
                ->set_content_type('application/json')
                ->set_output(json_encode([
                    'success' => false, 
                    'message' => 'Student UUID not found in session'
                ]));
        }
        
        // Get savings data dengan upgrade awareness
        $result = getSecureMemberSavings($student_uuid);
        
        return $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode($result));
    }
    
    public function submitSavings() {
        $this->load->helper('secure_member');
        
        $student_uuid = $this->session->userdata('student_uuid');
        
        if (!$student_uuid) {
            return $this->output
                ->set_content_type('application/json')
                ->set_output(json_encode([
                    'success' => false, 
                    'message' => 'Student UUID not found in session'
                ]));
        }
        
        // Get expected amount dulu (upgrade-aware)
        $expectedResult = getExpectedSavingsAmount($student_uuid);
        
        if (!$expectedResult['success']) {
            return $this->output
                ->set_content_type('application/json')
                ->set_output(json_encode($expectedResult));
        }
        
        $expectedAmount = $expectedResult['data']['expectedAmount'];
        $isUpgradePeriod = $expectedResult['data']['isUpgradePeriod'];
        
        // Prepare savings data
        $savingsData = [
            'amount' => $expectedAmount, // Gunakan expected amount (upgrade-aware)
            'description' => $isUpgradePeriod 
                ? 'Simpanan periode upgrade dengan kompensasi'
                : 'Simpanan bulanan reguler'
        ];
        
        // Handle file upload jika ada
        if (isset($_FILES['proofFile']) && $_FILES['proofFile']['error'] === UPLOAD_ERR_OK) {
            $savingsData['proofFile'] = $_FILES['proofFile']['tmp_name'];
        }
        
        // Submit savings
        $result = postSecureMemberSavings($student_uuid, $savingsData);
        
        return $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode($result));
    }
    
    public function getExpectedAmount() {
        $this->load->helper('secure_member');
        
        $student_uuid = $this->session->userdata('student_uuid');
        
        if (!$student_uuid) {
            return $this->output
                ->set_content_type('application/json')
                ->set_output(json_encode([
                    'success' => false, 
                    'message' => 'Student UUID not found in session'
                ]));
        }
        
        $result = getExpectedSavingsAmount($student_uuid);
        
        return $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode($result));
    }
    
    public function viewProofFile($filename) {
        $this->load->helper('secure_member');
        
        // Test akses file dulu
        $accessTest = testProofFileAccess($filename);
        
        if (!$accessTest['accessible']) {
            show_404();
            return;
        }
        
        // Get URL file
        $fileUrl = getProofFileUrl($filename);
        
        if (!$fileUrl) {
            show_404();
            return;
        }
        
        // Redirect ke URL file atau tampilkan dalam iframe
        redirect($fileUrl);
    }
    
    public function getSavingsWithProofUrls() {
        $this->load->helper('secure_member');
        
        $student_uuid = $this->session->userdata('student_uuid');
        
        if (!$student_uuid) {
            return $this->output
                ->set_content_type('application/json')
                ->set_output(json_encode([
                    'success' => false, 
                    'message' => 'Student UUID not found in session'
                ]));
        }
        
        // Get savings data
        $result = getSecureMemberSavings($student_uuid);
        
        if ($result['success'] && isset($result['data']['savings']['savings'])) {
            // Tambahkan URL untuk setiap proof file
            foreach ($result['data']['savings']['savings'] as &$saving) {
                if (!empty($saving['proofFile'])) {
                    // Extract filename dari path
                    $filename = basename($saving['proofFile']);
                    $saving['proofFileUrl'] = getProofFileUrl($filename);
                    $saving['proofFileAccessible'] = testProofFileAccess($filename)['accessible'];
                }
            }
        }
        
        return $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode($result));
    }
}

CONTOH RESPONSE getSecureMemberSavings():
{
    "success": true,
    "data": {
        "member": {
            "uuid": "JPSB37142",
            "name": "Puspita",
            "product": {
                "title": "PAKET SENPAI",
                "depositAmount": 3500000
            }
        },
        "savings": {
            "savings": [...] // Array savings data
        },
        "upgrade": {
            "hasActiveUpgrade": true,
            "activeUpgrade": {
                "periodWhenUpgraded": 12,
                "newMonthlyAmount": 5500000,
                "compensationPerMonth": 2000000
            }
        },
        "hasActiveUpgrade": true,
        "upgradeInfo": {...}
    }
}

CONTOH RESPONSE getExpectedSavingsAmount():
{
    "success": true,
    "data": {
        "expectedAmount": 5500000,
        "isUpgradePeriod": true,
        "upgradeDetails": {
            "oldAmount": 3500000,
            "newAmount": 5500000,
            "compensation": 2000000,
            "upgradeFromPeriod": 13
        },
        "nextPeriod": 13
    }
}

CONTOH PENGGUNAAN FUNGSI FILE BUKTI:

// 1. Mendapatkan URL file bukti
$filename = "proofFile-1757557163390-70348894.png";
$fileUrl = getProofFileUrl($filename);
echo $fileUrl; // Output: http://localhost:5000/api/member-auth/proof/proofFile-1757557163390-70348894.png

// 2. Test akses file bukti
$accessTest = testProofFileAccess($filename);
if ($accessTest['accessible']) {
    echo "File dapat diakses: " . $accessTest['url'];
    echo "Content-Type: " . $accessTest['content_type'];
} else {
    echo "File tidak dapat diakses: " . $accessTest['error'];
}

// 3. Dalam view HTML untuk menampilkan gambar bukti
<?php if (!empty($saving['proofFile'])): ?>
    <?php $filename = basename($saving['proofFile']); ?>
    <?php $fileUrl = getProofFileUrl($filename); ?>
    <?php if ($fileUrl): ?>
        <a href="<?= $fileUrl ?>" target="_blank">
            <img src="<?= $fileUrl ?>" alt="Bukti Pembayaran" style="max-width: 200px;">
        </a>
    <?php endif; ?>
<?php endif; ?>

// 4. Untuk PDF bukti pembayaran
<?php if (!empty($saving['proofFile'])): ?>
    <?php $filename = basename($saving['proofFile']); ?>
    <?php $fileUrl = getProofFileUrl($filename); ?>
    <?php if ($fileUrl && pathinfo($filename, PATHINFO_EXTENSION) === 'pdf'): ?>
        <iframe src="<?= $fileUrl ?>" width="100%" height="600px"></iframe>
        <p><a href="<?= $fileUrl ?>" target="_blank">Buka PDF di tab baru</a></p>
    <?php endif; ?>
<?php endif; ?>

CONTOH RESPONSE testProofFileAccess():
{
    "accessible": true,
    "http_code": 200,
    "content_type": "image/png",
    "error": "",
    "url": "http://localhost:5000/api/member-auth/proof/proofFile-1757557163390-70348894.png"
}

KEAMANAN:
- Fungsi getProofFileUrl() sudah memvalidasi nama file untuk mencegah path traversal
- Hanya format file yang diizinkan: JPG, JPEG, PNG, GIF, PDF
- Endpoint /api/member-auth/proof/ tidak memerlukan autentikasi untuk kemudahan akses
- File disimpan dengan nama yang di-hash sehingga sulit ditebak

*/
?>
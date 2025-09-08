<?php
/**
 * CODEIGNITER SECURE HELPER - GET SAVINGS (UPGRADE AWARE)
 * File helper untuk CodeIgniter integration dengan format response yang sama
 * 
 * Simpan di: application/helpers/secure_member_get_helper.php
 */

if (!defined('BASEPATH')) exit('No direct script access allowed');

if (!function_exists('getSecureMemberSavingsFormatted')) {
    /**
     * Get member savings data dalam format array periode (upgrade-aware)
     * @param string $uuid Member UUID
     * @param string $apiUrl Base API URL
     * @return array Response data dalam format periode
     */
    function getSecureMemberSavingsFormatted($uuid, $apiUrl = 'http://localhost:5000') {
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
            
            // Step 3: Get member dashboard data (yang sudah upgrade-aware)
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $apiUrl . '/api/members/dashboard/' . urlencode($uuid));
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
                return ['success' => false, 'message' => 'Dashboard request error: ' . $error];
            }
            
            if ($httpCode !== 200) {
                return ['success' => false, 'message' => 'Dashboard HTTP error: ' . $httpCode];
            }
            
            $dashboardData = json_decode($response, true);
            
            // Handle different response formats
            if (is_array($dashboardData) && !isset($dashboardData['success'])) {
                // Student dashboard format (array of periods) - sudah upgrade-aware dari backend
                return ['success' => true, 'data' => $dashboardData];
            } elseif (isset($dashboardData['success']) && $dashboardData['success']) {
                // Standard API response format
                return ['success' => true, 'data' => $dashboardData['data']];
            } else {
                return ['success' => false, 'message' => 'No dashboard data available'];
            }
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'System error: ' . $e->getMessage()];
        }
    }
}

if (!function_exists('getSecureMemberUpgradeInfo')) {
    /**
     * Get member upgrade info saja
     * @param string $uuid Member UUID
     * @param string $apiUrl Base API URL
     * @return array Upgrade info
     */
    function getSecureMemberUpgradeInfo($uuid, $apiUrl = 'http://localhost:5000') {
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
            
            // Step 3: Get upgrade info
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $apiUrl . '/api/product-upgrade/active/' . urlencode($uuid));
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
                return ['success' => false, 'message' => 'Upgrade request error: ' . $error];
            }
            
            if ($httpCode !== 200) {
                return ['success' => false, 'message' => 'Upgrade HTTP error: ' . $httpCode];
            }
            
            $upgradeData = json_decode($response, true);
            
            if (!$upgradeData || !isset($upgradeData['success']) || !$upgradeData['success']) {
                return ['success' => true, 'data' => ['hasActiveUpgrade' => false, 'upgradeInfo' => null]];
            }
            
            return ['success' => true, 'data' => $upgradeData['data']];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'System error: ' . $e->getMessage()];
        }
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
CARA PAKAI DI CONTROLLER CODEIGNITER:

class StudentController extends CI_Controller {
    
    public function getSavings() {
        // Load helper
        $this->load->helper('secure_member_get');
        
        // Ambil UUID dari session
        $student_uuid = $this->session->userdata('student_uuid');
        
        if (!$student_uuid) {
            return $this->output
                ->set_content_type('application/json')
                ->set_output(json_encode([
                    'success' => false, 
                    'message' => 'Student UUID not found in session'
                ]));
        }
        
        // Panggil helper function - return format array periode yang sama
        $result = getSecureMemberSavingsFormatted($student_uuid);
        
        // Return JSON response
        return $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode($result['data'] ?? [])); // Return array langsung
    }
    
    public function getUpgradeInfo() {
        $this->load->helper('secure_member_get');
        
        $student_uuid = $this->session->userdata('student_uuid');
        
        if (!$student_uuid) {
            return $this->output
                ->set_content_type('application/json')
                ->set_output(json_encode([
                    'success' => false, 
                    'message' => 'Student UUID not found in session'
                ]));
        }
        
        $result = getSecureMemberUpgradeInfo($student_uuid);
        
        return $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode($result));
    }
}

CONTOH RESPONSE getSecureMemberSavingsFormatted():
[
    {
        "installment_period": 1,
        "projection": "2500000",
        "dateProjection": "October 2025",
        "realization": "2500000",
        "payment_proof": "PAYMENT_JPTG98176_20250807_081622.pdf"
    },
    {
        "installment_period": 13,
        "projection": "5500000",  // ✅ UPGRADE: Nominal baru + kompensasi
        "dateProjection": "October 2026",
        "realization": 0,
        "payment_proof": 0
    },
    ...
]

CONTOH RESPONSE getSecureMemberUpgradeInfo():
{
    "success": true,
    "data": {
        "hasActiveUpgrade": true,
        "activeUpgrade": {
            "periodWhenUpgraded": 12,
            "newMonthlyAmount": 5500000,
            "compensationPerMonth": 2000000,
            "oldProduct": {
                "title": "PAKET SILVER",
                "depositAmount": 2500000
            },
            "newProduct": {
                "title": "PAKET GOLD", 
                "depositAmount": 3500000
            }
        }
    }
}

*/
?>
<?php
/**
 * CODEIGNITER SECURE HELPER
 * File helper untuk CodeIgniter integration
 * 
 * Simpan di: application/helpers/secure_member_helper.php
 */

if (!defined('BASEPATH')) exit('No direct script access allowed');

if (!function_exists('getSecureMemberSavings')) {
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
            
            // Step 3: Get member dashboard data
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
                // Student dashboard format (array of periods)
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
        $this->load->helper('secure_member');
        
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
        
        // Panggil helper function
        $result = getSecureMemberSavings($student_uuid);
        
        // Return JSON response
        return $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode($result));
    }
    
    public function testConnection() {
        $this->load->helper('secure_member');
        $result = testMernConnection();
        
        return $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode($result));
    }
}

ATAU DENGAN CI4:

class StudentController extends BaseController {
    
    public function getSavings() {
        helper('secure_member');
        
        $student_uuid = session()->get('student_uuid');
        
        if (!$student_uuid) {
            return $this->response->setJSON([
                'success' => false, 
                'message' => 'Student UUID not found in session'
            ]);
        }
        
        $result = getSecureMemberSavings($student_uuid);
        
        return $this->response->setJSON($result);
    }
}

*/
?>
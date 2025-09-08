<?php
/**
 * CODEIGNITER SECURE POST HELPER
 * File helper untuk POST member savings dengan keamanan yang sama seperti GET
 * 
 * Simpan di: application/helpers/secure_member_post_helper.php
 */

if (!defined('BASEPATH')) exit('No direct script access allowed');

if (!function_exists('postSecureMemberSavings')) {
    /**
     * Post member savings dengan sistem keamanan yang sama seperti GET
     * 
     * @param string $uuid Member UUID
     * @param array $savingsData Data savings yang akan dipost
     * @param string $apiUrl Base API URL
     * @return array Response result
     */
    function postSecureMemberSavings($uuid, $savingsData, $apiUrl = 'http://localhost:5000') {
        // Validasi UUID
        if (empty($uuid)) {
            return ['success' => false, 'message' => 'UUID is required'];
        }
        
        // Validasi data savings
        if (empty($savingsData) || !is_array($savingsData)) {
            return ['success' => false, 'message' => 'Savings data is required'];
        }
        
        // Validasi required fields
        $requiredFields = ['amount', 'description'];
        foreach ($requiredFields as $field) {
            if (!isset($savingsData[$field]) || empty($savingsData[$field])) {
                return ['success' => false, 'message' => "Field '{$field}' is required"];
            }
        }
        
        try {
            // Step 1: Generate encrypted payload (sama seperti GET)
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
            
            // Step 2: Get member token (sama seperti GET)
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
            
            // Step 3: Cek expected amount dulu (upgrade-aware)
            // Ambil member ID dari UUID
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
            curl_close($ch);
            
            if ($memberHttpCode === 200) {
                $memberData = json_decode($memberResponse, true);
                if ($memberData && isset($memberData['success']) && $memberData['success']) {
                    $member = $memberData['data'];
                    $memberId = $member['_id'];
                    $productId = $member['productId'];
                    
                    // Cek expected amount dengan endpoint upgrade-aware
                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, $apiUrl . '/api/savings/check-period/' . urlencode($memberId) . '/' . urlencode($productId));
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_HTTPHEADER, [
                        'Authorization: Bearer ' . $token,
                        'Content-Type: application/json'
                    ]);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
                    
                    $periodResponse = curl_exec($ch);
                    $periodHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    
                    if ($periodHttpCode === 200) {
                        $periodData = json_decode($periodResponse, true);
                        if ($periodData && isset($periodData['success']) && $periodData['success']) {
                            $expectedAmount = $periodData['data']['expectedAmount'] ?? null;
                            $upgradeInfo = $periodData['data']['upgradeInfo'] ?? null;
                            
                            // Validasi amount terhadap expected amount
                            if ($expectedAmount && isset($savingsData['amount']) && $savingsData['amount'] < $expectedAmount) {
                                $errorMessage = 'Jumlah simpanan minimal Rp ' . number_format($expectedAmount, 0, ',', '.');
                                if ($upgradeInfo && $upgradeInfo['isUpgradePeriod']) {
                                    $errorMessage .= ' (termasuk kompensasi upgrade Rp ' . number_format($upgradeInfo['compensation'], 0, ',', '.') . ')';
                                }
                                return ['success' => false, 'message' => $errorMessage];
                            }
                        }
                    }
                }
            }
            
            // Step 4: POST member savings data
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $apiUrl . '/api/members/savings/' . urlencode($uuid));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            
            // Handle file upload jika ada
            if (isset($savingsData['proofFile']) && is_array($savingsData['proofFile'])) {
                // File upload dengan multipart/form-data
                $postData = [];
                foreach ($savingsData as $key => $value) {
                    if ($key !== 'proofFile') {
                        $postData[$key] = $value;
                    }
                }
                
                // Add file
                $fileInfo = $savingsData['proofFile'];
                if (isset($fileInfo['tmp_name']) && isset($fileInfo['name'])) {
                    $postData['proofFile'] = new CURLFile($fileInfo['tmp_name'], $fileInfo['type'] ?? 'application/octet-stream', $fileInfo['name']);
                }
                
                curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Authorization: Bearer ' . $token
                    // Content-Type akan di-set otomatis oleh cURL untuk multipart
                ]);
            } else {
                // JSON data tanpa file
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($savingsData));
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Authorization: Bearer ' . $token,
                    'Content-Type: application/json'
                ]);
            }
            
            curl_setopt($ch, CURLOPT_TIMEOUT, 30); // Timeout lebih lama untuk upload
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            
            if ($error) {
                return ['success' => false, 'message' => 'Savings post error: ' . $error];
            }
            
            if ($httpCode !== 201 && $httpCode !== 200) {
                return ['success' => false, 'message' => 'Savings HTTP error: ' . $httpCode, 'response' => $response];
            }
            
            $savingsResult = json_decode($response, true);
            
            if (!$savingsResult) {
                return ['success' => false, 'message' => 'Invalid response format'];
            }
            
            // Handle different response formats
            if (isset($savingsResult['success']) && $savingsResult['success']) {
                return ['success' => true, 'data' => $savingsResult['data'], 'message' => $savingsResult['message'] ?? 'Savings posted successfully'];
            } else {
                return ['success' => false, 'message' => $savingsResult['message'] ?? 'Failed to post savings'];
            }
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'System error: ' . $e->getMessage()];
        }
    }
}

if (!function_exists('validateSavingsData')) {
    /**
     * Validasi data savings sebelum POST
     * 
     * @param array $data Savings data
     * @return array Validation result
     */
    function validateSavingsData($data) {
        $errors = [];
        
        // Required fields
        if (empty($data['amount']) || !is_numeric($data['amount']) || $data['amount'] <= 0) {
            $errors[] = 'Amount must be a positive number';
        }
        
        if (empty($data['description'])) {
            $errors[] = 'Description is required';
        }
        
        // Optional file validation
        if (isset($data['proofFile']) && is_array($data['proofFile'])) {
            $file = $data['proofFile'];
            
            // Check file size (max 5MB)
            if (isset($file['size']) && $file['size'] > 5 * 1024 * 1024) {
                $errors[] = 'File size must be less than 5MB';
            }
            
            // Check file type
            if (isset($file['type'])) {
                $allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
                if (!in_array($file['type'], $allowedTypes)) {
                    $errors[] = 'File type must be JPG, PNG, or PDF';
                }
            }
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
}

/*
CARA PAKAI DI CONTROLLER CODEIGNITER:

class StudentController extends CI_Controller {
    
    public function postSavings() {
        // Load helper
        $this->load->helper('secure_member_post');
        
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
        
        // Ambil data dari form
        $savingsData = [
            'amount' => $this->input->post('amount'),
            'description' => $this->input->post('description')
        ];
        
        // Handle file upload jika ada
        if (!empty($_FILES['proofFile']['name'])) {
            $savingsData['proofFile'] = $_FILES['proofFile'];
        }
        
        // Validasi data
        $validation = validateSavingsData($savingsData);
        if (!$validation['valid']) {
            return $this->output
                ->set_content_type('application/json')
                ->set_output(json_encode([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validation['errors']
                ]));
        }
        
        // Post savings
        $result = postSecureMemberSavings($student_uuid, $savingsData);
        
        // Return JSON response
        return $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode($result));
    }
}

ATAU DENGAN CI4:

class StudentController extends BaseController {
    
    public function postSavings() {
        helper('secure_member_post');
        
        $student_uuid = session()->get('student_uuid');
        
        if (!$student_uuid) {
            return $this->response->setJSON([
                'success' => false, 
                'message' => 'Student UUID not found in session'
            ]);
        }
        
        // Ambil data dari request
        $savingsData = [
            'amount' => $this->request->getPost('amount'),
            'description' => $this->request->getPost('description')
        ];
        
        // Handle file upload
        $file = $this->request->getFile('proofFile');
        if ($file && $file->isValid()) {
            $savingsData['proofFile'] = [
                'tmp_name' => $file->getTempName(),
                'name' => $file->getName(),
                'type' => $file->getMimeType(),
                'size' => $file->getSize()
            ];
        }
        
        // Validasi
        $validation = validateSavingsData($savingsData);
        if (!$validation['valid']) {
            return $this->response->setJSON([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validation['errors']
            ]);
        }
        
        // Post savings
        $result = postSecureMemberSavings($student_uuid, $savingsData);
        
        return $this->response->setJSON($result);
    }
}

CONTOH FORM HTML:

<form id="savingsForm" enctype="multipart/form-data">
    <div class="form-group">
        <label for="amount">Jumlah Setoran:</label>
        <input type="number" id="amount" name="amount" required min="1">
    </div>
    
    <div class="form-group">
        <label for="description">Deskripsi:</label>
        <textarea id="description" name="description" required></textarea>
    </div>
    
    <div class="form-group">
        <label for="proofFile">Bukti Pembayaran (Opsional):</label>
        <input type="file" id="proofFile" name="proofFile" accept=".jpg,.jpeg,.png,.pdf">
    </div>
    
    <button type="submit">Submit Setoran</button>
</form>

<script>
document.getElementById('savingsForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    fetch('/student/postSavings', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Setoran berhasil disubmit!');
            // Refresh atau redirect
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Terjadi kesalahan sistem');
    });
});
</script>
*/
?>
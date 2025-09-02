<?php
/**
 * Simple connection test untuk debug
 */

echo "<h2>🔍 Connection Test Debug</h2>";

// Test 1: Basic curl ke MERN server
echo "<h3>Test 1: Basic Connection</h3>";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost:5000/api/member-auth/generate-payload');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['uuid' => 'JPSB37142']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "<pre>";
echo "HTTP Code: $httpCode\n";
echo "Error: $error\n";
echo "Response: $response\n";
echo "</pre>";

// Test 2: Check if MERN server is running
echo "<h3>Test 2: Server Status</h3>";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost:5000');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_NOBODY, true); // HEAD request

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "<pre>";
echo "Server Status - HTTP Code: $httpCode\n";
echo "Error: $error\n";
if ($httpCode == 0) {
    echo "❌ MERN server tidak bisa diakses dari PHP\n";
    echo "Pastikan:\n";
    echo "1. MERN server running: npm start\n";
    echo "2. Server di http://localhost:5000\n";
    echo "3. CORS enabled untuk localhost\n";
} else {
    echo "✅ MERN server bisa diakses\n";
}
echo "</pre>";

// Test 3: Manual test dengan data yang sama seperti Postman
echo "<h3>Test 3: Manual API Test</h3>";
echo "<form method='post'>";
echo "<input type='text' name='test_uuid' value='JPSB37142' placeholder='UUID'>";
echo "<button type='submit'>Test API Call</button>";
echo "</form>";

if (isset($_POST['test_uuid'])) {
    $uuid = $_POST['test_uuid'];
    
    echo "<h4>Testing dengan UUID: $uuid</h4>";
    
    // Step 1: Generate payload
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'http://localhost:5000/api/member-auth/generate-payload');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['uuid' => $uuid]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response1 = curl_exec($ch);
    $httpCode1 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error1 = curl_error($ch);
    curl_close($ch);
    
    echo "<pre>";
    echo "=== STEP 1: Generate Payload ===\n";
    echo "HTTP Code: $httpCode1\n";
    echo "Error: $error1\n";
    echo "Response: $response1\n";
    echo "</pre>";
    
    if ($httpCode1 == 200 && $response1) {
        $data1 = json_decode($response1, true);
        if (isset($data1['data']['encryptedPayload'])) {
            $encryptedPayload = $data1['data']['encryptedPayload'];
            
            // Step 2: Get token
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, 'http://localhost:5000/api/member-auth/token');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, '{}');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'x-koperasi-auth: ' . $encryptedPayload
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            
            $response2 = curl_exec($ch);
            $httpCode2 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error2 = curl_error($ch);
            curl_close($ch);
            
            echo "<pre>";
            echo "=== STEP 2: Get Token ===\n";
            echo "HTTP Code: $httpCode2\n";
            echo "Error: $error2\n";
            echo "Response: $response2\n";
            echo "</pre>";
            
            if ($httpCode2 == 200 && $response2) {
                $data2 = json_decode($response2, true);
                if (isset($data2['data']['token'])) {
                    $token = $data2['data']['token'];
                    
                    // Step 3: Get member data
                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, "http://localhost:5000/api/members/dashboard/$uuid");
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_HTTPHEADER, [
                        'Authorization: Bearer ' . $token,
                        'Content-Type: application/json'
                    ]);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                    
                    $response3 = curl_exec($ch);
                    $httpCode3 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    $error3 = curl_error($ch);
                    curl_close($ch);
                    
                    echo "<pre>";
                    echo "=== STEP 3: Get Member Data ===\n";
                    echo "HTTP Code: $httpCode3\n";
                    echo "Error: $error3\n";
                    echo "Response: $response3\n";
                    echo "</pre>";
                    
                    if ($httpCode3 == 200) {
                        echo "<h4 style='color: green;'>✅ SUCCESS! API berfungsi normal</h4>";
                    }
                }
            }
        }
    }
}
?>
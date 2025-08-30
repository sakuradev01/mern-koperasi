<?php
// Konfigurasi API
$api_base_url = "http://localhost:5000/api"; // Sesuaikan dengan URL server Anda

// Fungsi untuk mendapatkan data member berdasarkan UUID
function getMemberByUuid($uuid) {
    global $api_base_url;
    
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => "$api_base_url/members/$uuid",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . getToken(),
            "Content-Type: application/json"
        ]
    ]);
    
    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);
    
    if ($err) {
        return ["error" => "Error: $err"];
    }
    
    return json_decode($response, true);
}

// Fungsi untuk mendapatkan savings berdasarkan member ID
function getSavingsByMemberId($memberId) {
    global $api_base_url;
    
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => "$api_base_url/savings/member/$memberId",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . getToken(),
            "Content-Type: application/json"
        ]
    ]);
    
    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);
    
    if ($err) {
        return ["error" => "Error: $err"];
    }
    
    return json_decode($response, true);
}

// Fungsi untuk mendapatkan token
function getToken() {
    global $api_base_url;
    
    // Jika token sudah ada di session, gunakan token tersebut
    session_start();
    if (isset($_SESSION['token']) && isset($_SESSION['token_expiry']) && $_SESSION['token_expiry'] > time()) {
        return $_SESSION['token'];
    }
    
    // Jika tidak, dapatkan token baru
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => "$api_base_url/auth/login",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            "username" => "admin", // Ganti dengan username yang valid
            "password" => "admin123" // Ganti dengan password yang valid
        ]),
        CURLOPT_HTTPHEADER => [
            "Content-Type: application/json"
        ]
    ]);
    
    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);
    
    if ($err) {
        header('Content-Type: application/json');
        echo json_encode(["error" => "Error getting token: $err"]);
        exit;
    }
    
    $data = json_decode($response, true);
    if (isset($data['data']['token'])) {
        $_SESSION['token'] = $data['data']['token'];
        $_SESSION['token_expiry'] = time() + 3600; // Token berlaku 1 jam
        return $data['data']['token'];
    }
    
    header('Content-Type: application/json');
    echo json_encode(["error" => "Failed to get token", "response" => $data]);
    exit;
}

// Set header untuk JSON response
header('Content-Type: application/json');

// Ambil UUID dari GET atau POST request
$uuid = $_GET['uuid'] ?? $_POST['uuid'] ?? 'JPSB37142';

if (!$uuid) {
    echo json_encode([
        "success" => false,
        "message" => "UUID tidak diberikan",
        "data" => null
    ]);
    exit;
}

// Dapatkan member berdasarkan UUID
$memberResponse = getMemberByUuid($uuid);

if (isset($memberResponse['success']) && $memberResponse['success'] === true) {
    $memberId = $memberResponse['data']['_id'];
    
    // Dapatkan savings berdasarkan member ID
    $savingsResponse = getSavingsByMemberId($memberId);
    
    if (isset($savingsResponse['statusCode']) && $savingsResponse['statusCode'] === 200) {
        echo json_encode([
            "success" => true,
            "message" => "Data savings berhasil ditemukan",
            "data" => [
                "member" => [
                    "uuid" => $uuid,
                    "id" => $memberId,
                    "name" => $memberResponse['data']['name'] ?? "Unknown",
                ],
                "summary" => $savingsResponse['data']['summary'] ?? [],
                "savings" => $savingsResponse['data']['savings'] ?? [],
                "pagination" => $savingsResponse['data']['pagination'] ?? []
            ]
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Gagal mendapatkan data savings: " . ($savingsResponse['message'] ?? "Unknown error"),
            "data" => null
        ]);
    }
} else {
    echo json_encode([
        "success" => false,
        "message" => "Member dengan UUID $uuid tidak ditemukan",
        "data" => null
    ]);
}
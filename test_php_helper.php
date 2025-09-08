<?php
/**
 * TEST PHP HELPER - UPGRADE AWARE
 * File untuk test helper functions di localhost Windows
 */

// Include helper file
require_once 'secure_member_get_helper.php';

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set content type untuk JSON response
header('Content-Type: application/json; charset=utf-8');

echo "<h1>🧪 Test PHP Helper - MERN Koperasi</h1>";
echo "<hr>";

// Test connection dulu
echo "<h2>1. Test Connection</h2>";
$connectionTest = testMernConnection('http://localhost:5000');
echo "<pre>";
print_r($connectionTest);
echo "</pre>";

if (!$connectionTest['connected']) {
    echo "<p style='color: red;'>❌ Server tidak bisa diakses. Pastikan server MERN berjalan di http://localhost:5000</p>";
    exit;
}

echo "<p style='color: green;'>✅ Server connection OK</p>";

// Test member UUIDs
$testUuids = [
    'JPSB37142', // Puspita
    'JPTG34817', // Alu
    'JPYG15378'  // Member yang mungkin sudah upgrade
];

echo "<h2>2. Test Get Member Savings (Upgrade-Aware)</h2>";

foreach ($testUuids as $uuid) {
    echo "<h3>Testing UUID: $uuid</h3>";
    
    try {
        $result = getSecureMemberSavingsFormatted($uuid, 'http://localhost:5000');
        
        if ($result['success']) {
            $data = $result['data'];
            echo "<p style='color: green;'>✅ Success - Found " . count($data) . " periods</p>";
            
            // Tampilkan beberapa periode pertama dan terakhir
            echo "<table border='1' style='border-collapse: collapse; margin: 10px 0;'>";
            echo "<tr><th>Period</th><th>Projection</th><th>Date</th><th>Realization</th><th>Proof</th></tr>";
            
            // Tampilkan 5 periode pertama
            for ($i = 0; $i < min(5, count($data)); $i++) {
                $period = $data[$i];
                echo "<tr>";
                echo "<td>" . $period['installment_period'] . "</td>";
                echo "<td>Rp " . number_format($period['projection'], 0, ',', '.') . "</td>";
                echo "<td>" . $period['dateProjection'] . "</td>";
                echo "<td>" . ($period['realization'] ? "Rp " . number_format($period['realization'], 0, ',', '.') : "Belum bayar") . "</td>";
                echo "<td>" . ($period['payment_proof'] && $period['payment_proof'] !== '0' ? "Ada" : "Tidak ada") . "</td>";
                echo "</tr>";
            }
            
            // Jika ada lebih dari 10 periode, tampilkan ...
            if (count($data) > 10) {
                echo "<tr><td colspan='5' style='text-align: center;'>... (" . (count($data) - 10) . " periods) ...</td></tr>";
            }
            
            // Tampilkan 5 periode terakhir
            if (count($data) > 5) {
                for ($i = max(5, count($data) - 5); $i < count($data); $i++) {
                    $period = $data[$i];
                    $isUpgradePeriod = $period['projection'] != $data[0]['projection']; // Deteksi upgrade
                    $style = $isUpgradePeriod ? "background-color: #fff3cd;" : "";
                    
                    echo "<tr style='$style'>";
                    echo "<td>" . $period['installment_period'] . ($isUpgradePeriod ? " 🚀" : "") . "</td>";
                    echo "<td>Rp " . number_format($period['projection'], 0, ',', '.') . "</td>";
                    echo "<td>" . $period['dateProjection'] . "</td>";
                    echo "<td>" . ($period['realization'] ? "Rp " . number_format($period['realization'], 0, ',', '.') : "Belum bayar") . "</td>";
                    echo "<td>" . ($period['payment_proof'] && $period['payment_proof'] !== '0' ? "Ada" : "Tidak ada") . "</td>";
                    echo "</tr>";
                }
            }
            
            echo "</table>";
            
            // Deteksi upgrade
            $hasUpgrade = false;
            $firstProjection = $data[0]['projection'];
            foreach ($data as $period) {
                if ($period['projection'] != $firstProjection) {
                    $hasUpgrade = true;
                    break;
                }
            }
            
            if ($hasUpgrade) {
                echo "<p style='color: orange;'>🚀 <strong>UPGRADE DETECTED!</strong> Member ini pernah upgrade paket</p>";
            } else {
                echo "<p style='color: blue;'>📊 Member ini belum pernah upgrade paket</p>";
            }
            
        } else {
            echo "<p style='color: red;'>❌ Error: " . $result['message'] . "</p>";
        }
        
    } catch (Exception $e) {
        echo "<p style='color: red;'>❌ Exception: " . $e->getMessage() . "</p>";
    }
    
    echo "<hr>";
}

echo "<h2>3. Test Get Upgrade Info</h2>";

foreach ($testUuids as $uuid) {
    echo "<h3>Upgrade Info for UUID: $uuid</h3>";
    
    try {
        $result = getSecureMemberUpgradeInfo($uuid, 'http://localhost:5000');
        
        if ($result['success']) {
            $data = $result['data'];
            
            if ($data['hasActiveUpgrade']) {
                $upgrade = $data['activeUpgrade'];
                echo "<p style='color: green;'>✅ <strong>HAS ACTIVE UPGRADE</strong></p>";
                echo "<table border='1' style='border-collapse: collapse;'>";
                echo "<tr><th>Field</th><th>Value</th></tr>";
                echo "<tr><td>Upgrade From Period</td><td>" . ($upgrade['periodWhenUpgraded'] + 1) . "</td></tr>";
                echo "<tr><td>Old Product</td><td>" . ($upgrade['oldProduct']['title'] ?? 'N/A') . " (Rp " . number_format($upgrade['oldProduct']['depositAmount'] ?? 0, 0, ',', '.') . ")</td></tr>";
                echo "<tr><td>New Product</td><td>" . ($upgrade['newProduct']['title'] ?? 'N/A') . " (Rp " . number_format($upgrade['newProduct']['depositAmount'] ?? 0, 0, ',', '.') . ")</td></tr>";
                echo "<tr><td>Compensation per Month</td><td>Rp " . number_format($upgrade['compensationPerMonth'] ?? 0, 0, ',', '.') . "</td></tr>";
                echo "<tr><td>New Monthly Amount</td><td>Rp " . number_format($upgrade['newMonthlyAmount'] ?? 0, 0, ',', '.') . "</td></tr>";
                echo "</table>";
            } else {
                echo "<p style='color: blue;'>📊 No active upgrade</p>";
            }
            
        } else {
            echo "<p style='color: red;'>❌ Error: " . $result['message'] . "</p>";
        }
        
    } catch (Exception $e) {
        echo "<p style='color: red;'>❌ Exception: " . $e->getMessage() . "</p>";
    }
    
    echo "<hr>";
}

echo "<h2>4. Summary</h2>";
echo "<p>✅ Test completed. Check results above.</p>";
echo "<p><strong>Notes:</strong></p>";
echo "<ul>";
echo "<li>🚀 Yellow highlighted rows = Upgrade periods</li>";
echo "<li>📊 Blue text = No upgrade detected</li>";
echo "<li>✅ Green text = Success</li>";
echo "<li>❌ Red text = Error</li>";
echo "</ul>";

?>

<style>
body {
    font-family: Arial, sans-serif;
    margin: 20px;
    background-color: #f5f5f5;
}

table {
    background-color: white;
    margin: 10px 0;
}

th {
    background-color: #007bff;
    color: white;
    padding: 8px;
}

td {
    padding: 6px 8px;
}

pre {
    background-color: #f8f9fa;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
}

hr {
    margin: 20px 0;
    border: none;
    border-top: 2px solid #dee2e6;
}
</style>
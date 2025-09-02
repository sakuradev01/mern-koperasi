<?php
/**
 * CONTOH PENGGUNAAN SECURE MEMBER HELPER
 * 
 * File ini berisi berbagai contoh penggunaan secure_member_helper.php
 * untuk berbagai skenario implementasi di platform lain
 */

require_once 'secure_member_helper.php';

echo "<!DOCTYPE html>
<html lang='id'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Secure Member Helper - Usage Examples</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        .example { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #007bff; }
        .code { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; font-family: monospace; overflow-x: auto; }
        .result { background: #e8f5e8; padding: 10px; border-radius: 5px; margin-top: 10px; }
        .error { background: #ffe6e6; color: #d32f2f; }
        .warning { background: #fff3cd; color: #856404; }
        .info { background: #d1ecf1; color: #0c5460; }
        .success { background: #d4edda; color: #155724; }
        pre { margin: 0; white-space: pre-wrap; }
        .form-group { margin: 10px 0; }
        input, button { padding: 8px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007bff; color: white; cursor: pointer; }
        button:hover { background: #0056b3; }
        .security-info { background: #f1f3f4; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>🔐 Secure Member Helper - Usage Examples</h1>
        <p>File helper PHP dengan keamanan berlapis untuk mengakses data member koperasi</p>";

// ========================= CONTOH 1: BASIC USAGE =========================
echo "<div class='example'>
        <h2>📖 Contoh 1: Penggunaan Dasar</h2>
        <div class='code'>
<pre>&lt;?php
require_once 'secure_member_helper.php';

// Menggunakan fungsi helper global
\$result = getSecureMemberSavings('JPSB37142');

if (\$result['success']) {
    echo 'Data berhasil diambil: ' . json_encode(\$result['data']);
} else {
    echo 'Error: ' . \$result['message'];
}
?&gt;</pre>
        </div>";

if (isset($_GET['test1'])) {
    echo "<div class='result'>";
    $result = getSecureMemberSavings('JPSB37142');
    echo "<pre>" . json_encode($result, JSON_PRETTY_PRINT) . "</pre>";
    echo "</div>";
}

echo "<button onclick=\"window.location.href='?test1=1'\">🧪 Test Contoh 1</button>
      </div>";

// ========================= CONTOH 2: ADVANCED USAGE =========================
echo "<div class='example'>
        <h2>🔧 Contoh 2: Penggunaan Advanced dengan Custom API URL</h2>
        <div class='code'>
<pre>&lt;?php
require_once 'secure_member_helper.php';

// Inisialisasi dengan custom API URL
\$helper = new SecureMemberHelper('https://api-koperasi.yourschool.edu');

// Ambil data dengan error handling lengkap
\$uuid = 'JPSB37142';
\$result = \$helper->getMemberSavings(\$uuid);

if (\$result['success']) {
    \$data = \$result['data'];
    
    // Proses data sesuai kebutuhan
    if (is_array(\$data) && isset(\$data[0])) {
        // Format student dashboard
        foreach (\$data as \$period) {
            echo \"Period {\$period['installment_period']}: \";
            echo \"Projection: {\$period['projection']}, \";
            echo \"Realization: {\$period['realization']}\";
            echo \"&lt;br&gt;\";
        }
    } else {
        // Format member data
        echo \"Member: \" . \$data['member']['name'];
        echo \"Total Savings: \" . \$data['savings']['totalSetoran'];
    }
} else {
    // Error handling
    switch (\$result['error_code']) {
        case 'RATE_LIMIT_EXCEEDED':
            echo 'Terlalu banyak request, coba lagi nanti';
            break;
        case 'VALIDATION_FAILED':
            echo 'UUID tidak valid';
            break;
        case 'TOKEN_FAILED':
            echo 'Gagal autentikasi';
            break;
        default:
            echo 'Error: ' . \$result['message'];
    }
}
?&gt;</pre>
        </div>";

if (isset($_GET['test2'])) {
    echo "<div class='result'>";
    $helper = new SecureMemberHelper('http://localhost:5000');
    $result = $helper->getMemberSavings('JPSB37142');
    echo "<pre>" . json_encode($result, JSON_PRETTY_PRINT) . "</pre>";
    echo "</div>";
}

echo "<button onclick=\"window.location.href='?test2=1'\">🧪 Test Contoh 2</button>
      </div>";

// ========================= CONTOH 3: AJAX IMPLEMENTATION =========================
echo "<div class='example'>
        <h2>⚡ Contoh 3: Implementasi AJAX untuk Web App</h2>
        <div class='code'>
<pre>// HTML
&lt;input type=\"text\" id=\"studentUuid\" placeholder=\"Masukkan UUID siswa\"&gt;
&lt;button onclick=\"loadStudentData()\"&gt;Load Data&lt;/button&gt;
&lt;div id=\"result\"&gt;&lt;/div&gt;

// JavaScript
function loadStudentData() {
    const uuid = document.getElementById('studentUuid').value;
    
    if (!uuid) {
        alert('UUID harus diisi');
        return;
    }
    
    // Loading state
    document.getElementById('result').innerHTML = 'Loading...';
    
    // AJAX call
    fetch('secure_member_helper.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'uuid=' + encodeURIComponent(uuid)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayStudentData(data.data);
        } else {
            showError(data.message);
        }
    })
    .catch(error => {
        showError('Network error: ' + error.message);
    });
}

function displayStudentData(data) {
    let html = '&lt;h3&gt;Data Simpanan Siswa&lt;/h3&gt;';
    
    if (Array.isArray(data)) {
        // Student dashboard format
        html += '&lt;table border=\"1\"&gt;';
        html += '&lt;tr&gt;&lt;th&gt;Period&lt;/th&gt;&lt;th&gt;Projection&lt;/th&gt;&lt;th&gt;Realization&lt;/th&gt;&lt;th&gt;Date&lt;/th&gt;&lt;/tr&gt;';
        
        data.forEach(period => {
            html += `&lt;tr&gt;
                &lt;td&gt;\${period.installment_period}&lt;/td&gt;
                &lt;td&gt;Rp \${Number(period.projection).toLocaleString()}&lt;/td&gt;
                &lt;td&gt;Rp \${Number(period.realization).toLocaleString()}&lt;/td&gt;
                &lt;td&gt;\${period.dateProjection}&lt;/td&gt;
            &lt;/tr&gt;`;
        });
        
        html += '&lt;/table&gt;';
    } else {
        // Member data format
        html += `&lt;p&gt;Nama: \${data.member.name}&lt;/p&gt;`;
        html += `&lt;p&gt;Total Simpanan: Rp \${Number(data.savings.totalSetoran).toLocaleString()}&lt;/p&gt;`;
    }
    
    document.getElementById('result').innerHTML = html;
}

function showError(message) {
    document.getElementById('result').innerHTML = 
        '&lt;div style=\"color: red;\"&gt;Error: ' + message + '&lt;/div&gt;';
}</pre>
        </div>";

// Live AJAX test
echo "<div class='form-group'>
        <label>Test UUID:</label>
        <input type='text' id='testUuid' value='JPSB37142' placeholder='Masukkan UUID'>
        <button onclick='loadTestData()'>Load Data</button>
      </div>
      <div id='ajaxResult'></div>
      
      <script>
      function loadTestData() {
          const uuid = document.getElementById('testUuid').value;
          
          if (!uuid) {
              alert('UUID harus diisi');
              return;
          }
          
          document.getElementById('ajaxResult').innerHTML = 'Loading...';
          
          fetch('secure_member_helper.php', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: 'uuid=' + encodeURIComponent(uuid)
          })
          .then(response => response.json())
          .then(data => {
              let html = '<div class=\"result\">';
              if (data.success) {
                  html += '<div class=\"success\">✅ Success!</div>';
                  html += '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
              } else {
                  html += '<div class=\"error\">❌ Error: ' + data.message + '</div>';
                  html += '<div class=\"info\">Error Code: ' + data.error_code + '</div>';
              }
              html += '</div>';
              document.getElementById('ajaxResult').innerHTML = html;
          })
          .catch(error => {
              document.getElementById('ajaxResult').innerHTML = 
                  '<div class=\"error\">Network error: ' + error.message + '</div>';
          });
      }
      </script>
      </div>";

// ========================= CONTOH 4: BATCH PROCESSING =========================
echo "<div class='example'>
        <h2>📦 Contoh 4: Batch Processing untuk Multiple Students</h2>
        <div class='code'>
<pre>&lt;?php
require_once 'secure_member_helper.php';

function processMultipleStudents(\$uuidList, \$apiUrl = 'http://localhost:5000') {
    \$helper = new SecureMemberHelper(\$apiUrl);
    \$results = [];
    \$errors = [];
    
    foreach (\$uuidList as \$uuid) {
        echo \"Processing UUID: \$uuid\\n\";
        
        \$result = \$helper->getMemberSavings(\$uuid);
        
        if (\$result['success']) {
            \$results[\$uuid] = \$result['data'];
            echo \"✅ Success for \$uuid\\n\";
        } else {
            \$errors[\$uuid] = \$result['message'];
            echo \"❌ Failed for \$uuid: \" . \$result['message'] . \"\\n\";
            
            // Rate limiting handling
            if (\$result['error_code'] === 'RATE_LIMIT_EXCEEDED') {
                echo \"⏰ Rate limit hit, waiting 60 seconds...\\n\";
                sleep(60);
            }
        }
        
        // Small delay between requests untuk menghindari rate limit
        usleep(500000); // 0.5 detik
    }
    
    return [
        'success_count' => count(\$results),
        'error_count' => count(\$errors),
        'results' => \$results,
        'errors' => \$errors
    ];
}

// Usage
\$studentUuids = ['JPSB37142', 'JPTG34817', 'INVALID123'];
\$batchResult = processMultipleStudents(\$studentUuids);

echo \"Processed: \" . \$batchResult['success_count'] . \" success, \" . 
     \$batchResult['error_count'] . \" errors\\n\";
?&gt;</pre>
        </div>
      </div>";

// ========================= SECURITY INFORMATION =========================
echo "<div class='security-info'>
        <h2>🛡️ Informasi Keamanan</h2>";

$helper = new SecureMemberHelper();
$securityInfo = $helper->getSecurityInfo();

echo "<div class='code'>
<pre>Security Features:
- Encryption: {$securityInfo['encryption_method']}
- Hash Algorithm: {$securityInfo['hash_algorithm']}
- Rate Limiting: {$securityInfo['rate_limit_max']} requests per {$securityInfo['rate_limit_window']} seconds
- Timestamp Validation: {$securityInfo['max_timestamp_diff']} seconds tolerance
- Active Nonces: {$securityInfo['active_nonces']}
- Client IP: {$securityInfo['client_ip']}
- Version: {$securityInfo['version']}</pre>
        </div>
      </div>";

// ========================= CONNECTION TEST =========================
echo "<div class='example'>
        <h2>🔗 Test Koneksi ke API Server</h2>";

if (isset($_GET['testconn'])) {
    $connTest = testSecureConnection();
    $class = $connTest['connected'] ? 'success' : 'error';
    echo "<div class='result $class'>";
    echo "<pre>" . json_encode($connTest, JSON_PRETTY_PRINT) . "</pre>";
    echo "</div>";
}

echo "<button onclick=\"window.location.href='?testconn=1'\">🧪 Test Connection</button>
      </div>";

// ========================= TROUBLESHOOTING =========================
echo "<div class='example'>
        <h2>🔧 Troubleshooting</h2>
        <div class='warning'>
            <h4>⚠️ Common Issues:</h4>
            <ul>
                <li><strong>Rate Limit Exceeded:</strong> Tunggu 1 menit atau implementasikan delay antar request</li>
                <li><strong>Invalid UUID Format:</strong> Pastikan UUID sesuai pattern [A-Z]{2,4}[0-9]{5,10}</li>
                <li><strong>Connection Failed:</strong> Periksa API URL dan pastikan server berjalan</li>
                <li><strong>Token Failed:</strong> Periksa magic key dan encryption settings</li>
                <li><strong>Timestamp Expired:</strong> Sinkronkan waktu server</li>
            </ul>
        </div>
        
        <div class='info'>
            <h4>💡 Best Practices:</h4>
            <ul>
                <li>Implementasikan caching untuk mengurangi API calls</li>
                <li>Gunakan database untuk menyimpan nonce dan rate limit data</li>
                <li>Set timeout yang sesuai untuk production</li>
                <li>Monitor dan log semua security events</li>
                <li>Gunakan HTTPS untuk production</li>
                <li>Implementasikan proper error handling</li>
            </ul>
        </div>
      </div>";

echo "</div>
</body>
</html>";
?>
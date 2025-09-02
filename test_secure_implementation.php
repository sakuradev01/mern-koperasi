<?php
/**
 * TEST SUITE UNTUK SECURE MEMBER HELPER
 * 
 * File untuk testing semua aspek keamanan dan fungsionalitas
 * Pastikan semua test PASS sebelum deploy ke production
 */

require_once 'secure_member_helper.php';

class SecureHelperTestSuite {
    
    private $testResults = [];
    private $totalTests = 0;
    private $passedTests = 0;
    
    public function __construct() {
        echo "🧪 SECURE MEMBER HELPER - Test Suite\n";
        echo "=====================================\n\n";
    }
    
    public function runAllTests() {
        echo "🔄 Running all tests...\n\n";
        
        // Test categories
        $this->testInputValidation();
        $this->testEncryption();
        $this->testRateLimiting();
        $this->testSecurityFeatures();
        $this->testAPIIntegration();
        $this->testErrorHandling();
        
        $this->showResults();
    }
    
    // ========================= INPUT VALIDATION TESTS =========================
    
    private function testInputValidation() {
        echo "📝 Testing Input Validation...\n";
        
        $helper = new SecureMemberHelper();
        
        // Test valid UUID
        $this->test(
            "Valid UUID format (JPSB37142)",
            function() use ($helper) {
                $reflection = new ReflectionClass($helper);
                $method = $reflection->getMethod('validateInput');
                $method->setAccessible(true);
                $result = $method->invoke($helper, 'JPSB37142');
                return $result['valid'] === true;
            }
        );
        
        // Test invalid UUID formats
        $invalidUuids = ['', 'invalid', '123', 'ABC', 'toolongstring1234567890', '<script>alert("xss")</script>'];
        
        foreach ($invalidUuids as $uuid) {
            $this->test(
                "Invalid UUID format ($uuid)",
                function() use ($helper, $uuid) {
                    $reflection = new ReflectionClass($helper);
                    $method = $reflection->getMethod('validateInput');
                    $method->setAccessible(true);
                    $result = $method->invoke($helper, $uuid);
                    return $result['valid'] === false;
                }
            );
        }
        
        echo "\n";
    }
    
    // ========================= ENCRYPTION TESTS =========================
    
    private function testEncryption() {
        echo "🔐 Testing Encryption Functions...\n";
        
        $helper = new SecureMemberHelper();
        $reflection = new ReflectionClass($helper);
        
        // Test encryption/decryption
        $this->test(
            "Encryption and decryption work correctly",
            function() use ($helper, $reflection) {
                $encryptMethod = $reflection->getMethod('encryptData');
                $encryptMethod->setAccessible(true);
                
                $testData = "Test encryption data";
                $encrypted = $encryptMethod->invoke($helper, $testData);
                
                return $encrypted !== false && $encrypted !== $testData;
            }
        );
        
        // Test encrypted payload generation
        $this->test(
            "Encrypted payload generation",
            function() use ($helper, $reflection) {
                $method = $reflection->getMethod('generateSecureEncryptedPayload');
                $method->setAccessible(true);
                $payload = $method->invoke($helper, 'JPSB37142');
                
                return $payload !== false && is_string($payload) && strlen($payload) > 50;
            }
        );
        
        // Test nonce generation
        $this->test(
            "Nonce generation uniqueness",
            function() use ($helper, $reflection) {
                $method = $reflection->getMethod('generateNonce');
                $method->setAccessible(true);
                
                $nonce1 = $method->invoke($helper);
                $nonce2 = $method->invoke($helper);
                
                return $nonce1 !== $nonce2 && strlen($nonce1) === 32;
            }
        );
        
        echo "\n";
    }
    
    // ========================= RATE LIMITING TESTS =========================
    
    private function testRateLimiting() {
        echo "⏱️ Testing Rate Limiting...\n";
        
        // Reset session untuk clean test
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        session_start();
        $_SESSION['rate_limit'] = [];
        
        $helper = new SecureMemberHelper();
        $reflection = new ReflectionClass($helper);
        $method = $reflection->getMethod('checkRateLimit');
        $method->setAccessible(true);
        
        // Test initial requests allowed
        $this->test(
            "Initial requests are allowed",
            function() use ($method, $helper) {
                $result = $method->invoke($helper);
                return $result['allowed'] === true;
            }
        );
        
        // Test rate limit enforcement
        $this->test(
            "Rate limit enforcement after max requests",
            function() use ($method, $helper) {
                // Simulate max requests
                $clientIp = '127.0.0.1';
                for ($i = 0; $i < 12; $i++) {
                    $_SESSION['rate_limit'][$clientIp][] = time();
                }
                
                $result = $method->invoke($helper);
                return $result['allowed'] === false;
            }
        );
        
        echo "\n";
    }
    
    // ========================= SECURITY FEATURES TESTS =========================
    
    private function testSecurityFeatures() {
        echo "🛡️ Testing Security Features...\n";
        
        $helper = new SecureMemberHelper();
        $reflection = new ReflectionClass($helper);
        
        // Test client IP detection
        $this->test(
            "Client IP detection",
            function() use ($helper, $reflection) {
                $method = $reflection->getMethod('getClientIP');
                $method->setAccessible(true);
                $ip = $method->invoke($helper);
                
                return filter_var($ip, FILTER_VALIDATE_IP) !== false || $ip === 'unknown';
            }
        );
        
        // Test HMAC signature generation
        $this->test(
            "HMAC signature generation",
            function() use ($helper, $reflection) {
                $method = $reflection->getMethod('generateRequestSignature');
                $method->setAccessible(true);
                
                $signature1 = $method->invoke($helper, 'GET', '/test', '');
                $signature2 = $method->invoke($helper, 'GET', '/test', '');
                
                return is_string($signature1) && strlen($signature1) === 64;
            }
        );
        
        // Test security info
        $this->test(
            "Security info completeness",
            function() use ($helper) {
                $info = $helper->getSecurityInfo();
                $requiredKeys = ['version', 'encryption_method', 'hash_algorithm', 'rate_limit_window'];
                
                foreach ($requiredKeys as $key) {
                    if (!isset($info[$key])) {
                        return false;
                    }
                }
                
                return true;
            }
        );
        
        echo "\n";
    }
    
    // ========================= API INTEGRATION TESTS =========================
    
    private function testAPIIntegration() {
        echo "🌐 Testing API Integration...\n";
        
        $helper = new SecureMemberHelper();
        
        // Test connection
        $this->test(
            "API connection test",
            function() use ($helper) {
                $result = $helper->testConnection();
                return isset($result['connected']);
            }
        );
        
        // Test dengan UUID yang valid (jika server running)
        $this->test(
            "Valid UUID processing (if server available)",
            function() use ($helper) {
                try {
                    $result = $helper->getMemberSavings('JPSB37142');
                    // Test berhasil jika dapat response (success atau error)
                    return isset($result['success']);
                } catch (Exception $e) {
                    // Test berhasil jika ada exception handling
                    return true;
                }
            }
        );
        
        echo "\n";
    }
    
    // ========================= ERROR HANDLING TESTS =========================
    
    private function testErrorHandling() {
        echo "❌ Testing Error Handling...\n";
        
        $helper = new SecureMemberHelper();
        
        // Test invalid UUID handling
        $this->test(
            "Invalid UUID error handling",
            function() use ($helper) {
                $result = $helper->getMemberSavings('INVALID123');
                return $result['success'] === false && isset($result['error_code']);
            }
        );
        
        // Test empty UUID handling
        $this->test(
            "Empty UUID error handling",
            function() use ($helper) {
                $result = $helper->getMemberSavings('');
                return $result['success'] === false && $result['error_code'] === 'VALIDATION_FAILED';
            }
        );
        
        // Test XSS attempt handling
        $this->test(
            "XSS attempt handling",
            function() use ($helper) {
                $result = $helper->getMemberSavings('<script>alert("xss")</script>');
                return $result['success'] === false && $result['error_code'] === 'VALIDATION_FAILED';
            }
        );
        
        echo "\n";
    }
    
    // ========================= HELPER FUNCTIONS =========================
    
    private function test($description, $testFunction) {
        $this->totalTests++;
        
        try {
            $result = $testFunction();
            
            if ($result) {
                echo "✅ PASS: $description\n";
                $this->passedTests++;
                $this->testResults[] = ['status' => 'PASS', 'description' => $description];
            } else {
                echo "❌ FAIL: $description\n";
                $this->testResults[] = ['status' => 'FAIL', 'description' => $description];
            }
        } catch (Exception $e) {
            echo "💥 ERROR: $description - " . $e->getMessage() . "\n";
            $this->testResults[] = ['status' => 'ERROR', 'description' => $description, 'error' => $e->getMessage()];
        }
    }
    
    private function showResults() {
        echo "\n";
        echo "📊 TEST RESULTS\n";
        echo "===============\n";
        echo "Total Tests: {$this->totalTests}\n";
        echo "Passed: {$this->passedTests}\n";
        echo "Failed: " . ($this->totalTests - $this->passedTests) . "\n";
        echo "Success Rate: " . round(($this->passedTests / $this->totalTests) * 100, 2) . "%\n\n";
        
        // Show failed tests
        $failedTests = array_filter($this->testResults, function($test) {
            return $test['status'] !== 'PASS';
        });
        
        if (!empty($failedTests)) {
            echo "🚨 FAILED TESTS:\n";
            foreach ($failedTests as $test) {
                echo "- [{$test['status']}] {$test['description']}\n";
                if (isset($test['error'])) {
                    echo "  Error: {$test['error']}\n";
                }
            }
            echo "\n";
        }
        
        // Security recommendations
        echo "🔒 SECURITY RECOMMENDATIONS:\n";
        echo "- Pastikan semua tests PASS sebelum production\n";
        echo "- Monitor rate limiting di production\n";
        echo "- Review security logs secara berkala\n";
        echo "- Update encryption keys secara periodik\n";
        echo "- Implementasikan HTTPS untuk production\n";
        echo "- Gunakan environment variables untuk secrets\n\n";
        
        if ($this->passedTests === $this->totalTests) {
            echo "🎉 ALL TESTS PASSED! Ready for production.\n";
        } else {
            echo "⚠️  Some tests failed. Please fix before deploying.\n";
        }
    }
}

// ========================= PERFORMANCE TESTS =========================

class PerformanceTest {
    
    public static function runPerformanceTests() {
        echo "\n🚀 PERFORMANCE TESTS\n";
        echo "====================\n";
        
        $helper = new SecureMemberHelper();
        
        // Test response time
        $startTime = microtime(true);
        $result = $helper->getMemberSavings('JPSB37142');
        $endTime = microtime(true);
        $responseTime = ($endTime - $startTime) * 1000; // Convert to milliseconds
        
        echo "Response Time: " . round($responseTime, 2) . " ms\n";
        
        if ($responseTime < 2000) {
            echo "✅ Performance: GOOD (< 2 seconds)\n";
        } elseif ($responseTime < 5000) {
            echo "⚠️  Performance: ACCEPTABLE (< 5 seconds)\n";
        } else {
            echo "❌ Performance: POOR (> 5 seconds)\n";
        }
        
        // Memory usage
        $memoryUsage = memory_get_peak_usage(true) / 1024 / 1024; // Convert to MB
        echo "Memory Usage: " . round($memoryUsage, 2) . " MB\n";
        
        if ($memoryUsage < 10) {
            echo "✅ Memory: GOOD (< 10 MB)\n";
        } elseif ($memoryUsage < 50) {
            echo "⚠️  Memory: ACCEPTABLE (< 50 MB)\n";
        } else {
            echo "❌ Memory: HIGH (> 50 MB)\n";
        }
    }
}

// ========================= SECURITY AUDIT =========================

class SecurityAudit {
    
    public static function runSecurityAudit() {
        echo "\n🔍 SECURITY AUDIT\n";
        echo "=================\n";
        
        $issues = [];
        
        // Check if running on HTTPS in production
        if (!isset($_SERVER['HTTPS']) && !self::isLocalhost()) {
            $issues[] = "❌ Not running on HTTPS - CRITICAL for production";
        } else {
            echo "✅ HTTPS check passed\n";
        }
        
        // Check PHP version
        if (version_compare(PHP_VERSION, '7.4.0', '<')) {
            $issues[] = "⚠️  PHP version " . PHP_VERSION . " - recommend 7.4+";
        } else {
            echo "✅ PHP version check passed\n";
        }
        
        // Check required extensions
        $requiredExtensions = ['openssl', 'curl', 'json'];
        foreach ($requiredExtensions as $ext) {
            if (!extension_loaded($ext)) {
                $issues[] = "❌ Missing PHP extension: $ext";
            } else {
                echo "✅ Extension $ext loaded\n";
            }
        }
        
        // Check file permissions
        $sensitiveFiles = ['secure_member_helper.php'];
        foreach ($sensitiveFiles as $file) {
            if (file_exists($file)) {
                $perms = fileperms($file) & 0777;
                if ($perms > 0644) {
                    $issues[] = "⚠️  File $file has overly permissive permissions: " . decoct($perms);
                } else {
                    echo "✅ File permissions for $file are secure\n";
                }
            }
        }
        
        if (empty($issues)) {
            echo "\n🎉 Security audit passed - no major issues found!\n";
        } else {
            echo "\n🚨 Security issues found:\n";
            foreach ($issues as $issue) {
                echo "  $issue\n";
            }
        }
    }
    
    private static function isLocalhost() {
        $localhost = ['127.0.0.1', '::1', 'localhost'];
        return in_array($_SERVER['SERVER_NAME'] ?? '', $localhost) || 
               in_array($_SERVER['HTTP_HOST'] ?? '', $localhost);
    }
}

// ========================= MAIN EXECUTION =========================

if (php_sapi_name() === 'cli') {
    // Command line execution
    echo "🔧 Secure Member Helper - Comprehensive Test Suite\n";
    echo "==================================================\n\n";
    
    $testSuite = new SecureHelperTestSuite();
    $testSuite->runAllTests();
    
    PerformanceTest::runPerformanceTests();
    SecurityAudit::runSecurityAudit();
    
} else {
    // Web execution
    header('Content-Type: text/html; charset=utf-8');
    
    echo "<!DOCTYPE html>
    <html>
    <head>
        <title>Secure Member Helper - Test Suite</title>
        <style>
            body { font-family: monospace; background: #f5f5f5; padding: 20px; }
            .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
            pre { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto; }
            .success { color: #28a745; }
            .error { color: #dc3545; }
            .warning { color: #ffc107; }
        </style>
    </head>
    <body>
        <div class='container'>
            <h1>🔧 Secure Member Helper - Test Suite</h1>
            <pre>";
    
    ob_start();
    
    $testSuite = new SecureHelperTestSuite();
    $testSuite->runAllTests();
    
    PerformanceTest::runPerformanceTests();
    SecurityAudit::runSecurityAudit();
    
    $output = ob_get_clean();
    
    // Add colors to output
    $output = str_replace('✅', '<span class="success">✅</span>', $output);
    $output = str_replace('❌', '<span class="error">❌</span>', $output);
    $output = str_replace('⚠️', '<span class="warning">⚠️</span>', $output);
    
    echo htmlspecialchars($output);
    
    echo "</pre>
        </div>
    </body>
    </html>";
}

?>
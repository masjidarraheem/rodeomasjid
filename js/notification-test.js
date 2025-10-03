// Test notification functionality - for debugging only
// Add this to browser console to test notifications manually

window.testNotifications = async function() {
    console.log('🧪 Testing notification functionality...');

    if (!window.visitorNotifications) {
        console.error('❌ Visitor notifications not loaded');
        return;
    }

    try {
        await window.visitorNotifications.initialize();
        await window.visitorNotifications.requestNotificationPermission();
        console.log('✅ Test completed - check if notification permission was granted');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// Make visitor notifications available globally for testing
document.addEventListener('DOMContentLoaded', () => {
    // Import the visitor notifications module
    import('./visitor-notifications.js').then(module => {
        window.visitorNotifications = module.default;
        console.log('🔧 Visitor notifications loaded - use testNotifications() to test');
    });
});
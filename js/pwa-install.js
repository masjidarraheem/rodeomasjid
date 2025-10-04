// Progressive Web App Install Manager
class PWAInstallManager {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.init();
    }

    init() {
        // Check if already installed
        this.checkInstallation();

        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('💾 PWA: beforeinstallprompt event fired');
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later
            this.deferredPrompt = e;
            // Show our custom install button
            this.showInstallBanner();
        });

        // Listen for appinstalled event
        window.addEventListener('appinstalled', (e) => {
            console.log('✅ PWA: App was installed');
            this.isInstalled = true;
            this.hideInstallBanner();
            localStorage.setItem('pwaInstalled', 'true');
        });

        // Check if running as PWA
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            console.log('📱 PWA: Running as installed app');
            this.isInstalled = true;
        }
    }

    checkInstallation() {
        // Check if user previously installed or dismissed
        const installed = localStorage.getItem('pwaInstalled') === 'true';
        const dismissed = localStorage.getItem('pwaInstallDismissed') === 'true';

        if (installed) {
            this.isInstalled = true;
        }

        return { installed, dismissed };
    }

    showInstallBanner() {
        const { installed, dismissed } = this.checkInstallation();

        // Don't show if already installed or dismissed
        if (installed || dismissed) {
            return;
        }

        // Don't show if already shown in this session
        if (document.getElementById('pwaInstallBanner')) {
            return;
        }

        const banner = document.createElement('div');
        banner.id = 'pwaInstallBanner';
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 16px;
            max-width: 500px;
            margin: 0 auto;
            font-family: 'Poppins', sans-serif;
            animation: slideUp 0.3s ease-out;
        `;

        // Add slide up animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        banner.innerHTML = `
            <div style="font-size: 32px;">📱</div>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 4px;">Install Masjid Ar-Raheem App</div>
                <div style="font-size: 14px; opacity: 0.9;">Add to your home screen for quick access to prayer times and announcements</div>
            </div>
            <button id="pwaInstallBtn" style="
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">Install</button>
            <button id="pwaInstallDismiss" style="
                background: transparent;
                border: none;
                color: rgba(255,255,255,0.7);
                cursor: pointer;
                font-size: 20px;
                padding: 4px 8px;
                transition: color 0.2s ease;
            " onmouseover="this.style.color='rgba(255,255,255,1)'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">&times;</button>
        `;

        document.body.appendChild(banner);

        // Handle install button click
        document.getElementById('pwaInstallBtn').addEventListener('click', () => {
            this.installApp();
        });

        // Handle dismiss button click
        document.getElementById('pwaInstallDismiss').addEventListener('click', () => {
            this.dismissInstallPrompt();
        });

        console.log('📱 PWA: Install banner shown');
    }

    async installApp() {
        if (!this.deferredPrompt) {
            console.log('❌ PWA: No deferred prompt available');
            return;
        }

        // Show the install prompt
        this.deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await this.deferredPrompt.userChoice;

        console.log(`👤 PWA: User response to the install prompt: ${outcome}`);

        if (outcome === 'accepted') {
            console.log('✅ PWA: User accepted the install prompt');
            this.hideInstallBanner();
        } else {
            console.log('❌ PWA: User dismissed the install prompt');
            // Set dismissed flag to prevent showing again for a while
            localStorage.setItem('pwaInstallDismissed', 'true');
            this.hideInstallBanner();
        }

        // Clear the deferredPrompt
        this.deferredPrompt = null;
    }

    dismissInstallPrompt() {
        console.log('❌ PWA: User manually dismissed install banner');
        localStorage.setItem('pwaInstallDismissed', 'true');
        this.hideInstallBanner();
    }

    hideInstallBanner() {
        const banner = document.getElementById('pwaInstallBanner');
        if (banner) {
            banner.style.animation = 'slideDown 0.3s ease-out forwards';
            setTimeout(() => {
                banner.remove();
            }, 300);
        }

        // Add slide down animation if not exists
        if (!document.querySelector('style[data-pwa-animations]')) {
            const style = document.createElement('style');
            style.setAttribute('data-pwa-animations', 'true');
            style.textContent = `
                @keyframes slideDown {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Method to reset install prompt (for testing)
    resetInstallPrompt() {
        localStorage.removeItem('pwaInstallDismissed');
        localStorage.removeItem('pwaInstalled');
        console.log('🔄 PWA: Install prompt reset');
    }

    // Check PWA capabilities
    checkPWASupport() {
        const support = {
            serviceWorker: 'serviceWorker' in navigator,
            manifest: 'manifest' in document.documentElement,
            standalone: window.matchMedia('(display-mode: standalone)').matches,
            beforeInstallPrompt: 'beforeinstallprompt' in window,
            notifications: 'Notification' in window
        };

        console.log('📱 PWA Support:', support);
        return support;
    }
}

// Initialize PWA Install Manager
let pwaInstallManager;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        pwaInstallManager = new PWAInstallManager();
        window.pwaInstallManager = pwaInstallManager;
    });
} else {
    // DOM is already ready
    pwaInstallManager = new PWAInstallManager();
    window.pwaInstallManager = pwaInstallManager;
}

export default pwaInstallManager;
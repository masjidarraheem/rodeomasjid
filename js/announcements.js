import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy,
    limit
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class AnnouncementManager {
    constructor() {
        this.currentAnnouncement = null;
        this.init();
    }

    async init() {
        await this.loadActiveAnnouncement();
        this.setupBannerEvents();
    }

    async loadActiveAnnouncement() {
        try {
            // Query for active announcements, ordered by creation date
            const now = new Date();
            const q = query(
                collection(db, 'announcements'),
                where('isActive', '==', true),
                orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // Filter and sort announcements
                const validAnnouncements = [];
                const closedAnnouncements = this.getClosedAnnouncements();
                
                querySnapshot.forEach(doc => {
                    const announcement = doc.data();
                    
                    // Check if announcement has expired
                    if (announcement.expiryDate) {
                        const expiryDate = announcement.expiryDate.toDate ? 
                            announcement.expiryDate.toDate() : 
                            new Date(announcement.expiryDate);
                        
                        if (expiryDate < now) {
                            return; // Skip expired
                        }
                    }
                    
                    // Check if user has already closed this announcement
                    if (closedAnnouncements.includes(doc.id)) {
                        return; // Skip closed
                    }
                    
                    validAnnouncements.push({
                        id: doc.id,
                        ...announcement
                    });
                });
                
                // Sort by priority (high > medium > low) then by creation date
                validAnnouncements.sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    const aPriority = priorityOrder[a.priority] || 1;
                    const bPriority = priorityOrder[b.priority] || 1;
                    
                    if (aPriority !== bPriority) {
                        return bPriority - aPriority; // Higher priority first
                    }
                    
                    // If same priority, show newer first
                    const aDate = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                    const bDate = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                    return bDate - aDate;
                });
                
                // Display the highest priority announcement
                if (validAnnouncements.length > 0) {
                    this.currentAnnouncement = validAnnouncements[0];
                    this.displayAnnouncement();
                }
            }
        } catch (error) {
            console.error('Error loading announcements:', error);
        }
    }

    displayAnnouncement() {
        if (!this.currentAnnouncement) return;

        const banner = document.getElementById('announcementBanner');
        const titleElement = document.getElementById('announcementTitle');
        const messageElement = document.getElementById('announcementMessage');

        if (banner && titleElement && messageElement) {
            titleElement.textContent = this.currentAnnouncement.title;
            messageElement.textContent = this.currentAnnouncement.message;

            // Set priority-based styling
            const priorityColors = {
                high: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
                medium: 'linear-gradient(135deg, #f6ad55 0%, #ed8936 100%)',
                low: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            };

            banner.style.background = priorityColors[this.currentAnnouncement.priority] || priorityColors.low;
            banner.style.display = 'block';

            // Adjust page layout for banner
            this.adjustPageLayout(true);
        }
    }

    adjustPageLayout(showBanner) {
        const navbar = document.querySelector('.navbar');
        const hero = document.querySelector('.hero');
        
        if (showBanner) {
            // Add padding to top of page to account for fixed banner
            if (navbar) {
                navbar.style.top = '60px';
            }
            if (hero) {
                hero.style.marginTop = '60px';
            }
            document.body.style.paddingTop = '60px';
        } else {
            // Reset layout
            if (navbar) {
                navbar.style.top = '0';
            }
            if (hero) {
                hero.style.marginTop = '0';
            }
            document.body.style.paddingTop = '0';
        }
    }

    setupBannerEvents() {
        // Make close function globally available
        window.closeAnnouncementBanner = () => {
            this.closeAnnouncement();
        };
    }

    closeAnnouncement() {
        const banner = document.getElementById('announcementBanner');
        if (banner) {
            banner.style.display = 'none';
            this.adjustPageLayout(false);

            // Remember that user closed this announcement
            if (this.currentAnnouncement) {
                this.saveClosedAnnouncement(this.currentAnnouncement.id);
            }
        }
    }

    getClosedAnnouncements() {
        const stored = localStorage.getItem('closedAnnouncements');
        return stored ? JSON.parse(stored) : [];
    }

    saveClosedAnnouncement(id) {
        const closed = this.getClosedAnnouncements();
        if (!closed.includes(id)) {
            closed.push(id);
            // Keep only last 20 closed announcements
            if (closed.length > 20) {
                closed.shift();
            }
            localStorage.setItem('closedAnnouncements', JSON.stringify(closed));
        }
    }

    // Priority order helper (for Firestore compound query)
    getPriorityOrder(priority) {
        const order = { high: 3, medium: 2, low: 1 };
        return order[priority] || 1;
    }
}

// Initialize announcements when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AnnouncementManager();
    });
} else {
    new AnnouncementManager();
}
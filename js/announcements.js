import { db } from './firebase-config.js';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class AnnouncementManager {
    constructor() {
        this.currentAnnouncement = null;
        this.isMinimized = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.availableAnnouncements = [];
        this.init();
    }

    async init() {
        console.log('[Announcements] Initializing...');
        this.setupServiceWorkerListener();

        // Load active announcements first, then check for notification clicks
        await this.loadActiveAnnouncement();

        // After Firebase is initialized, check for notification click
        this.checkForNotificationClick();

        this.setupEventHandlers();
        this.setupDraggable();
        this.setupNotificationBell();
        console.log('[Announcements] Initialization complete');
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
                const allValidAnnouncements = [];
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

                    const announcementWithId = {
                        id: doc.id,
                        ...announcement
                    };

                    // Add to all valid announcements (for bell count)
                    allValidAnnouncements.push(announcementWithId);

                    // Check if user has already closed this announcement (for auto-display)
                    if (!closedAnnouncements.includes(doc.id)) {
                        validAnnouncements.push(announcementWithId);
                    }
                });

                // Store all available announcements for bell functionality
                this.availableAnnouncements = allValidAnnouncements;
                
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

            // Update notification bell regardless of whether announcements are displayed
            this.updateNotificationBell();
        } catch (error) {
            console.error('Error loading announcements:', error);
        }
    }

    displayAnnouncement() {
        if (!this.currentAnnouncement) {
            console.log('[Announcements] No current announcement to display');
            return;
        }

        console.log('[Announcements] Displaying announcement:', this.currentAnnouncement.title);

        const modal = document.getElementById('announcementModal');
        const titleElement = document.getElementById('announcementTitle');
        const messageElement = document.getElementById('announcementMessage');
        const priorityBadge = document.getElementById('announcementPriorityBadge');
        const expiryElement = document.getElementById('announcementExpiry');
        const icon = document.getElementById('announcementIcon');

        if (modal && titleElement && messageElement) {
            // Set content
            titleElement.textContent = this.currentAnnouncement.title;
            messageElement.textContent = this.currentAnnouncement.message;
            
            // Set priority badge
            if (priorityBadge) {
                // Map priority to display text
                const priorityLabels = {
                    low: 'NOTIFICATION',
                    medium: 'ANNOUNCEMENT',
                    high: 'EMERGENCY'
                };
                priorityBadge.textContent = priorityLabels[this.currentAnnouncement.priority] || 'NOTIFICATION';
                priorityBadge.className = `priority-${this.currentAnnouncement.priority || 'low'}`;
                priorityBadge.style.display = 'inline-block';
                priorityBadge.style.padding = '3px 8px';
                priorityBadge.style.borderRadius = '4px';
                priorityBadge.style.fontSize = '11px';
                priorityBadge.style.fontWeight = '600';
                priorityBadge.style.textTransform = 'uppercase';
                priorityBadge.style.marginBottom = '5px';
            }
            
            // Set expiry info if exists
            if (expiryElement && this.currentAnnouncement.expiryDate) {
                const expiryDate = this.currentAnnouncement.expiryDate.toDate ? 
                    this.currentAnnouncement.expiryDate.toDate() : 
                    new Date(this.currentAnnouncement.expiryDate);
                expiryElement.innerHTML = `⏰ This announcement expires on ${expiryDate.toLocaleDateString()} at ${expiryDate.toLocaleTimeString()}`;
                expiryElement.style.display = 'block';
            } else if (expiryElement) {
                expiryElement.style.display = 'none';
            }

            // Set icon background based on priority
            if (icon) {
                const priorityColors = {
                    high: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
                    medium: 'linear-gradient(135deg, #f6ad55 0%, #ed8936 100%)',
                    low: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                };
                icon.style.background = priorityColors[this.currentAnnouncement.priority] || priorityColors.low;
                icon.style.color = 'white';
            }

            // Check if was previously minimized
            const wasMinimized = localStorage.getItem(`announcement_${this.currentAnnouncement.id}_minimized`);
            
            if (wasMinimized === 'true') {
                // Show as floating button
                this.showFloatingButton();
            } else {
                // Show modal
                modal.style.display = 'block';
                modal.style.opacity = '0';
                // Add a small delay for animation
                setTimeout(() => {
                    modal.style.opacity = '1';
                }, 50);
            }
        }
    }

    setupEventHandlers() {
        // Make functions globally available
        window.minimizeAnnouncement = () => this.minimizeAnnouncement();
        window.closeAnnouncementModal = () => this.closeAnnouncement();
        window.expandAnnouncement = () => this.expandAnnouncement();
        
        // Close modal when clicking backdrop
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => this.minimizeAnnouncement());
        }
    }

    minimizeAnnouncement() {
        const modal = document.getElementById('announcementModal');
        const floatingBtn = document.getElementById('floatingButton');
        
        if (modal && floatingBtn) {
            // Add minimizing animation class
            modal.classList.add('modal-minimizing');
            
            // Get button position for smooth transition
            const btnRect = floatingBtn.getBoundingClientRect();
            const modalRect = modal.querySelector('#modalContent').getBoundingClientRect();
            
            // Wait for animation to complete
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('modal-minimizing');
                
                // Show floating button with bounce animation
                this.showFloatingButton(true);
            }, 500);
            
            // Remember minimized state
            if (this.currentAnnouncement) {
                localStorage.setItem(`announcement_${this.currentAnnouncement.id}_minimized`, 'true');
            }
        }
    }

    showFloatingButton(animate = false) {
        const floatingBtn = document.getElementById('floatingButton');
        if (floatingBtn) {
            floatingBtn.style.display = 'block';
            
            // Add bounce animation if requested
            if (animate) {
                floatingBtn.classList.add('button-appearing');
                setTimeout(() => {
                    floatingBtn.classList.remove('button-appearing');
                }, 600);
            }
            // Set button color based on priority
            const button = floatingBtn.querySelector('button');
            if (button && this.currentAnnouncement) {
                const priorityColors = {
                    high: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
                    medium: 'linear-gradient(135deg, #f6ad55 0%, #ed8936 100%)',
                    low: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                };
                button.style.background = priorityColors[this.currentAnnouncement.priority] || priorityColors.low;
            }
            
            // Restore saved position if exists, otherwise use default top-right
            const savedPosition = this.getSavedPosition();
            if (savedPosition) {
                floatingBtn.style.left = savedPosition.left;
                floatingBtn.style.right = 'auto';
                floatingBtn.style.top = savedPosition.top;
                floatingBtn.style.bottom = 'auto';
            } else {
                // Default position: top right below menu
                floatingBtn.style.top = '80px';
                floatingBtn.style.right = '20px';
                floatingBtn.style.left = 'auto';
                floatingBtn.style.bottom = 'auto';
            }
        }
    }

    expandAnnouncement() {
        const modal = document.getElementById('announcementModal');
        const floatingBtn = document.getElementById('floatingButton');
        
        if (modal && floatingBtn) {
            // Hide floating button with fade
            floatingBtn.style.opacity = '0';
            floatingBtn.style.transform = 'scale(0.5)';
            
            setTimeout(() => {
                floatingBtn.style.display = 'none';
                floatingBtn.style.opacity = '1';
                floatingBtn.style.transform = 'scale(1)';
            }, 300);
            
            // Show modal with expand animation
            modal.style.display = 'block';
            modal.classList.add('modal-expanding');
            modal.style.opacity = '0';
            
            setTimeout(() => {
                modal.style.opacity = '1';
            }, 10);
            
            setTimeout(() => {
                modal.classList.remove('modal-expanding');
            }, 500);
            
            // Clear minimized state
            if (this.currentAnnouncement) {
                localStorage.removeItem(`announcement_${this.currentAnnouncement.id}_minimized`);
            }
        }
    }

    closeAnnouncement() {
        const modal = document.getElementById('announcementModal');
        const floatingBtn = document.getElementById('floatingButton');
        
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
        
        if (floatingBtn) {
            floatingBtn.style.display = 'none';
        }

        // Remember that user closed this announcement
        if (this.currentAnnouncement) {
            this.saveClosedAnnouncement(this.currentAnnouncement.id);
            localStorage.removeItem(`announcement_${this.currentAnnouncement.id}_minimized`);
        }
    }

    setupDraggable() {
        const floatingBtn = document.getElementById('floatingButton');
        if (!floatingBtn) return;

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const dragStart = (e) => {
            isDragging = true;
            floatingBtn.style.transition = 'none';
            
            // Get initial position
            const rect = floatingBtn.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
            // Get start point
            if (e.type === "touchstart") {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
                e.preventDefault();
            }
        };

        const dragEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            floatingBtn.style.transition = 'all 0.3s';
            
            // Save position
            const rect = floatingBtn.getBoundingClientRect();
            this.savePosition(`${rect.left}px`, `${rect.top}px`);
        };

        const drag = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            let currentX, currentY;
            if (e.type === "touchmove") {
                currentX = e.touches[0].clientX;
                currentY = e.touches[0].clientY;
            } else {
                currentX = e.clientX;
                currentY = e.clientY;
            }
            
            // Calculate new position
            let newLeft = initialLeft + (currentX - startX);
            let newTop = initialTop + (currentY - startY);
            
            // Keep button within viewport
            const btnWidth = floatingBtn.offsetWidth;
            const btnHeight = floatingBtn.offsetHeight;
            
            newLeft = Math.max(10, Math.min(newLeft, window.innerWidth - btnWidth - 10));
            newTop = Math.max(10, Math.min(newTop, window.innerHeight - btnHeight - 10));
            
            // Apply position
            floatingBtn.style.left = `${newLeft}px`;
            floatingBtn.style.right = 'auto';
            floatingBtn.style.top = `${newTop}px`;
            floatingBtn.style.bottom = 'auto';
        };

        // Mouse events
        floatingBtn.addEventListener('mousedown', dragStart);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('mousemove', drag);

        // Touch events for mobile
        floatingBtn.addEventListener('touchstart', dragStart, { passive: false });
        document.addEventListener('touchend', dragEnd);
        document.addEventListener('touchmove', drag, { passive: false });
    }

    savePosition(left, top) {
        localStorage.setItem('floatingBtnPosition', JSON.stringify({ left, top }));
    }

    getSavedPosition() {
        const saved = localStorage.getItem('floatingBtnPosition');
        return saved ? JSON.parse(saved) : null;
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

    setupServiceWorkerListener() {
        // Listen for messages from service worker (when notification is clicked and page is already open)
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'SHOW_ANNOUNCEMENT') {
                console.log('[Announcements] Received service worker message to show announcement:', event.data.announcement);
                this.showSpecificAnnouncement(event.data.announcement);
            }
        });
    }

    checkForNotificationClick() {
        // Check URL parameters for notification clicks (when notification opens new page)
        const urlParams = new URLSearchParams(window.location.search);
        const announcementId = urlParams.get('showAnnouncement');

        console.log('[Announcements] Checking for notification click...');
        console.log('[Announcements] Current URL:', window.location.href);
        console.log('[Announcements] URL parameters:', urlParams.toString());
        console.log('[Announcements] Announcement ID from URL:', announcementId);

        if (announcementId) {
            console.log('[Announcements] 🎯 Notification click detected for announcement:', announcementId);

            // Remove the parameter from URL to clean it up
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('showAnnouncement');
            window.history.replaceState({}, document.title, newUrl);

            console.log('[Announcements] Loading specific announcement by ID...');
            // Load and show the specific announcement
            this.loadSpecificAnnouncementById(announcementId);
        } else {
            console.log('[Announcements] No notification click detected');
        }
    }

    async loadSpecificAnnouncementById(announcementId) {
        try {
            console.log('[Announcements] 🔍 Loading announcement from Firestore:', announcementId);
            const docRef = doc(db, 'announcements', announcementId);
            const docSnap = await getDoc(docRef);

            console.log('[Announcements] Firestore query result exists:', docSnap.exists());

            if (docSnap.exists()) {
                const announcement = {
                    id: docSnap.id,
                    ...docSnap.data()
                };

                console.log('[Announcements] Found announcement:', {
                    id: announcement.id,
                    title: announcement.title,
                    isActive: announcement.isActive,
                    expiryDate: announcement.expiryDate
                });

                // Check if announcement is still active and not expired
                if (announcement.isActive) {
                    const now = new Date();
                    const isNotExpired = !announcement.expiryDate ||
                        (announcement.expiryDate.toDate ? announcement.expiryDate.toDate() : new Date(announcement.expiryDate)) > now;

                    console.log('[Announcements] Announcement active:', announcement.isActive);
                    console.log('[Announcements] Announcement not expired:', isNotExpired);

                    if (isNotExpired) {
                        console.log('[Announcements] ✅ Showing specific announcement from notification');
                        this.showSpecificAnnouncement(announcement);
                        return;
                    } else {
                        console.log('[Announcements] ❌ Announcement is expired');
                    }
                } else {
                    console.log('[Announcements] ❌ Announcement is not active');
                }
            } else {
                console.log('[Announcements] ❌ Announcement document does not exist in Firestore');
            }

            console.log('[Announcements] Specific announcement not found or expired:', announcementId);
        } catch (error) {
            console.error('[Announcements] ❌ Error loading specific announcement:', error);
            console.error('[Announcements] Error details:', error.message, error.stack);
        }
    }

    showSpecificAnnouncement(announcement) {
        // Temporarily set this as current announcement and display it
        const previousAnnouncement = this.currentAnnouncement;
        this.currentAnnouncement = announcement;

        // Clear any minimized state for this specific show
        localStorage.removeItem(`announcement_${announcement.id}_minimized`);

        // Display the announcement
        this.displayAnnouncement();

        console.log('[Announcements] Showing specific announcement from notification:', announcement.title);
    }

    setupNotificationBell() {
        const bellButton = document.getElementById('notificationBell');
        if (bellButton) {
            bellButton.addEventListener('click', () => {
                this.showAnnouncementFromBell();
            });
        }
    }

    updateNotificationBell() {
        const bellButton = document.getElementById('notificationBell');
        const countElement = document.getElementById('notificationCount');

        if (!bellButton || !countElement) return;

        const count = this.availableAnnouncements.length;

        if (count > 0) {
            // Show the bell button
            bellButton.style.display = 'flex';
            countElement.textContent = count;
            countElement.style.display = 'flex';
        } else {
            // Hide the bell button
            bellButton.style.display = 'none';
        }

        console.log(`[Announcements] Updated notification bell: ${count} announcements available`);
    }

    showAnnouncementFromBell() {
        console.log('[Announcements] Bell clicked - showing announcements');

        // If there's already a current announcement displayed, show it
        if (this.currentAnnouncement) {
            this.expandAnnouncement();
            return;
        }

        // Otherwise, find the highest priority available announcement
        if (this.availableAnnouncements.length > 0) {
            // Sort by priority and date to get the most important one
            const sortedAnnouncements = [...this.availableAnnouncements].sort((a, b) => {
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

            this.showSpecificAnnouncement(sortedAnnouncements[0]);
        }
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
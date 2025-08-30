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
        this.isMinimized = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.init();
    }

    async init() {
        await this.loadActiveAnnouncement();
        this.setupEventHandlers();
        this.setupDraggable();
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
                priorityBadge.textContent = this.currentAnnouncement.priority || 'info';
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
                // Add a small delay for animation
                setTimeout(() => {
                    modal.style.opacity = '1';
                }, 10);
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
            // Animate modal out
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                // Show floating button
                this.showFloatingButton();
            }, 300);
            
            // Remember minimized state
            if (this.currentAnnouncement) {
                localStorage.setItem(`announcement_${this.currentAnnouncement.id}_minimized`, 'true');
            }
        }
    }

    showFloatingButton() {
        const floatingBtn = document.getElementById('floatingButton');
        if (floatingBtn) {
            floatingBtn.style.display = 'block';
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
            
            // Restore saved position if exists
            const savedPosition = this.getSavedPosition();
            if (savedPosition) {
                floatingBtn.style.left = savedPosition.left;
                floatingBtn.style.right = 'auto';
                floatingBtn.style.top = savedPosition.top;
                floatingBtn.style.bottom = 'auto';
            }
        }
    }

    expandAnnouncement() {
        const modal = document.getElementById('announcementModal');
        const floatingBtn = document.getElementById('floatingButton');
        
        if (modal && floatingBtn) {
            // Hide floating button
            floatingBtn.style.display = 'none';
            
            // Show modal
            modal.style.display = 'block';
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.opacity = '1';
            }, 10);
            
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
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        const dragStart = (e) => {
            if (e.type === "touchstart") {
                initialX = e.touches[0].clientX - xOffset;
                initialY = e.touches[0].clientY - yOffset;
            } else {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
            }

            if (e.target === floatingBtn || floatingBtn.contains(e.target)) {
                isDragging = true;
                floatingBtn.style.transition = 'none';
            }
        };

        const dragEnd = (e) => {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            floatingBtn.style.transition = 'all 0.3s';
            
            // Save position
            this.savePosition(floatingBtn.style.left, floatingBtn.style.top);
        };

        const drag = (e) => {
            if (isDragging) {
                e.preventDefault();
                
                if (e.type === "touchmove") {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }

                xOffset = currentX;
                yOffset = currentY;

                // Keep button within viewport
                const rect = floatingBtn.getBoundingClientRect();
                const maxX = window.innerWidth - rect.width;
                const maxY = window.innerHeight - rect.height;
                
                currentX = Math.max(0, Math.min(currentX, maxX));
                currentY = Math.max(0, Math.min(currentY, maxY));

                floatingBtn.style.transform = `translate(${currentX}px, ${currentY}px)`;
                floatingBtn.style.left = '30px';
                floatingBtn.style.right = 'auto';
                floatingBtn.style.top = '30px';
                floatingBtn.style.bottom = 'auto';
            }
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
}

// Initialize announcements when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AnnouncementManager();
    });
} else {
    new AnnouncementManager();
}
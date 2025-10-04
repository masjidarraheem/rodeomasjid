import { db, auth } from './firebase-config.js';
import FCMPushManager from './fcm-push-manager.js';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

class AdminPanel {
    constructor() {
        this.editingId = null;
        this.editingAnnouncementId = null;
        this.editingBoardId = null;
        this.selectedIcon = null;
        this.currentUser = null;
        this.fcmPushManager = new FCMPushManager();
        this.init();
    }

    init() {
        this.setupAuth();
        this.setupLoginForm();
        this.setupLogout();
    }

    setupAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                this.currentUser = user;
                this.showAdminPanel();
                document.getElementById('userEmail').textContent = user.email;
            } else {
                // User is signed out
                this.currentUser = null;
                this.showLoginForm();
            }
        });
    }

    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('loginError');
            
            try {
                await signInWithEmailAndPassword(auth, email, password);
                errorDiv.style.display = 'none';
            } catch (error) {
                errorDiv.textContent = `Login failed: ${error.message}`;
                errorDiv.style.display = 'block';
            }
        });
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }

    showLoginForm() {
        document.getElementById('loginContainer').style.display = 'block';
        document.getElementById('adminContainer').style.display = 'none';
    }

    showAdminPanel() {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('adminContainer').style.display = 'block';

        // Initialize admin functionality only when authenticated
        this.setupTabs();
        this.setupIconSelector();
        this.setupForm();
        this.setupAnnouncementForm();
        this.setupBoardForm();
        this.loadPrograms();
        this.loadAnnouncements();
        // Don't load board members initially - wait for tab click

        // Initialize push notifications after admin panel is loaded
        setTimeout(() => {
            this.initializePushNotifications();
            this.setupDebugButton();
        }, 1000);
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        const menuToggle = document.getElementById('menuToggle');
        const menuToggleText = menuToggle?.querySelector('.menu-toggle-text');
        const tabButtonsContainer = document.getElementById('tabButtonsContainer');
        
        // Initialize: ensure only active tab is shown (CSS handles this, but clear any inline styles)
        tabContents.forEach(content => {
            content.style.display = ''; // Remove any inline display styles to let CSS handle it
        });

        // Setup menu toggle for mobile
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                const isExpanded = tabButtonsContainer.classList.contains('expanded');
                
                if (isExpanded) {
                    tabButtonsContainer.classList.remove('expanded');
                    menuToggle.classList.remove('expanded');
                } else {
                    tabButtonsContainer.classList.add('expanded');
                    menuToggle.classList.add('expanded');
                }
            });
        }

        // Update menu toggle text to show active tab
        const updateMenuToggleText = () => {
            if (menuToggleText) {
                const activeButton = document.querySelector('.tab-button.active');
                if (activeButton) {
                    menuToggleText.textContent = activeButton.textContent;
                }
            }
        };

        // Initialize menu toggle text
        updateMenuToggleText();

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                const isMobile = window.innerWidth <= 768;
                const targetContent = document.getElementById(`${targetTab}Tab`);
                
                // Normal tab switching behavior
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    // Remove inline styles to let CSS handle visibility
                    content.style.display = '';
                });
                
                button.classList.add('active');
                targetContent.classList.add('active');
                // Remove inline style to let CSS handle visibility
                targetContent.style.display = '';
                
                // Update menu toggle text
                updateMenuToggleText();
                
                // On mobile, collapse the menu after selecting
                if (isMobile && tabButtonsContainer) {
                    tabButtonsContainer.classList.remove('expanded');
                    menuToggle?.classList.remove('expanded');
                }
                
                // Load board members when board tab is clicked
                if (targetTab === 'board') {
                    this.loadBoardMembers();
                }
                
                // Scroll to top of content on mobile
                if (isMobile) {
                    setTimeout(() => {
                        targetContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                }
            });
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) {
                // Reset display styles for desktop
                tabContents.forEach(content => {
                    content.style.display = '';
                });
                // Hide menu on desktop
                if (tabButtonsContainer) {
                    tabButtonsContainer.classList.remove('expanded');
                    menuToggle?.classList.remove('expanded');
                }
            }
        });
    }

    setupIconSelector() {
        // Comprehensive icon collection
        this.iconCollection = {
            religious: [
                { icon: 'fas fa-mosque', name: 'Mosque' },
                { icon: 'fas fa-kaaba', name: 'Kaaba' },
                { icon: 'fas fa-quran', name: 'Quran' },
                { icon: 'fas fa-praying-hands', name: 'Prayer' },
                { icon: 'fas fa-hands', name: 'Dua' },
                { icon: 'fas fa-star-and-crescent', name: 'Crescent' },
                { icon: 'fas fa-place-of-worship', name: 'Worship' },
                { icon: 'fas fa-om', name: 'Om' },
                { icon: 'fas fa-dharmachakra', name: 'Dharma' },
                { icon: 'fas fa-yin-yang', name: 'Yin Yang' },
                { icon: 'fas fa-cross', name: 'Cross' },
                { icon: 'fas fa-hamsa', name: 'Hamsa' }
            ],
            education: [
                { icon: 'fas fa-graduation-cap', name: 'Graduation' },
                { icon: 'fas fa-book', name: 'Book' },
                { icon: 'fas fa-book-open', name: 'Open Book' },
                { icon: 'fas fa-book-reader', name: 'Reading' },
                { icon: 'fas fa-chalkboard', name: 'Chalkboard' },
                { icon: 'fas fa-chalkboard-teacher', name: 'Teacher' },
                { icon: 'fas fa-school', name: 'School' },
                { icon: 'fas fa-university', name: 'University' },
                { icon: 'fas fa-pencil-alt', name: 'Pencil' },
                { icon: 'fas fa-pen', name: 'Pen' },
                { icon: 'fas fa-laptop', name: 'Laptop' },
                { icon: 'fas fa-microscope', name: 'Microscope' },
                { icon: 'fas fa-atom', name: 'Atom' },
                { icon: 'fas fa-brain', name: 'Brain' }
            ],
            social: [
                { icon: 'fas fa-users', name: 'Users' },
                { icon: 'fas fa-user-friends', name: 'Friends' },
                { icon: 'fas fa-people-arrows', name: 'Social Distance' },
                { icon: 'fas fa-people-carry', name: 'Teamwork' },
                { icon: 'fas fa-handshake', name: 'Handshake' },
                { icon: 'fas fa-hands-helping', name: 'Helping' },
                { icon: 'fas fa-heart', name: 'Heart' },
                { icon: 'fas fa-thumbs-up', name: 'Like' },
                { icon: 'fas fa-comments', name: 'Comments' },
                { icon: 'fas fa-comment', name: 'Comment' },
                { icon: 'fas fa-share', name: 'Share' },
                { icon: 'fas fa-globe', name: 'Globe' }
            ],
            time: [
                { icon: 'fas fa-clock', name: 'Clock' },
                { icon: 'fas fa-calendar', name: 'Calendar' },
                { icon: 'fas fa-calendar-alt', name: 'Calendar Alt' },
                { icon: 'fas fa-calendar-week', name: 'Week' },
                { icon: 'fas fa-calendar-day', name: 'Day' },
                { icon: 'fas fa-calendar-check', name: 'Schedule' },
                { icon: 'fas fa-hourglass', name: 'Hourglass' },
                { icon: 'fas fa-hourglass-half', name: 'Half Time' },
                { icon: 'fas fa-stopwatch', name: 'Stopwatch' },
                { icon: 'fas fa-history', name: 'History' },
                { icon: 'fas fa-sun', name: 'Sun' },
                { icon: 'fas fa-moon', name: 'Moon' },
                { icon: 'fas fa-star', name: 'Star' }
            ],
            communication: [
                { icon: 'fas fa-envelope', name: 'Envelope' },
                { icon: 'fas fa-inbox', name: 'Inbox' },
                { icon: 'fas fa-paper-plane', name: 'Send' },
                { icon: 'fas fa-phone', name: 'Phone' },
                { icon: 'fas fa-mobile-alt', name: 'Mobile' },
                { icon: 'fas fa-microphone', name: 'Microphone' },
                { icon: 'fas fa-bullhorn', name: 'Announcement' },
                { icon: 'fas fa-bell', name: 'Bell' },
                { icon: 'fas fa-wifi', name: 'WiFi' },
                { icon: 'fas fa-broadcast-tower', name: 'Broadcast' },
                { icon: 'fas fa-satellite', name: 'Satellite' },
                { icon: 'fas fa-rss', name: 'RSS' }
            ],
            media: [
                { icon: 'fas fa-video', name: 'Video' },
                { icon: 'fas fa-camera', name: 'Camera' },
                { icon: 'fas fa-image', name: 'Image' },
                { icon: 'fas fa-images', name: 'Gallery' },
                { icon: 'fas fa-film', name: 'Film' },
                { icon: 'fas fa-play', name: 'Play' },
                { icon: 'fas fa-pause', name: 'Pause' },
                { icon: 'fas fa-volume-up', name: 'Volume' },
                { icon: 'fas fa-music', name: 'Music' },
                { icon: 'fas fa-podcast', name: 'Podcast' },
                { icon: 'fas fa-tv', name: 'TV' },
                { icon: 'fas fa-desktop', name: 'Desktop' }
            ],
            business: [
                { icon: 'fas fa-briefcase', name: 'Briefcase' },
                { icon: 'fas fa-building', name: 'Building' },
                { icon: 'fas fa-chart-line', name: 'Chart' },
                { icon: 'fas fa-chart-bar', name: 'Bar Chart' },
                { icon: 'fas fa-chart-pie', name: 'Pie Chart' },
                { icon: 'fas fa-coins', name: 'Coins' },
                { icon: 'fas fa-dollar-sign', name: 'Dollar' },
                { icon: 'fas fa-donate', name: 'Donate' },
                { icon: 'fas fa-gift', name: 'Gift' },
                { icon: 'fas fa-trophy', name: 'Trophy' },
                { icon: 'fas fa-award', name: 'Award' },
                { icon: 'fas fa-certificate', name: 'Certificate' }
            ],
            health: [
                { icon: 'fas fa-heartbeat', name: 'Heartbeat' },
                { icon: 'fas fa-stethoscope', name: 'Stethoscope' },
                { icon: 'fas fa-hospital', name: 'Hospital' },
                { icon: 'fas fa-clinic-medical', name: 'Clinic' },
                { icon: 'fas fa-ambulance', name: 'Ambulance' },
                { icon: 'fas fa-first-aid', name: 'First Aid' },
                { icon: 'fas fa-pills', name: 'Medicine' },
                { icon: 'fas fa-syringe', name: 'Syringe' },
                { icon: 'fas fa-band-aid', name: 'Band Aid' },
                { icon: 'fas fa-hand-holding-heart', name: 'Care' },
                { icon: 'fas fa-hand-holding-medical', name: 'Medical Help' },
                { icon: 'fas fa-shield-virus', name: 'Protection' }
            ],
            nature: [
                { icon: 'fas fa-tree', name: 'Tree' },
                { icon: 'fas fa-leaf', name: 'Leaf' },
                { icon: 'fas fa-seedling', name: 'Seedling' },
                { icon: 'fas fa-flower', name: 'Flower' },
                { icon: 'fas fa-spa', name: 'Spa' },
                { icon: 'fas fa-water', name: 'Water' },
                { icon: 'fas fa-cloud', name: 'Cloud' },
                { icon: 'fas fa-cloud-sun', name: 'Partly Cloudy' },
                { icon: 'fas fa-rainbow', name: 'Rainbow' },
                { icon: 'fas fa-snowflake', name: 'Snowflake' },
                { icon: 'fas fa-fire', name: 'Fire' },
                { icon: 'fas fa-bolt', name: 'Lightning' }
            ]
        };

        this.tempSelectedIcon = null;
        this.setupIconPicker();
    }

    setupIconPicker() {
        const trigger = document.getElementById('iconSelectTrigger');
        const modal = document.getElementById('iconPickerModal');
        const searchInput = document.getElementById('iconSearch');
        const categoryBtns = document.querySelectorAll('.category-btn');
        const iconGrid = document.getElementById('iconGrid');
        const cancelBtn = document.getElementById('cancelIconPicker');
        const confirmBtn = document.getElementById('confirmIconPicker');
        const previewIcon = document.getElementById('previewIcon');
        const previewIconName = document.getElementById('previewIconName');

        // Open modal when trigger is clicked
        trigger.addEventListener('click', () => {
            modal.style.display = 'block';
            this.tempSelectedIcon = this.selectedIcon;
            this.populateIcons('all');
            if (this.selectedIcon) {
                this.selectIconInGrid(this.selectedIcon);
            }
        });

        // Category filter
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const category = btn.dataset.category;
                this.populateIcons(category);
            });
        });

        // Search functionality
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchIcons(searchInput.value);
            }, 300);
        });

        // Cancel button
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            this.tempSelectedIcon = null;
        });

        // Confirm button
        confirmBtn.addEventListener('click', () => {
            if (this.tempSelectedIcon) {
                this.selectedIcon = this.tempSelectedIcon;
                document.getElementById('selectedIcon').value = this.selectedIcon;
                this.updateTriggerDisplay(this.selectedIcon);
            }
            modal.style.display = 'none';
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                this.tempSelectedIcon = null;
            }
        });
    }

    populateIcons(category = 'all') {
        const iconGrid = document.getElementById('iconGrid');
        iconGrid.innerHTML = '';

        let icons = [];
        if (category === 'all') {
            Object.values(this.iconCollection).forEach(catIcons => {
                icons = icons.concat(catIcons);
            });
        } else if (this.iconCollection[category]) {
            icons = this.iconCollection[category];
        }

        icons.forEach(item => {
            const iconItem = document.createElement('div');
            iconItem.className = 'icon-item';
            iconItem.dataset.icon = item.icon;
            iconItem.innerHTML = `
                <i class="${item.icon}"></i>
                <span class="icon-name">${item.name}</span>
            `;

            iconItem.addEventListener('click', () => {
                this.selectIcon(iconItem, item);
            });

            iconGrid.appendChild(iconItem);
        });
    }

    searchIcons(query) {
        const iconGrid = document.getElementById('iconGrid');
        iconGrid.innerHTML = '';

        if (!query) {
            this.populateIcons('all');
            return;
        }

        const searchTerm = query.toLowerCase();
        let matchedIcons = [];

        Object.values(this.iconCollection).forEach(catIcons => {
            catIcons.forEach(item => {
                if (item.name.toLowerCase().includes(searchTerm) || 
                    item.icon.toLowerCase().includes(searchTerm)) {
                    matchedIcons.push(item);
                }
            });
        });

        matchedIcons.forEach(item => {
            const iconItem = document.createElement('div');
            iconItem.className = 'icon-item';
            iconItem.dataset.icon = item.icon;
            iconItem.innerHTML = `
                <i class="${item.icon}"></i>
                <span class="icon-name">${item.name}</span>
            `;

            iconItem.addEventListener('click', () => {
                this.selectIcon(iconItem, item);
            });

            iconGrid.appendChild(iconItem);
        });
    }

    selectIcon(element, item) {
        // Remove previous selection
        document.querySelectorAll('.icon-item').forEach(el => {
            el.classList.remove('selected');
        });

        // Add selection to clicked item
        element.classList.add('selected');
        this.tempSelectedIcon = item.icon;

        // Update preview
        const previewIcon = document.getElementById('previewIcon');
        const previewIconName = document.getElementById('previewIconName');
        previewIcon.className = item.icon;
        previewIconName.textContent = item.name;
    }

    selectIconInGrid(iconClass) {
        const iconItems = document.querySelectorAll('.icon-item');
        iconItems.forEach(item => {
            if (item.dataset.icon === iconClass) {
                item.classList.add('selected');
                const iconName = item.querySelector('.icon-name').textContent;
                document.getElementById('previewIcon').className = iconClass;
                document.getElementById('previewIconName').textContent = iconName;
            }
        });
    }

    updateTriggerDisplay(iconClass) {
        const trigger = document.getElementById('iconSelectTrigger');
        const iconDisplay = document.getElementById('selectedIconDisplay');
        const triggerText = document.getElementById('iconTriggerText');

        trigger.classList.add('has-icon');
        iconDisplay.className = iconClass;
        triggerText.textContent = 'Click to change icon';
    }

    setupForm() {
        const form = document.getElementById('programForm');
        const cancelBtn = document.getElementById('cancelEdit');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.editingId) {
                this.updateProgram();
            } else {
                this.addProgram();
            }
        });

        cancelBtn.addEventListener('click', () => {
            this.resetForm();
        });
    }

    async addProgram() {
        const name = document.getElementById('programName').value.trim();
        const timing = document.getElementById('programTiming').value.trim();
        const isActive = document.getElementById('isActive').value === 'true';

        if (!name || !timing || !this.selectedIcon) {
            this.showError('Please fill in all fields and select an icon');
            return;
        }

        try {
            await addDoc(collection(db, 'programs'), {
                name: name,
                timing: timing,
                icon: this.selectedIcon,
                isActive: isActive,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            this.showSuccess('Program added successfully!');
            this.resetForm();
            this.loadPrograms();
        } catch (error) {
            console.error('Error adding program:', error);
            this.showError('Error adding program. Please try again.');
        }
    }

    async updateProgram() {
        const name = document.getElementById('programName').value.trim();
        const timing = document.getElementById('programTiming').value.trim();
        const isActive = document.getElementById('isActive').value === 'true';

        if (!name || !timing || !this.selectedIcon) {
            this.showError('Please fill in all fields and select an icon');
            return;
        }

        try {
            const programRef = doc(db, 'programs', this.editingId);
            await updateDoc(programRef, {
                name: name,
                timing: timing,
                icon: this.selectedIcon,
                isActive: isActive,
                updatedAt: new Date()
            });

            this.showSuccess('Program updated successfully!');
            this.resetForm();
            this.loadPrograms();
        } catch (error) {
            console.error('Error updating program:', error);
            this.showError('Error updating program. Please try again.');
        }
    }

    async deleteProgram(id) {
        if (!confirm('Are you sure you want to delete this program?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'programs', id));
            this.showSuccess('Program deleted successfully!');
            this.loadPrograms();
        } catch (error) {
            console.error('Error deleting program:', error);
            this.showError('Error deleting program. Please try again.');
        }
    }

    editProgram(id, program) {
        this.editingId = id;
        
        // Fill form with existing data
        document.getElementById('programName').value = program.name;
        document.getElementById('programTiming').value = program.timing;
        document.getElementById('isActive').value = program.isActive.toString();

        // Set the icon using the new icon picker
        this.selectedIcon = program.icon;
        document.getElementById('selectedIcon').value = program.icon;
        this.updateTriggerDisplay(program.icon);

        // Show cancel button and change submit button text
        document.getElementById('cancelEdit').style.display = 'inline-block';
        document.querySelector('button[type="submit"]').textContent = 'Update Program';

        // Scroll to form
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    }

    resetForm() {
        this.editingId = null;
        this.selectedIcon = null;
        
        document.getElementById('programForm').reset();
        document.getElementById('selectedIcon').value = '';
        
        // Reset the icon picker trigger
        const trigger = document.getElementById('iconSelectTrigger');
        const iconDisplay = document.getElementById('selectedIconDisplay');
        const triggerText = document.getElementById('iconTriggerText');
        
        trigger.classList.remove('has-icon');
        iconDisplay.className = 'fas fa-icons';
        triggerText.textContent = 'Click to select an icon';

        document.getElementById('cancelEdit').style.display = 'none';
        document.querySelector('button[type="submit"]').textContent = 'Add Program';
    }

    async loadPrograms() {
        const programsList = document.getElementById('programsList');
        
        try {
            const q = query(collection(db, 'programs'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                programsList.innerHTML = '<p class="loading">No programs found. Add your first program above.</p>';
                return;
            }

            let html = '';
            querySnapshot.forEach((docSnap) => {
                const program = docSnap.data();
                const id = docSnap.id;
                
                html += `
                    <div class="program-item">
                        <div class="program-info">
                            <div class="program-icon">
                                <i class="${program.icon}"></i>
                            </div>
                            <div class="program-details">
                                <h3>${program.name}</h3>
                                <p>${program.timing}</p>
                                <p style="font-size: 14px; color: ${program.isActive ? '#48bb78' : '#e53e3e'};">
                                    ${program.isActive ? '✓ Active' : '✗ Inactive'}
                                </p>
                            </div>
                        </div>
                        <div class="program-actions">
                            <button class="btn btn-primary" onclick="admin.editProgram('${id}', ${JSON.stringify(program).replace(/"/g, '&quot;')})">
                                Edit
                            </button>
                            <button class="btn btn-danger" onclick="admin.deleteProgram('${id}')">
                                Delete
                            </button>
                        </div>
                    </div>
                `;
            });

            programsList.innerHTML = html;
        } catch (error) {
            console.error('Error loading programs:', error);
            programsList.innerHTML = '<p class="loading">Error loading programs. Please refresh the page.</p>';
        }
    }

    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);

        // Hide error message if shown
        document.getElementById('errorMessage').style.display = 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);

        // Hide success message if shown
        document.getElementById('successMessage').style.display = 'none';
    }

    // Announcement methods
    setupAnnouncementForm() {
        const form = document.getElementById('announcementForm');
        const cancelBtn = document.getElementById('cancelAnnouncementEdit');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.editingAnnouncementId) {
                this.updateAnnouncement();
            } else {
                this.addAnnouncement();
            }
        });

        cancelBtn.addEventListener('click', () => {
            this.resetAnnouncementForm();
        });

        // Update push notification info when form is loaded
        setTimeout(() => {
            if (this.fcmPushManager && this.currentUser) {
                this.updatePushNotificationInfo();
            }
        }, 500);
    }

    async addAnnouncement() {
        const title = document.getElementById('announcementTitle').value.trim();
        const message = document.getElementById('announcementMessage').value.trim();
        const priority = document.getElementById('announcementPriority').value;
        const expiryInput = document.getElementById('announcementExpiry').value;
        const isActive = document.getElementById('announcementActive').value === 'true';
        const sendPush = document.getElementById('sendPushNotification')?.checked || false;

        if (!title || !message) {
            this.showError('Please fill in title and message');
            return;
        }

        try {
            const announcementData = {
                title: title,
                message: message,
                priority: priority,
                isActive: isActive,
                createdAt: new Date(),
                updatedAt: new Date(),
                publishedBy: this.currentUser?.email || 'admin'
            };

            // Add expiry date if provided
            if (expiryInput) {
                announcementData.expiryDate = new Date(expiryInput);
            }

            // 1. Save announcement to Firebase Firestore
            console.log('💾 Saving announcement to Firebase...');
            const docRef = await addDoc(collection(db, 'announcements'), announcementData);

            // 2. Send push notification if requested
            if (sendPush && isActive) {
                console.log('📤 Sending push notification...');

                try {
                    const pushResult = await this.fcmPushManager.sendPushNotification(
                        title,
                        message,
                        priority
                    );

                    console.log('✅ Push notification result:', pushResult);

                    // 3. Update announcement with push status
                    await updateDoc(docRef, {
                        pushSent: true,
                        pushSentAt: new Date(),
                        pushRecipients: pushResult.sent,
                        pushFailed: pushResult.failed
                    });

                    this.showSuccess(`✅ Announcement published and sent to ${pushResult.sent} subscribers!`);

                } catch (pushError) {
                    console.error('⚠️ Push notification failed:', pushError);

                    // Update with failed status
                    await updateDoc(docRef, {
                        pushSent: false,
                        pushError: pushError.message,
                        pushAttemptedAt: new Date()
                    });

                    this.showSuccess('✅ Announcement published (push notification failed)');
                    this.showError(`⚠️ Push notification error: ${pushError.message}`);
                }
            } else {
                this.showSuccess('✅ Announcement published successfully!');
            }

            this.resetAnnouncementForm();
            this.loadAnnouncements();

        } catch (error) {
            console.error('❌ Failed to publish announcement:', error);
            this.showError('❌ Failed to publish announcement. Please try again.');
        }
    }

    async updateAnnouncement() {
        const title = document.getElementById('announcementTitle').value.trim();
        const message = document.getElementById('announcementMessage').value.trim();
        const priority = document.getElementById('announcementPriority').value;
        const expiryInput = document.getElementById('announcementExpiry').value;
        const isActive = document.getElementById('announcementActive').value === 'true';

        if (!title || !message) {
            this.showError('Please fill in title and message');
            return;
        }

        try {
            const updateData = {
                title: title,
                message: message,
                priority: priority,
                isActive: isActive,
                updatedAt: new Date()
            };

            // Add or remove expiry date
            if (expiryInput) {
                updateData.expiryDate = new Date(expiryInput);
            } else {
                updateData.expiryDate = null;
            }

            const announcementRef = doc(db, 'announcements', this.editingAnnouncementId);
            await updateDoc(announcementRef, updateData);

            this.showSuccess('Announcement updated successfully!');
            this.resetAnnouncementForm();
            this.loadAnnouncements();
        } catch (error) {
            console.error('Error updating announcement:', error);
            this.showError('Error updating announcement. Please try again.');
        }
    }

    async deleteAnnouncement(id) {
        if (!confirm('Are you sure you want to delete this announcement?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'announcements', id));
            this.showSuccess('Announcement deleted successfully!');
            this.loadAnnouncements();
        } catch (error) {
            console.error('Error deleting announcement:', error);
            this.showError('Error deleting announcement. Please try again.');
        }
    }

    editAnnouncement(id, announcement) {
        this.editingAnnouncementId = id;
        
        // Fill form with existing data
        document.getElementById('announcementTitle').value = announcement.title;
        document.getElementById('announcementMessage').value = announcement.message;
        document.getElementById('announcementPriority').value = announcement.priority;
        document.getElementById('announcementActive').value = announcement.isActive.toString();

        // Set expiry date if exists
        if (announcement.expiryDate) {
            const expiryDate = announcement.expiryDate.toDate ? announcement.expiryDate.toDate() : new Date(announcement.expiryDate);
            const localDateTime = new Date(expiryDate.getTime() - expiryDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            document.getElementById('announcementExpiry').value = localDateTime;
        }

        // Show cancel button and change submit button text
        document.getElementById('cancelAnnouncementEdit').style.display = 'inline-block';
        document.querySelector('#announcementForm button[type="submit"]').textContent = 'Update Announcement';

        // Switch to announcements tab
        document.querySelector('[data-tab="announcements"]').click();

        // Scroll to form
        document.querySelector('#announcementsTab .form-section').scrollIntoView({ behavior: 'smooth' });
    }

    resetAnnouncementForm() {
        this.editingAnnouncementId = null;
        
        document.getElementById('announcementForm').reset();
        document.getElementById('cancelAnnouncementEdit').style.display = 'none';
        document.querySelector('#announcementForm button[type="submit"]').textContent = 'Add Announcement';
    }

    async loadAnnouncements() {
        const announcementsList = document.getElementById('announcementsList');
        
        try {
            const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                announcementsList.innerHTML = '<p class="loading">No announcements found. Add your first announcement above.</p>';
                return;
            }

            let html = '';
            querySnapshot.forEach((docSnap) => {
                const announcement = docSnap.data();
                const id = docSnap.id;
                
                // Check if expired
                let isExpired = false;
                let expiryText = '';
                if (announcement.expiryDate) {
                    const expiryDate = announcement.expiryDate.toDate ? announcement.expiryDate.toDate() : new Date(announcement.expiryDate);
                    isExpired = expiryDate < new Date();
                    expiryText = `Expires: ${expiryDate.toLocaleDateString()} ${expiryDate.toLocaleTimeString()}`;
                }

                const priorityClass = `priority-${announcement.priority}`;
                
                html += `
                    <div class="announcement-item ${isExpired ? 'expired' : ''}">
                        <div class="announcement-info">
                            <div class="announcement-title">${announcement.title}</div>
                            <div class="announcement-message">${announcement.message}</div>
                            <div class="announcement-meta">
                                <span class="announcement-priority ${priorityClass}">${announcement.priority === 'low' ? 'NOTIFICATION' : announcement.priority === 'medium' ? 'ANNOUNCEMENT' : 'EMERGENCY'}</span>
                                <span style="color: ${announcement.isActive && !isExpired ? '#48bb78' : '#e53e3e'};">
                                    ${announcement.isActive && !isExpired ? '✓ Active' : '✗ Inactive'}
                                </span>
                                ${expiryText ? `<span>${expiryText}</span>` : ''}
                                ${isExpired ? '<span style="color: #e53e3e;">EXPIRED</span>' : ''}
                            </div>
                        </div>
                        <div class="program-actions">
                            <button class="btn btn-primary" onclick="admin.editAnnouncement('${id}', ${JSON.stringify(announcement).replace(/"/g, '&quot;')})">
                                Edit
                            </button>
                            <button class="btn btn-danger" onclick="admin.deleteAnnouncement('${id}')">
                                Delete
                            </button>
                        </div>
                    </div>
                `;
            });

            announcementsList.innerHTML = html;
        } catch (error) {
            console.error('Error loading announcements:', error);
            announcementsList.innerHTML = '<p class="loading">Error loading announcements. Please refresh the page.</p>';
        }
    }

    // Board of Directors Methods
    setupBoardForm() {
        const form = document.getElementById('boardForm');
        const cancelBtn = document.getElementById('cancelBoardEdit');

        if (!form) {
            console.error('Board form not found');
            return;
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.editingBoardId) {
                this.updateBoardMember();
            } else {
                this.addBoardMember();
            }
        });

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.resetBoardForm();
            });
        }
    }

    async addBoardMember() {
        const nameElement = document.getElementById('memberName');
        const orderElement = document.getElementById('memberOrder');
        
        if (!nameElement || !orderElement) {
            console.error('Form elements not found:', { nameElement, orderElement });
            this.showError('Form error. Please refresh the page.');
            return;
        }

        const name = nameElement.value.trim();
        const order = parseInt(orderElement.value) || 999;

        if (!name) {
            this.showError('Please enter a name');
            return;
        }

        try {
            await addDoc(collection(db, 'boardMembers'), {
                name: name,
                order: order,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            this.showSuccess('Board member added successfully!');
            this.resetBoardForm();
            this.loadBoardMembers();
        } catch (error) {
            console.error('Error adding board member:', error);
            this.showError(`Error adding board member: ${error.message}`);
        }
    }

    async updateBoardMember() {
        const nameElement = document.getElementById('memberName');
        const orderElement = document.getElementById('memberOrder');
        
        if (!nameElement || !orderElement) {
            console.error('Form elements not found:', { nameElement, orderElement });
            this.showError('Form error. Please refresh the page.');
            return;
        }

        const name = nameElement.value.trim();
        const order = parseInt(orderElement.value) || 999;

        if (!name) {
            this.showError('Please enter a name');
            return;
        }

        try {
            const memberRef = doc(db, 'boardMembers', this.editingBoardId);
            await updateDoc(memberRef, {
                name: name,
                order: order,
                isActive: true,
                updatedAt: new Date()
            });

            this.showSuccess('Board member updated successfully!');
            this.resetBoardForm();
            this.loadBoardMembers();
        } catch (error) {
            console.error('Error updating board member:', error);
            this.showError(`Error updating board member: ${error.message}`);
        }
    }

    async deleteBoardMember(id) {
        if (!confirm('Are you sure you want to delete this board member?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'boardMembers', id));
            this.showSuccess('Board member deleted successfully!');
            this.loadBoardMembers();
        } catch (error) {
            console.error('Error deleting board member:', error);
            this.showError('Error deleting board member. Please try again.');
        }
    }

    editBoardMember(id, member) {
        this.editingBoardId = id;
        
        document.getElementById('memberName').value = member.name;
        document.getElementById('memberOrder').value = member.order || 999;

        document.getElementById('cancelBoardEdit').style.display = 'inline-block';
        document.querySelector('#boardForm button[type="submit"]').textContent = 'Update Member';

        // Switch to board tab
        document.querySelector('[data-tab="board"]').click();

        // Scroll to form
        document.querySelector('#boardTab .form-section').scrollIntoView({ behavior: 'smooth' });
    }

    resetBoardForm() {
        this.editingBoardId = null;
        
        document.getElementById('boardForm').reset();
        document.getElementById('cancelBoardEdit').style.display = 'none';
        document.querySelector('#boardForm button[type="submit"]').textContent = 'Add Member';
    }

    async loadBoardMembers() {
        const boardList = document.getElementById('boardList');
        
        if (!boardList) {
            console.log('Board list element not found - board tab may not be active');
            return;
        }
        
        try {
            // First try without ordering to avoid index requirement
            const querySnapshot = await getDocs(collection(db, 'boardMembers'));
            
            if (querySnapshot.empty) {
                boardList.innerHTML = '<p class="loading">No board members found. Add your first board member above.</p>';
                return;
            }

            // Collect all members and sort them by order
            const members = [];
            querySnapshot.forEach((docSnap) => {
                members.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });
            
            // Sort by order field
            members.sort((a, b) => (a.order || 999) - (b.order || 999));

            let html = '';
            members.forEach(({ id, ...member }) => {
                
                html += `
                    <div class="program-item">
                        <div class="program-info">
                            <div class="program-details">
                                <h3>${member.name}</h3>
                                <p style="font-size: 12px; color: #999;">Display Order: ${member.order || 999}</p>
                                <p style="font-size: 14px; color: ${member.isActive !== false ? '#48bb78' : '#e53e3e'};">
                                    ${member.isActive !== false ? '✓ Active' : '✗ Inactive'}
                                </p>
                            </div>
                        </div>
                        <div class="program-actions">
                            <button class="btn btn-primary" onclick="admin.editBoardMember('${id}', ${JSON.stringify(member).replace(/"/g, '&quot;')})">
                                Edit
                            </button>
                            <button class="btn btn-danger" onclick="admin.deleteBoardMember('${id}')">
                                Delete
                            </button>
                        </div>
                    </div>
                `;
            });

            boardList.innerHTML = html;
        } catch (error) {
            console.error('Error loading board members:', error);
            if (error.code === 'permission-denied' || error.message.includes('permission')) {
                boardList.innerHTML = '<p class="loading">Permission error. Board members collection may need to be initialized. Try adding a member first.</p>';
            } else if (error.message.includes('index')) {
                boardList.innerHTML = '<p class="loading">Database index required. Please contact administrator to create index for boardMembers collection.</p>';
            } else {
                boardList.innerHTML = `<p class="loading">Error loading board members: ${error.message}</p>`;
            }
        }
    }

    // Push notification methods
    async initializePushNotifications() {
        try {
            if (!this.currentUser) {
                console.log('❌ No user logged in, skipping push notifications');
                return;
            }

            console.log('🔔 Initializing push notifications...');

            // Request permission and subscribe
            await this.fcmPushManager.requestPermissionAndSubscribe(this.currentUser.uid);

            // Update subscriber count in announcement form
            this.updatePushNotificationInfo();

            console.log('✅ Push notifications initialized successfully');

        } catch (error) {
            console.error('⚠️ Push notification setup failed (non-critical):', error.message);
            this.updatePushNotificationError(error.message);
        }
    }

    async updatePushNotificationInfo() {
        try {
            const count = await this.fcmPushManager.getSubscriberCount();
            const infoDiv = document.getElementById('pushNotificationInfo');

            if (infoDiv) {
                if (count > 0) {
                    infoDiv.innerHTML = `✅ Will notify ${count} subscriber${count !== 1 ? 's' : ''}`;
                    infoDiv.style.color = '#059669';
                } else {
                    infoDiv.innerHTML = '⚠️ No subscribers yet. Users need to enable notifications first.';
                    infoDiv.style.color = '#d97706';
                }
            }
        } catch (error) {
            this.updatePushNotificationError('Unable to load subscriber count');
        }
    }

    updatePushNotificationError(message) {
        const infoDiv = document.getElementById('pushNotificationInfo');
        if (infoDiv) {
            infoDiv.innerHTML = `❌ ${message}`;
            infoDiv.style.color = '#dc2626';
        }
    }

    setupDebugButton() {
        const debugButton = document.getElementById('debugTokens');
        if (debugButton) {
            debugButton.addEventListener('click', () => {
                this.debugFCMTokens();
            });
        }

        const wipeButton = document.getElementById('wipeTokens');
        if (wipeButton) {
            wipeButton.addEventListener('click', () => {
                this.wipeAllTokens();
            });
        }
    }

    // Debug FCM Tokens for iOS duplication issue
    async debugFCMTokens() {
        const debugButton = document.getElementById('debugTokens');
        const debugResults = document.getElementById('debugResults');

        if (!debugButton || !debugResults) return;

        debugButton.disabled = true;
        debugButton.textContent = 'Analyzing...';
        debugResults.style.display = 'block';
        debugResults.textContent = 'Fetching FCM token data from Cloudflare Worker...\n';

        try {
            const apiKey = window.ENV?.PUSH_API_KEY;
            if (!apiKey) {
                throw new Error('Push API key not available');
            }

            // Call your Cloudflare Worker debug endpoint
            const response = await fetch('https://masjid-push-notifications.rodeomasjid.workers.dev/api/debug-tokens', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Debug request failed: ${response.status} ${response.statusText}`);
            }

            const debugData = await response.json();

            // Debug: Log the actual response structure
            console.log('Debug response structure:', debugData);
            debugResults.textContent += `Response structure logged to console\n`;

            let output = '=== FCM TOKEN ANALYSIS ===\n\n';
            output += `Total tokens found: ${debugData.summary?.totalTokens || debugData.tokens?.length || 0}\n\n`;

            if (debugData.tokens && debugData.tokens.length > 0) {
                // Group tokens by platform
                const userGroups = {};
                const duplicateGroups = {};

                debugData.tokens.forEach(token => {
                    const userId = token.userId || 'unknown';
                    const userAgent = token.userAgent || 'Unknown';
                    const platform = token.platform || 'Unknown';
                    const deviceInfo = token.deviceInfo || 'Unknown Device';
                    const storedAt = token.storedAt ? new Date(token.storedAt).toLocaleString() : 'Unknown';

                    if (!userGroups[platform]) {
                        userGroups[platform] = [];
                    }
                    userGroups[platform].push({
                        userId,
                        userAgent,
                        platform,
                        deviceInfo,
                        storedAt,
                        tokenPreview: token.tokenPreview || 'N/A'
                    });

                    // Check for potential duplicates (same device info)
                    const fingerprint = `${deviceInfo}_${platform}`;
                    if (!duplicateGroups[fingerprint]) {
                        duplicateGroups[fingerprint] = [];
                    }
                    duplicateGroups[fingerprint].push({ userId, userAgent, platform, deviceInfo, storedAt });
                });

                // Report by platform
                Object.keys(userGroups).forEach(platform => {
                    output += `--- ${platform} TOKENS (${userGroups[platform].length}) ---\n`;
                    userGroups[platform].forEach((token, index) => {
                        output += `${index + 1}. User ID: ${token.userId}\n`;
                        output += `   Device: ${token.deviceInfo}\n`;
                        output += `   Token: ${token.tokenPreview}\n`;
                        output += `   Registered: ${token.storedAt}\n`;
                        output += `   User Agent: ${token.userAgent.substring(0, 100)}${token.userAgent.length > 100 ? '...' : ''}\n\n`;
                    });
                });

                // Report potential duplicates
                output += '\n=== POTENTIAL DUPLICATES ===\n';
                let duplicatesFound = false;
                Object.keys(duplicateGroups).forEach(fingerprint => {
                    const group = duplicateGroups[fingerprint];
                    if (group.length > 1) {
                        duplicatesFound = true;
                        output += `\n🔴 DUPLICATE GROUP: ${fingerprint} (${group.length} tokens)\n`;
                        group.forEach((token, index) => {
                            output += `  ${index + 1}. ${token.userId} (${token.storedAt})\n`;
                            output += `     Device: ${token.deviceInfo}\n`;
                        });
                    }
                });

                if (!duplicatesFound) {
                    output += 'No duplicate devices detected.\n';
                }

            } else {
                output += 'No tokens found in storage.\n';
            }

            debugResults.textContent = output;

        } catch (error) {
            debugResults.textContent = `❌ Error analyzing tokens: ${error.message}\n\nThis might mean:\n- Debug endpoint not implemented yet\n- API key issue\n- Network connectivity problem`;
        } finally {
            debugButton.disabled = false;
            debugButton.textContent = 'Analyze FCM Tokens';
        }
    }

    // Wipe All FCM Tokens (Dangerous!)
    async wipeAllTokens() {
        const wipeButton = document.getElementById('wipeTokens');
        const debugResults = document.getElementById('debugResults');

        if (!wipeButton || !debugResults) return;

        // Double confirmation for safety
        const firstConfirm = confirm('⚠️ WARNING: This will DELETE ALL FCM tokens!\n\nAre you sure you want to proceed?\n\nThis action cannot be undone!');
        if (!firstConfirm) return;

        const secondConfirm = confirm('🚨 FINAL WARNING 🚨\n\nThis will permanently delete all notification subscribers.\n\nUsers will need to re-enable notifications.\n\nType "DELETE" and click OK to confirm:');
        if (!secondConfirm) return;

        wipeButton.disabled = true;
        wipeButton.textContent = 'Wiping...';
        wipeButton.style.background = '#6c757d';
        debugResults.style.display = 'block';
        debugResults.textContent = 'Initiating token wipe...\n';

        try {
            const apiKey = window.ENV?.PUSH_API_KEY;
            if (!apiKey) {
                throw new Error('Push API key not available');
            }

            debugResults.textContent += 'Calling Cloudflare Worker wipe endpoint...\n';

            const response = await fetch('https://masjid-push-notifications.rodeomasjid.workers.dev/api/wipe-all-tokens', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Wipe request failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            let output = '=== TOKEN WIPE COMPLETE ===\n\n';
            output += `✅ Success: ${result.success ? 'Yes' : 'No'}\n`;
            output += `🗑️ Tokens Deleted: ${result.deleted}/${result.total}\n`;
            output += `📅 Timestamp: ${new Date(result.timestamp).toLocaleString()}\n`;
            output += `💬 Message: ${result.message}\n\n`;
            output += '⚠️ All users will need to re-enable notifications on their devices.\n';
            output += '📱 Refresh the debug analysis to verify the wipe was successful.';

            debugResults.textContent = output;

            // Update UI
            this.showSuccess(`🗑️ All ${result.deleted} FCM tokens have been wiped successfully!`);

        } catch (error) {
            debugResults.textContent = `❌ Error wiping tokens: ${error.message}\n\nThis might mean:\n- API key issue\n- Network connectivity problem\n- Worker endpoint error`;
            this.showError(`Failed to wipe tokens: ${error.message}`);
        } finally {
            wipeButton.disabled = false;
            wipeButton.textContent = '🗑️ Wipe All Tokens';
            wipeButton.style.background = '#dc3545';
        }
    }
}

// Initialize the admin panel
const admin = new AdminPanel();

// Make admin available globally for onclick events
window.admin = admin;
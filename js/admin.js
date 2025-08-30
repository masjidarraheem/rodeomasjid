import { db, auth } from './firebase-config.js';
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
        this.selectedIcon = null;
        this.currentUser = null;
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
        this.loadPrograms();
        this.loadAnnouncements();
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Update active states
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                button.classList.add('active');
                document.getElementById(`${targetTab}Tab`).classList.add('active');
            });
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
    }

    async addAnnouncement() {
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
            const announcementData = {
                title: title,
                message: message,
                priority: priority,
                isActive: isActive,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Add expiry date if provided
            if (expiryInput) {
                announcementData.expiryDate = new Date(expiryInput);
            }

            await addDoc(collection(db, 'announcements'), announcementData);

            this.showSuccess('Announcement added successfully!');
            this.resetAnnouncementForm();
            this.loadAnnouncements();
        } catch (error) {
            console.error('Error adding announcement:', error);
            this.showError('Error adding announcement. Please try again.');
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
}

// Initialize the admin panel
const admin = new AdminPanel();

// Make admin available globally for onclick events
window.admin = admin;